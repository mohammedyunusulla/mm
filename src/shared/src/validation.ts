import { z } from "zod";

// ── Auth Validation ──
export const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ── Client Validation ──
export const clientSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().min(10, "Phone must be at least 10 digits").max(15),
  address: z.string().max(500).optional(),
  type: z.enum(["BUYER", "SELLER"]),
  notes: z.string().max(1000).optional(),
});

// ── Transaction Item Validation ──
export const transactionItemSchema = z.object({
  itemName: z.string().min(1, "Item name is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  pricePerUnit: z.number().nonnegative("Price must be non-negative"),
});

// ── Transaction Validation ──
export const transactionSchema = z.object({
  clientId: z.string().uuid("Invalid client ID"),
  type: z.enum(["PURCHASE", "SALE"]),
  items: z.array(transactionItemSchema).min(1, "At least one item is required"),
  paidAmount: z.number().nonnegative("Paid amount must be non-negative"),
  notes: z.string().max(1000).optional(),
  date: z.string().datetime().optional(),
});

// ── Expense Validation ──
export const expenseSchema = z.object({
  category: z.enum([
    "LABOUR",
    "TRANSPORT",
    "RENT",
    "UTILITIES",
    "MAINTENANCE",
    "OTHER",
  ]),
  amount: z.number().positive("Amount must be positive"),
  description: z.string().min(1, "Description is required").max(500),
  date: z.string().datetime().optional(),
});

// ── Inferred Types from Schemas ──
export type LoginInput = z.infer<typeof loginSchema>;
export type ClientInput = z.infer<typeof clientSchema>;
export type TransactionItemInput = z.infer<typeof transactionItemSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
