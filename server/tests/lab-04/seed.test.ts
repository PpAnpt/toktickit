import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import { getPrisma } from '../../src/prisma';
import { truncateLab4Tables } from './helpers';

/**
 * SEED-01 / SEED-02 (AC-24, AC-39): the Lab 4 seed is idempotent and covers the states the
 * dashboards and the Actions Taken demonstration need. The seed runs against the test database.
 */
const SERVER_DIR = path.resolve(__dirname, '../..');
const runSeed = () => execSync('npx tsx prisma/seed.ts', { cwd: SERVER_DIR, env: process.env, stdio: 'pipe' }).toString();

async function totals() {
    const prisma = getPrisma();
    return {
        users: await prisma.user.count(),
        tickets: await prisma.ticket.count(),
        actions: await prisma.actionTaken.count(),
        revisions: await prisma.actionTakenRevision.count(),
        comments: await prisma.publicComment.count(),
        notes: await prisma.internalNote.count(),
    };
}

describe('Lab 4: seed data (Issue #31)', () => {
    afterAll(async () => {
        await getPrisma().$disconnect();
    });

    it('SEED-01: running the seed twice creates no duplicate users, Tickets, or actions', async () => {
        await truncateLab4Tables();
        const first = runSeed();
        expect(first).toMatch(/Seeded \d+ new Actions Taken/);
        const afterFirst = await totals();
        expect(afterFirst.actions).toBeGreaterThan(0);

        const second = runSeed();
        expect(second).toContain('Seeded 0 new Actions Taken');
        expect(await totals()).toEqual(afterFirst);
    }, 120000);

    it('SEED-02 / AC-39: the seed demonstrates zero, one and many actions, all statuses, assignees, revisions and follow-up', async () => {
        const prisma = getPrisma();
        const actions = await prisma.actionTaken.findMany({ include: { assignee: true, ticket: true, revisions: true } });
        const byTicket = new Map<number, typeof actions>();
        for (const a of actions) byTicket.set(a.ticketId, [...(byTicket.get(a.ticketId) ?? []), a]);

        const ticketCount = await prisma.ticket.count();
        expect(ticketCount - byTicket.size).toBeGreaterThan(0);                       // Tickets with zero actions
        expect([...byTicket.values()].some(list => list.length === 1)).toBe(true);    // exactly one
        const showcase = [...byTicket.values()].find(list => list.length >= 4)!;      // several
        expect(showcase).toBeDefined();
        expect(new Set(showcase.map(a => a.status))).toEqual(new Set(['Planned', 'InProgress', 'Completed', 'Cancelled']));
        expect(new Set(showcase.map(a => a.assigneeId)).size).toBeGreaterThanOrEqual(3);
        expect(new Set(showcase.map(a => a.performedById)).size).toBeGreaterThanOrEqual(2);

        // An action assigned to the inactive staff member (rejection is demonstrated when reassigning)
        expect(actions.some(a => !a.assignee.isActive)).toBe(true);
        // Edited actions have several revisions with stable numbering
        const edited = actions.filter(a => a.revisions.length > 1);
        expect(edited.length).toBeGreaterThanOrEqual(2);
        for (const a of edited) {
            expect(a.revisions.map(r => r.revisionNo).sort((x, y) => x - y)).toEqual(a.revisions.map((_, i) => i + 1));
        }
        // Follow-up with a note
        expect(actions.some(a => a.followUpRequired && a.followUpNote)).toBe(true);
        // Reopened Ticket: old completed work plus new planned work (BR-41 allows Planned after reopening)
        const reopened = actions.filter(a => a.ticket.status === 'Reopened');
        expect(reopened.some(a => a.status === 'Completed') && reopened.some(a => a.status === 'Planned')).toBe(true);
        // The resolution gate holds for seeded Resolved/Closed Tickets: completed work, nothing open
        for (const status of ['Resolved', 'Closed'] as const) {
            const withActions = actions.filter(a => a.ticket.status === status);
            expect(withActions.length).toBeGreaterThan(0);
            expect(withActions.some(a => a.status === 'Completed')).toBe(true);
            expect(withActions.some(a => a.status === 'Planned' || a.status === 'InProgress')).toBe(false);
        }
        // Resolved/Closed seed Tickets carry a resolution time for the dashboards
        const resolved = await prisma.ticket.findMany({ where: { status: { in: ['Resolved', 'Closed'] } } });
        expect(resolved.every(t => t.resolvedAt !== null)).toBe(true);
    });
});
