import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('Lab 3: Public Comments & Internal Notes APIs (Issue 4)', () => {
    let ownerToken: string;
    let otherRequesterToken: string;
    let staffToken: string;
    let adminToken: string;
    let testTicketId: number;

    beforeAll(async () => {
        // Log in as Owner Requester (David Lee)
        const reqRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'david.lee@example.com', password: 'Password123!' });
        ownerToken = reqRes.body.token;

        // Log in as Another Requester (Jennifer Anderson)
        const otherRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'jennifer.anderson@example.com', password: 'Password123!' });
        otherRequesterToken = otherRes.body.token;

        // Log in as IT Staff (Sarah Connor)
        const staffRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'sarah.connor@example.com', password: 'Password123!' });
        staffToken = staffRes.body.token;

        // Log in as Admin System
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@example.com', password: 'Admin123!' });
        adminToken = adminRes.body.token;

        // Create a ticket owned by David Lee
        const ticketRes = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                summary: 'Comments and Notes Ticket',
                description: 'Testing two-tier discussions',
                categoryId: 1,
                relatedSystemId: 1,
            });
        testTicketId = ticketRes.body.id;
    });

    describe('API-12 (AC-13, BR-15): Public Comments Creation & Query', () => {
        it('should allow ticket owner to post a public comment', async () => {
            const res = await request(app)
                .post(`/api/tickets/${testTicketId}/comments`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ content: 'I tried rebooting and the issue persists.' });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.content).toBe('I tried rebooting and the issue persists.');
            expect(res.body.author.name).toBe('David Lee');
            expect(res.body.author.role).toBe('REQUESTER');
        });

        it('should allow IT Staff to post a public comment to the ticket', async () => {
            const res = await request(app)
                .post(`/api/tickets/${testTicketId}/comments`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ content: 'Please bring the laptop to IT Room 204.' });

            expect(res.status).toBe(201);
            expect(res.body.author.name).toBe('Sarah Connor');
            expect(res.body.author.role).toBe('IT_STAFF');
        });

        it('should allow ticket owner, IT Staff, and Admin to view public comments', async () => {
            const resRequester = await request(app)
                .get(`/api/tickets/${testTicketId}/comments`)
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(resRequester.status).toBe(200);
            expect(resRequester.body.length).toBeGreaterThanOrEqual(2);

            const resStaff = await request(app)
                .get(`/api/tickets/${testTicketId}/comments`)
                .set('Authorization', `Bearer ${staffToken}`);
            expect(resStaff.status).toBe(200);

            const resAdmin = await request(app)
                .get(`/api/tickets/${testTicketId}/comments`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(resAdmin.status).toBe(200);
        });

        it('should reject non-owner requester with 404 so the ticket existence is not revealed', async () => {
            const postRes = await request(app)
                .post(`/api/tickets/${testTicketId}/comments`)
                .set('Authorization', `Bearer ${otherRequesterToken}`)
                .send({ content: 'Trying to sneak into other ticket comment' });
            expect(postRes.status).toBe(404);

            const getRes = await request(app)
                .get(`/api/tickets/${testTicketId}/comments`)
                .set('Authorization', `Bearer ${otherRequesterToken}`);
            expect(getRes.status).toBe(404);
            expect(Array.isArray(getRes.body)).toBe(false);
        });

        it('should reject unauthenticated access to comments with 401', async () => {
            const res = await request(app).get(`/api/tickets/${testTicketId}/comments`);
            expect(res.status).toBe(401);
        });

        it('should reject comment content longer than 2000 characters', async () => {
            const res = await request(app)
                .post(`/api/tickets/${testTicketId}/comments`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ content: 'a'.repeat(2001) });
            expect(res.status).toBe(400);
        });

        it('should store comment content as plain text (rendered escaped by the client)', async () => {
            const html = '<img src=x onerror=alert(1)>';
            const res = await request(app)
                .post(`/api/tickets/${testTicketId}/comments`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ content: html });
            expect(res.status).toBe(201);
            expect(res.body.content).toBe(html);
        });

        it('should reject comment with empty content with 400 Bad Request', async () => {
            const res = await request(app)
                .post(`/api/tickets/${testTicketId}/comments`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ content: '   ' });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/content cannot be empty/i);
        });
    });

    describe('API-13 (AC-14, BR-16): Internal Notes Authorization Boundary', () => {
        it('should allow IT Staff to post an internal note', async () => {
            const res = await request(app)
                .post(`/api/tickets/${testTicketId}/internal-notes`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ content: 'Checked hardware logs: GPU overheating detected.' });

            expect(res.status).toBe(201);
            expect(res.body).toHaveProperty('id');
            expect(res.body.content).toBe('Checked hardware logs: GPU overheating detected.');
            expect(res.body.author.role).toBe('IT_STAFF');
        });

        it('should allow Administrator to post and read internal notes', async () => {
            const postRes = await request(app)
                .post(`/api/tickets/${testTicketId}/internal-notes`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ content: 'Approved replacement motherboard under warranty.' });
            expect(postRes.status).toBe(201);

            const getRes = await request(app)
                .get(`/api/tickets/${testTicketId}/internal-notes`)
                .set('Authorization', `Bearer ${adminToken}`);
            expect(getRes.status).toBe(200);
            expect(getRes.body.length).toBeGreaterThanOrEqual(2);
        });

        it('should strictly reject Requester from accessing internal notes with 403 Forbidden', async () => {
            const getRes = await request(app)
                .get(`/api/tickets/${testTicketId}/internal-notes`)
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(getRes.status).toBe(403);
            expect(getRes.body.error).toMatch(/insufficient permissions|access denied/i);

            const postRes = await request(app)
                .post(`/api/tickets/${testTicketId}/internal-notes`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ content: 'Requester trying to post note' });
            expect(postRes.status).toBe(403);
        });
    });
});
