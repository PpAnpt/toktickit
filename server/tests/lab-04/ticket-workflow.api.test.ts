import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { getPrisma } from '../../src/prisma';
import { ActionStatus, TicketStatus } from '../../generated/prisma/client';
import { ACCOUNTS, loginAs, bearer } from '../helpers';
import { actionBody, createTicket, removeCreatedTickets, userIdByEmail } from './helpers';

type Session = { token: string; user: { id: number; role: string } };

const label: Record<TicketStatus, string> = {
    New: 'New', Open: 'Open', InProgress: 'In Progress', WaitingForRequester: 'Waiting for Requester',
    Resolved: 'Resolved', Closed: 'Closed', Reopened: 'Reopened', Cancelled: 'Cancelled',
};
const ALL = Object.keys(label) as TicketStatus[];
const PERMITTED: Record<TicketStatus, TicketStatus[]> = {
    New: ['Open', 'Cancelled'],
    Open: ['InProgress', 'WaitingForRequester', 'Resolved', 'Cancelled'],
    InProgress: ['WaitingForRequester', 'Resolved', 'Cancelled'],
    WaitingForRequester: ['InProgress', 'Resolved', 'Cancelled'],
    Resolved: ['Closed', 'Reopened'],
    Reopened: ['InProgress', 'Resolved', 'Cancelled'],
    Closed: [],
    Cancelled: [],
};

describe('Lab 4: Ticket workflow API (Issue #32)', () => {
    let david: Session;
    let sarah: Session;
    let james: Session;
    let admin: Session;
    let marcusId: number;

    const prisma = () => getPrisma();
    const tokenOf = async (id: number) => (await prisma().ticket.findUniqueOrThrow({ where: { id } })).updatedAt.toISOString();
    const setStatus = (ticketId: number, session: Session, body: Record<string, unknown>) =>
        request(app).patch(`/api/staff/tickets/${ticketId}/status`).set(bearer(session.token)).send(body);
    const setOwner = (ticketId: number, session: Session, body: Record<string, unknown>) =>
        request(app).patch(`/api/staff/tickets/${ticketId}/owner`).set(bearer(session.token)).send(body);
    const setPriority = (ticketId: number, session: Session, body: Record<string, unknown>) =>
        request(app).patch(`/api/staff/tickets/${ticketId}/priority`).set(bearer(session.token)).send(body);
    const addAction = (ticketId: number, status: ActionStatus, by: Session = sarah) =>
        prisma().actionTaken.create({
            data: {
                ticketId, performedById: by.user.id, assigneeId: by.user.id, status, actionAt: new Date(Date.now() - 60_000),
                description: `Fixture ${status} action`, result: status === 'Completed' || status === 'Cancelled' ? 'Done' : null,
            },
        });

    beforeAll(async () => {
        [david, sarah, james, admin] = await Promise.all([
            loginAs(ACCOUNTS.david), loginAs(ACCOUNTS.sarah), loginAs(ACCOUNTS.james), loginAs(ACCOUNTS.admin),
        ]);
        marcusId = await userIdByEmail('marcus.wright@example.com');
    });

    afterAll(async () => {
        await removeCreatedTickets();
        await getPrisma().$disconnect();
    });

    describe('transition matrix (AC-10)', () => {
        it('WF-01: every permitted transition succeeds for IT Staff and Administrator', async () => {
            let checked = 0;
            for (const from of ALL) {
                for (const to of PERMITTED[from]) {
                    for (const session of [sarah, admin]) {
                        const ticket = await createTicket({ status: from });
                        if (to === 'Resolved') await addAction(ticket.id, 'Completed');
                        const res = await setStatus(ticket.id, session, { status: label[to], expectedUpdatedAt: await tokenOf(ticket.id) });
                        expect(res.status, `${from} -> ${to} as ${session.user.role}: ${JSON.stringify(res.body)}`).toBe(200);
                        expect(res.body.status).toBe(label[to]);
                        expect(res.body.updatedAt).not.toBe(ticket.updatedAt.toISOString());
                        checked++;
                    }
                }
            }
            expect(checked).toBe(34);
        });

        it('WF-02: every other transition, including out of Closed and Cancelled, is a 400 and changes nothing', async () => {
            let checked = 0;
            for (const from of ALL) {
                const ticket = await createTicket({ status: from });
                await addAction(ticket.id, 'Completed');
                for (const to of ALL.filter(s => !PERMITTED[from].includes(s))) {
                    const res = await setStatus(ticket.id, sarah, { status: label[to], expectedUpdatedAt: await tokenOf(ticket.id) });
                    expect(res.status, `${from} -> ${to}`).toBe(400);
                    expect(res.body.error).toMatch(/Invalid status transition/);
                    checked++;
                }
                expect((await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).status).toBe(from);
            }
            expect(checked).toBe(47);
        });

        it('WF-02: an unknown status or an inherited property name is a 400 validation error, not a 500', async () => {
            const ticket = await createTicket({ status: 'Open' });
            for (const status of ['Done', 'constructor', '__proto__', 'toString', 42, null]) {
                const res = await setStatus(ticket.id, sarah, { status, expectedUpdatedAt: await tokenOf(ticket.id) });
                expect(res.status, String(status)).toBe(400);
            }
            expect((await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).status).toBe('Open');
        });

        it('WF-03: a Requester cannot change status, owner or priority (403)', async () => {
            const ticket = await createTicket({ status: 'Open' });
            const token = await tokenOf(ticket.id);
            for (const [path, body] of [['status', { status: 'In Progress' }], ['owner', { ownerId: sarah.user.id }], ['priority', { itPriority: 'LOW' }]] as const) {
                const res = await request(app).patch(`/api/staff/tickets/${ticket.id}/${path}`).set(bearer(david.token)).send({ ...body, expectedUpdatedAt: token });
                expect(res.status, path).toBe(403);
            }
            expect((await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).status).toBe('Open');
        });
    });

    describe('resolution gate (AC-11, AC-40)', () => {
        it('WF-04: Resolved is refused with RESOLUTION_GATE_FAILED and the reasons, and the status is unchanged', async () => {
            const noAction = await createTicket({ status: 'InProgress' });
            const none = await setStatus(noAction.id, sarah, { status: 'Resolved', expectedUpdatedAt: await tokenOf(noAction.id) });
            expect(none.status).toBe(400);
            expect(none.body.code).toBe('RESOLUTION_GATE_FAILED');
            expect(none.body.reasons).toEqual(['NO_COMPLETED_ACTION']);

            const openWork = await createTicket({ status: 'InProgress' });
            await addAction(openWork.id, 'Completed');
            await addAction(openWork.id, 'Planned');
            await addAction(openWork.id, 'InProgress');
            const open = await setStatus(openWork.id, sarah, { status: 'Resolved', expectedUpdatedAt: await tokenOf(openWork.id) });
            expect(open.status).toBe(400);
            expect(open.body.code).toBe('RESOLUTION_GATE_FAILED');
            expect(open.body.reasons).toEqual(['OPEN_ACTIONS']);

            const both = await createTicket({ status: 'Open' });
            await addAction(both.id, 'Planned');
            await addAction(both.id, 'Cancelled');
            const bothRes = await setStatus(both.id, admin, { status: 'Resolved', expectedUpdatedAt: await tokenOf(both.id) });
            expect(bothRes.body.reasons).toEqual(['NO_COMPLETED_ACTION', 'OPEN_ACTIONS']);

            for (const t of [noAction, openWork, both]) {
                const row = await prisma().ticket.findUniqueOrThrow({ where: { id: t.id } });
                expect(row.status).not.toBe('Resolved');
                expect(row.resolvedAt).toBeNull();
                expect(await prisma().ticketEvent.count({ where: { ticketId: t.id } })).toBe(0);
            }
        });

        it('WF-05: Resolved succeeds after a Completed action exists and every open action is completed or cancelled, and sets resolvedAt', async () => {
            const ticket = await createTicket({ status: 'InProgress' });
            const planned = await addAction(ticket.id, 'Planned');
            const running = await addAction(ticket.id, 'InProgress');
            await addAction(ticket.id, 'Completed');
            await prisma().actionTaken.update({ where: { id: planned.id }, data: { status: 'Cancelled', result: 'Not needed' } });
            await prisma().actionTaken.update({ where: { id: running.id }, data: { status: 'Completed', result: 'Finished' } });
            const before = Date.now();
            const res = await setStatus(ticket.id, sarah, { status: 'Resolved', expectedUpdatedAt: await tokenOf(ticket.id) });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('Resolved');
            expect(new Date(res.body.resolvedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
            const row = await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
            expect(row.resolvedAt).not.toBeNull();
        });

        it('WF-05: Closed keeps resolvedAt', async () => {
            const ticket = await createTicket({ status: 'Open' });
            await addAction(ticket.id, 'Completed');
            const resolved = await setStatus(ticket.id, sarah, { status: 'Resolved', expectedUpdatedAt: await tokenOf(ticket.id) });
            const closed = await setStatus(ticket.id, sarah, { status: 'Closed', expectedUpdatedAt: resolved.body.updatedAt });
            expect(closed.status).toBe(200);
            expect(closed.body.resolvedAt).toBe(resolved.body.resolvedAt);
        });
    });

    describe('Requester indication is advisory (AC-12)', () => {
        it('WF-06: indicating resolved sets indicatedResolvedAt and never the status', async () => {
            const ticket = await createTicket({ status: 'Open' });
            const before = await tokenOf(ticket.id);
            const res = await request(app).post(`/api/tickets/${ticket.id}/indicate-resolved`).set(bearer(david.token));
            expect(res.status).toBe(200);
            const row = await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
            expect(row.updatedAt.getTime()).toBeGreaterThan(new Date(before).getTime()); // staff holding the old token get a conflict
            expect(row.status).toBe('Open');
            expect(row.indicatedResolvedAt).not.toBeNull();
            expect(row.resolvedAt).toBeNull();
        });

        const indicate = (ticketId: number, session: Session = david) =>
            request(app).post(`/api/tickets/${ticketId}/indicate-resolved`).set(bearer(session.token));

        it('WF-06: two simultaneous indications: exactly one succeeds and the other is a 409', async () => {
            const ticket = await createTicket({ status: 'Open' });
            const results = await Promise.all([indicate(ticket.id), indicate(ticket.id), indicate(ticket.id)]);
            expect(results.map(r => r.status).sort()).toEqual([200, 409, 409]);
            expect((await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).indicatedResolvedAt).not.toBeNull();
        });

        it('WF-06: an indication that waits behind a staff change re-checks the locked Ticket and is refused when it became Resolved', async () => {
            const ticket = await createTicket({ status: 'Open' });
            let lockHeld!: () => void;
            const locked = new Promise<void>(resolve => { lockHeld = resolve; });
            let release!: () => void;
            const hold = new Promise<void>(resolve => { release = resolve; });
            // A staff transaction holds the Ticket row, as changeStatus does while it works
            const staffWrite = prisma().$transaction(async tx => {
                await tx.$queryRaw`SELECT "id" FROM "Ticket" WHERE "id" = ${ticket.id} FOR UPDATE`;
                lockHeld();
                await hold;
                await tx.ticket.update({ where: { id: ticket.id }, data: { status: 'Resolved', resolvedAt: new Date() } });
            });
            await locked;
            const pending = indicate(ticket.id).then(res => res); // sends the request now; it must wait for the lock
            await new Promise(resolve => setTimeout(resolve, 400));
            release();
            await staffWrite;
            const res = await pending;
            expect(res.status).toBe(400);
            const row = await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
            expect(row.status).toBe('Resolved');
            expect(row.indicatedResolvedAt).toBeNull();
        });

        it('WF-06: the new token is based on the locked row, so a staff write made just before is not lost', async () => {
            const ticket = await createTicket({ status: 'Open' });
            const changed = await setPriority(ticket.id, sarah, { itPriority: 'HIGH', expectedUpdatedAt: await tokenOf(ticket.id) });
            expect(changed.status).toBe(200);
            const afterStaff = await tokenOf(ticket.id);
            expect((await indicate(ticket.id)).status).toBe(200);
            expect(await tokenOf(ticket.id) > afterStaff).toBe(true);
            // another Requester gets the same 404 as a missing Ticket and writes nothing
            const other = await createTicket({ status: 'Open' });
            const jennifer = await loginAs(ACCOUNTS.jennifer);
            expect((await indicate(other.id, jennifer)).status).toBe(404);
            expect((await prisma().ticket.findUniqueOrThrow({ where: { id: other.id } })).indicatedResolvedAt).toBeNull();
        });

        it('WF-07: reopening a Resolved Ticket clears resolvedAt and indicatedResolvedAt, and the Requester may indicate again', async () => {
            const ticket = await createTicket({ status: 'Open' });
            await addAction(ticket.id, 'Completed');
            await request(app).post(`/api/tickets/${ticket.id}/indicate-resolved`).set(bearer(david.token));
            const resolved = await setStatus(ticket.id, sarah, { status: 'Resolved', expectedUpdatedAt: await tokenOf(ticket.id) });
            expect(resolved.status).toBe(200);
            expect(resolved.body.resolvedAt).not.toBeNull();
            const reopened = await setStatus(ticket.id, sarah, { status: 'Reopened', expectedUpdatedAt: resolved.body.updatedAt });
            expect(reopened.status).toBe(200);
            expect(reopened.body.resolvedAt).toBeNull();
            expect(reopened.body.indicatedResolvedAt).toBeNull();
            const again = await request(app).post(`/api/tickets/${ticket.id}/indicate-resolved`).set(bearer(david.token));
            expect(again.status).toBe(200);
        });
    });

    describe('stale updates (AC-13, BR-19, BR-20)', () => {
        it('WF-08: a stale expectedUpdatedAt on status, owner and priority is a 409 STALE_UPDATE and changes nothing', async () => {
            const ticket = await createTicket({ status: 'Open' });
            const stale = await tokenOf(ticket.id);
            const first = await setPriority(ticket.id, sarah, { itPriority: 'HIGH', expectedUpdatedAt: stale });
            expect(first.status).toBe(200);
            expect(first.body.updatedAt).not.toBe(stale);
            const current = await tokenOf(ticket.id);

            const attempts = [
                await setStatus(ticket.id, james, { status: 'In Progress', expectedUpdatedAt: stale }),
                await setOwner(ticket.id, james, { ownerId: james.user.id, expectedUpdatedAt: stale }),
                await setPriority(ticket.id, james, { itPriority: 'LOW', expectedUpdatedAt: stale }),
            ];
            for (const res of attempts) {
                expect(res.status).toBe(409);
                expect(res.body.code).toBe('STALE_UPDATE');
                expect(res.body.currentUpdatedAt).toBe(current);
            }
            const row = await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
            expect(row).toMatchObject({ status: 'Open', ownerId: null, itPriority: 'HIGH' });
            expect(row.updatedAt.toISOString()).toBe(current);
        });

        it('WF-09: two concurrent different status changes with the same token: one succeeds, the other is 409', async () => {
            const ticket = await createTicket({ status: 'Open' });
            const expectedUpdatedAt = await tokenOf(ticket.id);
            const results = await Promise.all([
                setStatus(ticket.id, sarah, { status: 'In Progress', expectedUpdatedAt }),
                setStatus(ticket.id, james, { status: 'Waiting for Requester', expectedUpdatedAt }),
            ]);
            expect(results.map(r => r.status).sort()).toEqual([200, 409]);
            const winner = results.find(r => r.status === 200)!;
            expect((await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).status).toBe(
                winner.body.status === 'In Progress' ? 'InProgress' : 'WaitingForRequester');
        });

        it('WF-12: status, owner and priority without a valid expectedUpdatedAt are a 400 naming expectedUpdatedAt', async () => {
            const ticket = await createTicket({ status: 'Open' });
            const bodies: Array<[string, Record<string, unknown>]> = [
                ['status', { status: 'In Progress' }], ['owner', { ownerId: sarah.user.id }], ['priority', { itPriority: 'HIGH' }],
            ];
            for (const [path, body] of bodies) {
                for (const token of [undefined, 'not-a-date', 12345, null, '']) {
                    const res = await request(app).patch(`/api/staff/tickets/${ticket.id}/${path}`).set(bearer(sarah.token))
                        .send(token === undefined ? body : { ...body, expectedUpdatedAt: token });
                    expect(res.status, `${path} ${String(token)}`).toBe(400);
                    expect(res.body.details).toHaveProperty('expectedUpdatedAt');
                }
            }
            const row = await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
            expect(row).toMatchObject({ status: 'Open', ownerId: null, itPriority: null });
            expect(await prisma().ticketEvent.count({ where: { ticketId: ticket.id } })).toBe(0);
        });

        it('WF-13: 10 parallel status changes with the same token: exactly one 200, nine 409, exactly one event', async () => {
            const ticket = await createTicket({ status: 'Open' });
            const expectedUpdatedAt = await tokenOf(ticket.id);
            const results = await Promise.all(Array.from({ length: 10 }, (_, i) =>
                setStatus(ticket.id, i % 2 ? sarah : james, { status: 'In Progress', expectedUpdatedAt })));
            expect(results.filter(r => r.status === 200)).toHaveLength(1);
            expect(results.filter(r => r.status === 409)).toHaveLength(9);
            expect(await prisma().ticketEvent.count({ where: { ticketId: ticket.id } })).toBe(1);
        });

        it('WF-13: 10 parallel Action Taken edits with the same token: exactly one 200, nine 409, exactly one revision added', async () => {
            const ticket = await createTicket({ status: 'Open' });
            const made = await request(app).post(`/api/staff/tickets/${ticket.id}/actions`).set(bearer(sarah.token)).send(actionBody());
            const action = made.body.action;
            const results = await Promise.all(Array.from({ length: 10 }, (_, i) =>
                request(app).patch(`/api/staff/tickets/${ticket.id}/actions/${action.id}`).set(bearer((i % 2 ? sarah : james).token))
                    .send({ description: `Edit number ${i}`, expectedUpdatedAt: action.updatedAt })));
            expect(results.filter(r => r.status === 200)).toHaveLength(1);
            expect(results.filter(r => r.status === 409)).toHaveLength(9);
            expect(await prisma().actionTakenRevision.count({ where: { actionId: action.id } })).toBe(2);
            const winner = results.find(r => r.status === 200)!;
            const row = await prisma().actionTaken.findUniqueOrThrow({ where: { id: action.id } });
            expect(row.description).toBe(winner.body.action.description);
        });

        it('WF-14: a write that fails the stale check is rolled back with no change and no history row', async () => {
            const ticket = await createTicket({ status: 'InProgress' });
            const planned = await addAction(ticket.id, 'Planned');
            const running = await addAction(ticket.id, 'InProgress');
            const stale = new Date(Date.now() - 3_600_000).toISOString();
            const cancel = await setStatus(ticket.id, sarah, { status: 'Cancelled', expectedUpdatedAt: stale });
            expect(cancel.status).toBe(409);
            const rows = await prisma().actionTaken.findMany({ where: { ticketId: ticket.id }, orderBy: { id: 'asc' } });
            expect(rows.map(r => r.status)).toEqual(['Planned', 'InProgress']);
            expect(rows.map(r => r.id)).toEqual([planned.id, running.id]);
            expect(await prisma().actionTakenRevision.count({ where: { ticketId: ticket.id } })).toBe(0);
            expect(await prisma().ticketEvent.count({ where: { ticketId: ticket.id } })).toBe(0);
            expect((await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } })).status).toBe('InProgress');
        });
    });

    describe('owner and priority rules (AC-14)', () => {
        it('WF-10: an inactive user, a Requester or an unknown user cannot be the owner', async () => {
            const ticket = await createTicket({ status: 'Open', ownerEmail: 'sarah.connor@example.com' });
            for (const ownerId of [marcusId, david.user.id, 999999, 'abc', 0, -3]) {
                const res = await setOwner(ticket.id, sarah, { ownerId, expectedUpdatedAt: await tokenOf(ticket.id) });
                expect(res.status, String(ownerId)).toBe(400);
            }
            const row = await prisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
            expect(row.ownerId).toBe(sarah.user.id);
            expect(await prisma().ticketEvent.count({ where: { ticketId: ticket.id } })).toBe(0);
        });

        it('WF-16: claiming a New Ticket still moves it to Open and records an owner and a status event', async () => {
            const ticket = await createTicket({ status: 'New' });
            const res = await setOwner(ticket.id, sarah, { ownerId: sarah.user.id, expectedUpdatedAt: await tokenOf(ticket.id) });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('Open');
            expect(res.body.owner.name).toBe('Sarah Connor');
            const events = await prisma().ticketEvent.findMany({ where: { ticketId: ticket.id }, orderBy: { id: 'asc' } });
            expect(events.map(e => e.type).sort()).toEqual(['OWNER_CHANGED', 'STATUS_CHANGED']);
        });

        it('WF-16: unassigning, reassigning and a repeated owner are handled as in Lab 3', async () => {
            const ticket = await createTicket({ status: 'Open', ownerEmail: 'sarah.connor@example.com' });
            const reassigned = await setOwner(ticket.id, sarah, { ownerId: admin.user.id, expectedUpdatedAt: await tokenOf(ticket.id) });
            expect(reassigned.body.ownerId).toBe(admin.user.id);
            const same = await setOwner(ticket.id, sarah, { ownerId: admin.user.id, expectedUpdatedAt: reassigned.body.updatedAt });
            expect(same.status).toBe(200);
            expect(await prisma().ticketEvent.count({ where: { ticketId: ticket.id, type: 'OWNER_CHANGED' } })).toBe(1);
            const cleared = await setOwner(ticket.id, sarah, { ownerId: null, expectedUpdatedAt: await tokenOf(ticket.id) });
            expect(cleared.body.ownerId).toBeNull();
            expect(await prisma().ticketEvent.count({ where: { ticketId: ticket.id, type: 'OWNER_CHANGED' } })).toBe(2);
        });

        it('WF-16: IT Priority changes keep the Requested Priority and reject invalid values', async () => {
            const ticket = await createTicket({ status: 'Open' });
            const ok = await setPriority(ticket.id, sarah, { itPriority: 'URGENT', expectedUpdatedAt: await tokenOf(ticket.id) });
            expect(ok.status).toBe(200);
            expect(ok.body.itPriority).toBe('URGENT');
            const bad = await setPriority(ticket.id, sarah, { itPriority: 'SUPER', expectedUpdatedAt: await tokenOf(ticket.id) });
            expect(bad.status).toBe(400);
            const proto = await setPriority(ticket.id, sarah, { itPriority: 'constructor', expectedUpdatedAt: await tokenOf(ticket.id) });
            expect(proto.status).toBe(400);
        });
    });

    describe('status=Active filter (AC-20, BR-28)', () => {
        it('WF-11: the staff queue and My Tickets return exactly the five active statuses; invalid values are still 400', async () => {
            const made: Record<string, number> = {};
            for (const status of ALL) made[status] = (await createTicket({ status })).id;
            const active = new Set<string>(['New', 'Open', 'InProgress', 'WaitingForRequester', 'Reopened']);

            const queue = await request(app).get('/api/staff/tickets?status=Active&limit=50&search=LAB4-').set(bearer(sarah.token));
            expect(queue.status).toBe(200);
            const queueIds = new Set<number>(queue.body.tickets.map((t: { id: number }) => t.id));
            for (const status of ALL) expect(queueIds.has(made[status]), `queue ${status}`).toBe(active.has(status));
            for (const t of queue.body.tickets) expect(['New', 'Open', 'In Progress', 'Waiting for Requester', 'Reopened']).toContain(t.status);

            const mine = await request(app).get('/api/tickets?status=Active&limit=50').set(bearer(david.token));
            expect(mine.status).toBe(200);
            const mineIds = new Set<number>(mine.body.data.map((t: { id: number }) => t.id));
            for (const status of ALL) expect(mineIds.has(made[status]), `mine ${status}`).toBe(active.has(status));

            for (const bad of ['Actives', 'constructor', '__proto__', 'toString']) {
                expect((await request(app).get(`/api/staff/tickets?status=${bad}`).set(bearer(sarah.token))).status, bad).toBe(400);
                expect((await request(app).get(`/api/tickets?status=${bad}`).set(bearer(david.token))).status, bad).toBe(400);
            }
        });
    });
});
