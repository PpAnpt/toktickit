import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { ACCOUNTS, loginAs, bearer } from '../helpers';

describe('Attachment APIs (Lab 2 continuity with authenticated identity)', () => {
  let ticketId: number;
  let davidToken: string;
  let jenniferToken: string;
  let staffToken: string;
  let attachmentId: number;

  beforeAll(async () => {
    davidToken = (await loginAs(ACCOUNTS.david)).token;
    jenniferToken = (await loginAs(ACCOUNTS.jennifer)).token;
    staffToken = (await loginAs(ACCOUNTS.sarah)).token;

    const res = await request(app)
      .post('/api/tickets')
      .set(bearer(davidToken))
      .send({
        summary: 'Test for attachments',
        description: 'Need to test file upload constraints',
        categoryId: 1,
        relatedSystemId: 1
      });
    ticketId = res.body.id;

    const upload = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set(bearer(davidToken))
      .attach('file', Buffer.from('%PDF-1.4 test'), { filename: 'evidence.pdf', contentType: 'application/pdf' });
    attachmentId = upload.body.id;
  });

  it('owner can upload a valid attachment', () => {
    expect(attachmentId).toBeTypeOf('number');
  });

  it('API-02: should return 400 if attachment exceeds 5MB limit', async () => {
    const oversizedBuffer = Buffer.alloc(5.1 * 1024 * 1024, 'a');

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set(bearer(davidToken))
      .attach('file', oversizedBuffer, 'huge-file.pdf');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('size exceeds');
  });

  it('should return 400 if file type is not allowed', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set(bearer(davidToken))
      .attach('file', Buffer.from('fake data content'), 'test.txt');

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Only JPG, PNG, WEBP, and PDF files are allowed');
  });

  it('rejects uploads, downloads, and removal without authentication (401)', async () => {
    const base = `/api/tickets/${ticketId}/attachments`;
    expect((await request(app).post(base).attach('file', Buffer.from('%PDF'), 'a.pdf')).status).toBe(401);
    expect((await request(app).get(`${base}/${attachmentId}/download`)).status).toBe(401);
    expect((await request(app).delete(`${base}/${attachmentId}`).send({ reason: 'x' })).status).toBe(401);
  });

  it('another requester cannot download, remove, or upload (404, existence not revealed)', async () => {
    const base = `/api/tickets/${ticketId}/attachments`;
    expect((await request(app).get(`${base}/${attachmentId}/download`).set(bearer(jenniferToken))).status).toBe(404);
    expect((await request(app).delete(`${base}/${attachmentId}`).set(bearer(jenniferToken)).send({ reason: 'x' })).status).toBe(404);
    expect((await request(app).post(base).set(bearer(jenniferToken)).attach('file', Buffer.from('%PDF'), { filename: 'a.pdf', contentType: 'application/pdf' })).status).toBe(404);
  });

  it('IT Staff can download attachments for Ticket Detail continuity', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}/attachments/${attachmentId}/download`)
      .set(bearer(staffToken));
    expect(res.status).toBe(200);
  });

  it('owner must give a reason to soft-remove an attachment', async () => {
    const url = `/api/tickets/${ticketId}/attachments/${attachmentId}`;
    expect((await request(app).delete(url).set(bearer(davidToken)).send({ reason: '   ' })).status).toBe(400);

    const res = await request(app).delete(url).set(bearer(davidToken)).send({ reason: 'Uploaded wrong file version' });
    expect(res.status).toBe(204);

    const download = await request(app).get(`${url}/download`).set(bearer(davidToken));
    expect(download.status).toBe(404);
  });
});
