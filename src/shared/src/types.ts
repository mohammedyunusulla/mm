// ── Client Types ──
export type ClientType = "BUYER" | "SELLER";

export interface Client {
  id: string;
  name: string;
  phone: string;
  address: string;
  type: ClientType;
  notes?: string;
  balanceDue: number;
  advanceBalance: number;
  createdAt: string;
  updatedAt: string;
}

// ── Advance Payment Types ──
export interface AdvancePayment {
  id: string;
  clientId: string;
  amount: number;
  invoiceNumber: string;
  note?: string;
  date: string;
  createdAt: string;
}

// ── Transaction Types ──
export type TransactionType = "PURCHASE" | "SALE";

export interface TransactionItem {
  id: string;
  transactionId: string;
  itemName: string;
  quantity: number;
  unit: string; // kg, crate, dozen, etc.
  pricePerUnit: number;
  total: number;
}

export interface Transaction {
  id: string;
  clientId: string;
  client?: Client;
  type: TransactionType;
  items: TransactionItem[];
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  notes?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// ── Expense Types ──
export type ExpenseCategory =
  | "LABOUR"
  | "TRANSPORT"
  | "RENT"
  | "UTILITIES"
  | "MAINTENANCE"
  | "OTHER";

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// ── Auth Types ──
export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER";
}

// ── Dashboard Types ──
export interface DashboardStats {
  totalBuyers: number;
  totalSellers: number;
  todayPurchases: number;
  todaySales: number;
  todayExpenses: number;
  totalReceivable: number;
  totalPayable: number;
  recentTransactions: Transaction[];
}

// ── Report Types ──
export interface ReportSummary {
  period: { from: string; to: string };
  purchases: { count: number; total: number; paid: number };
  sales: { count: number; total: number; paid: number };
  expenses: { count: number; total: number };
  profit: number;
}
