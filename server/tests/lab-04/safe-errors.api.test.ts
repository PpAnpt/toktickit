import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { getPrisma } from '../../src/prisma';
import { ACCOUNTS, loginAs, bearer } from '../helpers';
import { actionBody, createTicket, removeCreatedTickets } from './helpers';

/**
 * ERR-01 (AC-26): a failing database gives a generic 500 on the dashboard, Actions Taken and status endpoints,
 * with no stack, SQL, table names or ids in the body.
 */
const LEAK = 'SELECT "secret" FROM "Ticket" WHERE id = 4242 -- connection to 10.0.0.9:5432 refused';

describe('Lab 4: safe errors (Issue #34)', () => {
    let david: { token: string };
    let sarah: { token: string };
    let ticketId: number;
    let updatedAt: string;

    beforeAll(async () => {
        david = await loginAs(ACCOUNTS.david);
        sarah = await loginAs(ACCOUNTS.sarah);
        const ticket = await createTicket({ status: 'Open', ownerEmail: ACCOUNTS.sarah.email });
        ticketId = ticket.id;
        updatedAt = ticket.updatedAt.toISOString();
    });
    afterEach(() => vi.restoreAllMocks());
    afterAll(async () => {
        await removeCreatedTickets();
        await getPrisma().$disconnect();
    });

    function expectGeneric(res: request.Response) {
        expect(res.status).toBe(500);
        const text = JSON.stringify(res.body);
        expect(res.body.error).toEqual(expect.any(String));
        for (const forbidden of ['SELECT', 'secret', 'Ticket"', '4242', '10.0.0.9', 'refused', 'at ', 'node_modules', 'stack', String(ticketId) + '"']) {
            expect(text, forbidden).not.toContain(forbidden);
        }
        expect(Object.keys(res.body)).toEqual(['error']);
    }

    it('ERR-01: both dashboards', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const prisma = getPrisma();
        vi.spyOn(prisma.ticket, 'count').mockRejectedValue(new Error(LEAK));
        expectGeneric(await request(app).get('/api/dashboard/requester').set(bearer(david.token)));
        expectGeneric(await request(app).get('/api/dashboard/staff').set(bearer(sarah.token)));
    });

    it('ERR-01: Actions Taken list, create and the history reads', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const prisma = getPrisma();
        vi.spyOn(prisma, '$transaction').mockRejectedValue(new Error(LEAK));
        vi.spyOn(prisma.actionTaken, 'findMany').mockRejectedValue(new Error(LEAK));
        vi.spyOn(prisma.actionTaken, 'count').mockRejectedValue(new Error(LEAK));
        vi.spyOn(prisma.ticketEvent, 'findMany').mockRejectedValue(new Error(LEAK));
        vi.spyOn(prisma.ticketEvent, 'count').mockRejectedValue(new Error(LEAK));

        expectGeneric(await request(app).get(`/api/tickets/${ticketId}/actions`).set(bearer(sarah.token)));
        expectGeneric(await request(app).post(`/api/staff/tickets/${ticketId}/actions`).set(bearer(sarah.token)).send(actionBody()));
        expectGeneric(await request(app).get(`/api/staff/tickets/${ticketId}/events`).set(bearer(sarah.token)));
    });

    it('ERR-01: status, owner and priority writes', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        vi.spyOn(getPrisma(), '$transaction').mockRejectedValue(new Error(LEAK));
        for (const [endpoint, body] of [
            ['status', { status: 'In Progress', expectedUpdatedAt: updatedAt }],
            ['owner', { ownerId: null, expectedUpdatedAt: updatedAt }],
            ['priority', { itPriority: 'HIGH', expectedUpdatedAt: updatedAt }],
        ] as const) {
            expectGeneric(await request(app).patch(`/api/staff/tickets/${ticketId}/${endpoint}`).set(bearer(sarah.token)).send(body));
        }
        // Nothing changed: the Ticket still has its first status
        vi.restoreAllMocks();
        expect((await getPrisma().ticket.findUniqueOrThrow({ where: { id: ticketId } })).status).toBe('Open');
    });
});
