import { describe, it, expect } from 'vitest';
import { TicketStatus } from '../../generated/prisma/client';
import { isTransitionAllowed, parseStatus, statusDisplay } from '../../src/services/ticket-status';

const ALL: TicketStatus[] = ['New', 'Open', 'InProgress', 'WaitingForRequester', 'Resolved', 'Closed', 'Reopened', 'Cancelled'];

// docs/lab-04/specification.md "Ticket Status Transition Matrix (final)"
const PERMITTED: Record<TicketStatus, TicketStatus[]> = {
    New: ['Open', 'Cancelled'],
    Open: ['InProgress', 'WaitingForRequester', 'Resolved', 'Cancelled'],
    InProgress: ['WaitingForRequester', 'Resolved', 'Cancelled'],
    WaitingForRequester: ['InProgress', 'Resolved', 'Cancelled'],
    Resolved: ['Closed', 'Reopened'],
    Reopened: ['InProgress', 'Resolved', 'Cancelled'],
    Closed: [],
    Cancelled: [],
};

describe('Lab 4: Ticket status transition matrix (UNIT-04, AC-10)', () => {
    it('allows exactly the permitted pairs out of all 8 x 8', () => {
        let allowed = 0;
        for (const from of ALL) {
            for (const to of ALL) {
                const expected = PERMITTED[from].includes(to);
                expect(isTransitionAllowed(from, to), `${from} -> ${to}`).toBe(expected);
                if (expected) allowed++;
            }
        }
        expect(allowed).toBe(17);
    });

    it('never allows a status to stay the same, and Closed / Cancelled are terminal', () => {
        for (const status of ALL) expect(isTransitionAllowed(status, status)).toBe(false);
        for (const to of ALL) {
            expect(isTransitionAllowed('Closed', to)).toBe(false);
            expect(isTransitionAllowed('Cancelled', to)).toBe(false);
        }
    });

    it('reads status labels by own key only', () => {
        expect(parseStatus('In Progress')).toBe('InProgress');
        expect(parseStatus('InProgress')).toBe('InProgress');
        expect(parseStatus('Waiting for Requester')).toBe('WaitingForRequester');
        for (const bad of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'resolved', '', 'Done']) {
            expect(parseStatus(bad), bad).toBeUndefined();
        }
        expect(parseStatus(42)).toBeUndefined();
        expect(statusDisplay('InProgress')).toBe('In Progress');
        expect(statusDisplay('WaitingForRequester')).toBe('Waiting for Requester');
        expect(statusDisplay('Open')).toBe('Open');
    });
});
