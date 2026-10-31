import { Router, Response } from 'express';
import { getPrisma } from '../prisma';
import { authenticate, requireRole, requirePasswordChanged, AuthenticatedRequest } from '../middlewares/auth';
import { TicketPriority } from '../../generated/prisma/client';
import { statusDisplay, statusFilter } from '../services/ticket-status';
import { changeOwner, changePriority, changeStatus } from '../services/workflow';
import { sendApiError } from './send-error';

const router = Router();

// Apply auth middleware to all staff routes
router.use(authenticate);
router.use(requirePasswordChanged);
router.use(requireRole('IT_STAFF', 'ADMINISTRATOR'));

const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const QUEUE_SORT_FIELDS = ['createdAt', 'updatedAt', 'ticketNumber', 'status', 'priority'];

/**
 * GET /api/staff/tickets
 * Query IT Staff ticket queue with search, filter, sort, and pagination
 */
router.get('/tickets', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const prisma = getPrisma();
        const page = Math.max(1, parseInt(req.query.page as string) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
        const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
        const statusParam = req.query.status as string;
        const priorityParam = req.query.priority as string;
        const ownerParam = req.query.owner as string;
        const sortBy = (req.query.sortBy as string) || 'createdAt';
        const sortOrderParam = ((req.query.sortOrder as string) || 'desc').toLowerCase();

        // Invalid query parameters are rejected with 400 instead of being silently ignored
        if (!QUEUE_SORT_FIELDS.includes(sortBy)) {
            return res.status(400).json({ error: `Invalid sortBy. Allowed values: ${QUEUE_SORT_FIELDS.join(', ')}` });
        }
        if (sortOrderParam !== 'asc' && sortOrderParam !== 'desc') {
            return res.status(400).json({ error: 'Invalid sortOrder. Allowed values: asc, desc' });
        }
        const statusWhere = statusFilter(statusParam);
        if (statusWhere.invalid) {
            return res.status(400).json({ error: 'Invalid status filter' });
        }
        if (priorityParam && priorityParam !== 'All' && !PRIORITIES.includes(priorityParam.toUpperCase() as TicketPriority)) {
            return res.status(400).json({ error: 'Invalid priority filter. Allowed values: LOW, MEDIUM, HIGH, URGENT' });
        }
        if (ownerParam && !['All', 'unassigned', 'me'].includes(ownerParam) && !/^\d+$/.test(ownerParam)) {
            return res.status(400).json({ error: 'Invalid owner filter. Allowed values: unassigned, me, or a staff user id' });
        }
        if (search.length > 100) {
            return res.status(400).json({ error: 'Search text must be at most 100 characters' });
        }
        const sortOrder: 'asc' | 'desc' = sortOrderParam;

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

        // Status filter (a single status, or Active = the five active statuses)
        if (statusWhere.where) {
            andConditions.push({ status: statusWhere.where });
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
            } else {
                andConditions.push({ ownerId: Number(ownerParam) });
            }
        }

        const whereCondition = andConditions.length > 0 ? { AND: andConditions } : {};

        // Sorting (single column; ties broken by id for stable pagination)
        let orderBy: any;
        if (sortBy === 'priority') {
            orderBy = [{ itPriority: sortOrder }, { requestedPriority: sortOrder }, { id: 'desc' }];
        } else {
            orderBy = [{ [sortBy]: sortOrder }, { id: 'desc' }];
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
            status: statusDisplay(t.status),
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

function bodyObject(req: AuthenticatedRequest): Record<string, unknown> {
    return req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? (req.body as Record<string, unknown>) : {};
}

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
            status: statusDisplay(ticket.status),
            itPriority: ticket.itPriority || ticket.requestedPriority,
        });
    } catch (error) {
        console.error('Failed to fetch staff ticket detail:', error);
        res.status(500).json({ error: 'Failed to fetch ticket detail' });
    }
});

/**
 * PATCH /api/staff/tickets/:id/owner
 * Claim or reassign ticket owner (L3-BR-09, L3-BR-12). Requires expectedUpdatedAt (BR-19); records an owner event (BR-35).
 */
router.patch('/tickets/:id/owner', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ticketId = Number(req.params.id);
        if (!Number.isInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }
        res.status(200).json(await changeOwner(ticketId, req.user!, bodyObject(req)));
    } catch (error) {
        sendApiError(res, error, 'Failed to update ticket owner');
    }
});

/**
 * PATCH /api/staff/tickets/:id/priority
 * Modify IT Priority independently of the Requested Priority (L3-BR-10, L3-BR-11). Requires expectedUpdatedAt (BR-19).
 */
router.patch('/tickets/:id/priority', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ticketId = Number(req.params.id);
        if (!Number.isInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }
        res.status(200).json(await changePriority(ticketId, req.user!, bodyObject(req)));
    } catch (error) {
        sendApiError(res, error, 'Failed to update ticket priority');
    }
});

/**
 * PATCH /api/staff/tickets/:id/status
 * Final transition matrix, resolution gate and atomic stale-update check (BR-14..BR-20).
 */
router.patch('/tickets/:id/status', async (req: AuthenticatedRequest, res: Response) => {
    try {
        const ticketId = Number(req.params.id);
        if (!Number.isInteger(ticketId) || ticketId <= 0) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }
        res.status(200).json(await changeStatus(ticketId, req.user!, bodyObject(req)));
    } catch (error) {
        sendApiError(res, error, 'Failed to update ticket status');
    }
});

export default router;

