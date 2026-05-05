import { Router } from "express";
import bcrypt from "bcrypt";
import { execSync } from "child_process";
import path from "path";
import { z } from "zod";
import { masterDb } from "../lib/masterDb";
import { getTenantDb } from "../lib/tenantDb";
import { signSuperToken, verifySuperToken } from "../lib/jwt";
import { validate } from "../middleware/validate";
import { authenticateSuperUser, computeSubscriptionStatus } from "../middleware/auth";

const router = Router();

// Plan tier limits
const PLAN_LIMITS: Record<string, { maxUsers: number; maxClients: number }> = {
  TRIAL: { maxUsers: 2, maxClients: 20 },
  STANDARD: { maxUsers: 5, maxClients: 200 },
  PREMIUM: { maxUsers: 0, maxClients: 0 }, // 0 = unlimited
};

// Helper: derive a tenant DB URL from slug using the master DB connection string
function deriveTenantDbUrl(slug: string): string {
  const masterUrl = process.env.MASTER_DATABASE_URL || "";
  // Replace the database name at the end of the URL
  // postgresql://user:pass@host:5432/mandi_master → postgresql://user:pass@host:5432/mandi_tenant_<slug>
  const dbName = `mandi_tenant_${slug.replace(/-/g, "_")}`;
  return masterUrl.replace(/\/[^/?]+(\?.*)?$/, `/${dbName}$1`);
}

// ── Superuser Login ───────────────────────────────────────────────
// POST /api/super/login
const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { username, password } = req.body as z.infer<typeof loginSchema>;

    const superUser = await masterDb.superUser.findUnique({ where: { username } });
    if (!superUser) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, superUser.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: "Invalid credentials" });
      return;
    }

    const token = signSuperToken({ superUserId: superUser.id, role: "SUPERUSER" });
    res.json({
      success: true,
      data: { token, superUser: { id: superUser.id, username: superUser.username } },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// All routes below require a valid superuser token
router.use(authenticateSuperUser);

// ── List all mandis ───────────────────────────────────────────────
// GET /api/super/mandis
router.get("/mandis", async (_req, res) => {
  try {
    const tenants = await masterDb.tenant.findMany({
      select: {
        id: true, slug: true, name: true, phone: true, adminEmail: true,
        isActive: true, plan: true, subscriptionEndDate: true,
        maxUsers: true, maxClients: true,
        createdAt: true, updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const data = tenants.map((t) => {
      const { status, daysRemaining } = computeSubscriptionStatus(t.subscriptionEndDate);
      return { ...t, subscriptionStatus: status, daysRemaining };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Create a new mandi ────────────────────────────────────────────
// POST /api/super/mandis
// Auto-creates the tenant database from the slug, applies schema, and creates admin user.
const createMandiSchema = z.object({
  slug: z
    .string().min(2).max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  name: z.string().min(2).max(100),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  adminName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
  plan: z.enum(["TRIAL", "STANDARD", "PREMIUM"]).optional().default("TRIAL"),
});

router.post("/mandis", validate(createMandiSchema), async (req, res) => {
  try {
    const { slug, name, phone, adminName, adminEmail, adminPassword, plan } =
      req.body as z.infer<typeof createMandiSchema>;

    // Check slug uniqueness
    const existing = await masterDb.tenant.findUnique({ where: { slug } });
    if (existing) {
      res.status(409).json({ success: false, error: "Mandi slug already taken" });
      return;
    }

    // Derive tenant DB URL and auto-create the database
    const dbUrl = deriveTenantDbUrl(slug);
    const dbName = `mandi_tenant_${slug.replace(/-/g, "_")}`;

    // Create the database if it doesn't exist (connect to default 'postgres' DB)
    const masterUrl = process.env.MASTER_DATABASE_URL || "";
    const adminDbUrl = masterUrl.replace(/\/[^/?]+(\?.*)?$/, `/postgres$1`);
    try {
      const { PrismaClient } = require("@prisma/client");
      const adminClient = new PrismaClient({ datasources: { db: { url: adminDbUrl } } });
      await adminClient.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
      await adminClient.$disconnect();
    } catch (e: unknown) {
      // Database might already exist - that's fine
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("already exists")) {
        console.error("DB creation failed:", msg);
        res.status(422).json({ success: false, error: "Failed to create tenant database", detail: msg });
        return;
      }
    }

    // Apply the tenant schema to the provided database (prisma db push)
    const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
    try {
      execSync(`npx prisma db push --schema="${schemaPath}" --skip-generate --accept-data-loss`, {
        env: { ...process.env, TENANT_DATABASE_URL: dbUrl },
        cwd: process.cwd(),
        shell: process.platform === "win32" ? "cmd.exe" : "/bin/sh",
        stdio: "pipe",
        timeout: 60_000,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const stderr = (e as { stderr?: Buffer })?.stderr?.toString() ?? "";
      console.error("Schema push failed:", msg, stderr);
      res.status(422).json({
        success: false,
        error: "Could not apply schema to the provided database. Check the connection URL.",
        detail: stderr || msg,
      });
      return;
    }

    // Create the admin user in the tenant DB (upsert in case of retry)
    const tenantDb = getTenantDb(dbUrl);
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await tenantDb.user.upsert({
      where: { email: adminEmail },
      update: { name: adminName, passwordHash, role: "ADMIN" },
      create: { name: adminName, email: adminEmail, passwordHash, role: "ADMIN" },
    });

    // Register the tenant in the master DB
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.TRIAL;
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setDate(subscriptionEndDate.getDate() + (plan === "TRIAL" ? 7 : 30));

    const tenant = await masterDb.tenant.create({
      data: {
        slug, name, phone, dbUrl, adminEmail,
        plan: plan as any,
        subscriptionEndDate,
        maxUsers: limits.maxUsers,
        maxClients: limits.maxClients,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        phone: tenant.phone,
        adminEmail: tenant.adminEmail,
        isActive: tenant.isActive,
        plan: tenant.plan,
        subscriptionEndDate: tenant.subscriptionEndDate,
        maxUsers: tenant.maxUsers,
        maxClients: tenant.maxClients,
        createdAt: tenant.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Update a mandi ────────────────────────────────────────────────
// PATCH /api/super/mandis/:id
// Supports: toggle isActive, edit name, slug, phone, adminEmail
const updateMandiSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(2).max(100).optional(),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/).optional(),
  phone: z.string().min(10).max(15).optional(),
  adminEmail: z.string().email().optional(),
  plan: z.enum(["TRIAL", "STANDARD", "PREMIUM"]).optional(),
}).refine(data => Object.keys(data).length > 0, { message: "At least one field required" });

router.patch("/mandis/:id", validate(updateMandiSchema), async (req, res) => {
  try {
    const id = req.params.id as string;
    const tenant = await masterDb.tenant.findUnique({ where: { id } });
    if (!tenant) { res.status(404).json({ success: false, error: "Mandi not found" }); return; }

    const { isActive, name, slug, phone, adminEmail, plan } = req.body as z.infer<typeof updateMandiSchema>;

    // If slug is changing, check uniqueness
    if (slug && slug !== tenant.slug) {
      const slugTaken = await masterDb.tenant.findUnique({ where: { slug } });
      if (slugTaken) {
        res.status(409).json({ success: false, error: "Slug already taken" });
        return;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (name) updateData.name = name;
    if (slug) updateData.slug = slug;
    if (phone) updateData.phone = phone;
    if (adminEmail) updateData.adminEmail = adminEmail;

    // When plan changes, auto-update limits
    if (plan && plan !== tenant.plan) {
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.TRIAL;
      updateData.plan = plan;
      updateData.maxUsers = limits.maxUsers;
      updateData.maxClients = limits.maxClients;
    }

    // If admin email changed, also update it in the tenant's own DB
    if (adminEmail && adminEmail !== tenant.adminEmail) {
      const tenantDb = getTenantDb(tenant.dbUrl);
      const admin = await tenantDb.user.findUnique({ where: { email: tenant.adminEmail } });
      if (admin) {
        await tenantDb.user.update({ where: { id: admin.id }, data: { email: adminEmail } });
      }
    }

    const updated = await masterDb.tenant.update({
      where: { id },
      data: updateData,
      select: {
        id: true, slug: true, name: true, phone: true, adminEmail: true,
        isActive: true, plan: true, subscriptionEndDate: true,
        maxUsers: true, maxClients: true,
        createdAt: true, updatedAt: true,
      },
    });

    const sub = computeSubscriptionStatus(updated.subscriptionEndDate);
    res.json({ success: true, data: { ...updated, subscriptionStatus: sub.status, daysRemaining: sub.daysRemaining } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Reset mandi admin password ────────────────────────────────────
// PATCH /api/super/mandis/:id/reset-password
const resetMandiPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

router.patch("/mandis/:id/reset-password", validate(resetMandiPasswordSchema), async (req, res) => {
  try {
    const id = req.params.id as string;
    const tenant = await masterDb.tenant.findUnique({ where: { id } });
    if (!tenant) { res.status(404).json({ success: false, error: "Mandi not found" }); return; }

    const { newPassword } = req.body as z.infer<typeof resetMandiPasswordSchema>;
    const tenantDb = getTenantDb(tenant.dbUrl);

    // Find the admin user in the tenant DB
    const admin = await tenantDb.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin) { res.status(404).json({ success: false, error: "Admin user not found in this mandi" }); return; }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await tenantDb.user.update({ where: { id: admin.id }, data: { passwordHash } });
    res.json({ success: true, message: "Admin password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Add credits (extend subscription) ─────────────────────────────
// POST /api/super/mandis/:id/credits
const addCreditsSchema = z.object({
  days: z.number().int().positive().max(365, "Maximum 365 days at once"),
});

router.post("/mandis/:id/credits", validate(addCreditsSchema), async (req, res) => {
  try {
    const id = req.params.id as string;
    const tenant = await masterDb.tenant.findUnique({ where: { id } });
    if (!tenant) { res.status(404).json({ success: false, error: "Mandi not found" }); return; }

    const { days } = req.body as z.infer<typeof addCreditsSchema>;

    // If currently active/grace → extend from current endDate
    // If expired (readonly/blocked) → extend from now
    const now = new Date();
    const baseDate = tenant.subscriptionEndDate > now ? tenant.subscriptionEndDate : now;
    const newEndDate = new Date(baseDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    const updated = await masterDb.tenant.update({
      where: { id },
      data: { subscriptionEndDate: newEndDate },
      select: {
        id: true, slug: true, name: true,
        plan: true, subscriptionEndDate: true,
        maxUsers: true, maxClients: true,
      },
    });

    const sub = computeSubscriptionStatus(updated.subscriptionEndDate);
    res.json({
      success: true,
      data: {
        ...updated,
        subscriptionStatus: sub.status,
        daysRemaining: sub.daysRemaining,
      },
      message: `Added ${days} days. New expiry: ${newEndDate.toISOString().slice(0, 10)}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Delete a mandi ────────────────────────────────────────────────
// DELETE /api/super/mandis/:id
// NOTE: This removes the tenant record from master DB only.
// The tenant's Postgres database itself is NOT dropped (to avoid accidental data loss).
// The superuser must manually drop the DB from their Postgres server after confirming.
router.delete("/mandis/:id", async (req, res) => {
  try {
    const tenant = await masterDb.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) { res.status(404).json({ success: false, error: "Mandi not found" }); return; }

    await masterDb.tenant.delete({ where: { id: req.params.id } });
    res.json({
      success: true,
      message: "Mandi removed from registry. The database itself must be dropped manually.",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Get mandi details ─────────────────────────────────────────────
// GET /api/super/mandis/:id
router.get("/mandis/:id", async (req, res) => {
  try {
    const tenant = await masterDb.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) { res.status(404).json({ success: false, error: "Mandi not found" }); return; }

    // Return stats from the tenant's own DB
    const tenantDb = getTenantDb(tenant.dbUrl);
    const [
      users,
      buyerCount,
      sellerCount,
      transactionCount,
      expenseCount,
    ] = await Promise.all([
      tenantDb.user.findMany({
        select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      tenantDb.client.count({ where: { type: "BUYER" } }),
      tenantDb.client.count({ where: { type: "SELLER" } }),
      tenantDb.transaction.count(),
      tenantDb.expense.count(),
    ]);

    const adminCount = users.filter((u: any) => u.role === "ADMIN").length;
    const managerCount = users.filter((u: any) => u.role === "MANAGER").length;

    res.json({
      success: true,
      data: {
        id: tenant.id, slug: tenant.slug, name: tenant.name,
        phone: tenant.phone, adminEmail: tenant.adminEmail, isActive: tenant.isActive,
        plan: tenant.plan, subscriptionEndDate: tenant.subscriptionEndDate,
        maxUsers: tenant.maxUsers, maxClients: tenant.maxClients,
        subscriptionStatus: computeSubscriptionStatus(tenant.subscriptionEndDate).status,
        daysRemaining: computeSubscriptionStatus(tenant.subscriptionEndDate).daysRemaining,
        createdAt: tenant.createdAt, updatedAt: tenant.updatedAt,
        stats: {
          admins: adminCount,
          managers: managerCount,
          buyers: buyerCount,
          sellers: sellerCount,
          transactions: transactionCount,
          expenses: expenseCount,
        },
        users,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Get current super admin profile ───────────────────────────────
// GET /api/super/profile
router.get("/profile", async (req, res) => {
  try {
    const superUser = await masterDb.superUser.findUnique({
      where: { id: (req as any).superUser.superUserId },
      select: { id: true, username: true, createdAt: true },
    });
    if (!superUser) { res.status(404).json({ success: false, error: "Not found" }); return; }
    res.json({ success: true, data: superUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Update super admin password ───────────────────────────────────
// PATCH /api/super/profile
const updateProfileSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

router.patch("/profile", validate(updateProfileSchema), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body as z.infer<typeof updateProfileSchema>;
    const superUser = await masterDb.superUser.findUnique({
      where: { id: (req as any).superUser.superUserId },
    });
    if (!superUser) { res.status(404).json({ success: false, error: "Not found" }); return; }

    const valid = await bcrypt.compare(currentPassword, superUser.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: "Current password is incorrect" });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await masterDb.superUser.update({ where: { id: superUser.id }, data: { passwordHash } });
    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── List all super admins ─────────────────────────────────────────
// GET /api/super/admins
router.get("/admins", async (_req, res) => {
  try {
    const admins = await masterDb.superUser.findMany({
      select: { id: true, username: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    res.json({ success: true, data: admins });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Create a new super admin ──────────────────────────────────────
// POST /api/super/admins
const createAdminSchema = z.object({
  username: z.string().min(2).max(50),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/admins", validate(createAdminSchema), async (req, res) => {
  try {
    const { username, password } = req.body as z.infer<typeof createAdminSchema>;

    const exists = await masterDb.superUser.findUnique({ where: { username } });
    if (exists) {
      res.status(409).json({ success: false, error: "Username already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await masterDb.superUser.create({
      data: { username, passwordHash },
      select: { id: true, username: true, createdAt: true },
    });
    res.status(201).json({ success: true, data: admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Reset a super admin's password ────────────────────────────────
// PATCH /api/super/admins/:id/reset-password
const resetAdminPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

router.patch("/admins/:id/reset-password", validate(resetAdminPasswordSchema), async (req, res) => {
  try {
    const id = req.params.id as string;
    const admin = await masterDb.superUser.findUnique({ where: { id } });
    if (!admin) { res.status(404).json({ success: false, error: "Admin not found" }); return; }

    const { newPassword } = req.body as z.infer<typeof resetAdminPasswordSchema>;
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await masterDb.superUser.update({ where: { id }, data: { passwordHash } });
    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Delete a super admin ──────────────────────────────────────────
// DELETE /api/super/admins/:id
router.delete("/admins/:id", async (req, res) => {
  try {
    // Prevent self-deletion
    if (req.params.id === (req as any).superUser.superUserId) {
      res.status(400).json({ success: false, error: "Cannot delete your own account" });
      return;
    }

    const admin = await masterDb.superUser.findUnique({ where: { id: req.params.id } });
    if (!admin) { res.status(404).json({ success: false, error: "Admin not found" }); return; }

    // Ensure at least one admin remains
    const count = await masterDb.superUser.count();
    if (count <= 1) {
      res.status(400).json({ success: false, error: "Cannot delete the last admin" });
      return;
    }

    await masterDb.superUser.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
