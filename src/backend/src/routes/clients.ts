import { Router } from "express";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { authenticate, requireWriteAccess } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

// Block writes when subscription is in read-only mode
router.post("*", requireWriteAccess);
router.put("*", requireWriteAccess);
router.patch("*", requireWriteAccess);
router.delete("*", requireWriteAccess);

// ── Multer config for client images ───────────────────────────────
const uploadsDir = path.resolve(process.cwd(), "uploads/clients");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error("Only .jpg, .jpeg, .png, .webp files are allowed"));
  },
});

const clientSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(7).max(15),
  address: z.string().max(500).optional(),
  type: z.enum(["BUYER", "SELLER"]),
  notes: z.string().max(1000).optional(),
});

const clientUpdateSchema = clientSchema.partial();

// ── GET /api/clients ──────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { type, search } = req.query as { type?: string; search?: string };
    const db = req.db!;

    const clients = await db.client.findMany({
      where: {
        ...(type ? { type: type as "BUYER" | "SELLER" } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { phone: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
    });

    res.json({ success: true, data: clients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── GET /api/clients/:id ──────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const client = await req.db!.client.findUnique({ where: { id: req.params.id } });
    if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }
    res.json({ success: true, data: client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── POST /api/clients ──────────────────────────────────────────────────
router.post("/", validate(clientSchema), async (req, res) => {
  try {
    const client = await req.db!.client.create({ data: req.body });
    res.status(201).json({ success: true, data: client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── PUT /api/clients/:id ────────────────────────────────────────────────
router.put("/:id", validate(clientUpdateSchema), async (req, res) => {
  try {
    const existing = await req.db!.client.findUnique({ where: { id: req.params.id as string } });
    if (!existing) { res.status(404).json({ success: false, error: "Client not found" }); return; }

    const client = await req.db!.client.update({ where: { id: req.params.id as string }, data: req.body });
    res.json({ success: true, data: client });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── DELETE /api/clients/:id ───────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const existing = await req.db!.client.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ success: false, error: "Client not found" }); return; }

    await req.db!.client.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── POST /api/clients/:id/image ───────────────────────────────────────────
router.post("/:id/image", upload.single("image"), async (req, res) => {
  try {
    const id = req.params.id as string;
    const client = await req.db!.client.findUnique({ where: { id } });
    if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }
    if (!req.file) { res.status(400).json({ success: false, error: "No image file provided" }); return; }

    // Delete old image if exists
    if (client.imageUrl) {
      const oldPath = path.resolve(process.cwd(), client.imageUrl.replace(/^\//, ""));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const imageUrl = `/uploads/clients/${req.file.filename}`;
    await req.db!.client.update({ where: { id }, data: { imageUrl } });
    res.json({ success: true, data: { imageUrl } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── DELETE /api/clients/:id/image ─────────────────────────────────────────
router.delete("/:id/image", async (req, res) => {
  try {
    const id = req.params.id as string;
    const client = await req.db!.client.findUnique({ where: { id } });
    if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }

    if (client.imageUrl) {
      const filePath = path.resolve(process.cwd(), client.imageUrl.replace(/^\//, ""));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await req.db!.client.update({ where: { id }, data: { imageUrl: null } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
