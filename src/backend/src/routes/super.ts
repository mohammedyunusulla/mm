import { Router } from "express";
import bcrypt from "bcrypt";
import { execSync } from "child_process";
import path from "path";
import { z } from "zod";
import { masterDb } from "../lib/masterDb";
import { getTenantDb } from "../lib/tenantDb";
import { signSuperToken, verifySuperToken } from "../lib/jwt";
import { validate } from "../middleware/validate";
import { authenticateSuperUser } from "../middleware/auth";

const router = Router();

// ── Superuser Login ───────────────────────────────────────────────
// POST /api/super/login
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const superUser = await masterDb.superUser.findUnique({ where: { email } });
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
      data: { token, superUser: { id: superUser.id, email: superUser.email } },
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
        id: true, slug: true, name: true, adminEmail: true,
        isActive: true, createdAt: true, updatedAt: true,
        // Never expose dbUrl to client
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: tenants });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Create a new mandi ────────────────────────────────────────────
// POST /api/super/mandis
// Option C: caller provides the dbUrl (manually created Postgres database)
// We save it to master DB, apply the tenant schema, and create the admin user.
const createMandiSchema = z.object({
  slug: z
    .string().min(2).max(60)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers and hyphens only"),
  name: z.string().min(2).max(100),
  dbUrl: z.string().min(10, "Valid PostgreSQL connection URL required"),
  adminName: z.string().min(2).max(100),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8, "Password must be at least 8 characters"),
});

router.post("/mandis", validate(createMandiSchema), async (req, res) => {
  try {
    const { slug, name, dbUrl, adminName, adminEmail, adminPassword } =
      req.body as z.infer<typeof createMandiSchema>;

    // Check slug uniqueness
    const existing = await masterDb.tenant.findUnique({ where: { slug } });
    if (existing) {
      res.status(409).json({ success: false, error: "Mandi slug already taken" });
      return;
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

    // Create the admin user in the tenant DB
    const tenantDb = getTenantDb(dbUrl);
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await tenantDb.user.create({
      data: { name: adminName, email: adminEmail, passwordHash, role: "ADMIN" },
    });

    // Register the tenant in the master DB
    const tenant = await masterDb.tenant.create({
      data: { slug, name, dbUrl, adminEmail },
    });

    res.status(201).json({
      success: true,
      data: {
        id: tenant.id,
        slug: tenant.slug,
        name: tenant.name,
        adminEmail: tenant.adminEmail,
        isActive: tenant.isActive,
        createdAt: tenant.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── Toggle active/inactive ────────────────────────────────────────
// PATCH /api/super/mandis/:id
router.patch("/mandis/:id", async (req, res) => {
  try {
    const { isActive } = req.body as { isActive?: boolean };
    if (typeof isActive !== "boolean") {
      res.status(400).json({ success: false, error: "isActive boolean required" });
      return;
    }

    const tenant = await masterDb.tenant.findUnique({ where: { id: req.params.id } });
    if (!tenant) { res.status(404).json({ success: false, error: "Mandi not found" }); return; }

    await masterDb.tenant.update({ where: { id: req.params.id }, data: { isActive } });
    res.json({ success: true });
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
    const [userCount, clientCount] = await Promise.all([
      tenantDb.user.count(),
      tenantDb.client.count(),
    ]);

    res.json({
      success: true,
      data: {
        id: tenant.id, slug: tenant.slug, name: tenant.name,
        adminEmail: tenant.adminEmail, isActive: tenant.isActive,
        createdAt: tenant.createdAt, updatedAt: tenant.updatedAt,
        stats: { users: userCount, clients: clientCount },
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
