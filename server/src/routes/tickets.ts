import { Router, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getPrisma } from '../prisma';
import { requireAppAccess, requireRole, AuthenticatedRequest } from '../middlewares/auth';
import { TicketStatus, TicketPriority } from '../../generated/prisma/client';

const router = Router();

// Every Lab 2 Requester ticket route requires an authenticated user who has
// completed any mandatory password change. Identity always comes from the token.
router.use(requireAppAccess);

// Creating and managing own tickets is a Requester operation. IT Staff and Administrators
// work on tickets through /api/staff and may only download attachments here.
const requesterOnly = requireRole('REQUESTER');

export const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  },
});

const STAFF_ROLES = ['IT_STAFF', 'ADMINISTRATOR'];
const PRIORITIES: TicketPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'ticketNumber', 'summary', 'status', 'requestedPriority'];
const NOT_FOUND = { error: 'Ticket not found.' };

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

function withDisplayStatus<T extends { status: string }>(ticket: T): T {
  return { ...ticket, status: statusDisplayMap[ticket.status] || ticket.status };
}

function parseId(value: string | string[] | undefined): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// ---------------------------------------------------------------------------
// Create Ticket (requesterId always comes from the authenticated user)
// ---------------------------------------------------------------------------
router.post('/', requesterOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const { summary, description, categoryId, relatedSystemId, requestedPriority } = req.body;

    const errors: Record<string, string> = {};
    if (!summary || typeof summary !== 'string' || !summary.trim()) {
      errors.summary = 'Summary is required.';
    } else if (summary.trim().length > 200) {
      errors.summary = 'Summary must be at most 200 characters.';
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      errors.description = 'Description is required.';
    } else if (description.trim().length > 5000) {
      errors.description = 'Description must be at most 5000 characters.';
    }
    if (!parseId(categoryId)) {
      errors.categoryId = 'Category is required.';
    }
    if (!parseId(relatedSystemId)) {
      errors.relatedSystemId = 'Related System is required.';
    }
    if (requestedPriority !== undefined && !PRIORITIES.includes(requestedPriority)) {
      errors.requestedPriority = 'Priority must be LOW, MEDIUM, HIGH, or URGENT.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const [category, relatedSystem] = await Promise.all([
      prisma.category.findUnique({ where: { id: Number(categoryId) } }),
      prisma.relatedSystem.findUnique({ where: { id: Number(relatedSystemId) } }),
    ]);
    if (!category || !relatedSystem) {
      return res.status(400).json({
        error: 'Validation failed',
        details: {
          ...(category ? {} : { categoryId: 'Selected category does not exist.' }),
          ...(relatedSystem ? {} : { relatedSystemId: 'Selected related system does not exist.' }),
        },
      });
    }

    const priority: TicketPriority = requestedPriority || 'MEDIUM';

    // Ticket numbers are TKT-<year>-<6-digit sequence>. The next number follows the highest
    // existing number for the year; a unique-constraint clash (concurrent create) is retried.
    for (let attempt = 0; attempt < 5; attempt++) {
      const prefix = `TKT-${new Date().getFullYear()}-`;
      const last = await prisma.ticket.findFirst({
        where: { ticketNumber: { startsWith: prefix } },
        orderBy: { ticketNumber: 'desc' },
        select: { ticketNumber: true },
      });
      const nextSequence = (last ? parseInt(last.ticketNumber.slice(prefix.length), 10) || 0 : 0) + 1;
      const ticketNumber = `${prefix}${String(nextSequence).padStart(6, '0')}`;

      try {
        const newTicket = await prisma.ticket.create({
          data: {
            ticketNumber,
            summary: summary.trim(),
            description: description.trim(),
            status: TicketStatus.New,
            requestedPriority: priority,
            itPriority: priority, // IT Priority initially copies Requested Priority (BR-11)
            requesterId: req.user!.id,
            categoryId: category.id,
            relatedSystemId: relatedSystem.id,
          },
          include: {
            category: true,
            relatedSystem: true,
            requester: { select: { id: true, name: true, email: true } },
          },
        });
        return res.status(201).json(withDisplayStatus(newTicket));
      } catch (err: any) {
        if (err?.code !== 'P2002') throw err;
      }
    }

    return res.status(409).json({ error: 'Could not allocate a ticket number. Please try again.' });
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while creating the ticket.' });
  }
});

// ---------------------------------------------------------------------------
// Upload Attachment (ticket owner only)
// ---------------------------------------------------------------------------
router.post('/:id/attachments', requesterOnly, async (req: AuthenticatedRequest, res: Response) => {
  const ticketId = parseId(req.params.id);
  if (!ticketId) {
    return res.status(404).json(NOT_FOUND);
  }

  // Check ownership before accepting any file bytes
  try {
    const ticket = await getPrisma().ticket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.requesterId !== req.user!.id) {
      return res.status(404).json(NOT_FOUND);
    }
  } catch (error) {
    console.error('Failed to check attachment ownership:', error);
    return res.status(500).json({ error: 'Failed to process attachment.' });
  }

  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds the 5MB limit.' });
      }
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: 'Only JPG, PNG, WEBP, and PDF files are allowed.' });
      }
      return res.status(400).json({ error: 'File upload failed.' });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      const prisma = getPrisma();
      const activeCount = await prisma.attachment.count({ where: { ticketId, isRemoved: false } });
      if (activeCount >= 5) {
        fs.unlink(req.file.path, () => undefined);
        return res.status(400).json({ error: 'Maximum limit of 5 attachments per ticket reached.' });
      }

      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          originalFileName: req.file.originalname,
          storedFileName: req.file.filename,
          size: req.file.size,
          mimeType: req.file.mimetype,
          isRemoved: false,
        },
      });

      return res.status(201).json(attachment);
    } catch (dbError) {
      console.error('Failed to save attachment metadata:', dbError);
      return res.status(500).json({ error: 'Failed to process attachment.' });
    }
  });
});

// ---------------------------------------------------------------------------
// My Tickets List (Search, Filter, Sort, Pagination) — owned tickets only
// ---------------------------------------------------------------------------
router.get('/', requesterOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const search = req.query.search ? String(req.query.search).trim() : '';
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const statusParam = req.query.status ? String(req.query.status) : undefined;
    const sortBy = (req.query.sortBy as string) || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    if (!SORTABLE_FIELDS.includes(sortBy)) {
      return res.status(400).json({ error: `Invalid sortBy. Allowed values: ${SORTABLE_FIELDS.join(', ')}` });
    }
    if (categoryId !== undefined && !parseId(req.query.categoryId as string)) {
      return res.status(400).json({ error: 'Invalid categoryId' });
    }

    const whereCondition: any = { requesterId: req.user!.id };

    if (categoryId) {
      whereCondition.categoryId = categoryId;
    }

    if (statusParam && statusParam !== 'All') {
      const mapped = statusQueryMap[statusParam];
      if (!mapped) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      whereCondition.status = mapped;
    }

    if (search) {
      whereCondition.OR = [
        { summary: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [totalItems, tickets] = await Promise.all([
      prisma.ticket.count({ where: whereCondition }),
      prisma.ticket.findMany({
        where: whereCondition,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          category: true,
          relatedSystem: true,
          attachments: {
            where: { isRemoved: false },
            select: { id: true },
          },
        },
      }),
    ]);

    return res.status(200).json({
      data: tickets.map(withDisplayStatus),
      meta: {
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    console.error('Failed to fetch tickets:', error);
    return res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
});

// ---------------------------------------------------------------------------
// Requester Ticket Detail — owner only. Tickets of other requesters return 404
// so the API does not reveal whether they exist.
// ---------------------------------------------------------------------------
router.get('/:id', requesterOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseId(req.params.id);
    if (!ticketId) {
      return res.status(404).json(NOT_FOUND);
    }

    const ticket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
      include: {
        category: true,
        relatedSystem: true,
        requester: { select: { id: true, name: true, email: true } },
        owner: { select: { id: true, name: true } },
        attachments: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!ticket || ticket.requesterId !== req.user!.id) {
      return res.status(404).json(NOT_FOUND);
    }

    return res.status(200).json(withDisplayStatus(ticket));
  } catch (error) {
    console.error('Failed to fetch ticket detail:', error);
    return res.status(500).json({ error: 'Failed to fetch ticket detail.' });
  }
});

// ---------------------------------------------------------------------------
// Download Attachment — ticket owner, IT Staff, or Administrator
// ---------------------------------------------------------------------------
router.get('/:id/attachments/:attachmentId/download', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const ticketId = parseId(req.params.id);
    const attachmentId = parseId(req.params.attachmentId);
    const notFound = { error: 'Attachment not found.' };
    if (!ticketId || !attachmentId) {
      return res.status(404).json(notFound);
    }

    const attachment = await getPrisma().attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    const isStaff = STAFF_ROLES.includes(req.user!.role);
    if (
      !attachment ||
      attachment.ticketId !== ticketId ||
      (!isStaff && attachment.ticket.requesterId !== req.user!.id)
    ) {
      return res.status(404).json(notFound);
    }

    if (attachment.isRemoved) {
      return res.status(404).json({ error: 'This attachment has been removed.' });
    }

    const filePath = path.join(uploadDir, attachment.storedFileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json(notFound);
    }

    return res.download(filePath, attachment.originalFileName);
  } catch (error) {
    console.error('Failed to download attachment:', error);
    return res.status(500).json({ error: 'Failed to download attachment.' });
  }
});

// ---------------------------------------------------------------------------
// Soft-remove Attachment — ticket owner only, with a removal reason
// ---------------------------------------------------------------------------
router.delete('/:id/attachments/:attachmentId', requesterOnly, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const prisma = getPrisma();
    const ticketId = parseId(req.params.id);
    const attachmentId = parseId(req.params.attachmentId);
    const notFound = { error: 'Attachment not found.' };
    if (!ticketId || !attachmentId) {
      return res.status(404).json(notFound);
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { ticket: true },
    });

    if (!attachment || attachment.ticketId !== ticketId || attachment.ticket.requesterId !== req.user!.id) {
      return res.status(404).json(notFound);
    }

    const rawReason = req.body?.reason ?? req.query?.reason;
    const reason = typeof rawReason === 'string' ? rawReason.trim() : '';
    if (!reason) {
      return res.status(400).json({ error: 'A removal reason is required.' });
    }
    if (reason.length > 500) {
      return res.status(400).json({ error: 'Removal reason must be at most 500 characters.' });
    }

    await prisma.attachment.update({
      where: { id: attachmentId },
      data: { isRemoved: true, removalReason: reason },
    });

    return res.status(204).send();
  } catch (error) {
    console.error('Failed to remove attachment:', error);
    return res.status(500).json({ error: 'Failed to remove attachment.' });
  }
});

export default router;
