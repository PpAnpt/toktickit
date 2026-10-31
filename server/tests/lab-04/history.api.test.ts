import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { getPrisma } from '../../src/prisma';
import { ACCOUNTS, loginAs, bearer } from '../helpers';
import { actionBody, createTicket, removeCreatedTickets } from './helpers';

type Session = { token: string; user: { id: number; role: string } };

describe('Lab 4: Action Taken history is append-only (Issue #31, BR-33..BR-37)', () => {
    let david: Session;
    let sarah: Session;
    let james: Session;
    let admin: Session;

    const create = (ticketId: number, session: Session, body: Record<string, unknown> = actionBody()) =>
        request(app).post(`/api/staff/tickets/${ticketId}/actions`).set(bearer(session.token)).send(body);
    const patch = (ticketId: number, actionId: number, session: Session, body: Record<string, unknown>) =>
        request(app).patch(`/api/staff/tickets/${ticketId}/actions/${actionId}`).set(bearer(session.token)).send(body);
    const revisions = (ticketId: number, actionId: number, session: Session, query = '') =>
        request(app).get(`/api/staff/tickets/${ticketId}/actions/${actionId}/revisions${query}`).set(bearer(session.token));

    beforeAll(async () => {
        [david, sarah, james, admin] = await Promise.all([
            loginAs(ACCOUNTS.david), loginAs(ACCOUNTS.sarah), loginAs(ACCOUNTS.james), loginAs(ACCOUNTS.admin),
        ]);
    });

    afterAll(async () => {
        await removeCreatedTickets();
        await getPrisma().$disconnect();
    });

    it('HIST-01: creating an action appends revision 1 (CREATED) with a null before and a full after snapshot', async () => {
        const ticket = await createTicket();
        const made = await create(ticket.id, sarah);
        const res = await revisions(ticket.id, made.body.action.id, sarah);
        expect(res.status).toBe(200);
        expect(res.body.revisions).toHaveLength(1);
        expect(res.body.revisions[0]).toMatchObject({
            revisionNo: 1, type: 'CREATED', actor: { id: sarah.user.id }, changedFields: [], before: null,
            after: { id: made.body.action.id, description: actionBody().description, status: 'Completed', performedById: sarah.user.id, assigneeId: sarah.user.id },
        });
    });

    it('HIST-02: edits by A and B, then a status change, keep every earlier value', async () => {
        const ticket = await createTicket();
        const made = await create(ticket.id, sarah, { description: 'Check the switch', status: 'In Progress', result: 'Started' });
        const original = made.body.action.result;

        const byA = await patch(ticket.id, made.body.action.id, sarah, { result: 'Cable looks damaged', expectedUpdatedAt: made.body.action.updatedAt });
        const byB = await patch(ticket.id, made.body.action.id, james, { result: 'Cable replaced', expectedUpdatedAt: byA.body.action.updatedAt });
        const done = await patch(ticket.id, made.body.action.id, james, { status: 'Completed', expectedUpdatedAt: byB.body.action.updatedAt });
        expect([byA.status, byB.status, done.status]).toEqual([200, 200, 200]);

        const res = await revisions(ticket.id, made.body.action.id, admin);
        expect(res.body.revisions.map((r: any) => [r.revisionNo, r.type])).toEqual([
            [1, 'CREATED'], [2, 'EDITED'], [3, 'EDITED'], [4, 'STATUS_CHANGED'],
        ]);
        const [, r2, r3, r4] = res.body.revisions;
        expect(r2).toMatchObject({ actor: { id: sarah.user.id }, changedFields: ['result'], before: { result: original }, after: { result: 'Cable looks damaged' } });
        expect(r3).toMatchObject({ actor: { id: james.user.id }, changedFields: ['result'], before: { result: 'Cable looks damaged' }, after: { result: 'Cable replaced' } });
        expect(r4).toMatchObject({ actor: { id: james.user.id }, changedFields: ['status'], before: { status: 'In Progress' }, after: { status: 'Completed' } });
    });

    it('HIST-03: a PATCH that changes nothing succeeds without a revision or a new token', async () => {
        const ticket = await createTicket();
        const made = await create(ticket.id, sarah);
        const res = await patch(ticket.id, made.body.action.id, sarah, {
            description: made.body.action.description, assigneeId: sarah.user.id, expectedUpdatedAt: made.body.action.updatedAt,
        });
        expect(res.status).toBe(200);
        expect(res.body.action.updatedAt).toBe(made.body.action.updatedAt);
        expect(await getPrisma().actionTakenRevision.count({ where: { actionId: made.body.action.id } })).toBe(1);
    });

    it('HIST-06: no route can change or remove history', async () => {
        const ticket = await createTicket();
        const made = await create(ticket.id, sarah);
        const path = `/api/staff/tickets/${ticket.id}/actions/${made.body.action.id}/revisions`;
        for (const method of ['patch', 'put', 'delete', 'post'] as const) {
            const res = await request(app)[method](path).set(bearer(sarah.token)).send({});
            expect([404, 405]).toContain(res.status);
        }
        const one = `${path}/1`;
        expect([404, 405]).toContain((await request(app).delete(one).set(bearer(sarah.token))).status);
        expect(await getPrisma().actionTakenRevision.count({ where: { actionId: made.body.action.id } })).toBe(1);
    });

    it('HIST-07: the database itself rejects UPDATE and DELETE on the history table', async () => {
        const ticket = await createTicket();
        const made = await create(ticket.id, sarah);
        const prisma = getPrisma();
        await expect(prisma.$executeRaw`UPDATE "ActionTakenRevision" SET "revisionNo" = 99 WHERE "actionId" = ${made.body.action.id}`)
            .rejects.toThrow(/append-only/);
        await expect(prisma.$executeRaw`DELETE FROM "ActionTakenRevision" WHERE "actionId" = ${made.body.action.id}`)
            .rejects.toThrow(/append-only/);
        const row = await prisma.actionTakenRevision.findFirstOrThrow({ where: { actionId: made.body.action.id } });
        expect(row.revisionNo).toBe(1);
    });

    it('HIST-08: staff and admin read history; a Requester gets 403 and no data; no token gets 401', async () => {
        const ticket = await createTicket();
        const made = await create(ticket.id, sarah);
        expect((await revisions(ticket.id, made.body.action.id, sarah)).status).toBe(200);
        expect((await revisions(ticket.id, made.body.action.id, admin)).status).toBe(200);
        const denied = await revisions(ticket.id, made.body.action.id, david);
        expect(denied.status).toBe(403);
        expect(denied.body).not.toHaveProperty('revisions');
        expect((await request(app).get(`/api/staff/tickets/${ticket.id}/actions/${made.body.action.id}/revisions`)).status).toBe(401);
    });

    it('HIST-09: a stale or failing write leaves no revision behind', async () => {
        const ticket = await createTicket();
        const made = await create(ticket.id, sarah);
        const stale = await patch(ticket.id, made.body.action.id, james, { description: 'late', expectedUpdatedAt: '2000-01-01T00:00:00.000Z' });
        expect(stale.status).toBe(409);
        const invalid = await patch(ticket.id, made.body.action.id, james, { status: 'Cancelled', expectedUpdatedAt: made.body.action.updatedAt });
        expect(invalid.status).toBe(400);
        expect(await getPrisma().actionTakenRevision.count({ where: { actionId: made.body.action.id } })).toBe(1);
        const row = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: made.body.action.id } });
        expect(row.description).toBe(actionBody().description);
    });

    it('HIST-10: history lists paginate with totals, clamping and no overlap or gap', async () => {
        const ticket = await createTicket();
        const made = await create(ticket.id, sarah);
        let token = made.body.action.updatedAt;
        for (let i = 0; i < 5; i++) {
            const edit = await patch(ticket.id, made.body.action.id, sarah, { attachmentNotes: `note ${i}`, expectedUpdatedAt: token });
            expect(edit.status).toBe(200);
            token = edit.body.action.updatedAt;
        }
        const pages = await Promise.all([1, 2, 3].map(p => revisions(ticket.id, made.body.action.id, sarah, `?page=${p}&limit=2`)));
        expect(pages.map(p => p.body.revisions.length)).toEqual([2, 2, 2]);
        expect(pages[0].body.total).toBe(6);
        expect(pages.flatMap(p => p.body.revisions.map((r: any) => r.revisionNo))).toEqual([1, 2, 3, 4, 5, 6]);
        const clamped = await revisions(ticket.id, made.body.action.id, sarah, '?page=0&limit=9999');
        expect(clamped.body).toMatchObject({ page: 1, limit: 100 });
    });

    describe('Ticket events (Issue #32, BR-35, BR-36)', () => {
        const events = (ticketId: number, session: Session, query = '') =>
            request(app).get(`/api/staff/tickets/${ticketId}/events${query}`).set(bearer(session.token));
        const tokenOf = async (id: number) => (await getPrisma().ticket.findUniqueOrThrow({ where: { id } })).updatedAt.toISOString();
        const send = (ticketId: number, session: Session, path: string, body: Record<string, unknown>) =>
            request(app).patch(`/api/staff/tickets/${ticketId}/${path}`).set(bearer(session.token)).send(body);

        it('HIST-04: status, owner and priority changes and a reopen each add one event with from, to, actor and time', async () => {
            const ticket = await createTicket({ status: 'New' });
            await send(ticket.id, sarah, 'owner', { ownerId: sarah.user.id, expectedUpdatedAt: await tokenOf(ticket.id) }); // claim: owner + New -> Open
            await send(ticket.id, james, 'priority', { itPriority: 'URGENT', expectedUpdatedAt: await tokenOf(ticket.id) });
            await send(ticket.id, james, 'status', { status: 'In Progress', expectedUpdatedAt: await tokenOf(ticket.id) });
            await create(ticket.id, sarah);
            await send(ticket.id, sarah, 'status', { status: 'Resolved', expectedUpdatedAt: await tokenOf(ticket.id) });
            await send(ticket.id, admin, 'status', { status: 'Reopened', expectedUpdatedAt: await tokenOf(ticket.id) });

            const res = await events(ticket.id, sarah);
            expect(res.status).toBe(200);
            expect(res.body.total).toBe(6);
            const summary = res.body.events.map((e: { type: string; from: string | null; to: string | null; actor: { id: number } }) => [e.type, e.from, e.to, e.actor.id]);
            expect(summary).toEqual([
                ['OWNER_CHANGED', null, 'Sarah Connor', sarah.user.id],
                ['STATUS_CHANGED', 'New', 'Open', sarah.user.id],
                ['PRIORITY_CHANGED', expect.any(String), 'URGENT', james.user.id],
                ['STATUS_CHANGED', 'Open', 'In Progress', james.user.id],
                ['STATUS_CHANGED', 'In Progress', 'Resolved', sarah.user.id],
                ['STATUS_CHANGED', 'Resolved', 'Reopened', admin.user.id],
            ]);
            for (const e of res.body.events) expect(Number.isNaN(new Date(e.createdAt).getTime())).toBe(false);
        });

        it('HIST-04: only IT Staff and Administrators read events (Requester 403), a missing Ticket is 404, a Ticket without events is empty', async () => {
            const ticket = await createTicket();
            expect((await events(ticket.id, david)).status).toBe(403);
            expect((await events(999999, sarah)).status).toBe(404);
            expect((await request(app).get(`/api/staff/tickets/${ticket.id}/events`)).status).toBe(401);
            const empty = await events(ticket.id, admin);
            expect(empty.status).toBe(200);
            expect(empty.body).toMatchObject({ events: [], total: 0, page: 1, limit: 50 });
        });

        it('HIST-05: events written in the same millisecond keep a stable order (time, then id) on repeated reads', async () => {
            const ticket = await createTicket();
            const at = new Date('2026-11-01T03:00:00.000Z');
            for (const to of ['Open', 'In Progress', 'Waiting for Requester', 'Resolved']) {
                await getPrisma().ticketEvent.create({ data: { ticketId: ticket.id, type: 'STATUS_CHANGED', fromValue: null, toValue: to, actorId: sarah.user.id, createdAt: at } });
            }
            const first = await events(ticket.id, sarah);
            const second = await events(ticket.id, sarah);
            expect(first.body.events.map((e: { to: string }) => e.to)).toEqual(['Open', 'In Progress', 'Waiting for Requester', 'Resolved']);
            expect(second.body.events).toEqual(first.body.events);
            const ids = first.body.events.map((e: { id: number }) => e.id);
            expect(ids).toEqual([...ids].sort((a: number, b: number) => a - b));
        });

        it('HIST-10: the events list is paginated and clamped like the other history lists', async () => {
            const ticket = await createTicket();
            await getPrisma().ticketEvent.createMany({
                data: Array.from({ length: 120 }, (_, i) => ({ ticketId: ticket.id, type: 'PRIORITY_CHANGED' as const, toValue: 'P' + i, actorId: sarah.user.id, createdAt: new Date(Date.UTC(2026, 10, 1, 0, 0, i)) })),
            });
            const page = await events(ticket.id, sarah);
            expect(page.body).toMatchObject({ total: 120, page: 1, limit: 50 });
            expect(page.body.events).toHaveLength(50);
            const clamped = await events(ticket.id, sarah, '?limit=500&page=3');
            expect(clamped.body.limit).toBe(100);
            expect(clamped.body.events).toHaveLength(0);
            const last = await events(ticket.id, sarah, '?limit=50&page=3');
            expect(last.body.events.map((e: { to: string }) => e.to)).toEqual(Array.from({ length: 20 }, (_, i) => 'P' + (100 + i)));
        });
    });
});
