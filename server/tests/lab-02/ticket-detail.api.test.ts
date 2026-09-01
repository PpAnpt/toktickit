import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('GET /api/tickets/:id (Ticket Detail API)', () => {
    let ticketId: number;

    beforeAll(async () => {
        // สร้างตั๋วให้ Requester ID = 1 เป็นเจ้าของ
        const res = await request(app)
            .post('/api/tickets')
            .set('X-Requester-Id', '1')
            .send({
                summary: 'Cross-requester test',
                description: 'This ticket belongs to Requester 1',
                categoryId: 1,
                relatedSystemId: 1
            });
        ticketId = res.body.id;
    });

    it('API-04: should return 403 when trying to access a ticket owned by another requester', async () => {
        // จำลองการเข้าใช้งานด้วย Requester ID = 2 (คนละคน) ไปเปิดตั๋วของคนที่ 1
        const res = await request(app)
            .get(`/api/tickets/${ticketId}`)
            .set('X-Requester-Id', '2');

        expect(res.status).toBe(403);
        expect(res.body.error).toContain('Access denied');
    });

    it('should successfully return ticket data for the owner', async () => {
        // ใช้ Requester ID = 1 เข้าดูตั๋วของตัวเอง
        const res = await request(app)
            .get(`/api/tickets/${ticketId}`)
            .set('X-Requester-Id', '1');

        expect(res.status).toBe(200);
        expect(res.body.id).toBe(ticketId);
    });
});
