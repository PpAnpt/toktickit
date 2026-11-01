import { Prisma, PrismaClient, TicketPriority, TicketStatus } from '../../generated/prisma/client';
import { statusLabel as actionStatusLabel } from './action-rules';
import { ACTIVE_STATUSES, statusDisplay } from './ticket-status';

/**
 * Role dashboards (docs/lab-04/api-spec.md section 4, BR-22..28).
 * Every number is computed by the database; lists hold at most 5 items. The window and the
 * "recent" predicates below are also used by My Tickets (`recent=`), so a card value and its
 * drill-down list can never disagree (BR-39).
 */

type Db = PrismaClient | Prisma.TransactionClient;

const LIST_SIZE = 5;
const DESCRIPTION_LIMIT = 120;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Asia/Bangkok is UTC+7 all year (BR-23) */
const BANGKOK_OFFSET = 7 * HOUR;

const ALL_STATUSES: TicketStatus[] = [
    TicketStatus.New, TicketStatus.Open, TicketStatus.InProgress, TicketStatus.WaitingForRequester,
    TicketStatus.Resolved, TicketStatus.Closed, TicketStatus.Reopened, TicketStatus.Cancelled,
];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

/** 00:00 Asia/Bangkok six days before today (7 calendar days including today), as an instant (BR-23) */
export function windowStart(now: Date = new Date()): Date {
    const bangkokNow = now.getTime() + BANGKOK_OFFSET;
    const bangkokMidnight = Math.floor(bangkokNow / DAY) * DAY;
    return new Date(bangkokMidnight - 6 * DAY - BANGKOK_OFFSET);
}

/** The priority the staff work to: the IT Priority when set, otherwise the requested one */
export const effectivePriority = (ticket: { itPriority: TicketPriority | null; requestedPriority: TicketPriority }): TicketPriority =>
    ticket.itPriority ?? ticket.requestedPriority;

/** Tickets whose effective priority is `priority` (shared by the queue filter and the dashboard) */
export const effectivePriorityWhere = (priority: TicketPriority): Prisma.TicketWhereInput => ({
    OR: [{ itPriority: priority }, { itPriority: null, requestedPriority: priority }],
});

/** `recent=updated`: changed inside the window */
export const recentlyUpdatedWhere = (start: Date): Prisma.TicketWhereInput => ({ updatedAt: { gte: start } });

/** `recent=resolved`: Resolved or Closed with a resolution time inside the window (a later edit does not matter) */
export const recentlyResolvedWhere = (start: Date): Prisma.TicketWhereInput => ({
    status: { in: [TicketStatus.Resolved, TicketStatus.Closed] },
    resolvedAt: { gte: start },
});

/** The value of `?recent=`; `undefined` for an absent or empty one, `invalid` for anything else */
export function recentFilter(raw: unknown, now: Date = new Date()): { where?: Prisma.TicketWhereInput; invalid?: true } {
    if (raw === undefined || raw === '') return {};
    if (raw === 'updated') return { where: recentlyUpdatedWhere(windowStart(now)) };
    if (raw === 'resolved') return { where: recentlyResolvedWhere(windowStart(now)) };
    return { invalid: true };
}

const activeWhere: Prisma.TicketWhereInput = { status: { in: ACTIVE_STATUSES } };

const ticketItem = (ticket: { id: number; ticketNumber: string; summary: string; status: TicketStatus; updatedAt: Date }) => ({
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    summary: ticket.summary,
    status: statusDisplay(ticket.status),
    updatedAt: ticket.updatedAt,
});

const shorten = (text: string): string =>
    text.length <= DESCRIPTION_LIMIT ? text : `${text.slice(0, DESCRIPTION_LIMIT - 1).trimEnd()}…`;

export async function getRequesterDashboard(db: Db, requesterId: number, now: Date = new Date()) {
    const start = windowStart(now);
    const own: Prisma.TicketWhereInput = { requesterId };
    const [openTickets, waitingForRequester, recentlyUpdated, recentlyResolved, attention, recentTickets] = await Promise.all([
        db.ticket.count({ where: { AND: [own, activeWhere] } }),
        db.ticket.count({ where: { AND: [own, { status: TicketStatus.WaitingForRequester }] } }),
        db.ticket.count({ where: { AND: [own, recentlyUpdatedWhere(start)] } }),
        db.ticket.count({ where: { AND: [own, recentlyResolvedWhere(start)] } }),
        db.ticket.findMany({
            where: { AND: [own, { status: TicketStatus.WaitingForRequester }] },
            orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }],
            take: LIST_SIZE,
            select: { id: true, ticketNumber: true, summary: true, status: true, updatedAt: true },
        }),
        db.ticket.findMany({
            where: own,
            orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
            take: LIST_SIZE,
            select: { id: true, ticketNumber: true, summary: true, status: true, updatedAt: true },
        }),
    ]);

    return {
        generatedAt: now.toISOString(),
        windowStart: start.toISOString(),
        metrics: { openTickets, waitingForRequester, recentlyUpdated, recentlyResolved },
        attention: attention.map(ticketItem),
        recentTickets: recentTickets.map(ticketItem),
    };
}

export async function getStaffDashboard(db: Db, user: { id: number; role: string }, now: Date = new Date()) {
    const start = windowStart(now);
    const [unassigned, myActive, urgent, reopened, resolvedAwaitingClosure, statusGroups, priorityGroups, recentTickets, recentActions] =
        await Promise.all([
            db.ticket.count({ where: { AND: [{ ownerId: null }, activeWhere] } }),
            db.ticket.count({ where: { AND: [{ ownerId: user.id }, activeWhere] } }),
            db.ticket.count({ where: { AND: [effectivePriorityWhere('URGENT'), activeWhere] } }),
            db.ticket.count({ where: { status: TicketStatus.Reopened } }),
            db.ticket.count({ where: { status: TicketStatus.Resolved } }),
            db.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
            // At most 16 rows (priority x IT priority): merged into the effective priority below
            db.ticket.groupBy({ by: ['itPriority', 'requestedPriority'], where: activeWhere, _count: { _all: true } }),
            db.ticket.findMany({
                orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
                take: LIST_SIZE,
                select: {
                    id: true, ticketNumber: true, summary: true, status: true, itPriority: true, requestedPriority: true, updatedAt: true,
                    owner: { select: { id: true, name: true } },
                },
            }),
            db.actionTaken.findMany({
                where: { OR: [{ performedById: user.id }, { assigneeId: user.id }] },
                orderBy: [{ actionAt: 'desc' }, { id: 'desc' }],
                take: LIST_SIZE,
                select: {
                    id: true, ticketId: true, actionAt: true, description: true, status: true, followUpRequired: true,
                    ticket: { select: { ticketNumber: true } },
                    assignee: { select: { id: true, name: true } },
                },
            }),
        ]);

    const byStatus = Object.fromEntries(ALL_STATUSES.map(status => [statusDisplay(status), 0])) as Record<string, number>;
    for (const group of statusGroups) byStatus[statusDisplay(group.status)] = group._count._all;

    const byPriority = Object.fromEntries(PRIORITIES.map(priority => [priority, 0])) as Record<TicketPriority, number>;
    for (const group of priorityGroups) byPriority[effectivePriority(group)] += group._count._all;

    const response = {
        generatedAt: now.toISOString(),
        windowStart: start.toISOString(),
        metrics: { unassigned, myActive, urgent, reopened, resolvedAwaitingClosure },
        byStatus,
        byPriority,
        recentTickets: recentTickets.map(ticket => ({
            ...ticketItem(ticket),
            itPriority: effectivePriority(ticket),
            owner: ticket.owner,
        })),
        myRecentActions: recentActions.map(action => ({
            id: action.id,
            ticketId: action.ticketId,
            ticketNumber: action.ticket.ticketNumber,
            actionAt: action.actionAt,
            description: shorten(action.description),
            status: actionStatusLabel[action.status],
            assignee: action.assignee,
            followUpRequired: action.followUpRequired,
        })),
    };

    if (user.role !== 'ADMINISTRATOR') return response;

    const [requesters, itStaff, administrators, inactive] = await Promise.all([
        db.user.count({ where: { role: 'REQUESTER' } }),
        db.user.count({ where: { role: 'IT_STAFF' } }),
        db.user.count({ where: { role: 'ADMINISTRATOR' } }),
        db.user.count({ where: { isActive: false } }),
    ]);
    return { ...response, userCounts: { requesters, itStaff, administrators, inactive } };
}
