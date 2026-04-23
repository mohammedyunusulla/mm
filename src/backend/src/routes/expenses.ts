import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

const expenseSchema = z.object({
  category: z.enum(["LABOUR", "TRANSPORT", "RENT", "UTILITIES", "MAINTENANCE", "OTHER"]),
  amount: z.number().positive(),
  description: z.string().min(1).max(500),
  date: z.string().optional(),
});

// ── GET /api/expenses ────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { category, from, to } = req.query as { category?: string; from?: string; to?: string };
    const db = req.db!;

    const expenses = await db.expense.findMany({
      where: {
        ...(category ? { category: category as "LABOUR" | "TRANSPORT" | "RENT" | "UTILITIES" | "MAINTENANCE" | "OTHER" } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: "desc" },
    });

    res.json({ success: true, data: expenses });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── POST /api/expenses ─────────────────────────────────────────────────────
router.post("/", validate(expenseSchema), async (req, res) => {
  try {
    const { category, amount, description, date } = req.body as z.infer<typeof expenseSchema>;
    const expense = await req.db!.expense.create({
      data: { category, amount, description, date: date ? new Date(date) : new Date() },
    });
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── PUT /api/expenses/:id ───────────────────────────────────────────────────
router.put("/:id", validate(expenseSchema.partial()), async (req, res) => {
  try {
    const db = req.db!;
    const existing = await db.expense.findUnique({ where: { id: req.params.id as string } });
    if (!existing) { res.status(404).json({ success: false, error: "Expense not found" }); return; }

    const { date, ...rest } = req.body as z.infer<typeof expenseSchema>;
    const expense = await db.expense.update({
      where: { id: req.params.id as string },
      data: { ...rest, ...(date ? { date: new Date(date) } : {}) },
    });
    res.json({ success: true, data: expense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── DELETE /api/expenses/:id ────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const db = req.db!;
    const existing = await db.expense.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ success: false, error: "Expense not found" }); return; }

    await db.expense.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
