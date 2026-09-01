import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('GET /api/tickets (My Tickets API)', () => {
    beforeAll(async () => {
        // สร้างตั๋ว 3 ใบสำหรับทดสอบ Pagination
        for (let i = 0; i < 3; i++) {
            await request(app)
                .post('/api/tickets')
                .set('X-Requester-Id', '1')
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
            .set('X-Requester-Id', '1');

        expect(res.status).toBe(200);
        expect(res.body.data).toBeInstanceOf(Array);
        expect(res.body.data.length).toBeLessThanOrEqual(2); // เพราะเราใส่ limit=2
        expect(res.body.meta).toHaveProperty('totalItems');
        expect(res.body.meta.currentPage).toBe(1);
        expect(res.body.meta.limit).toBe(2);
    });
});
