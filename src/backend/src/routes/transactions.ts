import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

const itemSchema = z.object({
  itemName: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  pricePerUnit: z.number().nonnegative(),
});

const createSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(["PURCHASE", "SALE"]),
  items: z.array(itemSchema).min(1),
  paidAmount: z.number().nonnegative(),
  notes: z.string().max(1000).optional(),
  date: z.string().optional(),
});

// ── GET /api/transactions ───────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { type, clientId } = req.query as { type?: string; clientId?: string };
    const db = req.db!;

    const transactions = await db.transaction.findMany({
      where: {
        ...(type ? { type: type as "PURCHASE" | "SALE" } : {}),
        ...(clientId ? { clientId } : {}),
      },
      include: {
        items: true,
        client: { select: { id: true, name: true, phone: true, type: true } },
      },
      orderBy: { date: "desc" },
    });

    res.json({ success: true, data: transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── GET /api/transactions/:id ───────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const txn = await req.db!.transaction.findUnique({
      where: { id: req.params.id },
      include: { items: true, client: true },
    });
    if (!txn) { res.status(404).json({ success: false, error: "Transaction not found" }); return; }
    res.json({ success: true, data: txn });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── POST /api/transactions ──────────────────────────────────────────────────
router.post("/", validate(createSchema), async (req, res) => {
  try {
    const db = req.db!;
    const { clientId, type, items, paidAmount, notes, date } = req.body as z.infer<typeof createSchema>;

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }

    const totalAmount = items.reduce((s: number, i: z.infer<typeof itemSchema>) => s + i.quantity * i.pricePerUnit, 0);
    const balanceDue = Math.max(0, totalAmount - paidAmount);
    const txnDate = date ? new Date(date) : new Date();

    const availableAdvance = Number(client.advanceBalance);
    const advanceUsed = Math.min(availableAdvance, balanceDue);
    const finalBalanceDue = balanceDue - advanceUsed;

    const txn = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const transaction = await tx.transaction.create({
        data: {
          clientId,
          type,
          totalAmount,
          paidAmount: paidAmount + advanceUsed,
          balanceDue: finalBalanceDue,
          notes: notes ?? "",
          date: txnDate,
          items: {
            create: items.map((i: z.infer<typeof itemSchema>) => ({
              itemName: i.itemName,
              quantity: i.quantity,
              unit: i.unit,
              pricePerUnit: i.pricePerUnit,
              total: i.quantity * i.pricePerUnit,
            })),
          },
        },
        include: { items: true, client: true },
      });

      await tx.client.update({
        where: { id: clientId },
        data: {
          balanceDue: { increment: finalBalanceDue },
          ...(advanceUsed > 0 ? { advanceBalance: { decrement: advanceUsed } } : {}),
          updatedAt: new Date(),
        },
      });

      return transaction;
    });

    res.status(201).json({ success: true, data: txn });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── DELETE /api/transactions/:id ──────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const db = req.db!;
    const txn = await db.transaction.findUnique({ where: { id: req.params.id } });
    if (!txn) { res.status(404).json({ success: false, error: "Transaction not found" }); return; }

    await db.$transaction([
      db.transactionItem.deleteMany({ where: { transactionId: txn.id } }),
      db.transaction.delete({ where: { id: txn.id } }),
      db.client.update({
        where: { id: txn.clientId },
        data: { balanceDue: { decrement: Number(txn.balanceDue) }, updatedAt: new Date() },
      }),
    ]);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
