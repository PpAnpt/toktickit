import { ActionStatus } from '../../generated/prisma/client';

/**
 * Pure validation rules for Actions Taken (docs/lab-04/specification.md BR-04..BR-07, BR-29..BR-31).
 * Nothing here touches the database, so the rules can be unit tested directly (UNIT-01..03).
 */

export const LIMITS = { description: 2000, result: 1000, followUpNote: 1000, attachmentNotes: 500 } as const;
export const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const statusLabel: Record<ActionStatus, string> = {
    Planned: 'Planned',
    InProgress: 'In Progress',
    Completed: 'Completed',
    Cancelled: 'Cancelled',
};
export const statusByLabel: Record<string, ActionStatus> = {
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
export const ASSIGNABLE_ROLES = ['IT_STAFF', 'ADMINISTRATOR'];

// ─── Input parsing ────────────────────────────────────────

export function readText(body: Record<string, unknown>, key: keyof typeof LIMITS, details: Record<string, string>): string | null | undefined {
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

export function readDate(body: Record<string, unknown>, key: string, details: Record<string, string>): Date | undefined {
    const raw = body[key];
    if (raw === undefined) return undefined;
    const date = typeof raw === 'string' ? new Date(raw) : null;
    if (!date || Number.isNaN(date.getTime())) {
        details[key] = 'Must be a valid date and time.';
        return undefined;
    }
    return date;
}

export function readStatus(body: Record<string, unknown>, details: Record<string, string>): ActionStatus | undefined {
    if (body.status === undefined) return undefined;
    // Own keys only: 'constructor', '__proto__' and 'toString' must not resolve to inherited values
    const status = typeof body.status === 'string' && Object.hasOwn(statusByLabel, body.status) ? statusByLabel[body.status] : undefined;
    if (!status) {
        details.status = 'Choose a valid status.';
        return undefined;
    }
    return status;
}

export function readCommon(body: Record<string, unknown>, details: Record<string, string>) {
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
export function checkMerged(
    m: { description: string | null | undefined; result: string | null | undefined; status: ActionStatus; followUpRequired: boolean; followUpNote: string | null | undefined },
    details: Record<string, string>,
) {
    if (!m.description) details.description = 'Describe what was done.';
    if ((m.status === 'Completed' || m.status === 'Cancelled') && !m.result) {
        details.result = m.status === 'Cancelled' ? 'Enter the reason for cancelling.' : 'Enter the result of this action.';
    }
    if (m.followUpRequired && !m.followUpNote) details.followUpNote = 'Follow-up note is required when follow-up is needed.';
}

export function checkActionAt(actionAt: Date, status: ActionStatus, ticketCreatedAt: Date, details: Record<string, string>) {
    if (actionAt.getTime() < ticketCreatedAt.getTime()) {
        details.actionAt = 'Action time cannot be before the Ticket was created.';
    } else if (status !== 'Planned' && actionAt.getTime() > Date.now() + FUTURE_TOLERANCE_MS) {
        details.actionAt = 'Action time cannot be in the future.';
    }
}
