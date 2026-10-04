import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { ACCOUNTS, loginAs, bearer } from '../helpers';

describe('POST /api/tickets (Create Ticket API)', () => {
  let token: string;
  let davidId: number;

  beforeAll(async () => {
    const session = await loginAs(ACCOUNTS.david);
    token = session.token;
    davidId = session.user.id;
  });

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
      .set(bearer(token))
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/); // e.g. TKT-2026-000001
    expect(res.body.summary).toBe(payload.summary);
    expect(res.body.requesterId).toBe(davidId);
    // BR-11: IT Priority initially copies Requested Priority
    expect(res.body.itPriority).toBe('MEDIUM');
  });

  it('should return 400 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set(bearer(token))
      .send({ description: 'Missing summary and categories' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toHaveProperty('summary');
    expect(res.body.details).toHaveProperty('categoryId');
  });

  it('should return 400 for an invalid requested priority', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set(bearer(token))
      .send({ summary: 'x', description: 'y', categoryId: 1, relatedSystemId: 1, requestedPriority: 'CRITICAL' });

    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty('requestedPriority');
  });

  it('should return 401 when no authentication token is provided', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ summary: 'test', description: 'test', categoryId: 1, relatedSystemId: 1 });

    expect(res.status).toBe(401);
  });
});
