import { describe, it, expect } from 'vitest';
import { nextToken } from '../../src/services/actions';

describe('Lab 4: concurrency token helper (UNIT-07, BR-20)', () => {
    it('is strictly greater than the previous token even in the same millisecond', () => {
        const previous = new Date('2026-11-01T10:00:00.500Z');
        const sameMillisecond = nextToken(previous, new Date('2026-11-01T10:00:00.500Z'));
        expect(sameMillisecond.getTime()).toBe(previous.getTime() + 1);
        expect(nextToken(sameMillisecond, new Date('2026-11-01T10:00:00.500Z')).getTime()).toBe(previous.getTime() + 2);
    });

    it('uses the current time when it is already later than previous + 1 ms', () => {
        const previous = new Date('2026-11-01T10:00:00.000Z');
        const now = new Date('2026-11-01T10:00:05.000Z');
        expect(nextToken(previous, now).getTime()).toBe(now.getTime());
    });

    it('still moves forward when the clock is behind the stored token', () => {
        const previous = new Date('2026-11-01T10:00:10.000Z');
        const now = new Date('2026-11-01T10:00:00.000Z');
        expect(nextToken(previous, now).getTime()).toBe(previous.getTime() + 1);
    });
});
