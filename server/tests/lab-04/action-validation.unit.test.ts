import { describe, it, expect } from 'vitest';
import { LIMITS, checkActionAt, checkMerged, readCommon, readText } from '../../src/services/action-rules';

describe('Lab 4: Action Taken validation rules (UNIT-01..03)', () => {
    describe('UNIT-01: required fields, trimming and maximum lengths', () => {
        it('trims text and turns blank optional text into null', () => {
            const details: Record<string, string> = {};
            const input = readCommon({ description: '  Replaced the cable  ', result: '   ', attachmentNotes: ' Photo in Tickets/7 ' }, details);
            expect(details).toEqual({});
            expect(input.description).toBe('Replaced the cable');
            expect(input.result).toBeNull();
            expect(input.attachmentNotes).toBe('Photo in Tickets/7');
        });

        it('reports every invalid field by name', () => {
            const details: Record<string, string> = {};
            readCommon({
                description: 'x'.repeat(LIMITS.description + 1),
                result: 'x'.repeat(LIMITS.result + 1),
                followUpNote: 'x'.repeat(LIMITS.followUpNote + 1),
                attachmentNotes: 'x'.repeat(LIMITS.attachmentNotes + 1),
                assigneeId: 'abc',
                status: 'Finished',
                followUpRequired: 'yes',
            }, details);
            expect(Object.keys(details).sort()).toEqual(['assigneeId', 'attachmentNotes', 'description', 'followUpNote', 'followUpRequired', 'result', 'status']);
        });

        it('accepts text exactly at the maximum length and rejects non-text values', () => {
            const ok: Record<string, string> = {};
            expect(readText({ description: 'x'.repeat(LIMITS.description) }, 'description', ok)).toHaveLength(LIMITS.description);
            expect(ok).toEqual({});
            const bad: Record<string, string> = {};
            readText({ description: 42 }, 'description', bad);
            expect(bad).toHaveProperty('description');
        });

        it('requires a description, and a result for Completed and Cancelled actions only', () => {
            const missing: Record<string, string> = {};
            checkMerged({ description: null, result: null, status: 'Completed', followUpRequired: false, followUpNote: null }, missing);
            expect(Object.keys(missing).sort()).toEqual(['description', 'result']);

            const cancelled: Record<string, string> = {};
            checkMerged({ description: 'Visit', result: null, status: 'Cancelled', followUpRequired: false, followUpNote: null }, cancelled);
            expect(cancelled.result).toMatch(/reason for cancelling/i);

            for (const status of ['Planned', 'InProgress'] as const) {
                const open: Record<string, string> = {};
                checkMerged({ description: 'Visit', result: null, status, followUpRequired: false, followUpNote: null }, open);
                expect(open).toEqual({});
            }
        });
    });

    describe('UNIT-02: follow-up rule', () => {
        it('requires a note when follow-up is required', () => {
            const details: Record<string, string> = {};
            checkMerged({ description: 'a', result: 'b', status: 'Completed', followUpRequired: true, followUpNote: null }, details);
            expect(details).toHaveProperty('followUpNote');
        });

        it('accepts a note when follow-up is required and ignores a missing note when it is not', () => {
            const withNote: Record<string, string> = {};
            checkMerged({ description: 'a', result: 'b', status: 'Completed', followUpRequired: true, followUpNote: 'Check on Friday' }, withNote);
            expect(withNote).toEqual({});
            const without: Record<string, string> = {};
            checkMerged({ description: 'a', result: 'b', status: 'Completed', followUpRequired: false, followUpNote: null }, without);
            expect(without).toEqual({});
        });
    });

    describe('UNIT-03: actionAt bounds', () => {
        const created = new Date('2026-10-01T08:00:00Z');

        it('rejects a time before the Ticket was created', () => {
            const details: Record<string, string> = {};
            checkActionAt(new Date('2026-10-01T07:59:59Z'), 'Completed', created, details);
            expect(details.actionAt).toMatch(/before the Ticket was created/);
        });

        it('rejects more than 5 minutes in the future unless the action is only Planned', () => {
            const future = new Date(Date.now() + 6 * 60 * 1000);
            for (const status of ['InProgress', 'Completed'] as const) {
                const details: Record<string, string> = {};
                checkActionAt(future, status, created, details);
                expect(details.actionAt).toMatch(/future/);
            }
            const planned: Record<string, string> = {};
            checkActionAt(future, 'Planned', created, planned);
            expect(planned).toEqual({});
        });

        it('accepts a time up to 5 minutes ahead and a time right at Ticket creation', () => {
            const near: Record<string, string> = {};
            checkActionAt(new Date(Date.now() + 4 * 60 * 1000), 'Completed', created, near);
            expect(near).toEqual({});
            const atCreation: Record<string, string> = {};
            checkActionAt(created, 'Completed', created, atCreation);
            expect(atCreation).toEqual({});
        });

        it('reads an invalid date as a validation error', () => {
            const details: Record<string, string> = {};
            const input = readCommon({ actionAt: 'not a date' }, details);
            expect(input.actionAt).toBeUndefined();
            expect(details).toHaveProperty('actionAt');
        });
    });
});
