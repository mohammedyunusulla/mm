import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { masterDb } from "../lib/masterDb";
import { getTenantDb } from "../lib/tenantDb";
import { signToken } from "../lib/jwt";
import { validate } from "../middleware/validate";
import { authenticate, requireAdmin } from "../middleware/auth";

const router = Router();

// ── Login ─────────────────────────────────────────────────────────
// POST /api/auth/login
// 1. Find tenant by slug in master DB → get dbUrl
// 2. Connect to tenant DB → verify user credentials
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
});

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password, tenantSlug } = req.body as z.infer<typeof loginSchema>;

    // Step 1: find tenant in master DB
    const tenant = await masterDb.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || !tenant.isActive) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    // Step 2: connect to tenant DB and verify user
    const db = getTenantDb(tenant.dbUrl);
    const user = await db.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const token = signToken({ userId: user.id, tenantId: tenant.id, role: user.role });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Get current user ──────────────────────────────────────────────
// GET /api/auth/me
router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await req.db!.user.findUnique({
      where: { id: req.user!.userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }
    res.json({ success: true, data: { ...user, tenantId: req.user!.tenantId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Create staff user (admin only) ───────────────────────────────
// POST /api/auth/users
const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "OWNER", "WRITER"]).default("WRITER"),
});

router.post("/users", authenticate, requireAdmin, validate(createUserSchema), async (req, res) => {
  try {
    const { name, email, password, role } = req.body as z.infer<typeof createUserSchema>;

    const exists = await req.db!.user.findUnique({ where: { email } });
    if (exists) {
      res.status(409).json({ success: false, error: "Email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await req.db!.user.create({
      data: { name, email, passwordHash, role },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    res.status(201).json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── List staff users (admin only) ────────────────────────────────
// GET /api/auth/users
router.get("/users", authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await req.db!.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Deactivate / reactivate a user (admin only) ──────────────────
// PATCH /api/auth/users/:id
router.patch("/users/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const { isActive } = req.body as { isActive?: boolean };
    if (typeof isActive !== "boolean") {
      res.status(400).json({ success: false, error: "isActive boolean required" });
      return;
    }

    if (req.params.id === req.user!.userId && !isActive) {
      res.status(400).json({ success: false, error: "Cannot deactivate your own account" });
      return;
    }

    const user = await req.db!.user.findUnique({ where: { id: req.params.id as string } });
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }

    await req.db!.user.update({ where: { id: req.params.id as string }, data: { isActive } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
