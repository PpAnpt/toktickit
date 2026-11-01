import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import request from 'supertest';
import { Client } from 'pg';
import { hashPassword } from '../../src/utils/auth';

/**
 * PERF-01 / PERF-02 (AC-30): performance smoke on a generated fixture, following docs/lab-04/tests.md section 6.
 * The fixture lives in its own database (`toktickit_perf`), created and dropped by this test; the test and
 * development databases are never touched. The application is imported after DATABASE_URL points there.
 */
const PERF_DB = 'toktickit_perf';
const SERVER_DIR = path.resolve(__dirname, '../..');
const PASSWORD = 'Password123!';
const WARM_UP = 3;
const TIMED = 30;
const LIMIT_MS = 1000;

const urlFor = (db: string) => {
    const url = new URL(process.env.DATABASE_URL!);
    url.pathname = `/${db}`;
    return url.toString();
};
const admin = async <T>(fn: (c: Client) => Promise<T>) => {
    const client = new Client({ connectionString: urlFor('postgres') });
    await client.connect();
    try { return await fn(client); } finally { await client.end(); }
};

type Summary = { endpoint: string; min: number; median: number; p95: number; max: number };
const summaries: Summary[] = [];

describe('Lab 4: performance smoke (Issue #34)', () => {
    let app: import('express').Express;
    let tokens: { requester: string; staff: string; admin: string };
    let bigTicketId: number;
    let firstActionId: number;
    let sizes: Record<string, number> = {};
    let header = '';

    beforeAll(async () => {
        const testUrl = process.env.DATABASE_URL!;
        await admin(async c => {
            await c.query(`DROP DATABASE IF EXISTS "${PERF_DB}" WITH (FORCE)`);
            await c.query(`CREATE DATABASE "${PERF_DB}"`);
        });
        const perfUrl = urlFor(PERF_DB);
        execSync('npx prisma migrate deploy', { cwd: SERVER_DIR, env: { ...process.env, DATABASE_URL: perfUrl }, stdio: 'pipe' });

        const hash = await hashPassword(PASSWORD);
        const db = new Client({ connectionString: perfUrl });
        await db.connect();
        await db.query('SELECT setseed(0.4242)');
        await db.query(`INSERT INTO "Category"("name") VALUES ('Perf category'); INSERT INTO "RelatedSystem"("name") VALUES ('Perf system')`);
        // 100 users: 80 Requesters, 18 IT Staff, 2 Administrators
        await db.query(`INSERT INTO "User"("name","email","passwordHash","role","isActive","mustChangePassword","updatedAt")
            SELECT 'Perf User ' || g, 'perf' || g || '@example.com', $1,
                   (CASE WHEN g <= 80 THEN 'REQUESTER' WHEN g <= 98 THEN 'IT_STAFF' ELSE 'ADMINISTRATOR' END)::"UserRole", true, false, now()
            FROM generate_series(1, 100) g`, [hash]);
        const base = (await db.query('SELECT min("id")::int AS id FROM "User"')).rows[0].id as number;
        // 5,000 Tickets across all statuses and priorities; the first 60 belong to the measured Requester
        await db.query(`INSERT INTO "Ticket"("ticketNumber","summary","description","status","requestedPriority","itPriority","requesterId","ownerId",
                "categoryId","relatedSystemId","createdAt","updatedAt","resolvedAt")
            SELECT 'PERF-' || g, 'Perf ticket ' || g, 'Generated for the performance smoke',
                   (ARRAY['New','Open','In Progress','Waiting for Requester','Resolved','Closed','Reopened','Cancelled'])[1 + g % 8]::"TicketStatus",
                   (ARRAY['LOW','MEDIUM','HIGH','URGENT'])[1 + g % 4]::"TicketPriority",
                   (ARRAY['LOW','MEDIUM','HIGH','URGENT'])[1 + (g / 3) % 4]::"TicketPriority",
                   CASE WHEN g <= 60 THEN $1 ELSE $1 + (g % 80) END,
                   CASE WHEN g % 3 = 0 THEN NULL ELSE $1 + 80 + (g % 18) END,
                   (SELECT min("id") FROM "Category"), (SELECT min("id") FROM "RelatedSystem"),
                   now() - (g % 40) * interval '1 day', now() - (g % 12) * interval '1 day',
                   CASE WHEN g % 8 IN (4, 5) THEN now() - (g % 12) * interval '1 day' END
            FROM generate_series(1, 5000) g`, [base]);
        const firstTicket = (await db.query('SELECT min("id")::int AS id FROM "Ticket"')).rows[0].id as number;
        bigTicketId = firstTicket;
        // 20,000 actions in all four statuses; Ticket 1 has 2,000 of them
        await db.query(`INSERT INTO "ActionTaken"("ticketId","performedById","assigneeId","status","actionAt","description","result","createdAt","updatedAt")
            SELECT CASE WHEN g <= 2000 THEN $2 ELSE $2 + 1 + (g % 4999) END, $1 + 80 + (g % 18), $1 + 80 + ((g + 1) % 18),
                   (ARRAY['Planned','In Progress','Completed','Cancelled'])[1 + g % 4]::"ActionStatus",
                   now() - (g % 2000) * interval '1 minute', 'Perf action ' || g, 'Done', now(), now()
            FROM generate_series(1, 20000) g`, [base, firstTicket]);
        await db.query(`INSERT INTO "ActionTakenRevision"("actionId","ticketId","revisionNo","type","actorId","changedFields","before","after")
            SELECT a."id", a."ticketId", 1, 'CREATED'::"ActionRevisionType", a."performedById", ARRAY[]::text[], NULL, '{}'::jsonb FROM "ActionTaken" a`);
        await db.query(`INSERT INTO "TicketEvent"("ticketId","type","fromValue","toValue","actorId")
            SELECT $2 + (g % 5000), 'STATUS_CHANGED'::"TicketEventType", 'New', 'Open', $1 + 80 + (g % 18) FROM generate_series(1, 10000) g`, [base, firstTicket]);
        firstActionId = (await db.query('SELECT min("id")::int AS id FROM "ActionTaken"')).rows[0].id as number;
        await db.query('ANALYZE');
        for (const [name, table] of [['users', 'User'], ['tickets', 'Ticket'], ['actions', 'ActionTaken'], ['revisions', 'ActionTakenRevision'], ['events', 'TicketEvent']]) {
            sizes[name] = (await db.query(`SELECT count(*)::int AS n FROM "${table}"`)).rows[0].n;
        }
        const version = (await db.query('SHOW server_version')).rows[0].server_version;
        await db.end();
        header = `${os.platform()} ${os.release()} | ${os.cpus()[0]?.model} | ${Math.round(os.totalmem() / 2 ** 30)} GB RAM | Node ${process.version} | PostgreSQL ${version}`;

        // The application reads DATABASE_URL when it first needs the database, so point it at the fixture before importing
        process.env.DATABASE_URL = perfUrl;
        const mod = (await import('../../src/index.js')) as any;
        app = mod.default?.default ?? mod.default;
        const login = async (email: string) => (await request(app).post('/api/auth/login').send({ email, password: PASSWORD })).body.token as string;
        tokens = { requester: await login('perf1@example.com'), staff: await login('perf81@example.com'), admin: await login('perf99@example.com') };
        process.env.DATABASE_URL = testUrl;
    }, 300_000);

    afterAll(async () => {
        const out = path.resolve(SERVER_DIR, '../artifacts/lab-04/performance');
        mkdirSync(out, { recursive: true });
        writeFileSync(path.join(out, 'summary.json'), JSON.stringify({ environment: header, fixture: sizes, limitMs: LIMIT_MS, results: summaries }, null, 2));
        const { getPrisma } = await import('../../src/prisma.js');
        await getPrisma().$disconnect();
        await admin(c => c.query(`DROP DATABASE IF EXISTS "${PERF_DB}" WITH (FORCE)`));
    }, 60_000);

    async function measure(endpoint: string, token: () => string, pathOf: () => string) {
        for (let i = 0; i < WARM_UP; i++) expect((await request(app).get(pathOf()).set('Authorization', `Bearer ${token()}`)).status).toBe(200);
        const times: number[] = [];
        for (let i = 0; i < TIMED; i++) {
            const start = performance.now();
            const res = await request(app).get(pathOf()).set('Authorization', `Bearer ${token()}`);
            times.push(performance.now() - start);
            expect(res.status, endpoint).toBe(200);
        }
        times.sort((a, b) => a - b);
        const round = (n: number) => Math.round(n * 10) / 10;
        const summary = { endpoint, min: round(times[0]), median: round(times[Math.floor(TIMED / 2)]), p95: round(times[Math.ceil(TIMED * 0.95) - 1]), max: round(times[TIMED - 1]) };
        summaries.push(summary);
        console.log(`[perf] ${endpoint}: min ${summary.min} ms, median ${summary.median} ms, p95 ${summary.p95} ms, max ${summary.max} ms`);
        expect(summary.p95, `${endpoint} p95 with fixture ${JSON.stringify(sizes)}`).toBeLessThan(LIMIT_MS);
    }

    it('fixture has the documented shape', () => {
        expect(sizes).toMatchObject({ users: 100, tickets: 5000, actions: 20000, revisions: 20000, events: 10000 });
    });

    it('PERF-01: Requester dashboard p95 under 1 second', () => measure('GET /api/dashboard/requester', () => tokens.requester, () => '/api/dashboard/requester'), 120_000);
    it('PERF-01: IT Staff dashboard p95 under 1 second', () => measure('GET /api/dashboard/staff (IT Staff)', () => tokens.staff, () => '/api/dashboard/staff'), 120_000);
    it('PERF-01: Administrator dashboard p95 under 1 second', () => measure('GET /api/dashboard/staff (Administrator)', () => tokens.admin, () => '/api/dashboard/staff'), 120_000);
    it('PERF-02: Actions list of the 2,000-action Ticket p95 under 1 second', () =>
        measure('GET /api/tickets/:id/actions?limit=20', () => tokens.staff, () => `/api/tickets/${bigTicketId}/actions?limit=20`), 120_000);
    it('PERF-02: first page of the revisions of an action p95 under 1 second', async () => {
        await measure('GET /api/staff/tickets/:id/actions/:actionId/revisions', () => tokens.staff, () => `/api/staff/tickets/${bigTicketId}/actions/${firstActionId}/revisions?limit=20`);
    }, 120_000);
    it('PERF-02: first page of the Ticket events history p95 under 1 second', () =>
        measure('GET /api/tickets/:id/events', () => tokens.staff, () => `/api/staff/tickets/${bigTicketId}/events?limit=20`), 120_000);
});
