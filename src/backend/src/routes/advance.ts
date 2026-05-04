import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticate, requireWriteAccess } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { nextAdvanceInvoiceNumber } from "../lib/invoice";

const router = Router({ mergeParams: true });
router.use(authenticate);

// Block writes when subscription is in read-only mode
router.post("*", requireWriteAccess);
router.put("*", requireWriteAccess);
router.patch("*", requireWriteAccess);
router.delete("*", requireWriteAccess);

const addSchema = z.object({
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
  date: z.string().optional(),
});

const updateSchema = z.object({
  amount: z.number().positive().optional(),
  note: z.string().max(500).optional(),
  date: z.string().optional(),
});

type ParamsWithClient = { clientId: string };

// ── GET /api/clients/:clientId/advance ───────────────────────────
router.get("/", async (req: Request<ParamsWithClient>, res: Response) => {
  try {
    const { clientId } = req.params;
    const db = req.db!;

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }

    const payments = await db.advancePayment.findMany({
      where: { clientId },
      orderBy: { date: "desc" },
    });

    res.json({ success: true, data: payments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── POST /api/clients/:clientId/advance ──────────────────────────
router.post("/", validate(addSchema), async (req: Request<ParamsWithClient>, res: Response) => {
  try {
    const { clientId } = req.params;
    const db = req.db!;
    const { amount, note, date } = req.body as z.infer<typeof addSchema>;

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }

    const paymentDate = date ? new Date(date) : new Date();
    const invoiceNumber = await nextAdvanceInvoiceNumber(db, paymentDate);

    const [payment, updatedClient] = await db.$transaction([
      db.advancePayment.create({
        data: { clientId, amount, invoiceNumber, note: note ?? "", date: paymentDate },
      }),
      db.client.update({
        where: { id: clientId },
        data: { advanceBalance: { increment: amount }, updatedAt: new Date() },
      }),
    ]);

    res.status(201).json({ success: true, data: { payment, updatedClient } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── PUT /api/advance/:id ──────────────────────────────────────────────────
export const advanceUpdateRouter = Router();
advanceUpdateRouter.use(authenticate);
advanceUpdateRouter.use(requireWriteAccess);

advanceUpdateRouter.put("/:id", validate(updateSchema), async (req, res) => {
  try {
    const db = req.db!;
    const { amount, note, date } = req.body as z.infer<typeof updateSchema>;

    const existing = await db.advancePayment.findUnique({ where: { id: req.params.id as string } });
    if (!existing) { res.status(404).json({ success: false, error: "Payment not found" }); return; }

    const client = await db.client.findUnique({ where: { id: existing.clientId } });
    if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }

    const newAmount = amount ?? Number(existing.amount);
    const diff = newAmount - Number(existing.amount);

    // If reducing advance, ensure advanceBalance doesn't go negative
    const currentAdvance = Number(client.advanceBalance);
    let advanceChange = diff;
    let balanceDueChange = 0;
    if (diff < 0 && currentAdvance + diff < 0) {
      // Can only reduce advance to 0; the rest becomes balance due
      advanceChange = -currentAdvance;
      balanceDueChange = -(diff - advanceChange); // positive: increase balance due
    }

    const [payment, updatedClient] = await db.$transaction([
      db.advancePayment.update({
        where: { id: req.params.id as string },
        data: {
          ...(amount !== undefined ? { amount } : {}),
          ...(note !== undefined ? { note } : {}),
          ...(date ? { date: new Date(date) } : {}),
        },
      }),
      db.client.update({
        where: { id: existing.clientId },
        data: {
          advanceBalance: { increment: advanceChange },
          ...(balanceDueChange !== 0 ? { balanceDue: { increment: balanceDueChange } } : {}),
          updatedAt: new Date(),
        },
      }),
    ]);

    res.json({ success: true, data: { payment, client: updatedClient } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── DELETE /api/advance/:id ───────────────────────────────────────────────
advanceUpdateRouter.delete("/:id", async (req, res) => {
  try {
    const db = req.db!;

    const existing = await db.advancePayment.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ success: false, error: "Payment not found" }); return; }

    const client = await db.client.findUnique({ where: { id: existing.clientId } });
    if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }

    const currentAdvance = Number(client.advanceBalance);
    const originalAmount = Number(existing.amount);

    // Only reduce advance by what's currently available; the rest goes to balance due
    const advanceReduction = Math.min(currentAdvance, originalAmount);
    const balanceDueIncrease = originalAmount - advanceReduction;

    const [, updatedClient] = await db.$transaction([
      db.advancePayment.delete({ where: { id: req.params.id } }),
      db.client.update({
        where: { id: existing.clientId },
        data: {
          advanceBalance: { decrement: advanceReduction },
          ...(balanceDueIncrease > 0 ? { balanceDue: { increment: balanceDueIncrease } } : {}),
          updatedAt: new Date(),
        },
      }),
    ]);

    res.json({ success: true, data: updatedClient });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;

