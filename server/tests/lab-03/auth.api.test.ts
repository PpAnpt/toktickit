import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';
import { getPrisma } from '../../src/prisma';
import { hashPassword } from '../../src/utils/auth';

// Restore a seeded account to its documented first-login state
async function resetToInitialPassword(email: string) {
    await getPrisma().user.updateMany({
        where: { email },
        data: { passwordHash: await hashPassword('Initial123!'), mustChangePassword: true },
    });
}

describe('Lab 3: Authentication APIs', () => {

    describe('POST /api/auth/login', () => {
        it('API-01 (AC-01): should authenticate active user with valid credentials and return JWT token', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'david.lee@example.com',
                    password: 'Password123!'
                });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body).toHaveProperty('user');
            expect(res.body.user.email).toBe('david.lee@example.com');
            expect(res.body.user.role).toBe('REQUESTER');
            expect(res.body.user.mustChangePassword).toBe(false);
            expect(res.body.user).not.toHaveProperty('passwordHash');
            expect(res.body.user).not.toHaveProperty('tokenVersion');
        });

        it('should accept the email case-insensitively', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: '  David.Lee@Example.com ', password: 'Password123!' });
            expect(res.status).toBe(200);
        });

        it('API-02 (AC-02): should reject login with incorrect password', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'david.lee@example.com',
                    password: 'WrongPassword!'
                });

            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toMatch(/invalid email or password/i);
        });

        it('API-02 (AC-02): should reject login for non-existent email with the same message', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123!'
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/invalid email or password/i);
        });

        it('should return 400 if email or password is missing or not a string', async () => {
            const missing = await request(app)
                .post('/api/auth/login')
                .send({ email: 'david.lee@example.com' });
            expect(missing.status).toBe(400);

            const wrongType = await request(app)
                .post('/api/auth/login')
                .send({ email: ['david.lee@example.com'], password: 123 });
            expect(wrongType.status).toBe(400);
        });

        it('API-03 (AC-03): should reject login for inactive user account', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'robert.taylor@example.com', // Seeded as inactive
                    password: 'Password123!'
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/deactivated/i);
        });

        it('does not reveal inactive status when the password is wrong', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'robert.taylor@example.com', password: 'WrongPassword!' });

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/invalid email or password/i);
        });
    });

    describe('GET /api/auth/me', () => {
        it('should return authenticated user profile with valid token', async () => {
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'sarah.connor@example.com',
                    password: 'Password123!'
                });
            const token = loginRes.body.token;

            const meRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(meRes.status).toBe(200);
            expect(meRes.body.email).toBe('sarah.connor@example.com');
            expect(meRes.body.role).toBe('IT_STAFF');
            expect(meRes.body).not.toHaveProperty('passwordHash');
        });

        it('should reject request without authentication token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
        });

        it('should reject a tampered or malformed token', async () => {
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer not-a-real-token');
            expect(res.status).toBe(401);
        });

        it('should ignore the removed Lab 2 X-Requester-Id header (no identity without a token)', async () => {
            const me = await request(app).get('/api/auth/me').set('X-Requester-Id', '1');
            expect(me.status).toBe(401);

            const tickets = await request(app).get('/api/tickets').set('X-Requester-Id', '1');
            expect(tickets.status).toBe(401);
        });
    });

    describe('POST /api/auth/change-password', () => {
        beforeEach(async () => {
            await resetToInitialPassword('emily.watson@example.com');
            await resetToInitialPassword('elena.rostova@example.com');
        });

        afterAll(async () => {
            // Leave seeded first-login accounts in their documented state for other suites
            await resetToInitialPassword('emily.watson@example.com');
            await resetToInitialPassword('elena.rostova@example.com');
        });

        it('API-04 (AC-04): should change password and clear mustChangePassword flag', async () => {
            // Emily Watson is seeded with mustChangePassword: true and initial password 'Initial123!'
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'emily.watson@example.com',
                    password: 'Initial123!'
                });

            expect(loginRes.status).toBe(200);
            expect(loginRes.body.user.mustChangePassword).toBe(true);
            const token = loginRes.body.token;

            // Normal application APIs are blocked until the password is changed (BR-02)
            const blocked = await request(app)
                .get('/api/tickets')
                .set('Authorization', `Bearer ${token}`);
            expect(blocked.status).toBe(403);
            expect(blocked.body.mustChangePassword).toBe(true);

            const changeRes = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currentPassword: 'Initial123!',
                    newPassword: 'MyNewSecurePassword456!'
                });

            expect(changeRes.status).toBe(200);
            expect(changeRes.body.mustChangePassword).toBe(false);
            expect(changeRes.body).toHaveProperty('token');

            // The fresh token works immediately; the old one is revoked
            const allowed = await request(app)
                .get('/api/tickets')
                .set('Authorization', `Bearer ${changeRes.body.token}`);
            expect(allowed.status).toBe(200);

            const oldToken = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            expect(oldToken.status).toBe(401);

            const newLoginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'emily.watson@example.com',
                    password: 'MyNewSecurePassword456!'
                });
            expect(newLoginRes.status).toBe(200);
            expect(newLoginRes.body.user.mustChangePassword).toBe(false);
        });

        it('IT Staff can open the Ticket Queue right after a first-login password change', async () => {
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'elena.rostova@example.com', password: 'Initial123!' });

            const blocked = await request(app)
                .get('/api/staff/tickets')
                .set('Authorization', `Bearer ${loginRes.body.token}`);
            expect(blocked.status).toBe(403);

            const changeRes = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${loginRes.body.token}`)
                .send({ currentPassword: 'Initial123!', newPassword: 'StaffPassword789!' });
            expect(changeRes.status).toBe(200);

            const queue = await request(app)
                .get('/api/staff/tickets')
                .set('Authorization', `Bearer ${changeRes.body.token}`);
            expect(queue.status).toBe(200);
        });

        it.each([
            ['Abcdef1', 'shorter than 8 characters'],
            ['abcdefgh', 'without a number'],
            ['12345678', 'without a letter'],
            ['A1' + 'a'.repeat(71), 'longer than 72 characters'],
            ['Initial123!', 'equal to the current password'],
        ])('rejects new password %s (%s)', async (newPassword) => {
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'emily.watson@example.com', password: 'Initial123!' });

            const res = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${loginRes.body.token}`)
                .send({ currentPassword: 'Initial123!', newPassword });

            expect(res.status).toBe(400);
        });

        it('accepts a new password of exactly 8 characters', async () => {
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'emily.watson@example.com', password: 'Initial123!' });

            const res = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${loginRes.body.token}`)
                .send({ currentPassword: 'Initial123!', newPassword: 'Abcdef12' });

            expect(res.status).toBe(200);
        });

        it('should reject password change if current password is incorrect', async () => {
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'david.lee@example.com',
                    password: 'Password123!'
                });
            const token = loginRes.body.token;

            const res = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currentPassword: 'WrongCurrentPassword',
                    newPassword: 'BrandNewPassword123!'
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toMatch(/current password is incorrect/i);
        });
    });

    describe('POST /api/auth/logout', () => {
        it('API-05 (AC-05): should invalidate the session so the same token returns 401 afterwards', async () => {
            const loginRes = await request(app)
                .post('/api/auth/login')
                .send({ email: 'james.gordon@example.com', password: 'Password123!' });
            const token = loginRes.body.token;

            const before = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
            expect(before.status).toBe(200);

            const logoutRes = await request(app)
                .post('/api/auth/logout')
                .set('Authorization', `Bearer ${token}`);
            expect(logoutRes.status).toBe(200);
            expect(logoutRes.body).toHaveProperty('message');

            const after = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
            expect(after.status).toBe(401);

            const staffApi = await request(app).get('/api/staff/tickets').set('Authorization', `Bearer ${token}`);
            expect(staffApi.status).toBe(401);
        });

        it('should reject logout without a token', async () => {
            const res = await request(app).post('/api/auth/logout');
            expect(res.status).toBe(401);
        });
    });
});
