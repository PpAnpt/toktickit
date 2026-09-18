import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

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
});
