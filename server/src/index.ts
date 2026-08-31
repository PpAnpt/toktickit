import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// สร้างโฟลเดอร์ uploads อัตโนมัติถ้ายังไม่มี
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ตั้งค่าที่เก็บไฟล์และการตั้งชื่อไฟล์
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

// กรองประเภทไฟล์และขนาดไฟล์
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // จำกัด 5MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE'));
    }
  },
});

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

// ---------------------------------------------------------------------------
// Lab 2 Issue 3 — Upload Attachment API
// ---------------------------------------------------------------------------
app.post('/api/tickets/:id/attachments', (req: Request, res: Response): void => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size exceeds the 5MB limit.' });
      }
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: 'Only JPG, PNG, WEBP, and PDF files are allowed.' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed.' });
    }

    try {
      const ticketId = Number(req.params.id);
      const requesterIdHeader = req.headers['x-requester-id'];
      const requesterId = requesterIdHeader ? Number(requesterIdHeader) : undefined;

      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
      }

      // ตรวจสอบว่าตั๋วนี้มีอยู่จริงและเป็นของ Requester คนนี้หรือไม่
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: { attachments: { where: { isRemoved: false } } }
      });

      if (!ticket) {
        return res.status(404).json({ error: 'Ticket not found.' });
      }

      if (requesterId && ticket.requesterId !== requesterId) {
        return res.status(403).json({ error: 'You do not have permission to add attachments to this ticket.' });
      }

      // ตรวจสอบจำนวนไฟล์แนบไม่ให้เกิน 5 ไฟล์
      if (ticket.attachments.length >= 5) {
        return res.status(400).json({ error: 'Maximum limit of 5 attachments per ticket reached.' });
      }

      // บันทึกข้อมูลไฟล์ลง Database
      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          originalFileName: req.file.originalname,
          storedFileName: req.file.filename,
          size: req.file.size,
          mimeType: req.file.mimetype,
          isRemoved: false,
        }
      });

      return res.status(201).json(attachment);
    } catch (dbError) {
      console.error('Failed to save attachment metadata:', dbError);
      return res.status(500).json({ error: 'Failed to process attachment.' });
    }
  });
});

// We only start the server if this file is run directly, 
// which makes it easier to import `app` for testing in the future.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
