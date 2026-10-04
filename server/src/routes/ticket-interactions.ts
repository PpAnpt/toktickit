import { Router, Response } from 'express';
import { getPrisma } from '../prisma';
import { requireAppAccess, requireRole, AuthenticatedRequest } from '../middlewares/auth';
import { TicketStatus } from '../../generated/prisma/client';

const router = Router();

export const MAX_ENTRY_LENGTH = 2000;
const NOT_FOUND = { error: 'Ticket not found' };
const authorSelect = { author: { select: { id: true, name: true, role: true } } };

/**
 * Loads a ticket the current user may see. Requesters only see tickets they own;
 * for any other ticket the caller receives the same 404 as for a missing ticket,
 * so the API does not reveal that the ticket exists.
 */
async function findAccessibleTicket(req: AuthenticatedRequest) {
    const ticketId = Number(req.params.id);
    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        return null;
    }
    const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
        return null;
    }
    if (req.user!.role === 'REQUESTER' && ticket.requesterId !== req.user!.id) {
        return null;
    }
    return ticket;
}

/**
 * Returns an error message for invalid comment/note content, otherwise null.
 */
function validateEntryContent(content: unknown, label: string): string | null {
    if (typeof content !== 'string' || !content.trim()) {
        return `${label} content cannot be empty`;
    }
    if (content.trim().length > MAX_ENTRY_LENGTH) {
        return `${label} cannot exceed ${MAX_ENTRY_LENGTH} characters`;
    }
    return null;
}

/**
 * GET /api/tickets/:id/comments
 * Fetch public comments (Accessible by Requester ticket owner, IT Staff, Admin)
 */
router.get('/:id/comments', requireAppAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ticket = await findAccessibleTicket(req);
        if (!ticket) {
            return res.status(404).json(NOT_FOUND);
        }

        const comments = await getPrisma().publicComment.findMany({
            where: { ticketId: ticket.id },
            include: authorSelect,
            orderBy: { createdAt: 'asc' },
        });

        res.status(200).json(comments);
    } catch (error) {
        console.error('Failed to fetch public comments:', error);
        res.status(500).json({ error: 'Failed to fetch public comments' });
    }
});

/**
 * POST /api/tickets/:id/comments
 * Post public comment (Accessible by Requester ticket owner, IT Staff, Admin) (BR-15, BR-17)
 */
router.post('/:id/comments', requireAppAccess, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ticket = await findAccessibleTicket(req);
        if (!ticket) {
            return res.status(404).json(NOT_FOUND);
        }

        const contentError = validateEntryContent(req.body?.content, 'Comment');
        if (contentError) {
            return res.status(400).json({ error: contentError });
        }

        const comment = await getPrisma().publicComment.create({
            data: {
                ticketId: ticket.id,
                authorId: req.user!.id,
                content: req.body.content.trim(),
            },
            include: authorSelect,
        });

        res.status(201).json(comment);
    } catch (error) {
        console.error('Failed to create public comment:', error);
        res.status(500).json({ error: 'Failed to create public comment' });
    }
});

/**
 * GET /api/tickets/:id/internal-notes
 * Fetch private internal notes (IT Staff & Admin only) (BR-16)
 */
router.get(
    '/:id/internal-notes',
    requireAppAccess,
    requireRole('IT_STAFF', 'ADMINISTRATOR'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const ticket = await findAccessibleTicket(req);
            if (!ticket) {
                return res.status(404).json(NOT_FOUND);
            }

            const notes = await getPrisma().internalNote.findMany({
                where: { ticketId: ticket.id },
                include: authorSelect,
                orderBy: { createdAt: 'asc' },
            });

            res.status(200).json(notes);
        } catch (error) {
            console.error('Failed to fetch internal notes:', error);
            res.status(500).json({ error: 'Failed to fetch internal notes' });
        }
    }
);

/**
 * POST /api/tickets/:id/internal-notes
 * Post private internal note (IT Staff & Admin only) (BR-16, BR-17)
 */
router.post(
    '/:id/internal-notes',
    requireAppAccess,
    requireRole('IT_STAFF', 'ADMINISTRATOR'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const ticket = await findAccessibleTicket(req);
            if (!ticket) {
                return res.status(404).json(NOT_FOUND);
            }

            const contentError = validateEntryContent(req.body?.content, 'Note');
            if (contentError) {
                return res.status(400).json({ error: contentError });
            }

            const note = await getPrisma().internalNote.create({
                data: {
                    ticketId: ticket.id,
                    authorId: req.user!.id,
                    content: req.body.content.trim(),
                },
                include: authorSelect,
            });

            res.status(201).json(note);
        } catch (error) {
            console.error('Failed to create internal note:', error);
            res.status(500).json({ error: 'Failed to create internal note' });
        }
    }
);

/**
 * POST /api/tickets/:id/indicate-resolved
 * The owning Requester flags that the issue appears resolved (BR-14).
 * The ticket status is not changed; IT Staff remain responsible for formal resolution.
 */
router.post(
    '/:id/indicate-resolved',
    requireAppAccess,
    requireRole('REQUESTER'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const ticket = await findAccessibleTicket(req);
            if (!ticket) {
                return res.status(404).json(NOT_FOUND);
            }

            const finalStatuses: TicketStatus[] = [TicketStatus.Resolved, TicketStatus.Closed, TicketStatus.Cancelled];
            if (finalStatuses.includes(ticket.status)) {
                return res.status(400).json({ error: 'This ticket is already resolved, closed, or cancelled' });
            }
            if (ticket.indicatedResolvedAt) {
                return res.status(409).json({ error: 'Resolution has already been indicated for this ticket' });
            }

            const updated = await getPrisma().ticket.update({
                where: { id: ticket.id },
                data: { indicatedResolvedAt: new Date() },
            });

            res.status(200).json({
                message: 'Indicated problem appears resolved',
                indicatedResolvedAt: updated.indicatedResolvedAt,
            });
        } catch (error) {
            console.error('Failed to indicate ticket resolved:', error);
            res.status(500).json({ error: 'Failed to indicate ticket resolved' });
        }
    }
);

export default router;
