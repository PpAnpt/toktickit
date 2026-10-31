import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { randomUUID } from 'crypto';
import app from '../../src/index';
import { getPrisma } from '../../src/prisma';
import { ACCOUNTS, loginAs, bearer } from '../helpers';
import { actionBody, createTicket, removeCreatedTickets, userIdByEmail } from './helpers';

type Session = { token: string; user: { id: number; role: string } };

describe('Lab 4: Actions Taken API (Issue #31)', () => {
    let david: Session;      // Requester, owns the fixtures
    let jennifer: Session;   // another Requester
    let sarah: Session;      // IT Staff
    let james: Session;      // IT Staff
    let admin: Session;
    let marcusId: number;    // inactive IT Staff
    let jenniferId: number;

    const create = (ticketId: number, session: Session, body: Record<string, unknown> = actionBody()) =>
        request(app).post(`/api/staff/tickets/${ticketId}/actions`).set(bearer(session.token)).send(body);
    const patch = (ticketId: number, actionId: number, session: Session, body: Record<string, unknown>) =>
        request(app).patch(`/api/staff/tickets/${ticketId}/actions/${actionId}`).set(bearer(session.token)).send(body);
    const list = (ticketId: number, session: Session, query = '') =>
        request(app).get(`/api/tickets/${ticketId}/actions${query}`).set(bearer(session.token));

    beforeAll(async () => {
        [david, jennifer, sarah, james, admin] = await Promise.all([
            loginAs(ACCOUNTS.david), loginAs(ACCOUNTS.jennifer), loginAs(ACCOUNTS.sarah), loginAs(ACCOUNTS.james), loginAs(ACCOUNTS.admin),
        ]);
        marcusId = await userIdByEmail('marcus.wright@example.com');
        jenniferId = jennifer.user.id;
    });

    afterAll(async () => {
        await removeCreatedTickets();
        await getPrisma().$disconnect();
    });

    describe('listing (AC-09, AUTHZ-01, AUTHZ-03, AUTHZ-04)', () => {
        it('API-01: a Ticket without actions returns an empty list', async () => {
            const ticket = await createTicket();
            const res = await list(ticket.id, sarah);
            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ actions: [], total: 0, page: 1, limit: 20 });
        });

        it('API-02: ordered by actionAt desc then id desc, repeatably', async () => {
            const ticket = await createTicket({ createdAt: new Date(Date.now() - 86_400_000) });
            const same = new Date(Date.now() - 3_600_000).toISOString();
            const older = new Date(Date.now() - 7_200_000).toISOString();
            const a = await create(ticket.id, sarah, actionBody({ actionAt: same, description: 'first at same time' }));
            const b = await create(ticket.id, sarah, actionBody({ actionAt: same, description: 'second at same time' }));
            const c = await create(ticket.id, sarah, actionBody({ actionAt: older, description: 'older' }));
            const ids = [b.body.action.id, a.body.action.id, c.body.action.id];
            const first = await list(ticket.id, sarah);
            const second = await list(ticket.id, sarah);
            expect(first.body.actions.map((x: any) => x.id)).toEqual(ids);
            expect(second.body.actions.map((x: any) => x.id)).toEqual(ids);
        });

        it('AUTHZ-01: the owning Requester sees every field read-only', async () => {
            const ticket = await createTicket();
            await create(ticket.id, sarah, actionBody({ followUpRequired: true, followUpNote: 'Check on Friday', attachmentNotes: 'Photo in Tickets/7' }));
            const res = await list(ticket.id, david);
            expect(res.status).toBe(200);
            expect(res.body.actions[0]).toMatchObject({
                description: expect.any(String), result: expect.any(String), status: 'Completed',
                followUpRequired: true, followUpNote: 'Check on Friday', attachmentNotes: 'Photo in Tickets/7',
                performedBy: { id: sarah.user.id }, assignee: { id: sarah.user.id },
            });
        });

        it('AUTHZ-03: another Requester gets the same 404 as a missing Ticket', async () => {
            const ticket = await createTicket();
            const other = await list(ticket.id, jennifer);
            const missing = await list(999_999_999, jennifer);
            expect(other.status).toBe(404);
            expect(other.body).toEqual(missing.body);
        });

        it('AUTHZ-04: no token returns 401 on every action endpoint', async () => {
            const ticket = await createTicket();
            expect((await request(app).get(`/api/tickets/${ticket.id}/actions`)).status).toBe(401);
            expect((await request(app).post(`/api/staff/tickets/${ticket.id}/actions`).send(actionBody())).status).toBe(401);
            expect((await request(app).patch(`/api/staff/tickets/${ticket.id}/actions/1`).send({})).status).toBe(401);
            expect((await request(app).get(`/api/staff/tickets/${ticket.id}/actions/1/revisions`)).status).toBe(401);
        });

        it('API-24: pagination slices, totals, clamping and stable order', async () => {
            const ticket = await createTicket({ createdAt: new Date(Date.now() - 86_400_000) });
            for (let i = 0; i < 7; i++) {
                await create(ticket.id, sarah, actionBody({ actionAt: new Date(Date.now() - 600_000 + i * 1000).toISOString(), description: `action ${i}` }));
            }
            const p1 = await list(ticket.id, sarah, '?page=1&limit=3');
            const p2 = await list(ticket.id, sarah, '?page=2&limit=3');
            const p3 = await list(ticket.id, sarah, '?page=3&limit=3');
            expect([p1.body.actions.length, p2.body.actions.length, p3.body.actions.length]).toEqual([3, 3, 1]);
            expect(p1.body.total).toBe(7);
            const all = [...p1.body.actions, ...p2.body.actions, ...p3.body.actions].map((x: any) => x.id);
            expect(new Set(all).size).toBe(7);
            const clamped = await list(ticket.id, sarah, '?page=0&limit=500');
            expect(clamped.body).toMatchObject({ page: 1, limit: 50 });
        });
    });

    describe('create (AC-01, AC-04, AC-05, AC-07)', () => {
        it('API-03: saves under the right Ticket with the authenticated performer', async () => {
            const ticket = await createTicket();
            const res = await create(ticket.id, sarah);
            expect(res.status).toBe(201);
            expect(res.body.action).toMatchObject({
                ticketId: ticket.id, status: 'Completed', performedBy: { id: sarah.user.id }, assignee: { id: sarah.user.id }, updatedBy: null,
            });
            const row = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: res.body.action.id } });
            expect(row.ticketId).toBe(ticket.id);
        });

        it('API-04: a client-sent performedById is ignored', async () => {
            const ticket = await createTicket();
            const res = await create(ticket.id, sarah, actionBody({ performedById: james.user.id, createdAt: '2001-01-01T00:00:00Z' }));
            expect(res.status).toBe(201);
            expect(res.body.action.performedBy.id).toBe(sarah.user.id);
            expect(new Date(res.body.action.createdAt).getFullYear()).toBeGreaterThan(2020);
        });

        it('API-05 / AC-05: a non-owner staff member can record an action and the owner is unchanged', async () => {
            const ticket = await createTicket({ ownerEmail: 'sarah.connor@example.com' });
            const res = await create(ticket.id, james);
            expect(res.status).toBe(201);
            expect(res.body.action.performedBy.id).toBe(james.user.id);
            const after = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
            expect(after.ownerId).toBe(sarah.user.id);
        });

        it('API-06: missing description, missing result on Completed, and over-length text name each field', async () => {
            const ticket = await createTicket();
            const res = await create(ticket.id, sarah, { description: '   ', status: 'Completed', attachmentNotes: 'x'.repeat(501) });
            expect(res.status).toBe(400);
            expect(Object.keys(res.body.details).sort()).toEqual(['attachmentNotes', 'description', 'result']);
            expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
        });

        it('API-07: follow-up required without a note names followUpNote; the note is dropped when not required', async () => {
            const ticket = await createTicket();
            const bad = await create(ticket.id, sarah, actionBody({ followUpRequired: true }));
            expect(bad.status).toBe(400);
            expect(bad.body.details).toHaveProperty('followUpNote');
            const ok = await create(ticket.id, sarah, actionBody({ followUpRequired: false, followUpNote: 'ignored' }));
            expect(ok.status).toBe(201);
            expect(ok.body.action.followUpNote).toBeNull();
        });

        it('API-08: actionAt before the Ticket existed or in the future is rejected; a future Planned action is accepted', async () => {
            const ticket = await createTicket();
            const past = await create(ticket.id, sarah, actionBody({ actionAt: new Date(Date.now() - 10 * 86_400_000).toISOString() }));
            expect(past.status).toBe(400);
            expect(past.body.details).toHaveProperty('actionAt');
            const future = new Date(Date.now() + 3_600_000).toISOString();
            const bad = await create(ticket.id, sarah, actionBody({ actionAt: future }));
            expect(bad.status).toBe(400);
            const planned = await create(ticket.id, sarah, { description: 'Visit on site', status: 'Planned', actionAt: future });
            expect(planned.status).toBe(201);
            expect(planned.body.action.status).toBe('Planned');
        });

        it('API-13 / AC-07: create on a Closed or Cancelled Ticket is 409 TICKET_TERMINAL', async () => {
            for (const status of ['Closed', 'Cancelled'] as const) {
                const ticket = await createTicket({ status });
                const res = await create(ticket.id, sarah);
                expect(res.status).toBe(409);
                expect(res.body.code).toBe('TICKET_TERMINAL');
            }
        });

        it('API-16: creating an action refreshes the Ticket updatedAt', async () => {
            const ticket = await createTicket();
            await create(ticket.id, sarah);
            const after = await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticket.id } });
            expect(after.updatedAt.getTime()).toBeGreaterThan(ticket.updatedAt.getTime());
        });

        it('API-17: the assignee defaults to the creator and is stored apart from the performer', async () => {
            const ticket = await createTicket();
            const dflt = await create(ticket.id, sarah);
            expect(dflt.body.action.assignee.id).toBe(sarah.user.id);
            const other = await create(ticket.id, sarah, actionBody({ assigneeId: james.user.id }));
            expect(other.body.action.performedBy.id).toBe(sarah.user.id);
            expect(other.body.action.assignee.id).toBe(james.user.id);
        });

        it('API-18: an inactive user, a Requester, or an unknown id is rejected as assignee', async () => {
            const ticket = await createTicket();
            for (const assigneeId of [marcusId, jenniferId, 999_999_999]) {
                const res = await create(ticket.id, sarah, actionBody({ assigneeId }));
                expect(res.status).toBe(400);
                expect(res.body.details).toHaveProperty('assigneeId');
            }
            expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
        });

        it('API-21: an action cannot be created as Cancelled', async () => {
            const ticket = await createTicket();
            const res = await create(ticket.id, sarah, actionBody({ status: 'Cancelled' }));
            expect(res.status).toBe(400);
            expect(res.body.code).toBe('INVALID_ACTION_TRANSITION');
        });

        it('API-25 / AC-40: no Planned or In Progress work on a Resolved Ticket; Completed is fine; reopening allows Planned', async () => {
            const ticket = await createTicket({ status: 'Resolved' });
            for (const status of ['Planned', 'In Progress']) {
                const res = await create(ticket.id, sarah, { description: 'More work', status });
                expect(res.status).toBe(409);
                expect(res.body.code).toBe('TICKET_RESOLVED');
            }
            expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(0);
            expect((await create(ticket.id, sarah)).status).toBe(201);
            await getPrisma().ticket.update({ where: { id: ticket.id }, data: { status: 'Reopened' } });
            expect((await create(ticket.id, sarah, { description: 'Plan again', status: 'Planned' })).status).toBe(201);
        });
    });

    describe('authorization (AC-03, AUTHZ-02, AUTHZ-05)', () => {
        it('AUTHZ-02: a Requester cannot create or edit; nothing is saved', async () => {
            const ticket = await createTicket();
            const made = await create(ticket.id, sarah);
            expect((await create(ticket.id, david)).status).toBe(403);
            const res = await patch(ticket.id, made.body.action.id, david, { description: 'hacked', expectedUpdatedAt: made.body.action.updatedAt });
            expect(res.status).toBe(403);
            expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);
        });

        it('AUTHZ-05: an Administrator can create and edit', async () => {
            const ticket = await createTicket();
            const made = await create(ticket.id, admin);
            expect(made.status).toBe(201);
            const edited = await patch(ticket.id, made.body.action.id, admin, { description: 'Edited by admin', expectedUpdatedAt: made.body.action.updatedAt });
            expect(edited.status).toBe(200);
            expect(edited.body.action.description).toBe('Edited by admin');
        });
    });

    describe('edit and conflicts (AC-06, AC-07, AC-31, AC-32)', () => {
        it('API-09: edit with the current token keeps performer and createdAt and records the editor', async () => {
            const ticket = await createTicket();
            const made = await create(ticket.id, sarah);
            const res = await patch(ticket.id, made.body.action.id, james, { result: 'Updated result', expectedUpdatedAt: made.body.action.updatedAt });
            expect(res.status).toBe(200);
            expect(res.body.action).toMatchObject({
                result: 'Updated result', performedBy: { id: sarah.user.id }, createdAt: made.body.action.createdAt, updatedBy: { id: james.user.id },
            });
            expect(new Date(res.body.action.updatedAt).getTime()).toBeGreaterThan(new Date(made.body.action.updatedAt).getTime());
        });

        it('API-10: a stale token is 409 STALE_UPDATE and changes nothing', async () => {
            const ticket = await createTicket();
            const made = await create(ticket.id, sarah);
            const first = await patch(ticket.id, made.body.action.id, sarah, { description: 'first', expectedUpdatedAt: made.body.action.updatedAt });
            expect(first.status).toBe(200);
            const stale = await patch(ticket.id, made.body.action.id, james, { description: 'second', expectedUpdatedAt: made.body.action.updatedAt });
            expect(stale.status).toBe(409);
            expect(stale.body.code).toBe('STALE_UPDATE');
            expect(stale.body.currentUpdatedAt).toBe(first.body.action.updatedAt);
            const row = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: made.body.action.id } });
            expect(row.description).toBe('first');
        });

        it('API-11: an edit without expectedUpdatedAt is 400', async () => {
            const ticket = await createTicket();
            const made = await create(ticket.id, sarah);
            const res = await patch(ticket.id, made.body.action.id, sarah, { description: 'no token' });
            expect(res.status).toBe(400);
            expect(res.body.details).toHaveProperty('expectedUpdatedAt');
        });

        it('API-12: there is no way to delete an action', async () => {
            const ticket = await createTicket();
            const made = await create(ticket.id, sarah);
            const res = await request(app).delete(`/api/staff/tickets/${ticket.id}/actions/${made.body.action.id}`).set(bearer(sarah.token));
            expect(res.status).toBe(404);
            expect(await getPrisma().actionTaken.count({ where: { id: made.body.action.id } })).toBe(1);
        });

        it('API-13: edit on a Closed Ticket is 409 TICKET_TERMINAL', async () => {
            const ticket = await createTicket();
            const made = await create(ticket.id, sarah);
            await getPrisma().ticket.update({ where: { id: ticket.id }, data: { status: 'Closed' } });
            const res = await patch(ticket.id, made.body.action.id, sarah, { description: 'late', expectedUpdatedAt: made.body.action.updatedAt });
            expect(res.status).toBe(409);
            expect(res.body.code).toBe('TICKET_TERMINAL');
        });

        it('API-19: an assignee who became inactive does not block unrelated edits but blocks start/complete until reassigned', async () => {
            const ticket = await createTicket();
            const made = await create(ticket.id, sarah, { description: 'Check the switch', status: 'Planned', assigneeId: james.user.id });
            await getPrisma().user.update({ where: { id: james.user.id }, data: { isActive: false } });
            try {
                const edit = await patch(ticket.id, made.body.action.id, sarah, { attachmentNotes: 'Look at the label', expectedUpdatedAt: made.body.action.updatedAt });
                expect(edit.status).toBe(200);
                const start = await patch(ticket.id, made.body.action.id, sarah, { status: 'In Progress', expectedUpdatedAt: edit.body.action.updatedAt });
                expect(start.status).toBe(400);
                expect(start.body.details).toHaveProperty('assigneeId');
                const reassigned = await patch(ticket.id, made.body.action.id, sarah, { status: 'In Progress', assigneeId: sarah.user.id, expectedUpdatedAt: edit.body.action.updatedAt });
                expect(reassigned.status).toBe(200);
                expect(reassigned.body.action).toMatchObject({ status: 'In Progress', assignee: { id: sarah.user.id } });
            } finally {
                await getPrisma().user.update({ where: { id: james.user.id }, data: { isActive: true } });
            }
        });

        it('API-20 / API-21 / API-22: action transitions follow BR-30 and need a Result to complete or cancel', async () => {
            const ticket = await createTicket();
            const planned = await create(ticket.id, sarah, { description: 'Visit', status: 'Planned', actionAt: new Date(Date.now() + 600_000).toISOString() });
            let token = planned.body.action.updatedAt;

            const noResult = await patch(ticket.id, planned.body.action.id, sarah, { status: 'Completed', expectedUpdatedAt: token });
            expect(noResult.status).toBe(400);
            expect(noResult.body.details).toHaveProperty('result');

            const noReason = await patch(ticket.id, planned.body.action.id, sarah, { status: 'Cancelled', expectedUpdatedAt: token });
            expect(noReason.status).toBe(400);

            const started = await patch(ticket.id, planned.body.action.id, sarah, { status: 'In Progress', actionAt: new Date().toISOString(), expectedUpdatedAt: token });
            expect(started.status).toBe(200);
            token = started.body.action.updatedAt;

            const done = await patch(ticket.id, planned.body.action.id, sarah, { status: 'Completed', result: 'Switch replaced', expectedUpdatedAt: token });
            expect(done.status).toBe(200);
            token = done.body.action.updatedAt;

            for (const status of ['In Progress', 'Cancelled', 'Planned']) {
                const back = await patch(ticket.id, planned.body.action.id, sarah, { status, result: 'x', expectedUpdatedAt: token });
                expect(back.status).toBe(400);
                expect(back.body.code).toBe('INVALID_ACTION_TRANSITION');
            }
            // Completed content can still be corrected (BR-30) without leaving the terminal status
            const fix = await patch(ticket.id, planned.body.action.id, sarah, { result: 'Switch replaced and tested', expectedUpdatedAt: token });
            expect(fix.status).toBe(200);
            expect(fix.body.action.status).toBe('Completed');
        });
    });

    describe('idempotency (AC-08, FR-14)', () => {
        it('API-14: a repeated request with the same content replays the original, even when whitespace differs', async () => {
            const ticket = await createTicket();
            const clientRequestId = randomUUID();
            const first = await create(ticket.id, sarah, actionBody({ clientRequestId }));
            expect(first.status).toBe(201);
            const second = await create(ticket.id, sarah, actionBody({ clientRequestId }));
            expect(second.status).toBe(200);
            expect(second.body).toMatchObject({ replayed: true, action: { id: first.body.action.id } });
            const spaced = await create(ticket.id, sarah, { result: `  ${actionBody().result}  `, clientRequestId, description: `${actionBody().description} ` });
            expect(spaced.status).toBe(200);
            expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);
        });

        it('API-15: two parallel creates with the same id leave exactly one row', async () => {
            const ticket = await createTicket();
            const clientRequestId = randomUUID();
            const results = await Promise.all([
                create(ticket.id, sarah, actionBody({ clientRequestId })),
                create(ticket.id, sarah, actionBody({ clientRequestId })),
            ]);
            expect(results.map(r => r.status).sort()).toEqual([200, 201]);
            expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);
        });

        it('API-26: reusing the id with different content or from a different user is 409 and creates nothing', async () => {
            const ticket = await createTicket();
            const clientRequestId = randomUUID();
            await create(ticket.id, sarah, actionBody({ clientRequestId }));
            const different = await create(ticket.id, sarah, actionBody({ clientRequestId, description: 'Something else' }));
            expect(different.status).toBe(409);
            expect(different.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
            expect(different.body).not.toHaveProperty('action');
            const otherUser = await create(ticket.id, james, actionBody({ clientRequestId }));
            expect(otherUser.status).toBe(409);
            expect(otherUser.body.code).toBe('IDEMPOTENCY_KEY_REUSED');
            expect(await getPrisma().actionTaken.count({ where: { ticketId: ticket.id } })).toBe(1);
        });
    });

    describe('concurrency (AC-13)', () => {
        it('WF-13 (actions): 10 parallel edits with the same token produce one winner, nine conflicts and one revision', async () => {
            const ticket = await createTicket();
            const made = await create(ticket.id, sarah);
            const results = await Promise.all(Array.from({ length: 10 }, (_, i) =>
                patch(ticket.id, made.body.action.id, i % 2 ? sarah : james, { description: `edit ${i}`, expectedUpdatedAt: made.body.action.updatedAt })));
            const statuses = results.map(r => r.status).sort();
            expect(statuses.filter(s => s === 200)).toHaveLength(1);
            expect(statuses.filter(s => s === 409)).toHaveLength(9);
            const winner = results.find(r => r.status === 200)!;
            const row = await getPrisma().actionTaken.findUniqueOrThrow({ where: { id: made.body.action.id } });
            expect(row.description).toBe(winner.body.action.description);
            expect(await getPrisma().actionTakenRevision.count({ where: { actionId: made.body.action.id } })).toBe(2);
        });
    });
});
