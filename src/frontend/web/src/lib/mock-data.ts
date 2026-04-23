import type {
  Client,
  Transaction,
  Expense,
  AdvancePayment,
  DashboardStats,
  ExpenseCategory,
  ClientType,
  TransactionType,
} from "@mandi/shared";

// ── Seed Data ──────────────────────────────────────────────────

let clients: Client[] = [
  {
    id: "c1",
    name: "Ramesh Kumar",
    phone: "9876543210",
    address: "Azadpur Mandi, Delhi",
    type: "BUYER",
    notes: "Regular supplier of tomatoes",
    balanceDue: 2000,
    advanceBalance: 0,
    createdAt: "2026-02-15T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "c2",
    name: "Suresh Patel",
    phone: "9123456789",
    address: "Vashi Market, Navi Mumbai",
    type: "BUYER",
    notes: "",
    balanceDue: 0,
    advanceBalance: 1500,
    createdAt: "2026-02-20T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "c3",
    name: "Rajesh Traders",
    phone: "9988776655",
    address: "Crawford Market, Mumbai",
    type: "SELLER",
    notes: "Bulk buyer of seasonal fruits",
    balanceDue: 3500,
    advanceBalance: 0,
    createdAt: "2026-02-18T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
  {
    id: "c4",
    name: "Sharma General Store",
    phone: "9112233445",
    address: "Sector 18, Noida",
    type: "SELLER",
    notes: "",
    balanceDue: 0,
    advanceBalance: 0,
    createdAt: "2026-02-22T10:00:00Z",
    updatedAt: "2026-03-01T10:00:00Z",
  },
];

let transactions: Transaction[] = [
  {
    id: "t1",
    clientId: "c1",
    client: clients[0],
    type: "PURCHASE",
    items: [
      { id: "ti1", transactionId: "t1", itemName: "Tomatoes", quantity: 100, unit: "kg", pricePerUnit: 30, total: 3000 },
      { id: "ti2", transactionId: "t1", itemName: "Onions", quantity: 50, unit: "kg", pricePerUnit: 40, total: 2000 },
    ],
    totalAmount: 5000,
    paidAmount: 3000,
    balanceDue: 2000,
    notes: "Weekly purchase",
    date: "2026-03-08T09:00:00Z",
    createdAt: "2026-03-08T09:00:00Z",
    updatedAt: "2026-03-08T09:00:00Z",
  },
  {
    id: "t2",
    clientId: "c3",
    client: clients[2],
    type: "SALE",
    items: [
      { id: "ti3", transactionId: "t2", itemName: "Mangoes", quantity: 200, unit: "kg", pricePerUnit: 50, total: 10000 },
    ],
    totalAmount: 10000,
    paidAmount: 6500,
    balanceDue: 3500,
    date: "2026-03-08T10:30:00Z",
    createdAt: "2026-03-08T10:30:00Z",
    updatedAt: "2026-03-08T10:30:00Z",
  },
  {
    id: "t3",
    clientId: "c1",
    client: clients[0],
    type: "PURCHASE",
    items: [
      { id: "ti4", transactionId: "t3", itemName: "Potatoes", quantity: 200, unit: "kg", pricePerUnit: 25, total: 5000 },
      { id: "ti5", transactionId: "t3", itemName: "Cauliflower", quantity: 50, unit: "kg", pricePerUnit: 60, total: 3000 },
    ],
    totalAmount: 8000,
    paidAmount: 8000,
    balanceDue: 0,
    notes: "Paid in full",
    date: "2026-03-07T08:00:00Z",
    createdAt: "2026-03-07T08:00:00Z",
    updatedAt: "2026-03-07T08:00:00Z",
  },
  {
    id: "t4",
    clientId: "c2",
    client: clients[1],
    type: "PURCHASE",
    items: [
      { id: "ti6", transactionId: "t4", itemName: "Apples", quantity: 80, unit: "kg", pricePerUnit: 120, total: 9600 },
    ],
    totalAmount: 9600,
    paidAmount: 5000,
    balanceDue: 4600,
    notes: "Kashmir apples - premium",
    date: "2026-03-06T11:00:00Z",
    createdAt: "2026-03-06T11:00:00Z",
    updatedAt: "2026-03-06T11:00:00Z",
  },
  {
    id: "t5",
    clientId: "c4",
    client: clients[3],
    type: "SALE",
    items: [
      { id: "ti7", transactionId: "t5", itemName: "Tomatoes", quantity: 60, unit: "kg", pricePerUnit: 45, total: 2700 },
      { id: "ti8", transactionId: "t5", itemName: "Onions", quantity: 40, unit: "kg", pricePerUnit: 55, total: 2200 },
    ],
    totalAmount: 4900,
    paidAmount: 4900,
    balanceDue: 0,
    notes: "Cash payment",
    date: "2026-03-07T14:00:00Z",
    createdAt: "2026-03-07T14:00:00Z",
    updatedAt: "2026-03-07T14:00:00Z",
  },
  {
    id: "t6",
    clientId: "c3",
    client: clients[2],
    type: "SALE",
    items: [
      { id: "ti9", transactionId: "t6", itemName: "Bananas", quantity: 150, unit: "dozen", pricePerUnit: 40, total: 6000 },
    ],
    totalAmount: 6000,
    paidAmount: 3000,
    balanceDue: 3000,
    date: "2026-03-05T09:30:00Z",
    createdAt: "2026-03-05T09:30:00Z",
    updatedAt: "2026-03-05T09:30:00Z",
  },
];

let expenses: Expense[] = [
  {
    id: "e1",
    category: "LABOUR",
    amount: 1500,
    description: "Daily workers - loading/unloading",
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "e2",
    category: "TRANSPORT",
    amount: 800,
    description: "Truck from farm to mandi",
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "e3",
    category: "RENT",
    amount: 5000,
    description: "Monthly shop rent",
    date: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let nextId = 100;
function genId() {
  return `mock-${++nextId}`;
}

// ── Advance Payment History ────────────────────────────────────
let advanceInvoiceCounter = 2; // seed record uses 001
let advancePayments: AdvancePayment[] = [
  {
    id: "ap1",
    clientId: "c2",
    amount: 1500,
    invoiceNumber: "AP-202603-001",
    note: "Cash advance before purchase",
    date: "2026-03-06T10:00:00Z",
    createdAt: "2026-03-06T10:00:00Z",
  },
];

// ── Simulated delay ────────────────────────────────────────────
const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

type ApiRes<T = unknown> = { success: boolean; data?: T; error?: string };
function ok<T>(data: T): ApiRes<T> {
  return { success: true, data };
}

// ── Mock API Implementation ────────────────────────────────────

export const mockApi = {
  // Auth
  async login(email: string, password: string, _tenantSlug?: string): Promise<ApiRes> {
    await delay();
    if (email === "admin@mandi.com" && password === "admin123") {
      return ok({
        user: { id: "u1", name: "Admin", email, role: "ADMIN" },
        token: "mock-jwt-token",
      });
    }
    return { success: false, error: "Invalid email or password" };
  },

  async getMe(): Promise<ApiRes> {
    await delay();
    return ok({ id: "u1", name: "Admin", email: "admin@mandi.com", role: "ADMIN" });
  },

  // Clients
  async getClients(type?: string, search?: string): Promise<ApiRes<Client[]>> {
    await delay();
    let result = [...clients];
    if (type) result = result.filter((c) => c.type === type);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
      );
    }
    return ok(result);
  },

  async getClient(id: string): Promise<ApiRes<Client | undefined>> {
    await delay();
    return ok(clients.find((c) => c.id === id));
  },

  async createClient(data: Record<string, unknown>): Promise<ApiRes<Client>> {
    await delay();
    const now = new Date().toISOString();
    const client: Client = {
      id: genId(),
      name: data.name as string,
      phone: data.phone as string,
      address: data.address as string,
      type: data.type as ClientType,
      notes: (data.notes as string) || "",
      balanceDue: 0,
      advanceBalance: 0,
      createdAt: now,
      updatedAt: now,
    };
    clients = [...clients, client];
    return ok(client);
  },

  async addAdvancePayment(clientId: string, amount: number, note?: string, date?: string): Promise<ApiRes<Client>> {
    await delay();
    const idx = clients.findIndex((c) => c.id === clientId);
    if (idx === -1) return { success: false, error: "Client not found" };
    const now = new Date().toISOString();
    const paymentDate = date ? new Date(date).toISOString() : now;
    const d = new Date(paymentDate);
    const ym = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
    const invoiceNumber = `AP-${ym}-${String(advanceInvoiceCounter++).padStart(3, "0")}`;
    clients[idx] = {
      ...clients[idx],
      advanceBalance: Number(clients[idx].advanceBalance) + amount,
      updatedAt: now,
    };
    clients = [...clients];
    advancePayments = [
      ...advancePayments,
      { id: genId(), clientId, amount, invoiceNumber, note: note || "", date: paymentDate, createdAt: now },
    ];
    return ok(clients[idx]);
  },

  async getAdvancePayments(clientId: string): Promise<ApiRes<AdvancePayment[]>> {
    await delay();
    const result = advancePayments
      .filter((p) => p.clientId === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return ok(result);
  },

  async updateAdvancePayment(
    id: string,
    data: { amount?: number; note?: string; date?: string }
  ): Promise<ApiRes<{ payment: AdvancePayment; client: Client }>> {
    await delay();
    const idx = advancePayments.findIndex((p) => p.id === id);
    if (idx === -1) return { success: false, error: "Payment not found" };
    const old = advancePayments[idx];
    const clientIdx = clients.findIndex((c) => c.id === old.clientId);
    if (clientIdx === -1) return { success: false, error: "Client not found" };
    const newAmount = data.amount !== undefined ? Number(data.amount) : Number(old.amount);
    const diff = newAmount - Number(old.amount);
    const updated: AdvancePayment = {
      ...old,
      amount: newAmount,
      note: data.note !== undefined ? data.note : old.note,
      date: data.date ? new Date(data.date).toISOString() : old.date,
    };
    advancePayments = advancePayments.map((p) => p.id === id ? updated : p);
    clients[clientIdx] = {
      ...clients[clientIdx],
      advanceBalance: Number(clients[clientIdx].advanceBalance) + diff,
      updatedAt: new Date().toISOString(),
    };
    clients = [...clients];
    return ok({ payment: updated, client: clients[clientIdx] });
  },

  async deleteAdvancePayment(id: string): Promise<ApiRes<Client>> {
    await delay();
    const payment = advancePayments.find((p) => p.id === id);
    if (!payment) return { success: false, error: "Payment not found" };
    const clientIdx = clients.findIndex((c) => c.id === payment.clientId);
    if (clientIdx === -1) return { success: false, error: "Client not found" };
    advancePayments = advancePayments.filter((p) => p.id !== id);
    clients[clientIdx] = {
      ...clients[clientIdx],
      advanceBalance: Math.max(0, Number(clients[clientIdx].advanceBalance) - Number(payment.amount)),
      updatedAt: new Date().toISOString(),
    };
    clients = [...clients];
    return ok(clients[clientIdx]);
  },

  async updateClient(id: string, data: Record<string, unknown>): Promise<ApiRes<Client | undefined>> {
    await delay();
    const idx = clients.findIndex((c) => c.id === id);
    if (idx === -1) return { success: false, error: "Client not found" };
    clients[idx] = {
      ...clients[idx],
      ...(data as Partial<Client>),
      updatedAt: new Date().toISOString(),
    };
    clients = [...clients];
    return ok(clients[idx]);
  },

  async deleteClient(id: string): Promise<ApiRes> {
    await delay();
    clients = clients.filter((c) => c.id !== id);
    return ok({ deleted: true });
  },

  // Transactions
  async getTransactions(type?: string, clientId?: string): Promise<ApiRes<Transaction[]>> {
    await delay();
    let result = [...transactions];
    if (type) result = result.filter((t) => t.type === type);
    if (clientId) result = result.filter((t) => t.clientId === clientId);
    return ok(result);
  },

  async createTransaction(data: Record<string, unknown>): Promise<ApiRes<Transaction>> {
    await delay();
    const items = (data.items as Transaction["items"]) || [];
    const totalAmount = items.reduce((s, i) => s + i.quantity * i.pricePerUnit, 0);
    const manualPaid = (data.paidAmount as number) || 0;
    const now = new Date().toISOString();

    // Auto-apply advance balance
    const clientIdx = clients.findIndex((c) => c.id === data.clientId);
    let advanceUsed = 0;
    if (clientIdx !== -1) {
      const available = Number(clients[clientIdx].advanceBalance);
      const remaining = totalAmount - manualPaid;
      advanceUsed = Math.min(available, Math.max(0, remaining));
      if (advanceUsed > 0) {
        clients[clientIdx] = {
          ...clients[clientIdx],
          advanceBalance: available - advanceUsed,
          updatedAt: now,
        };
        clients = [...clients];
      }
    }

    const paidAmount = manualPaid + advanceUsed;
    const txn: Transaction = {
      id: genId(),
      clientId: data.clientId as string,
      client: clients.find((c) => c.id === data.clientId),
      type: data.type as TransactionType,
      items: items.map((i) => ({ ...i, id: genId(), transactionId: "" })),
      totalAmount,
      paidAmount,
      balanceDue: totalAmount - paidAmount,
      notes: (data.notes as string) || "",
      date: (data.date as string) || now,
      createdAt: now,
      updatedAt: now,
    };
    transactions = [...transactions, txn];
    return ok(txn);
  },

  // Expenses
  async getExpenses(category?: string): Promise<ApiRes<Expense[]>> {
    await delay();
    let result = [...expenses];
    if (category) result = result.filter((e) => e.category === category);
    return ok(result);
  },

  async createExpense(data: Record<string, unknown>): Promise<ApiRes<Expense>> {
    await delay();
    const now = new Date().toISOString();
    const expense: Expense = {
      id: genId(),
      category: data.category as ExpenseCategory,
      amount: data.amount as number,
      description: data.description as string,
      date: (data.date as string) || now,
      createdAt: now,
      updatedAt: now,
    };
    expenses = [...expenses, expense];
    return ok(expense);
  },

  async deleteExpense(id: string): Promise<ApiRes> {
    await delay();
    expenses = expenses.filter((e) => e.id !== id);
    return ok({ deleted: true });
  },

  // Reports
  async getDashboard(): Promise<ApiRes<DashboardStats>> {
    await delay();
    const buyers = clients.filter((c) => c.type === "BUYER");
    const sellers = clients.filter((c) => c.type === "SELLER");
    const purchases = transactions.filter((t) => t.type === "PURCHASE");
    const sales = transactions.filter((t) => t.type === "SALE");
    const todayExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);
    return ok({
      totalBuyers: buyers.length,
      totalSellers: sellers.length,
      todayPurchases: purchases.reduce((s, t) => s + Number(t.totalAmount), 0),
      todaySales: sales.reduce((s, t) => s + Number(t.totalAmount), 0),
      todayExpenses,
      totalReceivable: sellers.reduce((s, c) => s + Number(c.balanceDue), 0),
      totalPayable: buyers.reduce((s, c) => s + Number(c.balanceDue), 0),
      recentTransactions: transactions.slice(-5).reverse(),
    });
  },

  async getSummary(from?: string, to?: string): Promise<ApiRes> {
    await delay();
    const purchases = transactions.filter((t) => t.type === "PURCHASE");
    const sales = transactions.filter((t) => t.type === "SALE");
    const purchaseTotal = purchases.reduce((s, t) => s + Number(t.totalAmount), 0);
    const saleTotal = sales.reduce((s, t) => s + Number(t.totalAmount), 0);
    const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
    return ok({
      period: { from: from || "2026-03-01", to: to || "2026-03-08" },
      purchases: {
        count: purchases.length,
        total: purchaseTotal,
        paid: purchases.reduce((s, t) => s + Number(t.paidAmount), 0),
      },
      sales: {
        count: sales.length,
        total: saleTotal,
        paid: sales.reduce((s, t) => s + Number(t.paidAmount), 0),
      },
      expenses: { count: expenses.length, total: expenseTotal },
      profit: saleTotal - purchaseTotal - expenseTotal,
    });
  },
};
