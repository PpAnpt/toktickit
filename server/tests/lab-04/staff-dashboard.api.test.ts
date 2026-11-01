import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { getPrisma } from '../../src/prisma';
import { ACCOUNTS, loginAs, bearer } from '../helpers';
import { assertTestDatabase, createTicket, removeCreatedTickets, userIdByEmail } from './helpers';
import { getRequesterDashboard, getStaffDashboard } from '../../src/services/dashboard';

type Session = { token: string; user: { id: number; role: string } };

const MINUTE = 60_000;
const ACTIVE_SQL = "('New','Open','In Progress','Waiting for Requester','Reopened')";
const STATUS_LABELS: Record<string, string> = {
    New: 'New', Open: 'Open', InProgress: 'In Progress', WaitingForRequester: 'Waiting for Requester',
    Resolved: 'Resolved', Closed: 'Closed', Reopened: 'Reopened', Cancelled: 'Cancelled',
};

describe('Lab 4: IT Staff dashboard API (Issue #33)', () => {
    let david: Session;
    let sarah: Session;
    let james: Session;
    let admin: Session;

    const prisma = () => getPrisma();
    const dashboard = (token?: string) => {
        const req = request(app).get('/api/dashboard/staff');
        return token ? req.set(bearer(token)) : req;
    };
    const queue = (token: string, query: string) => request(app).get(`/api/staff/tickets?${query}&limit=1`).set(bearer(token));
    const count = async (where: string, ...params: unknown[]) => {
        const rows = await prisma().$queryRawUnsafe<{ n: number }[]>(`SELECT count(*)::int AS n FROM "Ticket" WHERE ${where}`, ...params);
        return rows[0].n;
    };

    beforeAll(async () => {
        [david, sarah, james, admin] = await Promise.all([
            loginAs(ACCOUNTS.david), loginAs(ACCOUNTS.sarah), loginAs(ACCOUNTS.james), loginAs(ACCOUNTS.admin),
        ]);
        // A varied set of Tickets on top of the seed, so the independent queries have something to count
        await createTicket({ status: 'New', requestedPriority: 'URGENT', itPriority: null });
        await createTicket({ status: 'Open', requestedPriority: 'LOW', itPriority: 'URGENT', ownerEmail: ACCOUNTS.sarah.email });
        await createTicket({ status: 'InProgress', requestedPriority: 'URGENT', itPriority: 'LOW', ownerEmail: ACCOUNTS.sarah.email });
        await createTicket({ status: 'Reopened', requestedPriority: 'HIGH', itPriority: 'HIGH', ownerEmail: ACCOUNTS.james.email });
        await createTicket({ status: 'Resolved', requestedPriority: 'URGENT', itPriority: 'URGENT', ownerEmail: ACCOUNTS.sarah.email, resolvedAt: new Date() });
        await createTicket({ status: 'Closed', requestedPriority: 'URGENT', itPriority: 'URGENT', resolvedAt: new Date() });
        await createTicket({ status: 'Cancelled', requestedPriority: 'URGENT', itPriority: null });
    });

    afterAll(async () => {
        await removeCreatedTickets();
        await getPrisma().$disconnect();
    });

    it('SDASH-01: a Requester gets 403 and no data; no token gets 401', async () => {
        const res = await dashboard(david.token);
        expect(res.status).toBe(403);
        expect(res.body).toEqual({ error: 'Forbidden' });
        expect((await dashboard()).status).toBe(401);
    });

    it('SDASH-02: Unassigned, My Active, Urgent, Reopened and Resolved-awaiting-closure equal independent SQL counts', async () => {
        for (const session of [sarah, james, admin]) {
            const res = await dashboard(session.token);
            expect(res.status).toBe(200);
            expect(res.body.metrics).toEqual({
                unassigned: await count(`"ownerId" IS NULL AND "status"::text IN ${ACTIVE_SQL}`),
                myActive: await count(`"ownerId" = $1 AND "status"::text IN ${ACTIVE_SQL}`, session.user.id),
                urgent: await count(`COALESCE("itPriority","requestedPriority")::text = 'URGENT' AND "status"::text IN ${ACTIVE_SQL}`),
                reopened: await count(`"status"::text = 'Reopened'`),
                resolvedAwaitingClosure: await count(`"status"::text = 'Resolved'`),
            });
        }
        // Effective priority: IT Priority wins over the requested one, in both directions
        const res = await dashboard(sarah.token);
        expect(res.body.metrics.urgent).toBeGreaterThanOrEqual(2); // New (requested URGENT, no IT priority) and Open (IT URGENT)
    });

    it('SDASH-03: byStatus has 8 keys, byPriority has 4 keys counting Active Tickets only', async () => {
        const res = await dashboard(sarah.token);
        expect(Object.keys(res.body.byStatus).sort()).toEqual(Object.values(STATUS_LABELS).sort());
        expect(Object.keys(res.body.byPriority).sort()).toEqual(['HIGH', 'LOW', 'MEDIUM', 'URGENT']);
        // The database stores the display text ("In Progress"), so the label is the SQL value
        for (const label of Object.values(STATUS_LABELS)) {
            expect(res.body.byStatus[label]).toBe(await count(`"status"::text = $1`, label));
        }
        for (const priority of ['LOW', 'MEDIUM', 'HIGH', 'URGENT']) {
            expect(res.body.byPriority[priority]).toBe(
                await count(`COALESCE("itPriority","requestedPriority")::text = $1 AND "status"::text IN ${ACTIVE_SQL}`, priority),
            );
        }
        const activeTotal = Object.values(res.body.byPriority).reduce((sum: number, n) => sum + (n as number), 0);
        const closedOrCancelled = await count(`"status"::text IN ('Closed','Cancelled')`);
        expect(closedOrCancelled).toBeGreaterThan(0);
        expect(activeTotal).toBe(await count(`"status"::text IN ${ACTIVE_SQL}`));
    });

    it('SDASH-04: myRecentActions holds only my actions (performed or assigned), newest first, at most 5, with a short description', async () => {
        const ticket = await createTicket({ status: 'InProgress', ownerEmail: ACCOUNTS.sarah.email });
        const sarahId = sarah.user.id;
        const jamesId = james.user.id;
        const base = Date.now() + 60 * MINUTE; // newer than every seeded action
        const long = 'x'.repeat(400);
        const make = (performedById: number, assigneeId: number, minutes: number, description = `Action at +${minutes}`) =>
            prisma().actionTaken.create({
                data: { ticketId: ticket.id, performedById, assigneeId, status: 'Completed', result: 'Done', description, actionAt: new Date(base + minutes * MINUTE) },
            });
        const mine1 = await make(sarahId, sarahId, 1, long);
        const assignedToMe = await make(jamesId, sarahId, 2);
        await make(jamesId, jamesId, 3); // nobody to do with Sarah
        const mine3 = await make(sarahId, jamesId, 4);
        for (let minutes = 5; minutes <= 8; minutes++) await make(sarahId, sarahId, minutes);

        const res = await dashboard(sarah.token);
        const items = res.body.myRecentActions as { id: number; ticketId: number; ticketNumber: string; actionAt: string; description: string; status: string; assignee: { id: number; name: string }; followUpRequired: boolean }[];
        expect(items).toHaveLength(5);

        const expected = await prisma().$queryRaw<{ id: number }[]>`
            SELECT "id" FROM "ActionTaken" WHERE "performedById" = ${sarahId} OR "assigneeId" = ${sarahId}
            ORDER BY "actionAt" DESC, "id" DESC LIMIT 5`;
        expect(items.map(a => a.id)).toEqual(expected.map(a => a.id));
        expect(items.every(a => a.ticketNumber === ticket.ticketNumber && a.ticketId === ticket.id)).toBe(true);
        expect(items[0]).toMatchObject({ status: 'Completed', followUpRequired: false });
        expect(items[0].assignee).toEqual({ id: sarahId, name: 'Sarah Connor' });

        // The 3 oldest of my fixtures fall out of the top 5; a long description is shortened to 120 characters
        expect(items.map(a => a.id)).not.toContain(mine1.id);
        const all = await dashboard(sarah.token);
        expect(all.body.myRecentActions.every((a: { description: string }) => a.description.length <= 120)).toBe(true);
        const longOne = await prisma().actionTaken.update({ where: { id: mine1.id }, data: { actionAt: new Date(base + 99 * MINUTE) } });
        const afterMove = await dashboard(sarah.token);
        const shortened = afterMove.body.myRecentActions.find((a: { id: number }) => a.id === longOne.id);
        expect(shortened.description.length).toBeLessThanOrEqual(120);
        expect(shortened.description.endsWith('…')).toBe(true);

        // James sees the two he is part of, but not Sarah's own
        const jamesView = await dashboard(james.token);
        const jamesIds = jamesView.body.myRecentActions.map((a: { id: number }) => a.id);
        expect(jamesIds).toContain(mine3.id);
        expect(jamesIds).not.toContain(mine1.id);
        void assignedToMe;
    });

    it('SDASH-05: userCounts is present for the Administrator only and matches SQL', async () => {
        const adminView = await dashboard(admin.token);
        const [row] = await prisma().$queryRaw<{ r: number; s: number; a: number; i: number }[]>`
            SELECT count(*) FILTER (WHERE "role"::text = 'REQUESTER')::int AS r,
                   count(*) FILTER (WHERE "role"::text = 'IT_STAFF')::int AS s,
                   count(*) FILTER (WHERE "role"::text = 'ADMINISTRATOR')::int AS a,
                   count(*) FILTER (WHERE NOT "isActive")::int AS i FROM "User"`;
        expect(adminView.body.userCounts).toEqual({ requesters: row.r, itStaff: row.s, administrators: row.a, inactive: row.i });
        expect(row.i).toBeGreaterThan(0);

        for (const session of [sarah, james]) {
            const res = await dashboard(session.token);
            expect(res.status).toBe(200);
            expect(res.body).not.toHaveProperty('userCounts');
        }
    });

    it('SDASH-06: with no Tickets and no actions every metric is 0 and every list is empty', async () => {
        assertTestDatabase();
        class Rollback extends Error {}
        let staff: Awaited<ReturnType<typeof getStaffDashboard>> | undefined;
        let requester: Awaited<ReturnType<typeof getRequesterDashboard>> | undefined;
        await prisma().$transaction(async tx => {
            await tx.$executeRawUnsafe('TRUNCATE "Ticket" CASCADE');
            staff = await getStaffDashboard(tx, { id: sarah.user.id, role: 'IT_STAFF' });
            requester = await getRequesterDashboard(tx, david.user.id);
            throw new Rollback();
        }).catch(error => { if (!(error instanceof Rollback)) throw error; });

        expect(staff!.metrics).toEqual({ unassigned: 0, myActive: 0, urgent: 0, reopened: 0, resolvedAwaitingClosure: 0 });
        expect(Object.values(staff!.byStatus)).toEqual(new Array(8).fill(0));
        expect(Object.values(staff!.byPriority)).toEqual(new Array(4).fill(0));
        expect(staff!.recentTickets).toEqual([]);
        expect(staff!.myRecentActions).toEqual([]);
        expect(requester!.metrics).toEqual({ openTickets: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 });
        // The rollback restored everything
        expect(await prisma().ticket.count()).toBeGreaterThan(0);
    });

    it('SDASH-07: lists have at most 5 items; recentTickets are newest first with owner or null', async () => {
        const ticket = await createTicket({ status: 'Open', ownerEmail: null, updatedAt: new Date(Date.now() + 10 * MINUTE), summary: 'Newest unassigned' });
        const res = await dashboard(admin.token);
        expect(res.body.recentTickets.length).toBeLessThanOrEqual(5);
        expect(res.body.myRecentActions.length).toBeLessThanOrEqual(5);
        expect(res.body.recentTickets[0]).toMatchObject({
            id: ticket.id, ticketNumber: ticket.ticketNumber, summary: 'Newest unassigned', status: 'Open', owner: null,
        });
        expect(Object.keys(res.body.recentTickets[0]).sort()).toEqual(['id', 'itPriority', 'owner', 'status', 'summary', 'ticketNumber', 'updatedAt']);
        const times = res.body.recentTickets.map((t: { updatedAt: string }) => Date.parse(t.updatedAt));
        expect(times).toEqual([...times].sort((a, b) => b - a));
        // The card list is a summary, never the full collection
        expect(JSON.stringify(res.body)).not.toContain('Created by the Lab 4 API tests'); // descriptions are not included
    });

    it('SDASH-08: every card and breakdown row has a queue filter whose total equals the number shown', async () => {
        const sarahOwned = await userIdByEmail(ACCOUNTS.sarah.email);
        expect(sarahOwned).toBe(sarah.user.id);
        const res = await dashboard(sarah.token);
        const m = res.body.metrics;
        const total = async (query: string) => (await queue(sarah.token, query)).body.pagination.total;

        expect(await total('owner=unassigned&status=Active')).toBe(m.unassigned);
        expect(await total('owner=me&status=Active')).toBe(m.myActive);
        expect(await total('priority=URGENT&status=Active')).toBe(m.urgent);
        expect(await total('status=Reopened')).toBe(m.reopened);
        expect(await total('status=Resolved')).toBe(m.resolvedAwaitingClosure);
        for (const [label, value] of Object.entries(res.body.byStatus)) {
            expect(await total(`status=${encodeURIComponent(label)}`), label).toBe(value);
        }
        for (const [priority, value] of Object.entries(res.body.byPriority)) {
            expect(await total(`priority=${priority}&status=Active`), priority).toBe(value);
        }
    });
});
