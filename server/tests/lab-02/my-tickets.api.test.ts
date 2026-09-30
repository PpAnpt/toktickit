import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { ACCOUNTS, loginAs, bearer } from '../helpers';

describe('GET /api/tickets (My Tickets API)', () => {
    let token: string;
    let davidId: number;

    beforeAll(async () => {
        const session = await loginAs(ACCOUNTS.david);
        token = session.token;
        davidId = session.user.id;

        // Create 3 tickets for pagination
        for (let i = 0; i < 3; i++) {
            await request(app)
                .post('/api/tickets')
                .set(bearer(token))
                .send({
                    summary: `Pagination Test Ticket ${i + 1}`,
                    description: 'Testing my tickets list',
                    categoryId: 1,
                    relatedSystemId: 1
                });
        }
    });

    it('API-03: should return paginated list of tickets for the requester', async () => {
        const res = await request(app)
            .get('/api/tickets?page=1&limit=2')
            .set(bearer(token));

        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBeLessThanOrEqual(2);
        expect(res.body.meta).toHaveProperty('totalItems');
        expect(res.body.meta.currentPage).toBe(1);
        expect(res.body.meta.limit).toBe(2);
    });

    it('only returns tickets owned by the authenticated requester', async () => {
        const res = await request(app)
            .get('/api/tickets?limit=50')
            .set(bearer(token));

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBeGreaterThan(0);
        for (const ticket of res.body.data) {
            expect(ticket.requesterId).toBe(davidId);
        }
    });

    it('rejects an invalid sortBy parameter with 400', async () => {
        const res = await request(app)
            .get('/api/tickets?sortBy=passwordHash')
            .set(bearer(token));
        expect(res.status).toBe(400);
    });
});
