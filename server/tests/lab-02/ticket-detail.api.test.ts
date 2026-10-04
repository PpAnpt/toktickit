import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { ACCOUNTS, loginAs, bearer } from '../helpers';

describe('GET /api/tickets/:id (Ticket Detail API)', () => {
    let ticketId: number;
    let davidToken: string;
    let jenniferToken: string;

    beforeAll(async () => {
        davidToken = (await loginAs(ACCOUNTS.david)).token;
        jenniferToken = (await loginAs(ACCOUNTS.jennifer)).token;

        const res = await request(app)
            .post('/api/tickets')
            .set(bearer(davidToken))
            .send({
                summary: 'Cross-requester test',
                description: 'This ticket belongs to David',
                categoryId: 1,
                relatedSystemId: 1
            });
        ticketId = res.body.id;
    });

    it('API-04: should return 404 (not revealing existence) when another requester opens the ticket', async () => {
        const res = await request(app)
            .get(`/api/tickets/${ticketId}`)
            .set(bearer(jenniferToken));

        expect(res.status).toBe(404);
        expect(res.body).not.toHaveProperty('summary');
    });

    it('returns the same 404 for a ticket that does not exist', async () => {
        const res = await request(app)
            .get('/api/tickets/999999999')
            .set(bearer(jenniferToken));

        expect(res.status).toBe(404);
    });

    it('should successfully return ticket data for the owner', async () => {
        const res = await request(app)
            .get(`/api/tickets/${ticketId}`)
            .set(bearer(davidToken));

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(ticketId);
    });
});
