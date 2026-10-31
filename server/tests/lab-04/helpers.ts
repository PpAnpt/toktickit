import { randomUUID } from 'crypto';
import { getPrisma } from '../../src/prisma';
import { TicketStatus } from '../../generated/prisma/client';

/**
 * Lab 4 test helpers. The history tables are insert-only (BR-37) and every Lab 4 foreign key is
 * ON DELETE RESTRICT (BR-40), so fixtures cannot be removed with DELETE. Cleanup truncates the
 * three Lab 4 tables, and only on the dedicated test database; it refuses to run anywhere else.
 */
export function assertTestDatabase() {
    const name = decodeURIComponent(new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/').pathname.replace(/^\//, ''));
    if (!name.endsWith('_test')) {
        throw new Error(`Refusing to clean up Lab 4 data on "${name}": the database name must end with _test`);
    }
}

/** Removes every Action Taken, revision and Ticket event (test database only, BR-40). */
export async function truncateLab4Tables() {
    assertTestDatabase();
    await getPrisma().$executeRawUnsafe('TRUNCATE "ActionTakenRevision", "TicketEvent", "ActionTaken" RESTART IDENTITY');
}

export async function userIdByEmail(email: string): Promise<number> {
    const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
    return user.id;
}

const createdTicketIds: number[] = [];

/** Creates an isolated Ticket owned by the given Requester (default David Lee). */
export async function createTicket(opts: { status?: TicketStatus; requesterEmail?: string; ownerEmail?: string | null; createdAt?: Date } = {}) {
    const prisma = getPrisma();
    const requester = await prisma.user.findUniqueOrThrow({ where: { email: opts.requesterEmail ?? 'david.lee@example.com' } });
    const owner = opts.ownerEmail ? await prisma.user.findUniqueOrThrow({ where: { email: opts.ownerEmail } }) : null;
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();
    const ticket = await prisma.ticket.create({
        data: {
            ticketNumber: `LAB4-${randomUUID().slice(0, 8).toUpperCase()}`,
            summary: 'Lab 4 test ticket',
            description: 'Created by the Lab 4 API tests',
            status: opts.status ?? 'Open',
            requesterId: requester.id,
            ownerId: owner?.id ?? null,
            categoryId: category.id,
            relatedSystemId: system.id,
            ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
        },
    });
    createdTicketIds.push(ticket.id);
    return ticket;
}

/** Deletes the Tickets made by createTicket after the Lab 4 tables were truncated. */
export async function removeCreatedTickets() {
    await truncateLab4Tables();
    if (createdTicketIds.length) {
        await getPrisma().ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
        createdTicketIds.length = 0;
    }
}

/** A valid create payload; override fields per test. */
export function actionBody(overrides: Record<string, unknown> = {}) {
    return {
        description: 'Replaced the faulty network cable at desk 14B.',
        result: 'Link restored; ping stable for 10 minutes.',
        ...overrides,
    };
}
