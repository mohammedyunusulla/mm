import { Router } from "express";
import { authenticate } from "../middleware/auth";

const router = Router();
router.use(authenticate);

// ── GET /api/reports/dashboard ────────────────────────────────────────────
router.get("/dashboard", async (req, res) => {
  try {
    const db = req.db!;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [
      totalBuyers,
      totalSellers,
      todayPurchasesAgg,
      todaySalesAgg,
      todayExpensesAgg,
      totalReceivableAgg,
      totalPayableAgg,
    ] = await Promise.all([
      db.client.count({ where: { type: "BUYER" } }),
      db.client.count({ where: { type: "SELLER" } }),
      db.transaction.aggregate({
        where: { type: "PURCHASE", date: { gte: todayStart, lte: todayEnd } },
        _sum: { totalAmount: true },
      }),
      db.transaction.aggregate({
        where: { type: "SALE", date: { gte: todayStart, lte: todayEnd } },
        _sum: { totalAmount: true },
      }),
      db.expense.aggregate({
        where: { date: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
      }),
      db.client.aggregate({ where: { type: "BUYER" }, _sum: { balanceDue: true } }),
      db.client.aggregate({ where: { type: "SELLER" }, _sum: { balanceDue: true } }),
    ]);

    res.json({
      success: true,
      data: {
        totalBuyers,
        totalSellers,
        todayPurchases: Number(todayPurchasesAgg._sum.totalAmount ?? 0),
        todaySales: Number(todaySalesAgg._sum.totalAmount ?? 0),
        todayExpenses: Number(todayExpensesAgg._sum.amount ?? 0),
        totalReceivable: Number(totalReceivableAgg._sum.balanceDue ?? 0),
        totalPayable: Number(totalPayableAgg._sum.balanceDue ?? 0),
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
