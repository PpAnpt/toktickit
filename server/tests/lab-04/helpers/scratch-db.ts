import { randomBytes } from 'crypto';
import { Client } from 'pg';
import { assertTestDatabase } from '../helpers';

/**
 * A scratch database for destructive set-ups (the performance fixture). Safety rules:
 *  - only usable while DATABASE_URL names a `_test` database (explicit opt-in by environment),
 *  - the name is unique per run and created with a plain CREATE DATABASE, so an existing database is never replaced,
 *  - only a handle returned by `createScratchDatabase` can be dropped, and only once.
 */
export interface ScratchDatabase {
    readonly name: string;
    readonly url: string;
    dropped: boolean;
}

const PREFIX = 'toktickit_perf_';
const created = new WeakSet<ScratchDatabase>();

export function urlForDatabase(name: string): string {
    const url = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/');
    url.pathname = `/${name}`;
    return url.toString();
}

async function withAdmin<T>(fn: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString: urlForDatabase('postgres') });
    await client.connect();
    try { return await fn(client); } finally { await client.end(); }
}

export async function createScratchDatabase(): Promise<ScratchDatabase> {
    assertTestDatabase();
    const name = `${PREFIX}${randomBytes(6).toString('hex')}`;
    await withAdmin(client => client.query(`CREATE DATABASE "${name}"`)); // fails if the name exists
    const handle: ScratchDatabase = { name, url: urlForDatabase(name), dropped: false };
    created.add(handle);
    return handle;
}

/** Drops the database this run created; anything else (a forged handle, a second call) is refused without touching the server */
export async function dropScratchDatabase(handle: ScratchDatabase): Promise<boolean> {
    if (!created.has(handle) || handle.dropped || !handle.name.startsWith(PREFIX)) return false;
    handle.dropped = true;
    await withAdmin(client => client.query(`DROP DATABASE IF EXISTS "${handle.name}" WITH (FORCE)`));
    return true;
}

export const databaseExists = (name: string) =>
    withAdmin(async client => (await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name])).rowCount === 1);

/** Test-only: a database that must survive, created outside the handle mechanism */
export const createDecoy = (name: string) => withAdmin(client => client.query(`CREATE DATABASE "${name}"`));
export const dropDecoy = (name: string) => withAdmin(client => client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`));
