import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRouter from "./routes/auth";
import clientsRouter from "./routes/clients";
import advanceRouter, { advanceUpdateRouter } from "./routes/advance";
import transactionsRouter from "./routes/transactions";
import expensesRouter from "./routes/expenses";
import reportsRouter from "./routes/reports";
import superRouter from "./routes/super";
import { masterDb } from "./lib/masterDb";
import { disconnectAllTenantDbs } from "./lib/tenantDb";

const app = express();

// ── Trust proxy (Railway / load balancer) ─────────────────────────
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

// ── Rate limiting (auth endpoints) ───────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later" },
});

// ── Body parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: "1mb" }));

// ── Health check ──────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok", ts: new Date().toISOString() }));

// ── Routes ────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/clients", clientsRouter);
app.use("/api/clients/:clientId/advance", advanceRouter);
app.use("/api/advance", advanceUpdateRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/super", superRouter);

// ── 404 fallback ──────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, error: "Not found" }));

// ── Global error handler ──────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ success: false, error: "Internal server error" });
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT ?? 4000);

const server = app.listen(PORT, async () => {
  try {
    await masterDb.$connect();
    console.log(`✅  Master DB connected`);
  } catch (e) {
    console.error("❌  Master DB connection failed:", e);
    process.exit(1);
  }
  console.log(`🚀  Mandi Manager API running on http://localhost:${PORT}`);
});

// Graceful shutdown
async function shutdown() {
  server.close();
  await masterDb.$disconnect();
  await disconnectAllTenantDbs();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

export default app;
