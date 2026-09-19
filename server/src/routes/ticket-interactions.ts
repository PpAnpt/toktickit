import { Router, Response } from 'express';
import { getPrisma } from '../prisma';
import { authenticate, requireRole, requirePasswordChanged, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

/**
 * GET /api/tickets/:id/comments
 * Fetch public comments (Accessible by Requester ticket owner, IT Staff, Admin)
 */
router.get('/:id/comments', authenticate, requirePasswordChanged, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const prisma = getPrisma();
        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Requester can only view comments on their own ticket
        if (req.user!.role === 'REQUESTER' && ticket.requesterId !== req.user!.id) {
            return res.status(403).json({ error: 'Access denied: you do not own this ticket' });
        }

        const comments = await prisma.publicComment.findMany({
            where: { ticketId },
            include: {
                author: { select: { id: true, name: true, role: true } },
            },
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
router.post('/:id/comments', authenticate, requirePasswordChanged, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const prisma = getPrisma();
        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Requester can only comment on their own ticket
        if (req.user!.role === 'REQUESTER' && ticket.requesterId !== req.user!.id) {
            return res.status(403).json({ error: 'Access denied: you do not own this ticket' });
        }

        const { content } = req.body;
        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ error: 'Comment content cannot be empty' });
        }

        if (content.trim().length > 2000) {
            return res.status(400).json({ error: 'Comment cannot exceed 2000 characters' });
        }

        const comment = await prisma.publicComment.create({
            data: {
                ticketId,
                authorId: req.user!.id,
                content: content.trim(),
            },
            include: {
                author: { select: { id: true, name: true, role: true } },
            },
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
    authenticate,
    requirePasswordChanged,
    requireRole('IT_STAFF', 'ADMINISTRATOR'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const prisma = getPrisma();
            const ticketId = Number(req.params.id);
            if (isNaN(ticketId)) {
                return res.status(400).json({ error: 'Invalid ticket ID' });
            }

            const ticket = await prisma.ticket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            const notes = await prisma.internalNote.findMany({
                where: { ticketId },
                include: {
                    author: { select: { id: true, name: true, role: true } },
                },
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
    authenticate,
    requirePasswordChanged,
    requireRole('IT_STAFF', 'ADMINISTRATOR'),
    async (req: AuthenticatedRequest, res: Response) => {
        try {
            const prisma = getPrisma();
            const ticketId = Number(req.params.id);
            if (isNaN(ticketId)) {
                return res.status(400).json({ error: 'Invalid ticket ID' });
            }

            const ticket = await prisma.ticket.findUnique({
                where: { id: ticketId },
            });

            if (!ticket) {
                return res.status(404).json({ error: 'Ticket not found' });
            }

            const { content } = req.body;
            if (!content || typeof content !== 'string' || !content.trim()) {
                return res.status(400).json({ error: 'Note content cannot be empty' });
            }

            if (content.trim().length > 2000) {
                return res.status(400).json({ error: 'Note cannot exceed 2000 characters' });
            }

            const note = await prisma.internalNote.create({
                data: {
                    ticketId,
                    authorId: req.user!.id,
                    content: content.trim(),
                },
                include: {
                    author: { select: { id: true, name: true, role: true } },
                },
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
 * Requester flags that the issue appears resolved (BR-14)
 */
router.post('/:id/indicate-resolved', authenticate, requirePasswordChanged, async (req: AuthenticatedRequest, res: Response) => {
    try {
        const prisma = getPrisma();
        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Requester can only flag their own ticket
        if (req.user!.role === 'REQUESTER' && ticket.requesterId !== req.user!.id) {
            return res.status(403).json({ error: 'Access denied: you do not own this ticket' });
        }

        const now = new Date();
        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                indicatedResolvedAt: now,
            },
        });

        res.status(200).json({
            message: 'Indicated problem appears resolved',
            indicatedResolvedAt: updated.indicatedResolvedAt,
        });
    } catch (error) {
        console.error('Failed to indicate ticket resolved:', error);
        res.status(500).json({ error: 'Failed to indicate ticket resolved' });
    }
});

export default router;
