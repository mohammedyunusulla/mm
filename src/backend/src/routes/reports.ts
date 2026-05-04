import { Router } from "express";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// ── GET /api/reports/dashboard ────────────────────────────────────────────
router.get("/dashboard", async (req, res) => {
  try {
    const db = req.db!;
    const { from, to } = req.query as { from?: string; to?: string };

    // Date range: if from/to provided use them, else default to today
    const rangeStart = from ? new Date(from) : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();
    const rangeEnd = to ? new Date(to + "T23:59:59.999Z") : (() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; })();
    const dateFilter = { gte: rangeStart, lte: rangeEnd };

    const [
      totalBuyers,
      totalSellers,
      purchasesAgg,
      salesAgg,
      expensesAgg,
      totalReceivableAgg,
      totalPayableAgg,
      recentTransactions,
    ] = await Promise.all([
      db.client.count({ where: { type: "BUYER" } }),
      db.client.count({ where: { type: "SELLER" } }),
      db.transaction.aggregate({
        where: { type: "PURCHASE", date: dateFilter },
        _sum: { totalAmount: true },
      }),
      db.transaction.aggregate({
        where: { type: "SALE", date: dateFilter },
        _sum: { totalAmount: true },
      }),
      db.expense.aggregate({
        where: { date: dateFilter },
        _sum: { amount: true },
      }),
      db.client.aggregate({ where: { type: "BUYER" }, _sum: { balanceDue: true } }),
      db.client.aggregate({ where: { type: "SELLER" }, _sum: { balanceDue: true } }),
      db.transaction.findMany({
        where: { date: dateFilter },
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { client: true, items: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        totalBuyers,
        totalSellers,
        todayPurchases: Number(purchasesAgg._sum.totalAmount ?? 0),
        todaySales: Number(salesAgg._sum.totalAmount ?? 0),
        todayExpenses: Number(expensesAgg._sum.amount ?? 0),
        totalReceivable: Number(totalReceivableAgg._sum.balanceDue ?? 0),
        totalPayable: Number(totalPayableAgg._sum.balanceDue ?? 0),
        recentTransactions: recentTransactions.map((t: Record<string, unknown>) => ({
          ...t,
          totalAmount: Number(t.totalAmount),
          paidAmount: Number(t.paidAmount),
          balanceDue: Number(t.balanceDue),
          items: (t.items as Array<Record<string, unknown>>).map((i) => ({
            ...i,
            quantity: Number(i.quantity),
            pricePerUnit: Number(i.pricePerUnit),
            total: Number(i.total),
          })),
        })),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// ── GET /api/reports/summary?from=&to= ─────────────────────────────────────
router.get("/summary", async (req, res) => {
  try {
    const db = req.db!;
    const { from, to } = req.query as { from?: string; to?: string };

    const dateFilter = from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {};

    const [purchasesAgg, salesAgg, expensesAgg, expensesByCategory] = await Promise.all([
      db.transaction.aggregate({
        where: { type: "PURCHASE", ...dateFilter },
        _sum: { totalAmount: true, paidAmount: true, balanceDue: true },
        _count: true,
      }),
      db.transaction.aggregate({
        where: { type: "SALE", ...dateFilter },
        _sum: { totalAmount: true, paidAmount: true, balanceDue: true },
        _count: true,
      }),
      db.expense.aggregate({
        where: { ...dateFilter },
        _sum: { amount: true },
        _count: true,
      }),
      db.expense.groupBy({
        by: ["category"],
        where: { ...dateFilter },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        purchases: {
          count: purchasesAgg._count,
          total: Number(purchasesAgg._sum.totalAmount ?? 0),
          paid: Number(purchasesAgg._sum.paidAmount ?? 0),
          due: Number(purchasesAgg._sum.balanceDue ?? 0),
        },
        sales: {
          count: salesAgg._count,
          total: Number(salesAgg._sum.totalAmount ?? 0),
          paid: Number(salesAgg._sum.paidAmount ?? 0),
          due: Number(salesAgg._sum.balanceDue ?? 0),
        },
        expenses: {
          count: expensesAgg._count,
          total: Number(expensesAgg._sum.amount ?? 0),
          byCategory: expensesByCategory.map((e: { category: string; _sum: { amount: object | null } }) => ({
            category: e.category,
            total: Number(e._sum.amount ?? 0),
          })),
        },
        profit: Number(salesAgg._sum.totalAmount ?? 0) -
                Number(purchasesAgg._sum.totalAmount ?? 0) -
                Number(expensesAgg._sum.amount ?? 0),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
