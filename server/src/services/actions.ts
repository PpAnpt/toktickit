import crypto from 'crypto';
import { ActionStatus, Prisma, TicketStatus } from '../../generated/prisma/client';
import { getPrisma } from '../prisma';

/**
 * Actions Taken service (Lab 4, docs/lab-04/specification.md BR-01..BR-13, BR-29..BR-34, BR-40/41).
 *
 * Every write runs in one transaction that
 *   1. locks the parent Ticket row (serialises with status changes and with other writers),
 *   2. re-checks the Ticket state (Closed/Cancelled, Resolved),
 *   3. performs the change as a single compare-and-set (`UPDATE ... WHERE id AND updatedAt = expected`),
 *   4. appends the history revision in the same transaction.
 * If the compare-and-set updates no row the transaction is rolled back, so no history row survives.
 */

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        public code?: string,
        public extra: Record<string, unknown> = {},
    ) {
        super(message);
    }
}

export const LIMITS = { description: 2000, result: 1000, followUpNote: 1000, attachmentNotes: 500 } as const;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const statusLabel: Record<ActionStatus, string> = {
    Planned: 'Planned',
    InProgress: 'In Progress',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
};
const statusByLabel: Record<string, ActionStatus> = {
    'Planned': 'Planned',
    'In Progress': 'InProgress',
    'InProgress': 'InProgress',
    'Completed': 'Completed',
    'Cancelled': 'Cancelled',
};
// BR-30: Completed and Cancelled are terminal for status
export const ACTION_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
    Planned: ['InProgress', 'Completed', 'Cancelled'],
    InProgress: ['Completed', 'Cancelled'],
    Completed: [],
    Cancelled: [],
};
const ASSIGNABLE_ROLES = ['IT_STAFF', 'ADMINISTRATOR'];

/**
 * Next concurrency token: strictly greater than the previous one, so two writes in the same
 * millisecond still change it (BR-20): max(now, previous + 1 ms).
 */
export function nextToken(previous: Date, now: Date = new Date()): Date {
    return new Date(Math.max(now.getTime(), previous.getTime() + 1));
}

type Tx = Prisma.TransactionClient;

const actionInclude = {
    performedBy: { select: { id: true, name: true, role: true } },
    assignee: { select: { id: true, name: true, role: true } },
    updatedBy: { select: { id: true, name: true } },
} satisfies Prisma.ActionTakenInclude;
type ActionRow = Prisma.ActionTakenGetPayload<{ include: typeof actionInclude }>;

export function serializeAction(a: ActionRow) {
    return {
        id: a.id,
        ticketId: a.ticketId,
        actionAt: a.actionAt.toISOString(),
        description: a.description,
        result: a.result,
        performedBy: a.performedBy,
        assignee: a.assignee,
        status: statusLabel[a.status],
        followUpRequired: a.followUpRequired,
        followUpNote: a.followUpNote,
        attachmentNotes: a.attachmentNotes,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        updatedBy: a.updatedBy,
    };
}

// Full snapshot stored in each revision (BR-34) so any earlier state can be reconstructed
function snapshot(a: {
    id: number; ticketId: number; actionAt: Date; description: string; result: string | null;
    assigneeId: number; status: ActionStatus; followUpRequired: boolean; followUpNote: string | null;
    attachmentNotes: string | null; performedById: number; updatedById: number | null;
}) {
    return {
        id: a.id,
        ticketId: a.ticketId,
        actionAt: a.actionAt.toISOString(),
        description: a.description,
        result: a.result,
        assigneeId: a.assigneeId,
        status: statusLabel[a.status],
        followUpRequired: a.followUpRequired,
        followUpNote: a.followUpNote,
        attachmentNotes: a.attachmentNotes,
        performedById: a.performedById,
        updatedById: a.updatedById,
    } satisfies Prisma.InputJsonObject;
}

function validationError(details: Record<string, string>): ApiError {
    return new ApiError(400, 'Validation failed', undefined, { details });
}

function assertTicketOpenForWork(status: TicketStatus) {
    if (status === 'Closed' || status === 'Cancelled') {
        throw new ApiError(409, 'This Ticket is closed or cancelled, so Actions Taken can no longer be changed', 'TICKET_TERMINAL');
    }
}

async function lockTicket(tx: Tx, ticketId: number) {
    await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${ticketId} FOR UPDATE`;
    const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    return ticket;
}

async function assertEligibleAssignee(tx: Tx, assigneeId: number, details: Record<string, string>) {
    const user = await tx.user.findUnique({ where: { id: assigneeId } });
    if (!user || !user.isActive || !ASSIGNABLE_ROLES.includes(user.role)) {
        details.assigneeId = 'Choose an active IT Staff or Administrator.';
    }
}

// ─── Input parsing ────────────────────────────────────────

function readText(body: Record<string, unknown>, key: keyof typeof LIMITS, details: Record<string, string>): string | null | undefined {
    const raw = body[key];
    if (raw === undefined) return undefined;
    if (raw === null) return null;
    if (typeof raw !== 'string') {
        details[key] = 'Must be text.';
        return undefined;
    }
    const text = raw.trim();
    if (text.length > LIMITS[key]) {
        details[key] = `Must be at most ${LIMITS[key]} characters.`;
        return undefined;
    }
    return text === '' ? null : text;
}

function readDate(body: Record<string, unknown>, key: string, details: Record<string, string>): Date | undefined {
    const raw = body[key];
    if (raw === undefined) return undefined;
    const date = typeof raw === 'string' ? new Date(raw) : null;
    if (!date || Number.isNaN(date.getTime())) {
        details[key] = 'Must be a valid date and time.';
        return undefined;
    }
    return date;
}

function readStatus(body: Record<string, unknown>, details: Record<string, string>): ActionStatus | undefined {
    if (body.status === undefined) return undefined;
    const status = typeof body.status === 'string' ? statusByLabel[body.status] : undefined;
    if (!status) {
        details.status = 'Choose a valid status.';
        return undefined;
    }
    return status;
}

function readCommon(body: Record<string, unknown>, details: Record<string, string>) {
    const description = readText(body, 'description', details);
    const result = readText(body, 'result', details);
    const followUpNote = readText(body, 'followUpNote', details);
    const attachmentNotes = readText(body, 'attachmentNotes', details);
    const actionAt = readDate(body, 'actionAt', details);
    const status = readStatus(body, details);

    let assigneeId: number | undefined;
    if (body.assigneeId !== undefined) {
        if (typeof body.assigneeId === 'number' && Number.isInteger(body.assigneeId) && body.assigneeId > 0) {
            assigneeId = body.assigneeId;
        } else {
            details.assigneeId = 'Choose an active IT Staff or Administrator.';
        }
    }

    let followUpRequired: boolean | undefined;
    if (body.followUpRequired !== undefined) {
        if (typeof body.followUpRequired === 'boolean') {
            followUpRequired = body.followUpRequired;
        } else {
            details.followUpRequired = 'Must be true or false.';
        }
    }
    return { description, result, followUpNote, attachmentNotes, actionAt, status, assigneeId, followUpRequired };
}

/** Rules shared by create and edit, applied to the final (merged) values. */
function checkMerged(
    m: { description: string | null | undefined; result: string | null | undefined; status: ActionStatus; followUpRequired: boolean; followUpNote: string | null | undefined },
    details: Record<string, string>,
) {
    if (!m.description) details.description = 'Describe what was done.';
    if ((m.status === 'Completed' || m.status === 'Cancelled') && !m.result) {
        details.result = m.status === 'Cancelled' ? 'Enter the reason for cancelling.' : 'Enter the result of this action.';
    }
    if (m.followUpRequired && !m.followUpNote) details.followUpNote = 'Follow-up note is required when follow-up is needed.';
}

function checkActionAt(actionAt: Date, status: ActionStatus, ticketCreatedAt: Date, details: Record<string, string>) {
    if (actionAt.getTime() < ticketCreatedAt.getTime()) {
        details.actionAt = 'Action time cannot be before the Ticket was created.';
    } else if (status !== 'Planned' && actionAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
        details.actionAt = 'Action time cannot be in the future.';
    }
}

// ─── Read ─────────────────────────────────────────────────

export function parsePage(pageRaw: unknown, limitRaw: unknown, defaultLimit: number, maxLimit: number) {
    const page = Math.max(1, parseInt(String(pageRaw ?? ''), 10) || 1);
    const limit = Math.min(maxLimit, Math.max(1, parseInt(String(limitRaw ?? ''), 10) || defaultLimit));
    return { page, limit };
}

/** Ticket the caller may see; Requesters only their own (others get the same 404, L3-BR-25). */
export async function findVisibleTicket(ticketId: number, user: { id: number; role: string }) {
    if (!Number.isInteger(ticketId) || ticketId <= 0) return null;
    const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return null;
    if (user.role === 'REQUESTER' && ticket.requesterId !== user.id) return null;
    return ticket;
}

export async function listActions(ticketId: number, page: number, limit: number) {
    const prisma = getPrisma();
    const [total, rows] = await Promise.all([
        prisma.actionTaken.count({ where: { ticketId } }),
        prisma.actionTaken.findMany({
            where: { ticketId },
            include: actionInclude,
            orderBy: [{ actionAt: 'desc' }, { id: 'desc' }],
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);
    return { actions: rows.map(serializeAction), total, page, limit };
}

export async function listRevisions(ticketId: number, actionId: number, page: number, limit: number) {
    const prisma = getPrisma();
    const action = await prisma.actionTaken.findFirst({ where: { id: actionId, ticketId }, select: { id: true } });
    if (!action) throw new ApiError(404, 'Action Taken not found');
    const [total, rows] = await Promise.all([
        prisma.actionTakenRevision.count({ where: { actionId } }),
        prisma.actionTakenRevision.findMany({
            where: { actionId },
            include: { actor: { select: { id: true, name: true } } },
            orderBy: { revisionNo: 'asc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);
    return {
        revisions: rows.map(r => ({
            revisionNo: r.revisionNo,
            type: r.type,
            actor: r.actor,
            createdAt: r.createdAt.toISOString(),
            changedFields: r.changedFields,
            before: r.before,
            after: r.after,
        })),
        total, page, limit,
    };
}

// ─── Create ───────────────────────────────────────────────

export async function createAction(ticketId: number, actor: { id: number }, body: Record<string, unknown>) {
    const details: Record<string, string> = {};
    const input = readCommon(body, details);

    let clientRequestId: string | undefined;
    if (body.clientRequestId !== undefined) {
        if (typeof body.clientRequestId === 'string' && UUID_PATTERN.test(body.clientRequestId)) {
            clientRequestId = body.clientRequestId;
        } else {
            details.clientRequestId = 'Must be a UUID.';
        }
    }

    const status = input.status ?? 'Completed';
    const followUpRequired = input.followUpRequired ?? false;
    const followUpNote = followUpRequired ? input.followUpNote : null;
    checkMerged({ description: input.description, result: input.result, status, followUpRequired, followUpNote }, details);

    // Digest of what the caller submitted (before defaults), so a retry of the same request matches (BR-13)
    const requestDigest = crypto.createHash('sha256').update(JSON.stringify({
        actorId: actor.id,
        actionAt: input.actionAt ? input.actionAt.toISOString() : null,
        description: input.description ?? null,
        result: input.result ?? null,
        assigneeId: input.assigneeId ?? null,
        status: body.status === undefined ? null : status,
        followUpRequired: input.followUpRequired ?? null,
        followUpNote: input.followUpNote ?? null,
        attachmentNotes: input.attachmentNotes ?? null,
    })).digest('hex');

    if (body.status === 'Cancelled') {
        throw new ApiError(400, 'An Action Taken cannot be created as Cancelled', 'INVALID_ACTION_TRANSITION');
    }

    const prisma = getPrisma();
    const outcome = await prisma.$transaction(async tx => {
        const ticket = await lockTicket(tx, ticketId);
        assertTicketOpenForWork(ticket.status);

        if (clientRequestId) {
            const existing = await tx.actionTaken.findUnique({
                where: { ticketId_clientRequestId: { ticketId, clientRequestId } },
                include: actionInclude,
            });
            if (existing) {
                if (existing.requestDigest === requestDigest) return { action: existing, replayed: true };
                throw new ApiError(409, 'This request id was already used with different content', 'IDEMPOTENCY_KEY_REUSED');
            }
        }

        // BR-41: the resolution gate stays true after the Ticket is Resolved
        if (ticket.status === 'Resolved' && (status === 'Planned' || status === 'InProgress')) {
            throw new ApiError(409, 'Reopen the Ticket before planning new work', 'TICKET_RESOLVED');
        }

        const actionAt = input.actionAt ?? new Date();
        checkActionAt(actionAt, status, ticket.createdAt, details);
        const assigneeId = input.assigneeId ?? actor.id;
        await assertEligibleAssignee(tx, assigneeId, details);
        if (Object.keys(details).length > 0) throw validationError(details);

        const now = new Date();
        const created = await tx.actionTaken.create({
            data: {
                ticketId,
                performedById: actor.id,
                assigneeId,
                status,
                actionAt,
                description: input.description!,
                result: input.result ?? null,
                followUpRequired,
                followUpNote: followUpNote ?? null,
                attachmentNotes: input.attachmentNotes ?? null,
                clientRequestId: clientRequestId ?? null,
                requestDigest: clientRequestId ? requestDigest : null,
                updatedAt: now,
            },
        });
        await tx.actionTakenRevision.create({
            data: {
                actionId: created.id,
                ticketId,
                revisionNo: 1,
                type: 'CREATED',
                actorId: actor.id,
                changedFields: [],
                after: snapshot(created),
            },
        });
        // BR-11: "recently updated" reflects real work
        await tx.ticket.update({ where: { id: ticketId }, data: { updatedAt: nextToken(ticket.updatedAt, now) } });
        const row = await tx.actionTaken.findUniqueOrThrow({ where: { id: created.id }, include: actionInclude });
        return { action: row, replayed: false };
    });

    return { action: serializeAction(outcome.action), replayed: outcome.replayed };
}

// ─── Edit / reassign / change status ──────────────────────

export async function updateAction(ticketId: number, actionId: number, actor: { id: number }, body: Record<string, unknown>) {
    const details: Record<string, string> = {};
    const input = readCommon(body, details);

    const expected = readDate(body, 'expectedUpdatedAt', details);
    if (body.expectedUpdatedAt === undefined) details.expectedUpdatedAt = 'expectedUpdatedAt is required.';

    const prisma = getPrisma();
    return prisma.$transaction(async tx => {
        const ticket = await lockTicket(tx, ticketId);
        assertTicketOpenForWork(ticket.status);

        const current = await tx.actionTaken.findFirst({ where: { id: actionId, ticketId } });
        if (!current) throw new ApiError(404, 'Action Taken not found');

        if (Object.keys(details).length > 0) throw validationError(details);
        if (expected!.getTime() !== current.updatedAt.getTime()) {
            throw new ApiError(409, 'This Action Taken was changed by someone else. Reload and try again', 'STALE_UPDATE', {
                currentUpdatedAt: current.updatedAt.toISOString(),
            });
        }

        // Merge the request over the stored values and validate the result (BR-05, BR-06, BR-30, BR-31)
        const merged = {
            description: input.description !== undefined ? input.description : current.description,
            result: input.result !== undefined ? input.result : current.result,
            status: input.status ?? current.status,
            actionAt: input.actionAt ?? current.actionAt,
            assigneeId: input.assigneeId ?? current.assigneeId,
            followUpRequired: input.followUpRequired ?? current.followUpRequired,
            followUpNote: input.followUpNote !== undefined ? input.followUpNote : current.followUpNote,
            attachmentNotes: input.attachmentNotes !== undefined ? input.attachmentNotes : current.attachmentNotes,
        };
        if (!merged.followUpRequired) merged.followUpNote = null;

        const statusChanged = merged.status !== current.status;
        if (statusChanged && !ACTION_TRANSITIONS[current.status].includes(merged.status)) {
            throw new ApiError(400, `Invalid Action Taken status change from '${statusLabel[current.status]}' to '${statusLabel[merged.status]}'`, 'INVALID_ACTION_TRANSITION');
        }

        checkMerged(merged, details);
        if (input.actionAt !== undefined || statusChanged) checkActionAt(merged.actionAt, merged.status, ticket.createdAt, details);

        // BR-29: only a change of assignee is validated; an assignee who became inactive must be
        // replaced before the action can be started or completed
        if (merged.assigneeId !== current.assigneeId) {
            await assertEligibleAssignee(tx, merged.assigneeId, details);
        } else if (statusChanged && (merged.status === 'InProgress' || merged.status === 'Completed')) {
            await assertEligibleAssignee(tx, merged.assigneeId, details);
            if (details.assigneeId) details.assigneeId = 'Reassign this action to an active IT Staff or Administrator before starting or completing it.';
        }
        if (Object.keys(details).length > 0) throw validationError(details);

        const changedFields: string[] = [];
        if (merged.description !== current.description) changedFields.push('description');
        if (merged.result !== current.result) changedFields.push('result');
        if (merged.status !== current.status) changedFields.push('status');
        if (merged.actionAt.getTime() !== current.actionAt.getTime()) changedFields.push('actionAt');
        if (merged.assigneeId !== current.assigneeId) changedFields.push('assigneeId');
        if (merged.followUpRequired !== current.followUpRequired) changedFields.push('followUpRequired');
        if (merged.followUpNote !== current.followUpNote) changedFields.push('followUpNote');
        if (merged.attachmentNotes !== current.attachmentNotes) changedFields.push('attachmentNotes');

        // A request that changes nothing is a success without a revision (HIST-03)
        if (changedFields.length === 0) {
            const same = await tx.actionTaken.findUniqueOrThrow({ where: { id: actionId }, include: actionInclude });
            return serializeAction(same);
        }

        const now = new Date();
        const token = nextToken(current.updatedAt, now);
        // Atomic compare-and-set: the write only happens if nobody changed the row since it was read
        const updated = await tx.actionTaken.updateMany({
            where: { id: actionId, ticketId, updatedAt: current.updatedAt },
            data: {
                description: merged.description!,
                result: merged.result ?? null,
                status: merged.status,
                actionAt: merged.actionAt,
                assigneeId: merged.assigneeId,
                followUpRequired: merged.followUpRequired,
                followUpNote: merged.followUpNote ?? null,
                attachmentNotes: merged.attachmentNotes ?? null,
                updatedById: actor.id,
                updatedAt: token,
            },
        });
        if (updated.count !== 1) {
            throw new ApiError(409, 'This Action Taken was changed by someone else. Reload and try again', 'STALE_UPDATE');
        }

        const after = await tx.actionTaken.findUniqueOrThrow({ where: { id: actionId }, include: actionInclude });
        const last = await tx.actionTakenRevision.aggregate({ where: { actionId }, _max: { revisionNo: true } });
        const type = statusChanged ? 'STATUS_CHANGED' : changedFields.includes('assigneeId') ? 'ASSIGNEE_CHANGED' : 'EDITED';
        await tx.actionTakenRevision.create({
            data: {
                actionId,
                ticketId,
                revisionNo: (last._max.revisionNo ?? 0) + 1,
                type,
                actorId: actor.id,
                changedFields,
                before: snapshot(current),
                after: snapshot(after),
            },
        });
        await tx.ticket.update({ where: { id: ticketId }, data: { updatedAt: nextToken(ticket.updatedAt, now) } });
        return serializeAction(after);
    });
}
