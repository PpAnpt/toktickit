import { TicketStatus } from '../../generated/prisma/client';

/**
 * Ticket status vocabulary shared by the staff queue, My Tickets and the workflow service
 * (docs/lab-04/specification.md "Ticket Status Transition Matrix (final)", BR-14, BR-15, BR-28).
 */

const STATUS_BY_LABEL: Record<string, TicketStatus> = {
    'New': TicketStatus.New,
    'Open': TicketStatus.Open,
    'In Progress': TicketStatus.InProgress,
    'InProgress': TicketStatus.InProgress,
    'Waiting for Requester': TicketStatus.WaitingForRequester,
    'WaitingForRequester': TicketStatus.WaitingForRequester,
    'Resolved': TicketStatus.Resolved,
    'Closed': TicketStatus.Closed,
    'Reopened': TicketStatus.Reopened,
    'Cancelled': TicketStatus.Cancelled,
};

const DISPLAY: Partial<Record<TicketStatus, string>> = {
    [TicketStatus.InProgress]: 'In Progress',
    [TicketStatus.WaitingForRequester]: 'Waiting for Requester',
};

/** Status shown to users, for example `In Progress` */
export const statusDisplay = (status: TicketStatus): string => DISPLAY[status] ?? status;

/** Own keys only: 'constructor', '__proto__' and 'toString' are not statuses */
export function parseStatus(value: unknown): TicketStatus | undefined {
    return typeof value === 'string' && Object.hasOwn(STATUS_BY_LABEL, value) ? STATUS_BY_LABEL[value] : undefined;
}

/** `status=Active` on the staff queue and My Tickets (BR-24, BR-28) */
export const ACTIVE_STATUSES: TicketStatus[] = [
    TicketStatus.New, TicketStatus.Open, TicketStatus.InProgress, TicketStatus.WaitingForRequester, TicketStatus.Reopened,
];

const TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
    [TicketStatus.New]: [TicketStatus.Open, TicketStatus.Cancelled],
    [TicketStatus.Open]: [TicketStatus.InProgress, TicketStatus.WaitingForRequester, TicketStatus.Resolved, TicketStatus.Cancelled],
    [TicketStatus.InProgress]: [TicketStatus.WaitingForRequester, TicketStatus.Resolved, TicketStatus.Cancelled],
    [TicketStatus.WaitingForRequester]: [TicketStatus.InProgress, TicketStatus.Resolved, TicketStatus.Cancelled],
    [TicketStatus.Resolved]: [TicketStatus.Closed, TicketStatus.Reopened],
    [TicketStatus.Reopened]: [TicketStatus.InProgress, TicketStatus.Resolved, TicketStatus.Cancelled],
    [TicketStatus.Closed]: [],
    [TicketStatus.Cancelled]: [],
};

export const isTransitionAllowed = (from: TicketStatus, to: TicketStatus): boolean => TRANSITIONS[from].includes(to);

/**
 * The status filter of a list endpoint. `All` / empty means no filter, `Active` the five active statuses,
 * anything else one status. Returns `invalid` for an unknown value so the route can answer 400.
 */
export function statusFilter(raw: unknown): { where?: TicketStatus | { in: TicketStatus[] }; invalid?: true } {
    if (raw === undefined || raw === '' || raw === 'All') return {};
    if (raw === 'Active') return { where: { in: ACTIVE_STATUSES } };
    const status = parseStatus(raw);
    return status ? { where: status } : { invalid: true };
}
