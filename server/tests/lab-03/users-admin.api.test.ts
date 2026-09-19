import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('Lab 3: Administrator User Management & Safety Rules APIs (Issue 5)', () => {
    let requesterToken: string;
    let staffToken: string;
    let adminToken: string;
    let adminUserId: number;

    beforeAll(async () => {
        // Log in as David Lee (Requester)
        const reqRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'david.lee@example.com', password: 'Password123!' });
        requesterToken = reqRes.body.token;

        // Log in as Sarah Connor (IT Staff)
        const staffRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'sarah.connor@example.com', password: 'Password123!' });
        staffToken = staffRes.body.token;

        // Log in as Admin System (Administrator)
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@example.com', password: 'Admin123!' });
        adminToken = adminRes.body.token;
        adminUserId = adminRes.body.user.id;
    });

    describe('API-15 (AC-16, FR-12): Role-based access control for User Management', () => {
        it('allows ADMINISTRATOR to access user management endpoint with 200 OK', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
        });

        it('rejects IT_STAFF with 403 Forbidden', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/insufficient permissions|access denied/i);
        });

        it('rejects REQUESTER with 403 Forbidden', async () => {
            const res = await request(app)
                .get('/api/admin/users')
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/insufficient permissions|access denied/i);
        });

        it('rejects unauthenticated request with 401 Unauthorized', async () => {
            const res = await request(app).get('/api/admin/users');
            expect(res.status).toBe(401);
        });
    });

    describe('API-16 (AC-17, AC-18): List, search, filter and create users', () => {
        it('filters users by role and searches by keyword', async () => {
            // Filter by role IT_STAFF
            const roleRes = await request(app)
                .get('/api/admin/users?role=IT_STAFF')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(roleRes.status).toBe(200);
            expect(roleRes.body.every((u: any) => u.role === 'IT_STAFF')).toBe(true);

            // Search by keyword "David"
            const searchRes = await request(app)
                .get('/api/admin/users?search=David')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(searchRes.status).toBe(200);
            expect(searchRes.body.some((u: any) => u.email === 'david.lee@example.com')).toBe(true);
        });

        it('creates a new user with single role and initial password (201 Created)', async () => {
            const uniqueEmail = `test.user.${Date.now()}@example.com`;
            const res = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Test New User',
                    email: uniqueEmail,
                    role: 'IT_STAFF',
                    initialPassword: 'TempPassword123!',
                });

            expect(res.status).toBe(201);
            expect(res.body.id).toBeDefined();
            expect(res.body.name).toBe('Test New User');
            expect(res.body.email).toBe(uniqueEmail.toLowerCase());
            expect(res.body.role).toBe('IT_STAFF');
            expect(res.body.isActive).toBe(true);
            expect(res.body.mustChangePassword).toBe(true);
            expect(res.body.passwordHash).toBeUndefined(); // Sensitive data omitted
        });

        it('rejects duplicate email with 409 Conflict', async () => {
            const res = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Duplicate Admin',
                    email: 'admin@example.com', // Already exists
                    role: 'ADMINISTRATOR',
                    initialPassword: 'Password123!',
                });

            expect(res.status).toBe(409);
            expect(res.body.error).toMatch(/already registered/i);
        });

        it('rejects user creation with missing required fields (400 Bad Request)', async () => {
            const res = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: '',
                    email: 'bad@example.com',
                });

            expect(res.status).toBe(400);
        });
    });

    describe('API-17 & API-18: User editing, soft deactivation, and self-deactivation prevention', () => {
        let createdUserId: number;
        let createdUserEmail: string;

        beforeAll(async () => {
            createdUserEmail = `target.deact.${Date.now()}@example.com`;
            const res = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Deactivation Target',
                    email: createdUserEmail,
                    role: 'REQUESTER',
                    initialPassword: 'Password123!',
                });
            createdUserId = res.body.id;
        });

        it('updates user name and role successfully (200 OK)', async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${createdUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Updated Target Name',
                    role: 'IT_STAFF',
                });

            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated Target Name');
            expect(res.body.role).toBe('IT_STAFF');
        });

        it('deactivates user with soft-deactivation (isActive=false, record preserved)', async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${createdUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    isActive: false,
                });

            expect(res.status).toBe(200);
            expect(res.body.isActive).toBe(false);

            // Verify deactivated user cannot log in
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: createdUserEmail, password: 'Password123!' });

            expect(loginRes.status).toBe(401);
            expect(loginRes.body.error).toMatch(/deactivated|inactive/i);
        });

        it('prevents Administrator from deactivating their own account (BR-19, 400 Bad Request)', async () => {
            const res = await request(app)
                .patch(`/api/admin/users/${adminUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    isActive: false,
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/cannot deactivate their own account/i);
        });
    });

    describe('API-19 (AC-21, BR-20): Last active Administrator protection', () => {
        it('strictly blocks deactivating or reassigning role of the last active Administrator', async () => {
            // Currently admin@example.com is the sole active Administrator in seed
            const res = await request(app)
                .patch(`/api/admin/users/${adminUserId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    role: 'IT_STAFF',
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/last remaining active Administrator/i);
        });

        it('allows modifying an admin role if another active Administrator exists', async () => {
            // 1. Create a second Administrator
            const secondAdminEmail = `admin2.${Date.now()}@example.com`;
            const createRes = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Second Admin',
                    email: secondAdminEmail,
                    role: 'ADMINISTRATOR',
                    initialPassword: 'AdminPassword123!',
                });

            const secondAdminId = createRes.body.id;

            // 2. Now that 2 active admins exist, modifying the role of the second admin is permitted
            const demoteRes = await request(app)
                .patch(`/api/admin/users/${secondAdminId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    role: 'IT_STAFF',
                });

            expect(demoteRes.status).toBe(200);
            expect(demoteRes.body.role).toBe('IT_STAFF');
        });
    });

    describe('API-20 (AC-22, BR-21): Admin resets user initial password', () => {
        let resetTargetUserId: number;
        let resetTargetEmail: string;

        beforeAll(async () => {
            resetTargetEmail = `reset.target.${Date.now()}@example.com`;
            const res = await request(app)
                .post('/api/admin/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Reset Password Target',
                    email: resetTargetEmail,
                    role: 'REQUESTER',
                    initialPassword: 'OldPassword123!',
                });
            resetTargetUserId = res.body.id;
        });

        it('resets initial password and enforces mustChangePassword=true', async () => {
            const res = await request(app)
                .post(`/api/admin/users/${resetTargetUserId}/reset-password`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    initialPassword: 'BrandNewTempPass123!',
                });

            expect(res.status).toBe(200);
            expect(res.body.message).toMatch(/Initial password set/i);

            // Log in with new temporary password
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: resetTargetEmail, password: 'BrandNewTempPass123!' });

            expect(loginRes.status).toBe(200);
            expect(loginRes.body.user.mustChangePassword).toBe(true);
        });

        it('rejects password reset with invalid/short password (400 Bad Request)', async () => {
            const res = await request(app)
                .post(`/api/admin/users/${resetTargetUserId}/reset-password`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    initialPassword: '123',
                });

            expect(res.status).toBe(400);
        });
    });
});
