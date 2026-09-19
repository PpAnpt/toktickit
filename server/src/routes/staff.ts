import { Router, Response } from 'express';
import { getPrisma } from '../prisma';
import { authenticate, requireRole, requirePasswordChanged, AuthenticatedRequest } from '../middlewares/auth';
import { TicketStatus, TicketPriority } from '../../generated/prisma/client';

const router = Router();

// Apply auth middleware to all staff routes
router.use(authenticate);
router.use(requirePasswordChanged);
router.use(requireRole('IT_STAFF', 'ADMINISTRATOR'));

const statusQueryMap: Record<string, TicketStatus> = {
    'New': TicketStatus.New,
    'Open': TicketStatus.Open,
    'In Progress': TicketStatus.InProgress,
    'InProgress': TicketStatus.InProgress,
    'Waiting for Requester': TicketStatus.WaitingForRequester,
    'WaitingForRequester': TicketStatus.WaitingForRequester,
    'Resolved': TicketStatus.Resolved,
    'Closed': TicketStatus.Closed,
    'Reopened': TicketStatus.Reopened,
    'Cancelled': TicketStatus.Cancelled,
};

const statusDisplayMap: Record<string, string> = {
    InProgress: 'In Progress',
    WaitingForRequester: 'Waiting for Requester',
};

/**
 * GET /api/staff/tickets
 * Query IT Staff ticket queue with search, filter, sort, and pagination
 */
router.get('/tickets', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const prisma = getPrisma();
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
        const search = (req.query.search as string)?.trim();
        const statusParam = req.query.status as string;
        const priorityParam = req.query.priority as string;
        const ownerParam = req.query.owner as string;
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrder = (req.query.sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';

        const andConditions: any[] = [];

        // Search filter (ticketNumber, summary, requester name)
        if (search) {
            andConditions.push({
                OR: [
                    { ticketNumber: { contains: search, mode: 'insensitive' } },
                    { summary: { contains: search, mode: 'insensitive' } },
                    { requester: { name: { contains: search, mode: 'insensitive' } } },
                ],
            });
        }

        // Status filter
        if (statusParam && statusParam !== 'All') {
            const mappedStatus = statusQueryMap[statusParam] || (statusParam as TicketStatus);
            andConditions.push({ status: mappedStatus });
        }

        // Priority filter (checks effective IT Priority, or requestedPriority if itPriority is null)
        if (priorityParam && priorityParam !== 'All') {
            const prio = priorityParam.toUpperCase() as TicketPriority;
            andConditions.push({
                OR: [
                    { itPriority: prio },
                    { itPriority: null, requestedPriority: prio },
                ],
            });
        }

        // Owner filter
        if (ownerParam && ownerParam !== 'All') {
            if (ownerParam === 'unassigned') {
                andConditions.push({ ownerId: null });
            } else if (ownerParam === 'me') {
                andConditions.push({ ownerId: req.user!.id });
            } else if (!isNaN(Number(ownerParam))) {
                andConditions.push({ ownerId: Number(ownerParam) });
            }
        }

        const whereCondition = andConditions.length > 0 ? { AND: andConditions } : {};

        // Sorting
        let orderBy: any = { createdAt: sortOrder };
        if (['ticketNumber', 'updatedAt', 'createdAt'].includes(sortBy)) {
            orderBy = { [sortBy]: sortOrder };
        } else if (sortBy === 'priority') {
            orderBy = [{ itPriority: sortOrder }, { requestedPriority: sortOrder }];
        }

        const total = await prisma.ticket.count({ where: whereCondition });

        const tickets = await prisma.ticket.findMany({
            where: whereCondition,
            skip: (page - 1) * limit,
            take: limit,
            orderBy,
            include: {
                requester: { select: { id: true, name: true, email: true } },
                owner: { select: { id: true, name: true, email: true } },
                category: { select: { id: true, name: true } },
                relatedSystem: { select: { id: true, name: true } },
            },
        });

        const formattedTickets = tickets.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            summary: t.summary,
            status: statusDisplayMap[t.status] || t.status,
            requestedPriority: t.requestedPriority,
            itPriority: t.itPriority || t.requestedPriority,
            requester: t.requester,
            owner: t.owner ? { id: t.owner.id, name: t.owner.name, email: t.owner.email } : null,
            category: t.category,
            relatedSystem: t.relatedSystem,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt,
        }));

        res.status(200).json({
            tickets: formattedTickets,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit) || 1,
            },
        });
    } catch (error) {
        console.error('Failed to fetch staff tickets:', error);
        res.status(500).json({ error: 'Failed to fetch staff tickets' });
    }
});

/**
 * GET /api/staff/members
 * Get active staff members (IT_STAFF and ADMINISTRATOR) for owner filter and assignment
 */
router.get('/members', async (_req: AuthenticatedRequest, res: Response) => {
    try {
        const prisma = getPrisma();
        const members = await prisma.user.findMany({
            where: {
                role: { in: ['IT_STAFF', 'ADMINISTRATOR'] },
                isActive: true,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
            orderBy: { name: 'asc' },
        });

        res.status(200).json(members);
    } catch (error) {
        console.error('Failed to fetch staff members:', error);
        res.status(500).json({ error: 'Failed to fetch staff members' });
    }
});

// Permitted status transitions based on BR-13 Matrix
const validTransitions: Record<TicketStatus, TicketStatus[]> = {
    [TicketStatus.New]: [TicketStatus.Open, TicketStatus.Cancelled],
    [TicketStatus.Open]: [TicketStatus.InProgress, TicketStatus.WaitingForRequester, TicketStatus.Resolved, TicketStatus.Cancelled],
    [TicketStatus.InProgress]: [TicketStatus.WaitingForRequester, TicketStatus.Resolved, TicketStatus.Cancelled],
    [TicketStatus.WaitingForRequester]: [TicketStatus.InProgress, TicketStatus.Resolved, TicketStatus.Cancelled],
    [TicketStatus.Resolved]: [TicketStatus.Closed, TicketStatus.Reopened],
    [TicketStatus.Reopened]: [TicketStatus.InProgress, TicketStatus.Resolved, TicketStatus.Cancelled],
    [TicketStatus.Closed]: [],
    [TicketStatus.Cancelled]: [],
};

/**
 * GET /api/staff/tickets/:id
 * Get full staff ticket detail including owner, category, system, attachments, comments, and notes
 */
router.get('/tickets/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const prisma = getPrisma();
        const ticketId = Number(req.params.id);
        if (isNaN(ticketId)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                requester: { select: { id: true, name: true, email: true } },
                owner: { select: { id: true, name: true, email: true, role: true } },
                category: true,
                relatedSystem: true,
                attachments: {
                    where: { isRemoved: false },
                    orderBy: { createdAt: 'asc' },
                },
                comments: {
                    include: {
                        author: { select: { id: true, name: true, role: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
                internalNotes: {
                    include: {
                        author: { select: { id: true, name: true, role: true } },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        res.status(200).json({
            ...ticket,
            status: statusDisplayMap[ticket.status] || ticket.status,
            itPriority: ticket.itPriority || ticket.requestedPriority,
        });
    } catch (error) {
        console.error('Failed to fetch staff ticket detail:', error);
        res.status(500).json({ error: 'Failed to fetch ticket detail' });
    }
});

/**
 * PATCH /api/staff/tickets/:id/owner
 * Claim or reassign ticket owner (BR-09, BR-12)
 */
router.patch('/tickets/:id/owner', async (req: AuthenticatedRequest, res: Response) => {
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

        const { ownerId } = req.body;

        // If ownerId is provided, validate that user exists, is active, and is IT_STAFF or ADMIN
        if (ownerId !== null && ownerId !== undefined) {
            const targetUser = await prisma.user.findUnique({
                where: { id: Number(ownerId) },
            });

            if (!targetUser || !targetUser.isActive || !['IT_STAFF', 'ADMINISTRATOR'].includes(targetUser.role)) {
                return res.status(400).json({ error: 'Owner must be an active IT Staff or Administrator' });
            }
        }

        // BR-12: Auto-move from New to Open when claimed or assigned
        let newStatus = ticket.status;
        if (ticket.status === TicketStatus.New && ownerId !== null && ownerId !== undefined) {
            newStatus = TicketStatus.Open;
        }

        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                ownerId: ownerId !== null && ownerId !== undefined ? Number(ownerId) : null,
                status: newStatus,
            },
            include: {
                owner: { select: { id: true, name: true, email: true, role: true } },
                requester: { select: { id: true, name: true, email: true } },
            },
        });

        res.status(200).json({
            ...updated,
            status: statusDisplayMap[updated.status] || updated.status,
            itPriority: updated.itPriority || updated.requestedPriority,
        });
    } catch (error) {
        console.error('Failed to update ticket owner:', error);
        res.status(500).json({ error: 'Failed to update ticket owner' });
    }
});

/**
 * PATCH /api/staff/tickets/:id/priority
 * Modify IT Priority independently of original Requested Priority (BR-10, BR-11)
 */
router.patch('/tickets/:id/priority', async (req: AuthenticatedRequest, res: Response) => {
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

        const { itPriority } = req.body;
        const validPriorities: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

        if (!itPriority || !validPriorities.includes(itPriority)) {
            return res.status(400).json({
                error: 'Valid itPriority (LOW, MEDIUM, HIGH, URGENT) is required',
            });
        }

        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                itPriority: itPriority as TicketPriority,
            },
            include: {
                owner: { select: { id: true, name: true, email: true, role: true } },
                requester: { select: { id: true, name: true, email: true } },
            },
        });

        res.status(200).json({
            ...updated,
            status: statusDisplayMap[updated.status] || updated.status,
            itPriority: updated.itPriority,
        });
    } catch (error) {
        console.error('Failed to update ticket priority:', error);
        res.status(500).json({ error: 'Failed to update ticket priority' });
    }
});

/**
 * PATCH /api/staff/tickets/:id/status
 * Workflow Status Transition following BR-13 Matrix
 */
router.patch('/tickets/:id/status', async (req: AuthenticatedRequest, res: Response) => {
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

        const { status: targetStatusStr } = req.body;
        if (!targetStatusStr) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const targetStatus = statusQueryMap[targetStatusStr] || (targetStatusStr as TicketStatus);
        const currentStatus = ticket.status;

        const permitted = validTransitions[currentStatus] || [];
        if (!permitted.includes(targetStatus)) {
            const currentDisplay = statusDisplayMap[currentStatus] || currentStatus;
            const targetDisplay = statusDisplayMap[targetStatus] || targetStatusStr;
            return res.status(400).json({
                error: `Invalid status transition from '${currentDisplay}' to '${targetDisplay}'`,
            });
        }

        const updated = await prisma.ticket.update({
            where: { id: ticketId },
            data: {
                status: targetStatus,
            },
            include: {
                owner: { select: { id: true, name: true, email: true, role: true } },
                requester: { select: { id: true, name: true, email: true } },
            },
        });

        res.status(200).json({
            ...updated,
            status: statusDisplayMap[updated.status] || updated.status,
            itPriority: updated.itPriority || updated.requestedPriority,
        });
    } catch (error) {
        console.error('Failed to update ticket status:', error);
        res.status(500).json({ error: 'Failed to update ticket status' });
    }
});

export default router;

