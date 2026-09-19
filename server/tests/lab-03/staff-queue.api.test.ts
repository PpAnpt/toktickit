import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../../src/index';

describe('Lab 3: Staff Ticket Queue APIs (Issue 3)', () => {
    let requesterToken: string;
    let staffToken: string;
    let adminToken: string;
    let unexpiredMustChangePasswordToken: string;

    beforeAll(async () => {
        // Log in as Requester (David Lee)
        const reqRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'david.lee@example.com', password: 'Password123!' });
        requesterToken = reqRes.body.token;

        // Log in as IT Staff (Sarah Connor)
        const staffRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'sarah.connor@example.com', password: 'Password123!' });
        staffToken = staffRes.body.token;

        // Log in as Administrator (Admin System)
        const adminRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@example.com', password: 'Admin123!' });
        adminToken = adminRes.body.token;

        // Log in as user requiring password change (Emily Watson)
        const changeRes = await request(app)
            .post('/api/auth/login')
            .send({ email: 'emily.watson@example.com', password: 'Initial123!' });
        unexpiredMustChangePasswordToken = changeRes.body.token;
    });

    describe('API-07 (AC-07): Staff Queue Role Access Guard', () => {
        it('should return 401 Unauthorized if no token is provided', async () => {
            const res = await request(app).get('/api/staff/tickets');
            expect(res.status).toBe(401);
            expect(res.body).toHaveProperty('error');
        });

        it('should return 403 Forbidden when a Requester tries to access staff queue', async () => {
            const res = await request(app)
                .get('/api/staff/tickets')
                .set('Authorization', `Bearer ${requesterToken}`);

            expect(res.status).toBe(403);
            expect(res.body.error).toMatch(/insufficient permissions|access denied/i);
        });

        it('should return 403 Forbidden when a user with mustChangePassword=true accesses staff queue', async () => {
            const res = await request(app)
                .get('/api/staff/tickets')
                .set('Authorization', `Bearer ${unexpiredMustChangePasswordToken}`);

            expect(res.status).toBe(403);
            expect(res.body.mustChangePassword).toBe(true);
        });

        it('should return 200 OK and ticket list when IT Staff accesses staff queue', async () => {
            const res = await request(app)
                .get('/api/staff/tickets')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('tickets');
            expect(res.body).toHaveProperty('pagination');
            expect(Array.isArray(res.body.tickets)).toBe(true);
        });

        it('should return 200 OK when Administrator accesses staff queue', async () => {
            const res = await request(app)
                .get('/api/staff/tickets')
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('tickets');
            expect(Array.isArray(res.body.tickets)).toBe(true);
        });
    });

    describe('API-08 (AC-08, AC-09): Queue Query, Search, Filters & Pagination', () => {
        it('should return tickets with proper structure including requester and owner', async () => {
            const res = await request(app)
                .get('/api/staff/tickets')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            expect(res.body.tickets.length).toBeGreaterThan(0);
            const ticket = res.body.tickets[0];
            expect(ticket).toHaveProperty('id');
            expect(ticket).toHaveProperty('ticketNumber');
            expect(ticket).toHaveProperty('summary');
            expect(ticket).toHaveProperty('status');
            expect(ticket).toHaveProperty('requestedPriority');
            expect(ticket).toHaveProperty('itPriority');
            expect(ticket).toHaveProperty('requester');
            expect(ticket.requester).toHaveProperty('name');
        });

        it('should filter queue by status', async () => {
            const res = await request(app)
                .get('/api/staff/tickets?status=New')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            res.body.tickets.forEach((t: any) => {
                expect(t.status).toBe('New');
            });
        });

        it('should filter queue by human-readable mapped status (In Progress)', async () => {
            const res = await request(app)
                .get('/api/staff/tickets?status=In Progress')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            res.body.tickets.forEach((t: any) => {
                expect(t.status).toMatch(/In Progress|InProgress/);
            });
        });

        it('should filter queue by priority', async () => {
            const res = await request(app)
                .get('/api/staff/tickets?priority=HIGH')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            res.body.tickets.forEach((t: any) => {
                expect(t.itPriority === 'HIGH' || t.requestedPriority === 'HIGH').toBe(true);
            });
        });

        it('should filter queue by unassigned owner', async () => {
            const res = await request(app)
                .get('/api/staff/tickets?owner=unassigned')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            res.body.tickets.forEach((t: any) => {
                expect(t.owner).toBeNull();
            });
        });

        it('should search tickets by keyword in summary or ticketNumber', async () => {
            const res = await request(app)
                .get('/api/staff/tickets?search=display')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            res.body.tickets.forEach((t: any) => {
                const text = `${t.ticketNumber} ${t.summary} ${t.requester.name}`.toLowerCase();
                expect(text).toContain('display');
            });
        });

        it('should paginate queue with custom page and limit', async () => {
            const res = await request(app)
                .get('/api/staff/tickets?page=1&limit=1')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            expect(res.body.tickets.length).toBeLessThanOrEqual(1);
            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.limit).toBe(1);
            expect(res.body.pagination.total).toBeGreaterThan(0);
            expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);
        });

        it('should sort tickets by createdAt ascending and descending', async () => {
            const resAsc = await request(app)
                .get('/api/staff/tickets?sortBy=createdAt&sortOrder=asc')
                .set('Authorization', `Bearer ${staffToken}`);

            const resDesc = await request(app)
                .get('/api/staff/tickets?sortBy=createdAt&sortOrder=desc')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(resAsc.status).toBe(200);
            expect(resDesc.status).toBe(200);
            if (resAsc.body.tickets.length > 1 && resDesc.body.tickets.length > 1) {
                const firstAscDate = new Date(resAsc.body.tickets[0].createdAt).getTime();
                const lastAscDate = new Date(resAsc.body.tickets[resAsc.body.tickets.length - 1].createdAt).getTime();
                expect(firstAscDate).toBeLessThanOrEqual(lastAscDate);
            }
        });
    });

    describe('GET /api/staff/members', () => {
        it('should return list of active staff and admin members', async () => {
            const res = await request(app)
                .get('/api/staff/members')
                .set('Authorization', `Bearer ${staffToken}`);

            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBeGreaterThan(0);
            res.body.forEach((member: any) => {
                expect(['IT_STAFF', 'ADMINISTRATOR']).toContain(member.role);
                expect(member).toHaveProperty('id');
                expect(member).toHaveProperty('name');
                expect(member).toHaveProperty('email');
            });
        });
    });
});
