import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('POST /api/tickets/:id/attachments (Attachment API)', () => {
  let ticketId: number;

  // ก่อนเริ่มรันเทสต์ไฟล์นี้ เราจะจำลองสร้าง Ticket ไว้ 1 ใบสำหรับใช้อัปโหลดไฟล์ใส่
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('X-Requester-Id', '1')
      .send({
        summary: 'Test for attachments',
        description: 'Need to test file upload constraints',
        categoryId: 1,
        relatedSystemId: 1
      });
    ticketId = res.body.id;
  });

  it('API-02: should return 400 if attachment exceeds 5MB limit', async () => {
    // จำลองสร้างข้อมูลขนาด 5.1 MB ใน Memory เพื่อหลอกว่าอัปโหลดไฟล์ใหญ่
    const oversizedBuffer = Buffer.alloc(5.1 * 1024 * 1024, 'a');

    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set('X-Requester-Id', '1')
      .attach('file', oversizedBuffer, 'huge-file.pdf'); // ส่งไฟล์ไปที่ API

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('size exceeds'); // เช็คว่ามีคำว่าขนาดเกินไหม
  });

  it('should return 400 if file type is not allowed', async () => {
    const invalidFileBuffer = Buffer.from('fake data content');
    
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set('X-Requester-Id', '1')
      .attach('file', invalidFileBuffer, 'test.txt'); // .txt ไม่ได้รับอนุญาต

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Only JPG, PNG, WEBP, and PDF files are allowed');
  });
});
