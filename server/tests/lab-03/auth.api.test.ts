import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

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

        it('API-02 (AC-02): should reject login for non-existent email', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'nonexistent@example.com',
                    password: 'Password123!'
                });

            expect(res.status).toBe(401);
            expect(res.body.error).toMatch(/invalid email or password/i);
        });

        it('should return 400 if email or password is missing', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({ email: 'david.lee@example.com' });

            expect(res.status).toBe(400);
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
    });

    describe('GET /api/auth/me', () => {
        it('should return authenticated user profile with valid token', async () => {
            // First login to obtain token
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
        });

        it('should reject request without authentication token', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
        });
    });

    describe('POST /api/auth/change-password', () => {
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

            // Change password
            const changeRes = await request(app)
                .post('/api/auth/change-password')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    currentPassword: 'Initial123!',
                    newPassword: 'MyNewSecurePassword456!'
                });

            expect(changeRes.status).toBe(200);
            expect(changeRes.body.mustChangePassword).toBe(false);

            // Verify can now login with new password
            const newLoginRes = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'emily.watson@example.com',
                    password: 'MyNewSecurePassword456!'
                });
            expect(newLoginRes.status).toBe(200);
            expect(newLoginRes.body.user.mustChangePassword).toBe(false);
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
        it('API-05 (AC-05): should acknowledge logout request', async () => {
            const res = await request(app).post('/api/auth/logout');
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });
    });
});
