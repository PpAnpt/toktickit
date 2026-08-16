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


// We only start the server if this file is run directly, 
// which makes it easier to import `app` for testing in the future.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;
