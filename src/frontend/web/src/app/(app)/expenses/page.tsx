"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Expense, ExpenseCategory } from "@mandi/shared";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { useYear } from "@/components/YearProvider";

const CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "LABOUR", label: "Labour" },
  { value: "TRANSPORT", label: "Transport" },
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
];

const categoryColors: Record<ExpenseCategory, string> = {
  LABOUR: "bg-blue-100 text-blue-700",
  TRANSPORT: "bg-purple-100 text-purple-700",
  RENT: "bg-orange-100 text-orange-700",
  UTILITIES: "bg-cyan-100 text-cyan-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-700",
  OTHER: "bg-gray-100 text-gray-700",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [form, setForm] = useState({ category: "LABOUR" as ExpenseCategory, amount: "", description: "" });
  const [saving, setSaving] = useState(false);
  const { yearStart, yearEnd } = useYear();

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.getExpenses(selectedCategory || undefined, yearStart, yearEnd);
      if (res.success && res.data) {
        setExpenses(res.data as Expense[]);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedCategory, yearStart, yearEnd]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createExpense({
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description,
      });
      setModalOpen(false);
      setForm({ category: "LABOUR", amount: "", description: "" });
      loadExpenses();
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    await api.deleteExpense(id);
    loadExpenses();
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-gray-500 text-sm mt-1">Track all your Mandi expenses</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Summary */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <p className="text-sm text-gray-500">Total Expenses</p>
        <p className="text-3xl font-bold text-red-600">
          ₹{totalExpenses.toLocaleString("en-IN")}
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => setSelectedCategory("")}
          className={`px-3 py-1.5 text-sm rounded-full border transition ${
            !selectedCategory ? "bg-green-600 text-white border-green-600" : "border-gray-200 hover:bg-gray-50"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1.5 text-sm rounded-full border transition ${
              selectedCategory === cat.value
                ? "bg-green-600 text-white border-green-600"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Expense List */}
      {loading ? (
        <LoadingSpinner />
      ) : expenses.length === 0 ? (
        <EmptyState message="No expenses found." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    {new Date(expense.date).toLocaleDateString("en-IN")}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                        categoryColors[expense.category as ExpenseCategory]
                      }`}
                    >
                      {expense.category}
                    </span>
                  </td>
                  <td className="py-3 px-4">{expense.description}</td>
                  <td className="py-3 px-4 text-right font-medium">
                    ₹{Number(expense.amount).toLocaleString("en-IN")}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Expense Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ExpenseCategory })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
