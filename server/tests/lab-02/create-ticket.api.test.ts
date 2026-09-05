import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('POST /api/tickets (Create Ticket API)', () => {

  it('API-01: should create a valid ticket and return 201 with ticketNumber', async () => {
    const payload = {
      summary: 'Test ticket summary',
      description: 'Test ticket description for API test',
      categoryId: 1,
      relatedSystemId: 1,
      requestedPriority: 'MEDIUM'
    };

    const res = await request(app)
      .post('/api/tickets')
      .set('X-Requester-Id', '1') // จำลองว่าเป็น Requester คนที่ 1
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('ticketNumber');
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/); // เช็ค Format เช่น TKT-2026-000001
    expect(res.body.summary).toBe(payload.summary);
  });

  it('should return 400 if required fields are missing', async () => {
    const payload = {
      description: 'Missing summary and categories'
      // จงใจไม่ใส่ summary, categoryId, relatedSystemId
    };

    const res = await request(app)
      .post('/api/tickets')
      .set('X-Requester-Id', '1')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toHaveProperty('summary');
    expect(res.body.details).toHaveProperty('categoryId');
  });

  it('should return 401 if X-Requester-Id header is missing', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ 
        summary: 'test', 
        description: 'test', 
        categoryId: 1, 
        relatedSystemId: 1 
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Missing or invalid');
  });
});
