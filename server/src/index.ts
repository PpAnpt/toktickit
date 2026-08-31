import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import express, { Request, Response } from 'express';
import cors from 'cors';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL
})
const prisma = new PrismaClient({ adapter })

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
  res.send('TokTickIT API is running');
});

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'TokTickIT API'
  });
});

app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { id: 'asc' },
    });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/related-systems', async (req: Request, res: Response) => {
  try {
    const systems = await prisma.relatedSystem.findMany({
      orderBy: { name: 'asc' },
    });
    res.status(200).json(systems);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch related systems' });
  }
});

app.get('/api/requesters', async (req: Request, res: Response) => {
  try {
    const requesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(requesters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch requesters' });
  }
});

// ---------------------------------------------------------------------------
// Lab 2 Issue 3 — Create Ticket API
// ---------------------------------------------------------------------------
app.post('/api/tickets', async (req: Request, res: Response) => {
  try {
    // 1. ตรวจสอบ Requester ID จาก Header (จำลอง Auth)
    const requesterIdHeader = req.headers['x-requester-id'];
    const requesterId = requesterIdHeader ? Number(requesterIdHeader) : req.body.requesterId;

    if (!requesterId || isNaN(requesterId)) {
      return res.status(401).json({ error: 'Missing or invalid X-Requester-Id header' });
    }

    const { summary, description, categoryId, relatedSystemId, requestedPriority } = req.body;

    // 2. Validation ตรวจสอบข้อมูลจำเป็น
    const errors: Record<string, string> = {};
    if (!summary || !summary.trim()) {
      errors.summary = 'Summary is required.';
    }
    if (!description || !description.trim()) {
      errors.description = 'Description is required.';
    }
    if (!categoryId) {
      errors.categoryId = 'Category is required.';
    }
    if (!relatedSystemId) {
      errors.relatedSystemId = 'Related System is required.';
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // 3. สร้างเลขที่ Ticket Number อัตโนมัติ (เช่น TKT-2026-000001)
    const currentYear = new Date().getFullYear();
    const ticketCount = await prisma.ticket.count();
    const ticketNumber = `TKT-${currentYear}-${String(ticketCount + 1).padStart(6, '0')}`;

    // 4. บันทึกลง Database
    const newTicket = await prisma.ticket.create({
      data: {
        ticketNumber,
        summary: summary.trim(),
        description: description.trim(),
        status: 'New',
        requestedPriority: requestedPriority || 'MEDIUM',
        requesterId: Number(requesterId),
        categoryId: Number(categoryId),
        relatedSystemId: Number(relatedSystemId),
      },
      include: {
        category: true,
        relatedSystem: true,
        requester: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return res.status(201).json(newTicket);
  } catch (error) {
    console.error('Failed to create ticket:', error);
    return res.status(500).json({ error: 'An unexpected error occurred while creating the ticket.' });
  }
});

// We only start the server if this file is run directly, 
// which makes it easier to import `app` for testing in the future.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
