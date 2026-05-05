import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { masterDb } from "../lib/masterDb";
import { getTenantDb } from "../lib/tenantDb";
import { signToken } from "../lib/jwt";
import { validate } from "../middleware/validate";
import { authenticate, requireAdmin, requireWriteAccess, computeSubscriptionStatus } from "../middleware/auth";

const router = Router();

// ── Login ─────────────────────────────────────────────────────────
// POST /api/auth/login
// 1. Find tenant by slug in master DB → get dbUrl
// 2. Connect to tenant DB → verify user credentials
const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1),
  tenantSlug: z.string().min(1),
});

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { identifier, password, tenantSlug } = req.body as z.infer<typeof loginSchema>;

    // Step 1: find tenant in master DB
    const tenant = await masterDb.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant || !tenant.isActive) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    // Step 1b: check subscription status
    const { status: subStatus, daysRemaining } = computeSubscriptionStatus(tenant.subscriptionEndDate);
    if (subStatus === "BLOCKED") {
      res.status(403).json({
        success: false,
        error: "Your subscription has expired. Please contact your administrator to renew.",
        code: "SUBSCRIPTION_EXPIRED",
      });
      return;
    }

    // Step 2: connect to tenant DB and verify user by email or phone
    const db = getTenantDb(tenant.dbUrl);
    const isEmail = identifier.includes("@");
    const user = isEmail
      ? await db.user.findUnique({ where: { email: identifier } })
      : await db.user.findUnique({ where: { phone: identifier } });

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

    // Record last login time (ignore if column not yet migrated)
    try {
      await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    } catch { /* lastLoginAt column may not exist yet */ }

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        subscription: {
          status: subStatus,
          daysRemaining,
          plan: tenant.plan,
        },
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
      select: { id: true, name: true, email: true, phone: true, role: true },
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
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "MANAGER"]).default("MANAGER"),
}).refine(data => data.email || data.phone, { message: "Email or phone is required" });

router.post("/users", authenticate, requireAdmin, requireWriteAccess, validate(createUserSchema), async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body as z.infer<typeof createUserSchema>;

    if (email) {
      const exists = await req.db!.user.findUnique({ where: { email } });
      if (exists) {
        res.status(409).json({ success: false, error: "Email already exists" });
        return;
      }
    }
    if (phone) {
      const exists = await req.db!.user.findUnique({ where: { phone } });
      if (exists) {
        res.status(409).json({ success: false, error: "Phone already exists" });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await req.db!.user.create({
      data: { name, email, phone, passwordHash, role },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
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
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Update a user (admin only) ───────────────────────────────────
// PATCH /api/auth/users/:id
const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).optional(),
  role: z.enum(["ADMIN", "MANAGER"]).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field required" });

router.patch("/users/:id", authenticate, requireAdmin, validate(updateUserSchema), async (req, res) => {
  try {
    const body = req.body as z.infer<typeof updateUserSchema>;
    const id = req.params.id as string;

    if (id === req.user!.userId && body.isActive === false) {
      res.status(400).json({ success: false, error: "Cannot deactivate your own account" });
      return;
    }

    const user = await req.db!.user.findUnique({ where: { id } });
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }

    // Check email uniqueness if changing
    if (body.email && body.email !== user.email) {
      const exists = await req.db!.user.findUnique({ where: { email: body.email } });
      if (exists) { res.status(409).json({ success: false, error: "Email already in use" }); return; }
    }
    // Check phone uniqueness if changing
    if (body.phone && body.phone !== user.phone) {
      const exists = await req.db!.user.findUnique({ where: { phone: body.phone } });
      if (exists) { res.status(409).json({ success: false, error: "Phone already in use" }); return; }
    }

    const updateData: Record<string, unknown> = {};
    if (body.isActive !== undefined) updateData.isActive = body.isActive;
    if (body.name) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.role) updateData.role = body.role;

    const updated = await req.db!.user.update({
      where: { id },
      data: updateData,
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
    });
    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Change own password ───────────────────────────────────────────
// PATCH /api/auth/password
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

router.patch("/password", authenticate, validate(changePasswordSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
    const user = await req.db!.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) { res.status(404).json({ success: false, error: "User not found" }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: "Current password is incorrect" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await req.db!.user.update({ where: { id: user.id }, data: { passwordHash } });
    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Admin reset another user's password ───────────────────────────
// PATCH /api/auth/users/:id/password
const adminResetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

router.patch("/users/:id/password", authenticate, requireAdmin, validate(adminResetPasswordSchema), async (req, res) => {
  try {
    const { newPassword } = req.body as z.infer<typeof adminResetPasswordSchema>;
    const targetUser = await req.db!.user.findUnique({ where: { id: req.params.id as string } });
    if (!targetUser) { res.status(404).json({ success: false, error: "User not found" }); return; }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await req.db!.user.update({ where: { id: targetUser.id }, data: { passwordHash } });
    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
