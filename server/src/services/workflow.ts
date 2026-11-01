import { Prisma, TicketPriority, TicketStatus } from '../../generated/prisma/client';
import { getPrisma } from '../prisma';
import { ASSIGNABLE_ROLES, readDate } from './action-rules';
import { ApiError, lockTicket, nextToken, snapshot, validationError } from './actions';
import { isTransitionAllowed, parseStatus, statusDisplay } from './ticket-status';

/**
 * Ticket workflow service (Lab 4, docs/lab-04/specification.md BR-14..BR-21, BR-32, BR-35;
 * docs/lab-04/api-spec.md section 3).
 *
 * Status, owner and priority changes share one shape:
 *   1. lock the Ticket row (FOR UPDATE) inside one transaction,
 *   2. validate against the locked state (transition matrix, resolution gate, eligible owner),
 *   3. change the Ticket with a single compare-and-set (`updateMany ... WHERE updatedAt = expected`),
 *   4. append the Ticket event, and for a cancellation the AUTO_CANCELLED revisions, in the same transaction.
 * A failed check throws, which rolls the whole transaction back, so no change and no history row survive.
 */

type Tx = Prisma.TransactionClient;
type Actor = { id: number };

const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const AUTO_CANCEL_RESULT = 'Cancelled because the Ticket was cancelled.';

const ticketInclude = {
    owner: { select: { id: true, name: true, email: true, role: true } },
    requester: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TicketInclude;

type TicketRow = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

function serializeTicket(ticket: TicketRow) {
    return {
        ...ticket,
        status: statusDisplay(ticket.status),
        itPriority: ticket.itPriority || ticket.requestedPriority,
    };
}

/** `expectedUpdatedAt` is required on every workflow write (BR-19) */
function readExpected(body: Record<string, unknown>, details: Record<string, string>): Date | undefined {
    const expected = readDate(body, 'expectedUpdatedAt', details);
    if (body.expectedUpdatedAt === undefined) details.expectedUpdatedAt = 'expectedUpdatedAt is required.';
    return expected;
}

function staleError(currentUpdatedAt: Date) {
    return new ApiError(409, 'This Ticket was changed by someone else. Reload and try again', 'STALE_UPDATE', {
        currentUpdatedAt: currentUpdatedAt.toISOString(),
    });
}

/**
 * Atomic compare-and-set of the Ticket (BR-20). The new token is strictly greater than the old one, so two writes
 * in the same millisecond still change it. `guard` adds columns the decision was based on, such as the status.
 */
async function updateTicket(
    tx: Tx, ticket: { id: number; updatedAt: Date; status: TicketStatus }, data: Prisma.TicketUncheckedUpdateManyInput, now: Date,
) {
    const result = await tx.ticket.updateMany({
        where: { id: ticket.id, updatedAt: ticket.updatedAt, status: ticket.status },
        data: { ...data, updatedAt: nextToken(ticket.updatedAt, now) },
    });
    if (result.count !== 1) throw staleError(ticket.updatedAt);
    return tx.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: ticketInclude });
}

async function addEvent(
    tx: Tx, ticketId: number, actor: Actor, type: 'STATUS_CHANGED' | 'OWNER_CHANGED' | 'PRIORITY_CHANGED', from: string | null, to: string | null,
) {
    await tx.ticketEvent.create({ data: { ticketId, type, fromValue: from, toValue: to, actorId: actor.id } });
}

/** BR-16: at least one Completed action and no Planned / In Progress action */
async function checkResolutionGate(tx: Tx, ticketId: number) {
    const [completed, open] = await Promise.all([
        tx.actionTaken.count({ where: { ticketId, status: 'Completed' } }),
        tx.actionTaken.count({ where: { ticketId, status: { in: ['Planned', 'InProgress'] } } }),
    ]);
    const reasons: string[] = [];
    if (completed === 0) reasons.push('NO_COMPLETED_ACTION');
    if (open > 0) reasons.push('OPEN_ACTIONS');
    if (reasons.length > 0) {
        throw new ApiError(
            400,
            'Complete or cancel all open actions, and record at least one completed action, before resolving this Ticket',
            'RESOLUTION_GATE_FAILED',
            { reasons, openActions: open },
        );
    }
}

/** BR-32: cancelling a Ticket cancels its open actions, each with an AUTO_CANCELLED revision */
async function cancelOpenActions(tx: Tx, ticketId: number, actor: Actor, now: Date) {
    const open = await tx.actionTaken.findMany({ where: { ticketId, status: { in: ['Planned', 'InProgress'] } }, orderBy: { id: 'asc' } });
    for (const action of open) {
        const updated = await tx.actionTaken.updateMany({
            where: { id: action.id, updatedAt: action.updatedAt },
            data: { status: 'Cancelled', result: AUTO_CANCEL_RESULT, updatedById: actor.id, updatedAt: nextToken(action.updatedAt, now) },
        });
        if (updated.count !== 1) throw staleError(action.updatedAt);
        const after = await tx.actionTaken.findUniqueOrThrow({ where: { id: action.id } });
        const last = await tx.actionTakenRevision.aggregate({ where: { actionId: action.id }, _max: { revisionNo: true } });
        await tx.actionTakenRevision.create({
            data: {
                actionId: action.id,
                ticketId,
                revisionNo: (last._max.revisionNo ?? 0) + 1,
                type: 'AUTO_CANCELLED',
                actorId: actor.id,
                changedFields: ['status', 'result'],
                before: snapshot(action),
                after: snapshot(after),
            },
        });
    }
}

// ─── Status ───────────────────────────────────────────────

export async function changeStatus(ticketId: number, actor: Actor, body: Record<string, unknown>) {
    const details: Record<string, string> = {};
    const target = parseStatus(body.status);
    if (body.status === undefined || body.status === null || body.status === '') details.status = 'Status is required.';
    else if (!target) details.status = 'Choose a valid status.';
    const expected = readExpected(body, details);

    return getPrisma().$transaction(async tx => {
        const ticket = await lockTicket(tx, ticketId);
        if (Object.keys(details).length > 0) throw validationError(details);
        if (expected!.getTime() !== ticket.updatedAt.getTime()) throw staleError(ticket.updatedAt);

        // Order of checks (api-spec 3.1): shape, stale token, transition matrix, resolution gate, atomic write
        if (!isTransitionAllowed(ticket.status, target!)) {
            throw new ApiError(400, `Invalid status transition from '${statusDisplay(ticket.status)}' to '${statusDisplay(target!)}'`);
        }
        if (target === 'Resolved') await checkResolutionGate(tx, ticketId);

        const now = new Date();
        const data: Prisma.TicketUncheckedUpdateManyInput = { status: target };
        if (target === 'Resolved') data.resolvedAt = now;
        if (target === 'Reopened') {
            data.resolvedAt = null;
            data.indicatedResolvedAt = null;
        }
        if (target === 'Cancelled') await cancelOpenActions(tx, ticketId, actor, now);

        const updated = await updateTicket(tx, ticket, data, now);
        await addEvent(tx, ticketId, actor, 'STATUS_CHANGED', statusDisplay(ticket.status), statusDisplay(target!));
        return serializeTicket(updated);
    });
}

// ─── Owner ────────────────────────────────────────────────

export async function changeOwner(ticketId: number, actor: Actor, body: Record<string, unknown>) {
    const details: Record<string, string> = {};
    const expected = readExpected(body, details);
    const raw = body.ownerId;
    let ownerId: number | null = null;
    if (raw !== null && raw !== undefined) {
        const n = Number(raw);
        if (typeof raw === 'boolean' || raw === '' || !Number.isInteger(n) || n <= 0) details.ownerId = 'ownerId must be a valid user id or null';
        else ownerId = n;
    }

    return getPrisma().$transaction(async tx => {
        const ticket = await lockTicket(tx, ticketId);
        if (Object.keys(details).length > 0) throw validationError(details);
        if (expected!.getTime() !== ticket.updatedAt.getTime()) throw staleError(ticket.updatedAt);

        let ownerName: string | null = null;
        if (ownerId !== null) {
            const user = await tx.user.findUnique({ where: { id: ownerId } });
            if (!user || !user.isActive || !ASSIGNABLE_ROLES.includes(user.role)) {
                throw new ApiError(400, 'Owner must be an active IT Staff or Administrator');
            }
            ownerName = user.name;
        }

        // The same owner again is a success without a change or an event
        if (ticket.ownerId === ownerId) {
            return serializeTicket(await tx.ticket.findUniqueOrThrow({ where: { id: ticketId }, include: ticketInclude }));
        }

        // BR-12 (Lab 3): claiming or assigning a New Ticket moves it to Open
        const status = ticket.status === 'New' && ownerId !== null ? TicketStatus.Open : ticket.status;
        const previous = ticket.ownerId === null ? null : (await tx.user.findUnique({ where: { id: ticket.ownerId } }))?.name ?? null;
        const updated = await updateTicket(tx, ticket, { ownerId, status }, new Date());
        await addEvent(tx, ticketId, actor, 'OWNER_CHANGED', previous, ownerName);
        if (status !== ticket.status) await addEvent(tx, ticketId, actor, 'STATUS_CHANGED', statusDisplay(ticket.status), statusDisplay(status));
        return serializeTicket(updated);
    });
}

// ─── Priority ─────────────────────────────────────────────

export async function changePriority(ticketId: number, actor: Actor, body: Record<string, unknown>) {
    const details: Record<string, string> = {};
    const expected = readExpected(body, details);
    const priority = typeof body.itPriority === 'string' && PRIORITIES.includes(body.itPriority as TicketPriority)
        ? (body.itPriority as TicketPriority)
        : undefined;

    return getPrisma().$transaction(async tx => {
        const ticket = await lockTicket(tx, ticketId);
        if (Object.keys(details).length > 0) throw validationError(details);
        if (!priority) throw new ApiError(400, 'Valid itPriority (LOW, MEDIUM, HIGH, URGENT) is required');
        if (expected!.getTime() !== ticket.updatedAt.getTime()) throw staleError(ticket.updatedAt);

        const previous = ticket.itPriority ?? ticket.requestedPriority;
        if (ticket.itPriority === priority) {
            return serializeTicket(await tx.ticket.findUniqueOrThrow({ where: { id: ticketId }, include: ticketInclude }));
        }
        const updated = await updateTicket(tx, ticket, { itPriority: priority }, new Date());
        await addEvent(tx, ticketId, actor, 'PRIORITY_CHANGED', previous, priority);
        return { ...serializeTicket(updated), itPriority: updated.itPriority };
    });
}

// ─── Requester indication ─────────────────────────────────

/**
 * The owning Requester says the problem appears resolved (BR-18). It only sets `indicatedResolvedAt`; it never changes
 * the status. It runs like every other Ticket write: the row is locked, ownership, final status and an earlier
 * indication are checked on the locked row, and the new token is computed from that row, so it cannot be written after
 * Staff resolved or closed the Ticket, and two simultaneous requests cannot both succeed.
 */
export async function indicateResolved(ticketId: number, requesterId: number) {
    return getPrisma().$transaction(async tx => {
        const ticket = await lockTicket(tx, ticketId);
        // A Ticket of another Requester looks exactly like a missing one (L3-BR non-disclosure)
        if (ticket.requesterId !== requesterId) throw new ApiError(404, 'Ticket not found');
        if (ticket.status === 'Resolved' || ticket.status === 'Closed' || ticket.status === 'Cancelled') {
            throw new ApiError(400, 'This ticket is already resolved, closed, or cancelled');
        }
        if (ticket.indicatedResolvedAt) throw new ApiError(409, 'Resolution has already been indicated for this ticket');

        const now = new Date();
        const updated = await updateTicket(tx, ticket, { indicatedResolvedAt: now }, now);
        return { indicatedResolvedAt: updated.indicatedResolvedAt };
    });
}

// ─── Ticket event history ─────────────────────────────────

export async function listEvents(ticketId: number, page: number, limit: number) {
    const prisma = getPrisma();
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { id: true } });
    if (!ticket) throw new ApiError(404, 'Ticket not found');
    const [total, rows] = await Promise.all([
        prisma.ticketEvent.count({ where: { ticketId } }),
        prisma.ticketEvent.findMany({
            where: { ticketId },
            include: { actor: { select: { id: true, name: true } } },
            orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
            skip: (page - 1) * limit,
            take: limit,
        }),
    ]);
    return {
        events: rows.map(e => ({
            id: e.id, type: e.type, from: e.fromValue, to: e.toValue, actor: e.actor, createdAt: e.createdAt.toISOString(),
        })),
        total, page, limit,
    };
}
