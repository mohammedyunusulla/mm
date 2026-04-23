import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

const clientSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(7).max(15),
  address: z.string().min(1).max(500),
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

export default router;
