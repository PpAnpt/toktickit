import { describe, it, expect, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import {
    createDecoy, createScratchDatabase, databaseExists, dropDecoy, dropScratchDatabase, urlForDatabase, type ScratchDatabase,
} from './helpers/scratch-db';

/** Review of PR #41: the performance test must never drop a database it did not create. */
describe('Lab 4: scratch database safety (Issue #34)', () => {
    const decoy = `toktickit_perf_${randomBytes(4).toString('hex')}_keep`;
    afterAll(() => dropDecoy(decoy));

    it('a pre-existing database, even one with the scratch prefix, is never dropped by a forged or foreign handle', async () => {
        await createDecoy(decoy);
        const forged: ScratchDatabase = { name: decoy, url: urlForDatabase(decoy), dropped: false };
        expect(await dropScratchDatabase(forged)).toBe(false);
        expect(await databaseExists(decoy)).toBe(true);
    });

    it('each run gets a unique name, and only the handle it created can drop it, once', async () => {
        const first = await createScratchDatabase();
        const second = await createScratchDatabase();
        expect(first.name).not.toBe(second.name);
        expect(first.name).not.toBe('toktickit_perf');
        expect(await databaseExists(first.name)).toBe(true);

        expect(await dropScratchDatabase(first)).toBe(true);
        expect(await databaseExists(first.name)).toBe(false);
        expect(await dropScratchDatabase(first)).toBe(false);
        expect(await databaseExists(second.name)).toBe(true); // another run's database is untouched
        expect(await dropScratchDatabase(second)).toBe(true);
    });

    it('creating over an existing name fails instead of replacing it', async () => {
        const handle = await createScratchDatabase();
        await expect(createDecoy(handle.name)).rejects.toThrow(/already exists/);
        expect(await databaseExists(handle.name)).toBe(true);
        await dropScratchDatabase(handle);
    });
});
