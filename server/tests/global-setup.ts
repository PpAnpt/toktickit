import { execSync } from 'child_process';
import { Client } from 'pg';

/**
 * Runs once before the API test suites. Tests use a dedicated database (see vitest.config.mts)
 * so they never add test tickets to the development data:
 *   1. create the test database if it does not exist,
 *   2. apply the committed migrations (on a new database this replays the full
 *      Lab 1 → Lab 2 → Lab 3 migration history),
 *   3. run the idempotent seed so the documented accounts are in their initial state.
 * Nothing is dropped or truncated; the suites are written to be re-runnable.
 */
export default async function setup() {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) {
        throw new Error('TEST_DATABASE_URL is not set (see vitest.config.mts)');
    }

    const target = new URL(url);
    const dbName = decodeURIComponent(target.pathname.replace(/^\//, ''));
    const admin = new URL(url);
    admin.pathname = '/postgres';
    admin.search = '';

    const client = new Client({ connectionString: admin.toString() });
    await client.connect();
    try {
        const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (exists.rowCount === 0) {
            await client.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
        }
    } finally {
        await client.end();
    }

    const options = { env: { ...process.env, DATABASE_URL: url }, cwd: `${__dirname}/..`, stdio: 'pipe' as const };
    execSync('npx prisma migrate deploy', options);
    execSync('npx tsx prisma/seed.ts', options);
}
