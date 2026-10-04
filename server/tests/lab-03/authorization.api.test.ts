import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { ACCOUNTS, loginAs, bearer } from '../helpers';

describe('Lab 3: Authorization & Identity Isolation', () => {

    it('API-06 (AC-06): should tie ticket ownership strictly to authenticated user, ignoring client-supplied requesterId', async () => {
        // 1. Log in as David Lee (id will be David's id)
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'david.lee@example.com',
                password: 'Password123!'
            });

        expect(loginRes.status).toBe(200);
        const davidToken = loginRes.body.token;
        const davidId = loginRes.body.user.id;

        // 2. David creates a ticket, but attempts to spoof requesterId as 999 or Jennifer's ID in header / body
        const createRes = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${davidToken}`)
            .set('X-Requester-Id', '999') // Attacker tries to impersonate ID 999
            .send({
                summary: 'Identity isolation verification ticket',
                description: 'Verifying that authenticated identity takes precedence over spoofed header.',
                categoryId: 1,
                relatedSystemId: 1,
                requestedPriority: 'MEDIUM',
                requesterId: 888 // Attacker tries to inject body ID 888
            });

        expect(createRes.status).toBe(201);
        const ticketId = createRes.body.id;

        // 3. Fetch ticket detail using David's token -> ownership must be David's id, NOT 999 or 888
        const fetchRes = await request(app)
            .get(`/api/tickets/${ticketId}`)
            .set('Authorization', `Bearer ${davidToken}`);

        expect(fetchRes.status).toBe(200);
        expect(fetchRes.body.requesterId).toBe(davidId);
        expect(fetchRes.body.requesterId).not.toBe(999);
        expect(fetchRes.body.requesterId).not.toBe(888);
    });

    it('should reject unauthenticated request when no token or legacy header is provided', async () => {
        const res = await request(app).get('/api/tickets');
        expect(res.status).toBe(401);
    });

    it('should not accept a client-supplied X-Requester-Id or body requesterId as identity', async () => {
        const headerOnly = await request(app)
            .post('/api/tickets')
            .set('X-Requester-Id', '1')
            .send({ summary: 's', description: 'd', categoryId: 1, relatedSystemId: 1, requesterId: 1 });
        expect(headerOnly.status).toBe(401);
    });
});

describe('Lab 3: Direct API authorization matrix (server-side, independent of UI)', () => {
    const tokens: Record<string, string> = {};

    beforeAll(async () => {
        tokens.REQUESTER = (await loginAs(ACCOUNTS.david)).token;
        tokens.IT_STAFF = (await loginAs(ACCOUNTS.sarah)).token;
        tokens.ADMINISTRATOR = (await loginAs(ACCOUNTS.admin)).token;
    });

    // [method, path, expected status per role: REQUESTER, IT_STAFF, ADMINISTRATOR]
    const matrix: [string, string, number, number, number][] = [
        ['get', '/api/tickets', 200, 403, 403],
        ['get', '/api/staff/tickets', 403, 200, 200],
        ['get', '/api/staff/members', 403, 200, 200],
        ['get', '/api/admin/users', 403, 403, 200],
    ];

    it.each(matrix)('%s %s', async (method, path, requester, staff, admin) => {
        const expected: Record<string, number> = { REQUESTER: requester, IT_STAFF: staff, ADMINISTRATOR: admin };
        for (const role of Object.keys(expected)) {
            const res = await (request(app) as any)[method](path).set(bearer(tokens[role]!));
            expect({ role, status: res.status }).toEqual({ role, status: expected[role] });
        }
    });

    it('IT Staff cannot create tickets through the Requester API (403)', async () => {
        const res = await request(app)
            .post('/api/tickets')
            .set(bearer(tokens.IT_STAFF!))
            .send({ summary: 's', description: 'd', categoryId: 1, relatedSystemId: 1 });
        expect(res.status).toBe(403);
    });

    it('a Requester cannot change ticket owner, IT Priority, or status (403)', async () => {
        const auth = bearer(tokens.REQUESTER!);
        expect((await request(app).patch('/api/staff/tickets/1/owner').set(auth).send({ ownerId: null })).status).toBe(403);
        expect((await request(app).patch('/api/staff/tickets/1/priority').set(auth).send({ itPriority: 'LOW' })).status).toBe(403);
        expect((await request(app).patch('/api/staff/tickets/1/status').set(auth).send({ status: 'Closed' })).status).toBe(403);
    });

    it('a Requester cannot create users or reset passwords (403)', async () => {
        const auth = bearer(tokens.REQUESTER!);
        expect((await request(app).post('/api/admin/users').set(auth).send({})).status).toBe(403);
        expect((await request(app).post('/api/admin/users/1/reset-password').set(auth).send({ initialPassword: 'Password123!' })).status).toBe(403);
    });

    it('unknown API routes return a JSON 404', async () => {
        const res = await request(app).get('/api/requesters');
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });
});
