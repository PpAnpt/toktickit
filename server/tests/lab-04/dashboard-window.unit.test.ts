import { describe, it, expect } from 'vitest';
import { ACTIVE_STATUSES } from '../../src/services/ticket-status';
import { effectivePriority, windowStart } from '../../src/services/dashboard';

/**
 * UNIT-05 / UNIT-06 (AC-21, AC-18): the Asia/Bangkok window and the shared dashboard helpers.
 * Asia/Bangkok is UTC+7 without daylight saving (BR-23).
 */
describe('Lab 4: dashboard window and helpers (Issue #33)', () => {
    it('UNIT-05: windowStart is 00:00 Asia/Bangkok six days before today', () => {
        // 2026-10-29 11:00 in Bangkok -> window opens 2026-10-23 00:00 Bangkok = 2026-10-22 17:00 UTC
        expect(windowStart(new Date('2026-10-29T04:00:00.000Z')).toISOString()).toBe('2026-10-22T17:00:00.000Z');
    });

    it('UNIT-05: around local midnight the Bangkok date decides, not the UTC date', () => {
        // 16:59:59.999 UTC is still 23:59:59.999 on 29 Oct in Bangkok
        expect(windowStart(new Date('2026-10-29T16:59:59.999Z')).toISOString()).toBe('2026-10-22T17:00:00.000Z');
        // 17:00:00.000 UTC is 00:00:00.000 on 30 Oct in Bangkok: the window moves one day
        expect(windowStart(new Date('2026-10-29T17:00:00.000Z')).toISOString()).toBe('2026-10-23T17:00:00.000Z');
        // 00:00 UTC is already 07:00 the same UTC date in Bangkok
        expect(windowStart(new Date('2026-10-29T00:00:00.000Z')).toISOString()).toBe('2026-10-22T17:00:00.000Z');
    });

    it('UNIT-05: crossing a month and a year boundary', () => {
        expect(windowStart(new Date('2026-01-03T05:00:00.000Z')).toISOString()).toBe('2025-12-27T17:00:00.000Z');
        expect(windowStart(new Date('2026-03-01T05:00:00.000Z')).toISOString()).toBe('2026-02-22T17:00:00.000Z');
    });

    it('UNIT-06: the Active set is exactly New, Open, In Progress, Waiting for Requester and Reopened (BR-24)', () => {
        expect([...ACTIVE_STATUSES].sort()).toEqual(['InProgress', 'New', 'Open', 'Reopened', 'WaitingForRequester']);
    });

    it('UNIT-06: effective priority is the IT Priority when set, otherwise the requested priority', () => {
        expect(effectivePriority({ itPriority: 'URGENT', requestedPriority: 'LOW' })).toBe('URGENT');
        expect(effectivePriority({ itPriority: null, requestedPriority: 'HIGH' })).toBe('HIGH');
    });
});
