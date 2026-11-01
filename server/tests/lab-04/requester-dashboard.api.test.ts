import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { getPrisma } from '../../src/prisma';
import { ACCOUNTS, loginAs, bearer } from '../helpers';
import { createRequester, createTicket, removeCreatedTickets } from './helpers';

type Session = { token: string; user: { id: number; role: string } };
type Requester = Awaited<ReturnType<typeof createRequester>>;

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

describe('Lab 4: Requester dashboard API (Issue #33)', () => {
    let david: Session;
    let sarah: Session;
    let james: Session;
    let admin: Session;

    const prisma = () => getPrisma();
    const dashboard = (token?: string) => {
        const req = request(app).get('/api/dashboard/requester');
        return token ? req.set(bearer(token)) : req;
    };
    const myTickets = (token: string, query: string) => request(app).get(`/api/tickets?${query}&limit=50`).set(bearer(token));
    const sessionOf = async (requester: Requester): Promise<Session> => loginAs({ email: requester.email, password: requester.password });

    /** The start of the window, computed by PostgreSQL itself so it is independent of the application code */
    const windowStartInDb = async (): Promise<Date> => {
        const rows = await prisma().$queryRaw<{ ws: Date }[]>`
            SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') - interval '6 days') AT TIME ZONE 'Asia/Bangkok' AS ws`;
        return rows[0].ws;
    };
    /** Independent counts straight from SQL (BR-23, BR-24) */
    const sqlCounts = async (requesterId: number) => {
        const [row] = await prisma().$queryRaw<{ open: number; waiting: number; updated: number; resolved: number }[]>`
            WITH w AS (SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Bangkok') - interval '6 days') AT TIME ZONE 'Asia/Bangkok' AS ws)
            SELECT
              count(*) FILTER (WHERE t."status"::text IN ('New','Open','In Progress','Waiting for Requester','Reopened'))::int AS open,
              count(*) FILTER (WHERE t."status"::text = 'Waiting for Requester')::int AS waiting,
              count(*) FILTER (WHERE t."updatedAt" >= w.ws)::int AS updated,
              count(*) FILTER (WHERE t."status"::text IN ('Resolved','Closed') AND t."resolvedAt" >= w.ws)::int AS resolved
            FROM "Ticket" t, w WHERE t."requesterId" = ${requesterId}`;
        return { openTickets: row.open, waitingForRequester: row.waiting, recentlyUpdated: row.updated, recentlyResolved: row.resolved };
    };

    beforeAll(async () => {
        [david, sarah, james, admin] = await Promise.all([
            loginAs(ACCOUNTS.david), loginAs(ACCOUNTS.sarah), loginAs(ACCOUNTS.james), loginAs(ACCOUNTS.admin),
        ]);
    });

    afterAll(async () => {
        await removeCreatedTickets();
        await getPrisma().$disconnect();
    });

    it('DASH-01: IT Staff and Administrator get 403 and no data', async () => {
        for (const session of [sarah, james, admin]) {
            const res = await dashboard(session.token);
            expect(res.status).toBe(403);
            expect(res.body).toEqual({ error: 'Forbidden' });
        }
    });

    it('DASH-02: no token and a revoked token get 401', async () => {
        expect((await dashboard()).status).toBe(401);
        expect((await dashboard('not-a-token')).status).toBe(401);

        const requester = await createRequester();
        const session = await sessionOf(requester);
        expect((await dashboard(session.token)).status).toBe(200);
        await request(app).post('/api/auth/logout').set(bearer(session.token));
        expect((await dashboard(session.token)).status).toBe(401);
    });

    it('DASH-03: Open, Waiting for You, Recently Updated and Recently Resolved equal independent SQL counts', async () => {
        const requester = await createRequester();
        const ws = await windowStartInDb();
        const now = new Date();
        await createTicket({ requesterEmail: requester.email, status: 'New', updatedAt: now });
        await createTicket({ requesterEmail: requester.email, status: 'InProgress', updatedAt: new Date(ws.getTime() - DAY) });
        await createTicket({ requesterEmail: requester.email, status: 'WaitingForRequester', updatedAt: now });
        await createTicket({ requesterEmail: requester.email, status: 'Reopened', updatedAt: new Date(ws.getTime() - 3 * DAY) });
        await createTicket({ requesterEmail: requester.email, status: 'Resolved', updatedAt: now, resolvedAt: now });
        await createTicket({ requesterEmail: requester.email, status: 'Cancelled', updatedAt: new Date(ws.getTime() - 2 * DAY) });

        const res = await dashboard((await sessionOf(requester)).token);
        expect(res.status).toBe(200);
        expect(res.body.metrics).toEqual(await sqlCounts(requester.id));
        expect(res.body.metrics).toEqual({ openTickets: 4, waitingForRequester: 1, recentlyUpdated: 3, recentlyResolved: 1 });
        expect(res.body.windowStart).toBe(ws.toISOString());
        expect(typeof res.body.generatedAt).toBe('string');

        // The seeded Requester (David) is also compared with SQL, whatever other tests created
        const seeded = await dashboard(david.token);
        expect(seeded.body.metrics).toEqual(await sqlCounts(david.user.id));
    });

    it('DASH-04: each Requester only sees their own Tickets and metrics', async () => {
        const first = await createRequester('First Requester');
        const second = await createRequester('Second Requester');
        const mine = await createTicket({ requesterEmail: first.email, status: 'Open', summary: 'First requester only' });
        const theirs = await createTicket({ requesterEmail: second.email, status: 'WaitingForRequester', summary: 'Second requester only' });

        const a = await dashboard((await sessionOf(first)).token);
        const b = await dashboard((await sessionOf(second)).token);
        expect(a.body.metrics).toMatchObject({ openTickets: 1, waitingForRequester: 0 });
        expect(b.body.metrics).toMatchObject({ openTickets: 1, waitingForRequester: 1 });
        expect(a.body.recentTickets.map((t: { id: number }) => t.id)).toEqual([mine.id]);
        expect(a.body.attention).toEqual([]);
        expect(b.body.attention.map((t: { id: number }) => t.id)).toEqual([theirs.id]);
        expect(JSON.stringify(a.body)).not.toContain('Second requester only');
        expect(JSON.stringify(b.body)).not.toContain('First requester only');
        // The seeded Requester does not see either of them
        const seeded = await dashboard(david.token);
        const seededIds = [...seeded.body.recentTickets, ...seeded.body.attention].map((t: { id: number }) => t.id);
        expect(seededIds).not.toContain(mine.id);
        expect(seededIds).not.toContain(theirs.id);
    });

    it('DASH-05: a Requester with no Tickets sees zeros and empty lists', async () => {
        const res = await dashboard((await sessionOf(await createRequester())).token);
        expect(res.status).toBe(200);
        expect(res.body.metrics).toEqual({ openTickets: 0, waitingForRequester: 0, recentlyUpdated: 0, recentlyResolved: 0 });
        expect(res.body.attention).toEqual([]);
        expect(res.body.recentTickets).toEqual([]);
    });

    it('DASH-06: a Ticket exactly at the window start counts, one millisecond earlier does not', async () => {
        const requester = await createRequester();
        const ws = await windowStartInDb();
        await createTicket({ requesterEmail: requester.email, status: 'Open', updatedAt: ws });
        await createTicket({ requesterEmail: requester.email, status: 'Open', updatedAt: new Date(ws.getTime() - 1) });
        await createTicket({ requesterEmail: requester.email, status: 'Resolved', updatedAt: new Date(ws.getTime() - DAY), resolvedAt: ws });
        await createTicket({ requesterEmail: requester.email, status: 'Resolved', updatedAt: new Date(), resolvedAt: new Date(ws.getTime() - 1) });

        const res = await dashboard((await sessionOf(requester)).token);
        expect(res.body.metrics.recentlyUpdated).toBe(2); // the Open ticket at ws and the Resolved one updated now
        expect(res.body.metrics.recentlyResolved).toBe(1);
        expect(res.body.metrics).toEqual(await sqlCounts(requester.id));
        expect(res.body.windowStart).toBe(ws.toISOString());
    });

    it('DASH-07: lists have at most 5 items and the metrics still count everything', async () => {
        const requester = await createRequester();
        const base = Date.now() - 10 * MINUTE;
        for (let i = 0; i < 7; i++) {
            await createTicket({ requesterEmail: requester.email, status: 'WaitingForRequester', updatedAt: new Date(base + i * MINUTE) });
        }
        const res = await dashboard((await sessionOf(requester)).token);
        expect(res.body.metrics.waitingForRequester).toBe(7);
        expect(res.body.metrics.openTickets).toBe(7);
        expect(res.body.attention).toHaveLength(5);
        expect(res.body.recentTickets).toHaveLength(5);
        // attention: oldest first; recent: newest first
        const attention = res.body.attention.map((t: { updatedAt: string }) => Date.parse(t.updatedAt));
        const recent = res.body.recentTickets.map((t: { updatedAt: string }) => Date.parse(t.updatedAt));
        expect(attention).toEqual([...attention].sort((x, y) => x - y));
        expect(recent).toEqual([...recent].sort((x, y) => y - x));
        // Items carry only what the dashboard shows
        expect(Object.keys(res.body.recentTickets[0]).sort()).toEqual(['id', 'status', 'summary', 'ticketNumber', 'updatedAt']);
        expect(res.body.recentTickets[0].status).toBe('Waiting for Requester');
    });

    it('DASH-08: Recently Resolved uses resolvedAt, so later edits do not move a Ticket in or out', async () => {
        const requester = await createRequester();
        const ws = await windowStartInDb();
        // Resolved long ago but edited just now: still not "recently resolved"
        await createTicket({ requesterEmail: requester.email, status: 'Closed', updatedAt: new Date(), resolvedAt: new Date(ws.getTime() - 5 * DAY) });
        // Resolved inside the window, last touched before it: still "recently resolved"
        await createTicket({ requesterEmail: requester.email, status: 'Resolved', updatedAt: new Date(ws.getTime() - 5 * DAY), resolvedAt: new Date(ws.getTime() + DAY) });

        const res = await dashboard((await sessionOf(requester)).token);
        expect(res.body.metrics.recentlyResolved).toBe(1);
        expect(res.body.metrics).toEqual(await sqlCounts(requester.id));
    });

    it('DASH-09: GET /api/tickets?recent=updated lists exactly the Tickets counted by the card', async () => {
        const requester = await createRequester();
        const ws = await windowStartInDb();
        const inside = [
            await createTicket({ requesterEmail: requester.email, status: 'Open', updatedAt: new Date() }),
            await createTicket({ requesterEmail: requester.email, status: 'Cancelled', updatedAt: ws }),
        ];
        await createTicket({ requesterEmail: requester.email, status: 'Open', updatedAt: new Date(ws.getTime() - 1) });
        const session = await sessionOf(requester);

        const card = (await dashboard(session.token)).body.metrics.recentlyUpdated;
        const list = await myTickets(session.token, 'recent=updated');
        expect(list.status).toBe(200);
        expect(list.body.meta.totalItems).toBe(card);
        expect(list.body.data.map((t: { id: number }) => t.id).sort()).toEqual(inside.map(t => t.id).sort());
    });

    it('DASH-10: recent=resolved lists a Ticket resolved then closed in the window and skips old and reopened ones', async () => {
        const requester = await createRequester();
        const ws = await windowStartInDb();
        const resolvedInWindow = await createTicket({ requesterEmail: requester.email, status: 'Resolved', resolvedAt: new Date(ws.getTime() + DAY) });
        const closedInWindow = await createTicket({ requesterEmail: requester.email, status: 'Closed', resolvedAt: new Date(ws.getTime() + 2 * DAY) });
        const resolvedBefore = await createTicket({ requesterEmail: requester.email, status: 'Resolved', resolvedAt: new Date(ws.getTime() - 1) });
        const reopened = await createTicket({ requesterEmail: requester.email, status: 'Reopened', resolvedAt: null });
        const session = await sessionOf(requester);

        const card = (await dashboard(session.token)).body.metrics.recentlyResolved;
        const list = await myTickets(session.token, 'recent=resolved');
        expect(card).toBe(2);
        expect(list.body.meta.totalItems).toBe(card);
        const ids = list.body.data.map((t: { id: number }) => t.id);
        expect(ids.sort()).toEqual([resolvedInWindow.id, closedInWindow.id].sort());
        expect(ids).not.toContain(resolvedBefore.id);
        expect(ids).not.toContain(reopened.id);
    });
});
