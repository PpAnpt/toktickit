import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('Lab 3: Staff Ticket Detail & Operations APIs (Issue 4)', () => {
    let requesterToken: string;
    let requesterUserId: number;
    let otherRequesterToken: string;
    let staffToken: string;
    let staffUserId: number;
    let adminToken: string;
    let adminUserId: number;
    let testTicketId: number;
    let newTicketId: number;

    // Lab 4 (BR-19): status, owner and priority changes carry the Ticket's current updatedAt
    const ticketToken = async (id: number): Promise<string> =>
        (await request(app).get(`/api/staff/tickets/${id}`).set('Authorization', `Bearer ${staffToken}`)).body.updatedAt;

    beforeAll(async () => {
        // Log in as David Lee (Requester 1)
        const reqRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'david.lee@example.com', password: 'Password123!' });
        requesterToken = reqRes.body.token;
        requesterUserId = reqRes.body.user.id;

        // Log in as Jennifer Anderson (Requester 2)
        const otherReqRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'jennifer.anderson@example.com', password: 'Password123!' });
        otherRequesterToken = otherReqRes.body.token;

        // Log in as Sarah Connor (IT Staff)
        const staffRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'sarah.connor@example.com', password: 'Password123!' });
        staffToken = staffRes.body.token;
        staffUserId = staffRes.body.user.id;

        // Log in as Admin System (Admin)
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@example.com', password: 'Admin123!' });
        adminToken = adminRes.body.token;
        adminUserId = adminRes.body.user.id;

        // Create a test ticket for operations
        const createdRes = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${requesterToken}`)
            .send({
                summary: 'Staff Operations Test Ticket',
                description: 'Testing claim, priority update, and status workflow',
                categoryId: 1,
                relatedSystemId: 1,
                requestedPriority: 'MEDIUM',
            });
        testTicketId = createdRes.body.id;

        // Create another fresh ticket in 'New' status
        const createdNewRes = await request(app)
            .post('/api/tickets')
            .set('Authorization', `Bearer ${requesterToken}`)
            .send({
                summary: 'New Unclaimed Ticket',
                description: 'Should auto-move to Open when claimed',
                categoryId: 1,
                relatedSystemId: 1,
                requestedPriority: 'HIGH',
            });
        newTicketId = createdNewRes.body.id;
    });

    describe('GET /api/staff/tickets/:id', () => {
        it('should return full ticket detail for IT Staff with relations', async () => {
            const res = await request(app)
                .get(`/api/staff/tickets/${testTicketId}`)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            expect(res.body.id).toBe(testTicketId);
            expect(res.body).toHaveProperty('requester');
            expect(res.body).toHaveProperty('category');
            expect(res.body).toHaveProperty('relatedSystem');
            expect(res.body).toHaveProperty('attachments');
            expect(res.body).toHaveProperty('comments');
            expect(res.body).toHaveProperty('internalNotes');
        });

        it('should return 403 Forbidden when Requester accesses staff ticket detail', async () => {
            const res = await request(app)
                .get(`/api/staff/tickets/${testTicketId}`)
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(403);
        });

        it('should return 404 for non-existent ticket ID', async () => {
            const res = await request(app)
                .get('/api/staff/tickets/999999')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(404);
        });
    });

    describe('API-09 (AC-10, FR-06): Claim / Reassign Ticket Owner', () => {
        it('should auto-move ticket status from New to Open when claimed by staff (BR-12)', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${newTicketId}/owner`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: staffUserId, expectedUpdatedAt: await ticketToken(newTicketId) });

            expect(res.status).toBe(200);
            expect(res.body.ownerId).toBe(staffUserId);
            expect(res.body.status).toBe('Open');
            expect(res.body.owner.name).toBe('Sarah Connor');
        });

        it('should allow reassigning owner to another active staff member or admin', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${testTicketId}/owner`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: adminUserId, expectedUpdatedAt: await ticketToken(testTicketId) });

            expect(res.status).toBe(200);
            expect(res.body.ownerId).toBe(adminUserId);
        });

        it('should allow unassigning owner by setting ownerId to null', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${testTicketId}/owner`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: null, expectedUpdatedAt: await ticketToken(testTicketId) });

            expect(res.status).toBe(200);
            expect(res.body.ownerId).toBeNull();
        });

        it('should reject assigning owner to non-staff user or inactive user with 400 Bad Request', async () => {
            // Assigning to David Lee (Requester)
            const res1 = await request(app)
                .patch(`/api/staff/tickets/${testTicketId}/owner`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: requesterUserId, expectedUpdatedAt: await ticketToken(testTicketId) });

            expect(res1.status).toBe(400);
            expect(res1.body.error).toMatch(/active IT Staff or Administrator/i);
        });
    });

    describe('API-10 (AC-11, BR-11): Update IT Priority', () => {
        it('should update IT Priority and leave Requested Priority immutable', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${testTicketId}/priority`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ itPriority: 'URGENT', expectedUpdatedAt: await ticketToken(testTicketId) });

            expect(res.status).toBe(200);
            expect(res.body.itPriority).toBe('URGENT');
            expect(res.body.requestedPriority).toBe('MEDIUM'); // Unchanged!
        });

        it('should reject invalid priority value with 400 Bad Request', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${testTicketId}/priority`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ itPriority: 'SUPER_URGENT', expectedUpdatedAt: await ticketToken(testTicketId) });

            expect(res.status).toBe(400);
        });
    });

    describe('API-11 (AC-12, BR-13): Permitted & Invalid Status Transitions', () => {
        it('should permit valid transition Open -> In Progress', async () => {
            // Ensure ticket is in 'Open' status
            await request(app)
                .patch(`/api/staff/tickets/${testTicketId}/owner`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ ownerId: 5, expectedUpdatedAt: await ticketToken(testTicketId) });

            const res = await request(app)
                .patch(`/api/staff/tickets/${testTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'In Progress', expectedUpdatedAt: await ticketToken(testTicketId) });

            expect(res.status).toBe(200);
            expect(res.body.status).toMatch(/In Progress|InProgress/);
        });

        it('should permit valid transition In Progress -> Resolved', async () => {
            // Lab 4 resolution gate (BR-16): a Ticket needs a Completed Action Taken before it can be Resolved
            const action = await request(app)
                .post(`/api/staff/tickets/${testTicketId}/actions`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ description: 'Checked the monitor and the dock', result: 'Cable replaced; display stable' });
            expect(action.status).toBe(201);

            const res = await request(app)
                .patch(`/api/staff/tickets/${testTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'Resolved', expectedUpdatedAt: await ticketToken(testTicketId) });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('Resolved');
        });

        it('should reject invalid transition Resolved -> In Progress directly with 400 Bad Request', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${testTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'In Progress', expectedUpdatedAt: await ticketToken(testTicketId) }); // Resolved can only transition to Closed or Reopened

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/Invalid status transition/i);
        });

        it('should permit valid transition Resolved -> Reopened', async () => {
            const res = await request(app)
                .patch(`/api/staff/tickets/${testTicketId}/status`)
                .set('Authorization', `Bearer ${staffToken}`)
                .send({ status: 'Reopened', expectedUpdatedAt: await ticketToken(testTicketId) });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('Reopened');
        });
    });

    describe('API-14 (AC-15, BR-14): Requester Indicate Problem Resolved', () => {
        it('should allow ticket owner to indicate problem appears resolved', async () => {
            const res = await request(app)
                .post(`/api/tickets/${testTicketId}/indicate-resolved`)
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('indicatedResolvedAt');
            expect(res.body.message).toMatch(/indicated problem appears resolved/i);
        });

        it('should reject a second indication with 409 Conflict', async () => {
            const res = await request(app)
                .post(`/api/tickets/${testTicketId}/indicate-resolved`)
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(409);
        });

        it('should reject non-owner requester with 404 (existence not revealed)', async () => {
            const res = await request(app)
                .post(`/api/tickets/${testTicketId}/indicate-resolved`)
                .set('Authorization', `Bearer ${otherRequesterToken}`);

            expect(res.status).toBe(404);
        });

        it('should reject IT Staff indicating resolved with 403 (staff resolve through status workflow)', async () => {
            const res = await request(app)
                .post(`/api/tickets/${testTicketId}/indicate-resolved`)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(403);
        });

        it('should not change the ticket status when the requester indicates resolution (BR-14)', async () => {
            const res = await request(app)
                .get(`/api/staff/tickets/${testTicketId}`)
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            expect(res.body.status).not.toBe('Resolved');
            expect(res.body.indicatedResolvedAt).toBeTruthy();
        });
    });
});
