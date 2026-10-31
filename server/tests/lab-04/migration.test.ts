import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { Client } from 'pg';
import { assertTestDatabase } from './helpers';

/**
 * MIG-01..04: Lab 3 -> Lab 4 migration on scratch databases, never on the development or test data.
 * Recovery (specification 7.4) is a restore of a pre-upgrade pg_dump, so MIG-02 needs the
 * PostgreSQL tools of the local-postgres container (the same one the lab database runs in).
 */
const SERVER_DIR = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(SERVER_DIR, 'prisma/migrations');
const LAB4_MIGRATION = readdirSync(MIGRATIONS_DIR).find(name => name.endsWith('_lab4_actions_taken'))!;
const suffix = Math.random().toString(36).slice(2, 8);
const SOURCE_DB = `toktickit_lab4_verify_mig_${suffix}`;
const RECOVERY_DB = `toktickit_lab4_verify_rec_${suffix}`;
const PG_CONTAINER = process.env.LAB4_PG_CONTAINER ?? 'local-postgres';

function urlFor(dbName: string) {
    const url = new URL(process.env.DATABASE_URL!);
    url.pathname = `/${dbName}`;
    return url.toString();
}
function adminClient() {
    const url = new URL(process.env.DATABASE_URL!);
    url.pathname = '/postgres';
    return new Client({ connectionString: url.toString() });
}
async function createDatabase(name: string) {
    expect(name).toMatch(/^toktickit_lab4_verify_/);
    const admin = adminClient();
    await admin.connect();
    try {
        await admin.query(`CREATE DATABASE "${name}"`);
    } finally {
        await admin.end();
    }
}
async function dropDatabase(name: string) {
    const admin = adminClient();
    await admin.connect();
    try {
        await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    } finally {
        await admin.end();
    }
}
async function withDb<T>(name: string, fn: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString: urlFor(name) });
    await client.connect();
    try {
        return await fn(client);
    } finally {
        await client.end();
    }
}
function prisma(args: string, dbName: string, extra: string = '') {
    return execSync(`npx prisma ${args} ${extra}`.trim(), {
        cwd: SERVER_DIR, env: { ...process.env, DATABASE_URL: urlFor(dbName) }, stdio: 'pipe',
    }).toString();
}

const counts = async (client: Client) => {
    const result: Record<string, number> = {};
    for (const table of ['User', 'Category', 'RelatedSystem', 'Ticket', 'Attachment', 'PublicComment', 'InternalNote']) {
        result[table] = Number((await client.query(`SELECT count(*) FROM "${table}"`)).rows[0].count);
    }
    return result;
};
const ownership = async (client: Client) =>
    (await client.query('SELECT id, "requesterId", "ownerId", status::text AS status FROM "Ticket" ORDER BY id')).rows;

describe('Lab 4: migration, backfill and recovery (Issue #31)', () => {
    let tempDir: string;
    let baseline: { counts: Record<string, number>; tickets: unknown[]; migrations: string[] };
    let dump: Buffer;

    beforeAll(async () => {
        assertTestDatabase();
        await createDatabase(SOURCE_DB);

        // Baseline = Labs 1 to 3 only: copy the earlier migrations into a temporary migrations folder
        tempDir = mkdtempSync(path.join(tmpdir(), 'lab4-mig-'));
        const baselineDir = path.join(tempDir, 'migrations');
        mkdirSync(baselineDir);
        copyFileSync(path.join(MIGRATIONS_DIR, 'migration_lock.toml'), path.join(baselineDir, 'migration_lock.toml'));
        for (const name of readdirSync(MIGRATIONS_DIR)) {
            if (name !== LAB4_MIGRATION && existsSync(path.join(MIGRATIONS_DIR, name, 'migration.sql'))) {
                cpSync(path.join(MIGRATIONS_DIR, name), path.join(baselineDir, name), { recursive: true });
            }
        }
        // The config lives inside the server project's node_modules so "prisma/config" resolves
        const configDir = path.join(SERVER_DIR, 'node_modules', '.cache', 'lab4-migration-test');
        mkdirSync(configDir, { recursive: true });
        const configPath = path.join(configDir, `prisma.baseline.${suffix}.config.ts`);
        writeFileSync(configPath, `import { defineConfig } from 'prisma/config'
export default defineConfig({
    schema: ${JSON.stringify(path.join(SERVER_DIR, 'prisma/schema.prisma'))},
    migrations: { path: ${JSON.stringify(baselineDir)} },
    datasource: { url: process.env.DATABASE_URL! },
})
`);
        try {
            prisma('migrate deploy', SOURCE_DB, `--config "${configPath}"`);
        } finally {
            rmSync(configPath, { force: true });
        }

        // Lab 3 data that must survive the upgrade
        await withDb(SOURCE_DB, async client => {
            await client.query(`INSERT INTO "Category"(name) VALUES ('Hardware')`);
            await client.query(`INSERT INTO "RelatedSystem"(name) VALUES ('VPN')`);
            await client.query(`INSERT INTO "User"(name, email, "passwordHash", role, "updatedAt") VALUES
                ('Requester One', 'r1@example.com', 'hash', 'REQUESTER', now()),
                ('Staff One', 's1@example.com', 'hash', 'IT_STAFF', now())`);
            await client.query(`INSERT INTO "Ticket"("ticketNumber", summary, description, status, "requesterId", "ownerId", "categoryId", "relatedSystemId", "updatedAt", "createdAt") VALUES
                ('OLD-1', 's', 'd', 'Open', 1, 2, 1, 1, '2026-09-01T10:00:00Z', '2026-09-01T08:00:00Z'),
                ('OLD-2', 's', 'd', 'Resolved', 1, 2, 1, 1, '2026-09-03T10:00:00Z', '2026-09-01T08:00:00Z'),
                ('OLD-3', 's', 'd', 'Closed', 1, 2, 1, 1, '2026-09-05T10:00:00Z', '2026-09-01T08:00:00Z'),
                ('OLD-4', 's', 'd', 'Cancelled', 1, NULL, 1, 1, '2026-09-06T10:00:00Z', '2026-09-01T08:00:00Z')`);
            await client.query(`INSERT INTO "Attachment"("originalFileName", "storedFileName", size, "mimeType", "ticketId") VALUES ('a.png', 'stored-a.png', 10, 'image/png', 1)`);
            await client.query(`INSERT INTO "PublicComment"(content, "ticketId", "authorId") VALUES ('hello', 1, 1)`);
            await client.query(`INSERT INTO "InternalNote"(content, "ticketId", "authorId") VALUES ('private', 1, 2)`);
        });

        baseline = await withDb(SOURCE_DB, async client => ({
            counts: await counts(client),
            tickets: await ownership(client),
            migrations: (await client.query('SELECT migration_name FROM _prisma_migrations ORDER BY migration_name')).rows.map(r => r.migration_name),
        }));

        // Pre-upgrade dump for MIG-02 (specification 7.4)
        const result = spawnSync('docker', ['exec', PG_CONTAINER, 'pg_dump', '-U', 'postgres', '-Fc', SOURCE_DB], { maxBuffer: 64 * 1024 * 1024, timeout: 60000 });
        if (result.status !== 0) throw new Error(`pg_dump failed: ${result.stderr?.toString() || result.error}`);
        dump = result.stdout;

        // The upgrade itself: the normal migrate deploy applies only the Lab 4 migration
        prisma('migrate deploy', SOURCE_DB);
    }, 180000);

    afterAll(async () => {
        await dropDatabase(SOURCE_DB);
        await dropDatabase(RECOVERY_DB);
        if (tempDir) rmSync(tempDir, { recursive: true, force: true });
    });

    it('MIG-01: Lab 3 data is preserved, the Lab 4 objects exist, and the schema matches schema.prisma', async () => {
        await withDb(SOURCE_DB, async client => {
            expect(await counts(client)).toEqual(baseline.counts);
            expect(await ownership(client)).toEqual(baseline.tickets);
            const tables = (await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`)).rows.map(r => r.table_name);
            expect(tables).toEqual(expect.arrayContaining(['ActionTaken', 'ActionTakenRevision', 'TicketEvent']));
            const enums = (await client.query(`SELECT typname FROM pg_type WHERE typtype = 'e'`)).rows.map(r => r.typname);
            expect(enums).toEqual(expect.arrayContaining(['ActionStatus', 'ActionRevisionType', 'TicketEventType']));
            const triggers = (await client.query(`SELECT tgname FROM pg_trigger WHERE NOT tgisinternal`)).rows.map(r => r.tgname);
            expect(triggers).toEqual(expect.arrayContaining(['ActionTakenRevision_immutable', 'TicketEvent_immutable']));
            const applied = (await client.query('SELECT migration_name FROM _prisma_migrations ORDER BY migration_name')).rows.map(r => r.migration_name);
            expect(applied).toEqual([...baseline.migrations, LAB4_MIGRATION].sort());
        });
        // prisma migrate diff exits non-zero (and execSync throws) when the database differs from the schema
        const output = prisma('migrate diff', SOURCE_DB, '--from-config-datasource --to-schema prisma/schema.prisma --exit-code');
        expect(output).toContain('No difference detected');
    }, 120000);

    it('MIG-03: resolvedAt is backfilled from updatedAt for Resolved/Closed Tickets; legacy Tickets have no actions', async () => {
        await withDb(SOURCE_DB, async client => {
            const rows = (await client.query(
                `SELECT "ticketNumber", status::text AS status, "updatedAt", "resolvedAt" FROM "Ticket" ORDER BY id`)).rows;
            for (const row of rows) {
                if (row.status === 'Resolved' || row.status === 'Closed') {
                    expect(row.resolvedAt?.getTime()).toBe(row.updatedAt.getTime());
                } else {
                    expect(row.resolvedAt).toBeNull();
                }
            }
            expect(Number((await client.query('SELECT count(*) FROM "ActionTaken"')).rows[0].count)).toBe(0);
        });
    });

    it('MIG-04: Restrict foreign keys block deletes; TRUNCATE cleanup works but the helper refuses non-test databases', async () => {
        await withDb(SOURCE_DB, async client => {
            await client.query(`INSERT INTO "ActionTaken"("ticketId", "performedById", "assigneeId", "actionAt", description) VALUES (1, 2, 2, now(), 'a')`);
            await client.query(`INSERT INTO "ActionTakenRevision"("actionId", "ticketId", "revisionNo", type, "actorId", "changedFields", after) VALUES (1, 1, 1, 'CREATED', 2, '{}', '{}')`);
            await expect(client.query('DELETE FROM "Ticket" WHERE id = 1')).rejects.toThrow(/violates RESTRICT|violates foreign key/);
            await expect(client.query('DELETE FROM "ActionTaken" WHERE id = 1')).rejects.toThrow(/violates RESTRICT|violates foreign key/);
            await expect(client.query(`UPDATE "ActionTakenRevision" SET "revisionNo" = 2`)).rejects.toThrow(/append-only/);
            expect(Number((await client.query('SELECT count(*) FROM "Ticket"')).rows[0].count)).toBe(baseline.counts.Ticket);

            await client.query('TRUNCATE "ActionTakenRevision", "TicketEvent", "ActionTaken"');
            expect(Number((await client.query('SELECT count(*) FROM "ActionTaken"')).rows[0].count)).toBe(0);
        });

        const original = process.env.DATABASE_URL;
        process.env.DATABASE_URL = urlFor(SOURCE_DB); // name does not end with _test
        try {
            expect(() => assertTestDatabase()).toThrow(/must end with _test/);
        } finally {
            process.env.DATABASE_URL = original;
        }
    });

    it('MIG-02: a pre-upgrade pg_dump restores into a clean database with the Lab 3 schema, data and migration history, and the upgrade can be applied again', async () => {
        await createDatabase(RECOVERY_DB);
        const restore = spawnSync('docker', ['exec', '-i', PG_CONTAINER, 'pg_restore', '-U', 'postgres', '--exit-on-error', '-d', RECOVERY_DB],
            { input: dump, maxBuffer: 64 * 1024 * 1024, timeout: 60000 });
        if (restore.status !== 0) throw new Error(`pg_restore failed: ${restore.stderr?.toString() || restore.error}`);

        await withDb(RECOVERY_DB, async client => {
            expect(await counts(client)).toEqual(baseline.counts);
            expect(await ownership(client)).toEqual(baseline.tickets);
            const tables = (await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`)).rows.map(r => r.table_name);
            expect(tables).not.toEqual(expect.arrayContaining(['ActionTaken']));
            expect(tables).not.toEqual(expect.arrayContaining(['TicketEvent']));
            const enums = (await client.query(`SELECT typname FROM pg_type WHERE typtype = 'e'`)).rows.map(r => r.typname);
            expect(enums).not.toContain('ActionStatus');
            const columns = (await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'Ticket'`)).rows.map(r => r.column_name);
            expect(columns).not.toContain('resolvedAt');
            const history = (await client.query('SELECT migration_name FROM _prisma_migrations ORDER BY migration_name')).rows.map(r => r.migration_name);
            expect(history).toEqual(baseline.migrations);
        });

        // The recovered database accepts the Lab 4 migration again
        prisma('migrate deploy', RECOVERY_DB);
        await withDb(RECOVERY_DB, async client => {
            const history = (await client.query('SELECT migration_name FROM _prisma_migrations ORDER BY migration_name')).rows.map(r => r.migration_name);
            expect(history).toContain(LAB4_MIGRATION);
            expect(Number((await client.query(`SELECT count(*) FROM "ActionTaken"`)).rows[0].count)).toBe(0);
        });
    }, 180000);
});
