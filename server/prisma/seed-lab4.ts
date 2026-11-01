import { ActionRevisionType, ActionStatus, PrismaClient } from '../generated/prisma/client'
import { snapshot } from '../src/services/actions'

/**
 * Lab 4 demonstration data (specification 7.5). Idempotent: every action carries a fixed
 * `clientRequestId`, and an action that already exists is left untouched, so running the seed
 * repeatedly never duplicates or rewrites anything. Existing Tickets and users are not modified.
 *
 * Coverage: Tickets with zero actions (most seed Tickets), one action, and several actions;
 * all four action statuses; different performers and assignees; an action assigned to the
 * inactive IT Staff member Marcus Wright; edited actions with several revisions; a Completed
 * action with a follow-up; a Reopened Ticket with old completed work and new planned work.
 */

type Edit = {
    by: string
    afterMinutes: number
    changes: Partial<{ description: string; result: string | null; status: ActionStatus; assignee: string; attachmentNotes: string | null }>
}

type SeedAction = {
    key: string
    ticket: string
    performer: string
    assignee: string
    status: ActionStatus
    /** Hours after the Ticket was created, or (when future) hours from now */
    hoursAfterCreate?: number
    hoursFromNow?: number
    description: string
    result?: string
    followUpNote?: string
    attachmentNotes?: string
    edits?: Edit[]
}

export const SEED_ACTIONS: SeedAction[] = [
    // Ticket with several actions, different assignees, and all four statuses (AC-39)
    {
        key: 'seed-lab4-001', ticket: 'TKT-2026-000001', performer: 'sarah.connor', assignee: 'sarah.connor', status: 'Completed',
        hoursAfterCreate: 4, description: 'Checked the HDMI cable and the monitor port.',
        result: 'Port works; flicker only appears when the dock is connected.', attachmentNotes: 'Photo of the dock label is in Tickets/1',
        edits: [{ by: 'james.gordon', afterMinutes: 30, changes: { result: 'Port and cable work; the flicker only appears when the dock is connected.' } }],
    },
    {
        key: 'seed-lab4-002', ticket: 'TKT-2026-000001', performer: 'sarah.connor', assignee: 'sarah.connor', status: 'InProgress',
        hoursAfterCreate: 20, description: 'Update the dock firmware to the latest version.',
        edits: [{ by: 'sarah.connor', afterMinutes: 15, changes: { assignee: 'james.gordon' } }],
    },
    {
        key: 'seed-lab4-003', ticket: 'TKT-2026-000001', performer: 'james.gordon', assignee: 'marcus.wright', status: 'Planned',
        hoursFromNow: 48, description: 'Replace the dock if the firmware update does not help.',
    },
    {
        key: 'seed-lab4-004', ticket: 'TKT-2026-000001', performer: 'sarah.connor', assignee: 'sarah.connor', status: 'Planned',
        hoursAfterCreate: 6, description: 'Swap in a loan monitor.',
        edits: [{ by: 'sarah.connor', afterMinutes: 20, changes: { status: 'Cancelled', result: 'Cancelled: the monitor was ruled out by the port test.' } }],
    },
    // Completed action with a follow-up
    {
        key: 'seed-lab4-005', ticket: 'TKT-2025-000102', performer: 'james.gordon', assignee: 'james.gordon', status: 'Completed',
        hoursAfterCreate: 8, description: 'Verified the course enrolment with the registrar and added the instructor role.',
        result: 'Instructor role added in the staging app.', followUpNote: 'Confirm access after the next sync on Friday.',
        attachmentNotes: 'Screenshot of the role page is in Tickets/102',
    },
    // Ticket owned by one person, work done by another
    {
        key: 'seed-lab4-006', ticket: 'TKT-2025-000105', performer: 'james.gordon', assignee: 'james.gordon', status: 'Completed',
        hoursAfterCreate: 5, description: 'Reproduced the upload error with a 12 MB file.', result: 'Error happens above 10 MB only.',
    },
    {
        key: 'seed-lab4-007', ticket: 'TKT-2025-000105', performer: 'sarah.connor', assignee: 'sarah.connor', status: 'InProgress',
        hoursAfterCreate: 12, description: 'Raise the upload size limit on the application server.',
    },
    // Resolved and Closed Tickets have completed work (resolution gate)
    {
        key: 'seed-lab4-008', ticket: 'TKT-2025-000104', performer: 'sarah.connor', assignee: 'sarah.connor', status: 'Completed',
        hoursAfterCreate: 10, description: 'Raised the mail attachment limit to 25 MB.', result: 'Test message with a 20 MB file was delivered.',
    },
    {
        key: 'seed-lab4-009', ticket: 'TKT-2025-000112', performer: 'james.gordon', assignee: 'james.gordon', status: 'Completed',
        hoursAfterCreate: 24, description: 'Cleaned the fan intake and replaced the thermal paste.', result: 'Temperature stays below 70 C under load.',
        followUpNote: 'Check again after one week of lectures.',
    },
    {
        key: 'seed-lab4-010', ticket: 'TKT-2025-000106', performer: 'james.gordon', assignee: 'james.gordon', status: 'Completed',
        hoursAfterCreate: 3, description: 'Reset the shared workstation password.', result: 'New password handed over in person.',
    },
    // Tickets resolved and closed inside the dashboard window (TKT-2025-000115 / 000116): each has completed work
    {
        key: 'seed-lab4-015', ticket: 'TKT-2025-000115', performer: 'james.gordon', assignee: 'james.gordon', status: 'Completed',
        hoursAfterCreate: 20, description: 'Restored the group membership for the team folder.', result: 'Access works after a new sign-in.',
    },
    {
        key: 'seed-lab4-016', ticket: 'TKT-2025-000116', performer: 'sarah.connor', assignee: 'sarah.connor', status: 'Completed',
        hoursAfterCreate: 4, description: 'Fitted two new AAA batteries in the remote.', result: 'The remote controls the projector again.',
    },
    // Reopened Ticket: old completed work plus new planned work
    {
        key: 'seed-lab4-011', ticket: 'TKT-2025-000108', performer: 'sarah.connor', assignee: 'sarah.connor', status: 'Completed',
        hoursAfterCreate: 6, description: 'Re-issued the captive portal certificate.', result: 'Login prompt stopped for the tester.',
    },
    {
        key: 'seed-lab4-012', ticket: 'TKT-2025-000108', performer: 'sarah.connor', assignee: 'james.gordon', status: 'Planned',
        hoursFromNow: 24, description: 'Check the access point controller logs for the cafeteria.',
    },
    // Waiting for Requester and administrator-owned Tickets
    {
        key: 'seed-lab4-013', ticket: 'TKT-2025-000103', performer: 'james.gordon', assignee: 'james.gordon', status: 'Planned',
        hoursAfterCreate: 30, description: 'Ask the requester to print a test page after the driver update.',
    },
    {
        key: 'seed-lab4-014', ticket: 'TKT-2025-000113', performer: 'admin', assignee: 'sarah.connor', status: 'InProgress',
        hoursAfterCreate: 8, description: 'Review the slow grade-saving queries with the database team.',
    },
]

const HOUR = 60 * 60 * 1000

export async function seedLab4(prisma: PrismaClient, userId: (key: string) => number) {
    let created = 0
    for (const def of SEED_ACTIONS) {
        const ticket = await prisma.ticket.findUnique({ where: { ticketNumber: def.ticket } })
        if (!ticket) continue
        const existing = await prisma.actionTaken.findUnique({
            where: { ticketId_clientRequestId: { ticketId: ticket.id, clientRequestId: def.key } },
        })
        if (existing) continue

        const now = Date.now()
        const actionAt = new Date(def.hoursFromNow !== undefined ? now + def.hoursFromNow * HOUR : ticket.createdAt.getTime() + (def.hoursAfterCreate ?? 1) * HOUR)
        const createdAt = new Date(Math.min(now, actionAt.getTime() + 10 * 60 * 1000))

        const row = await prisma.actionTaken.create({
            data: {
                ticketId: ticket.id,
                performedById: userId(def.performer),
                assigneeId: userId(def.assignee),
                status: def.status,
                actionAt,
                description: def.description,
                result: def.result ?? null,
                followUpRequired: Boolean(def.followUpNote),
                followUpNote: def.followUpNote ?? null,
                attachmentNotes: def.attachmentNotes ?? null,
                clientRequestId: def.key,
                createdAt,
                updatedAt: createdAt,
            },
        })

        await prisma.actionTakenRevision.create({
            data: {
                actionId: row.id, ticketId: ticket.id, revisionNo: 1, type: 'CREATED', actorId: row.performedById,
                changedFields: [], after: snapshot(row), createdAt,
            },
        })

        // Replay the edits so the revisions show who changed what (AC-34)
        let current = row
        let revisionNo = 1
        let when = createdAt.getTime()
        for (const edit of def.edits ?? []) {
            when += edit.afterMinutes * 60 * 1000
            const next = {
                ...current,
                description: edit.changes.description ?? current.description,
                result: edit.changes.result !== undefined ? edit.changes.result : current.result,
                status: edit.changes.status ?? current.status,
                assigneeId: edit.changes.assignee ? userId(edit.changes.assignee) : current.assigneeId,
                attachmentNotes: edit.changes.attachmentNotes !== undefined ? edit.changes.attachmentNotes : current.attachmentNotes,
                updatedById: userId(edit.by),
                updatedAt: new Date(when),
            }
            const changedFields = (['description', 'result', 'status', 'assigneeId', 'attachmentNotes'] as const)
                .filter(field => next[field] !== current[field])
            if (changedFields.length === 0) continue
            const type: ActionRevisionType = changedFields.includes('status') ? 'STATUS_CHANGED' : changedFields.includes('assigneeId') ? 'ASSIGNEE_CHANGED' : 'EDITED'
            revisionNo++
            await prisma.actionTakenRevision.create({
                data: {
                    actionId: row.id, ticketId: ticket.id, revisionNo, type, actorId: next.updatedById!,
                    changedFields, before: snapshot(current), after: snapshot(next), createdAt: next.updatedAt,
                },
            })
            current = next
        }
        if (revisionNo > 1) {
            await prisma.actionTaken.update({
                where: { id: row.id },
                data: {
                    description: current.description, result: current.result, status: current.status,
                    assigneeId: current.assigneeId, attachmentNotes: current.attachmentNotes,
                    updatedById: current.updatedById, updatedAt: current.updatedAt,
                },
            })
        }
        created++
    }
    return created
}
