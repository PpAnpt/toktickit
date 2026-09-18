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

export default router;
