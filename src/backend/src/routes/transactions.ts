import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { authenticate, requireWriteAccess } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router();
router.use(authenticate);

// Block writes when subscription is in read-only mode
router.post("*", requireWriteAccess);
router.put("*", requireWriteAccess);
router.patch("*", requireWriteAccess);
router.delete("*", requireWriteAccess);

// Generate invoice number: INV-YYYYMMDD-NNN
async function nextInvoiceNumber(db: any, date: Date, type: string): Promise<string> {
  const prefix = type === "PURCHASE" ? "PUR" : "SAL";
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const pattern = `${prefix}-${ymd}-%`;
  const existing = await db.transaction.findMany({
    where: { invoiceNumber: { startsWith: `${prefix}-${ymd}-` } },
    select: { invoiceNumber: true },
    orderBy: { invoiceNumber: "desc" },
    take: 1,
  });
  let seq = 1;
  if (existing.length > 0 && existing[0].invoiceNumber) {
    const last = existing[0].invoiceNumber.split("-").pop();
    seq = (parseInt(last, 10) || 0) + 1;
  }
  return `${prefix}-${ymd}-${String(seq).padStart(3, "0")}`;
}

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
  arrivalNumber: z.string().max(100).optional(),
  vehicleNumber: z.string().max(100).optional(),
  commissionAmount: z.number().nonnegative().optional(),
  labourAmount: z.number().nonnegative().optional(),
  vehicleRent: z.number().nonnegative().optional(),
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
    const { clientId, type, items, paidAmount, notes, date, arrivalNumber, vehicleNumber, commissionAmount, labourAmount, vehicleRent } = req.body as z.infer<typeof createSchema>;

    const client = await db.client.findUnique({ where: { id: clientId } });
    if (!client) { res.status(404).json({ success: false, error: "Client not found" }); return; }

    const totalAmount = items.reduce((s: number, i: z.infer<typeof itemSchema>) => s + i.quantity * i.pricePerUnit, 0);
    const balanceDue = Math.max(0, totalAmount - paidAmount);
    const txnDate = date ? new Date(date) : new Date();

    const availableAdvance = Number(client.advanceBalance);
    const advanceUsed = Math.min(availableAdvance, balanceDue);
    const finalBalanceDue = balanceDue - advanceUsed;

    const txn = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const invoiceNumber = await nextInvoiceNumber(tx, txnDate, type);
      const transaction = await tx.transaction.create({
        data: {
          invoiceNumber,
          clientId,
          type,
          totalAmount,
          paidAmount: paidAmount + advanceUsed,
          balanceDue: finalBalanceDue,
          notes: notes ?? "",
          arrivalNumber: arrivalNumber ?? null,
          vehicleNumber: vehicleNumber ?? null,
          commissionAmount: commissionAmount ?? null,
          labourAmount: labourAmount ?? null,
          vehicleRent: vehicleRent ?? null,
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

// ── PUT /api/transactions/:id ──────────────────────────────────────────────
const updateSchema = z.object({
  items: z.array(itemSchema).min(1).optional(),
  paidAmount: z.number().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().optional(),
  arrivalNumber: z.string().max(100).optional(),
  vehicleNumber: z.string().max(100).optional(),
  commissionAmount: z.number().nonnegative().optional(),
  labourAmount: z.number().nonnegative().optional(),
  vehicleRent: z.number().nonnegative().optional(),
});

router.put("/:id", validate(updateSchema), async (req, res) => {
  try {
    const db = req.db!;
    const id = req.params.id as string;
    const existing = await db.transaction.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!existing) { res.status(404).json({ success: false, error: "Transaction not found" }); return; }

    const body = req.body as z.infer<typeof updateSchema>;
    const newItems = body.items;
    const newTotalAmount = newItems
      ? newItems.reduce((s: number, i: z.infer<typeof itemSchema>) => s + i.quantity * i.pricePerUnit, 0)
      : Number(existing.totalAmount);
    const newPaidAmount = body.paidAmount ?? Number(existing.paidAmount);
    const newBalanceDue = Math.max(0, newTotalAmount - newPaidAmount);

    const oldBalanceDue = Number(existing.balanceDue);
    const balanceDiff = newBalanceDue - oldBalanceDue;

    const txn = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      if (newItems) {
        await tx.transactionItem.deleteMany({ where: { transactionId: existing.id } });
      }

      const transaction = await tx.transaction.update({
        where: { id: existing.id },
        data: {
          totalAmount: newTotalAmount,
          paidAmount: newPaidAmount,
          balanceDue: newBalanceDue,
          ...(body.notes !== undefined ? { notes: body.notes } : {}),
          ...(body.date ? { date: new Date(body.date) } : {}),
          ...(body.arrivalNumber !== undefined ? { arrivalNumber: body.arrivalNumber || null } : {}),
          ...(body.vehicleNumber !== undefined ? { vehicleNumber: body.vehicleNumber || null } : {}),
          ...(body.commissionAmount !== undefined ? { commissionAmount: body.commissionAmount } : {}),
          ...(body.labourAmount !== undefined ? { labourAmount: body.labourAmount } : {}),
          ...(body.vehicleRent !== undefined ? { vehicleRent: body.vehicleRent } : {}),
          ...(newItems ? {
            items: {
              create: newItems.map((i: z.infer<typeof itemSchema>) => ({
                itemName: i.itemName,
                quantity: i.quantity,
                unit: i.unit,
                pricePerUnit: i.pricePerUnit,
                total: i.quantity * i.pricePerUnit,
              })),
            },
          } : {}),
        },
        include: { items: true, client: true },
      });

      if (balanceDiff !== 0) {
        await tx.client.update({
          where: { id: existing.clientId },
          data: { balanceDue: { increment: balanceDiff }, updatedAt: new Date() },
        });
      }

      return transaction;
    });

    res.json({ success: true, data: txn });
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
