import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma";
import authRoutes from "./routes/auth";
import staffRoutes from "./routes/staff";
import ticketRoutes from "./routes/tickets";
import ticketInteractionsRoutes from "./routes/ticket-interactions";
import adminRoutes from "./routes/admin";

// The Express app is exported separately from app.listen() (see index.ts) so
// Supertest can import `app` without opening a port. Do not merge these files.
export const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.send("TokTickIT API is running");
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// Reference data used by the Create Ticket form
app.get("/api/categories", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      orderBy: { id: 'asc' }
    });
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

app.get("/api/related-systems", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      orderBy: { name: 'asc' }
    });
    res.status(200).json(systems);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch related systems" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/tickets", ticketInteractionsRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/admin", adminRoutes);

// Unknown API routes return a safe JSON 404
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

export default app;
