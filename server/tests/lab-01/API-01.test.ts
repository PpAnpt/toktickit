import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('Health Check API', () => {
  it('GET /api/health returns 200 and expected JSON', async () => {
    const res = await request(app).get('/api/health');
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      status: 'ok',
      service: 'TokTickIT API'
    });
  });
});
