"use client";

import { useEffect, useState } from "react";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "@/lib/api";
import type { Transaction, Client } from "@mandi/shared";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";

function NewSaleModal({
  isOpen,
  onClose,
  onSaved,
  sellers,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  sellers: Client[];
}) {
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState([{ itemName: "", quantity: "", unit: "kg", pricePerUnit: "" }]);
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedSeller = sellers.find((s) => s.id === clientId);
  const availableAdvance = selectedSeller ? Number(selectedSeller.advanceBalance) : 0;

  const addItem = () => setItems([...items, { itemName: "", quantity: "", unit: "kg", pricePerUnit: "" }]);

  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const removeItem = (idx: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== idx));
  };

  const totalAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.pricePerUnit) || 0;
    return sum + qty * price;
  }, 0);

  // Auto-apply advance when client or total changes
  useEffect(() => {
    if (availableAdvance > 0 && totalAmount > 0) {
      const applied = Math.min(availableAdvance, totalAmount);
      setPaidAmount(String(applied));
    }
  }, [clientId, totalAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createTransaction({
        clientId,
        type: "SALE",
        items: items.map((i) => ({
          itemName: i.itemName,
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit,
          pricePerUnit: parseFloat(i.pricePerUnit) || 0,
        })),
        paidAmount: parseFloat(paidAmount) || 0,
        notes,
      });
      onSaved();
      onClose();
      setClientId("");
      setItems([{ itemName: "", quantity: "", unit: "kg", pricePerUnit: "" }]);
      setPaidAmount("");
      setNotes("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Sale Entry">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seller (Sell To) *</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            required
          >
            <option value="">Select seller...</option>
            {sellers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Items *</label>
            <button type="button" onClick={addItem} className="text-xs text-green-600 hover:text-green-700 font-medium">
              + Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-2.5 space-y-2">
                <div className="flex gap-2 items-center">
                  <input
                    placeholder="Item name"
                    value={item.itemName}
                    onChange={(e) => updateItem(idx, "itemName", e.target.value)}
                    className="flex-1 px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 px-1 text-sm shrink-0">
                      ✕
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    placeholder="Qty"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    className="px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                  <select
                    value={item.unit}
                    onChange={(e) => updateItem(idx, "unit", e.target.value)}
                    className="px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="kg">kg</option>
                    <option value="dozen">dozen</option>
                    <option value="crate">crate</option>
                    <option value="piece">piece</option>
                  </select>
                  <input
                    placeholder="₹/unit"
                    type="number"
                    value={item.pricePerUnit}
                    onChange={(e) => updateItem(idx, "pricePerUnit", e.target.value)}
                    className="px-2 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
            <div className="px-3 py-2 bg-gray-50 border rounded-lg text-sm font-semibold">
              ₹{totalAmount.toLocaleString("en-IN")}
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Received Amount</label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              placeholder="0"
            />
          </div>
        </div>

        {/* Advance Notice */}
        {availableAdvance > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-sm">
            <span className="text-blue-500">₹</span>
            <span className="text-blue-700">
              <span className="font-semibold">₹{availableAdvance.toLocaleString("en-IN")}</span> advance available — auto-applied to received amount
            </span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransactionRow({ txn }: { txn: Transaction }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-4 text-left">
          <div>
            <p className="font-semibold">{txn.client?.name || "Unknown"}</p>
            <p className="text-xs text-gray-400">{new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold">₹{Number(txn.totalAmount).toLocaleString("en-IN")}</p>
            {Number(txn.balanceDue) > 0 ? (
              <p className="text-xs text-red-600">Due: ₹{Number(txn.balanceDue).toLocaleString("en-IN")}</p>
            ) : (
              <p className="text-xs text-green-600">Received</p>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100">
          <table className="w-full text-sm mt-3">
            <thead>
              <tr className="text-gray-500 text-xs">
                <th className="text-left py-1">Item</th>
                <th className="text-right py-1">Qty</th>
                <th className="text-right py-1">Rate</th>
                <th className="text-right py-1">Amount</th>
              </tr>
            </thead>
            <tbody>
              {txn.items.map((item) => (
                <tr key={item.id} className="border-t border-gray-50">
                  <td className="py-1.5">{item.itemName}</td>
                  <td className="text-right py-1.5">{item.quantity} {item.unit}</td>
                  <td className="text-right py-1.5">₹{Number(item.pricePerUnit).toLocaleString("en-IN")}</td>
                  <td className="text-right py-1.5 font-medium">₹{Number(item.total).toLocaleString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-between mt-3 pt-2 border-t border-gray-100 text-sm">
            <span className="text-gray-500">Received: ₹{Number(txn.paidAmount).toLocaleString("en-IN")}</span>
            <span className="font-semibold">Total: ₹{Number(txn.totalAmount).toLocaleString("en-IN")}</span>
          </div>
          {txn.notes && <p className="text-xs text-gray-400 mt-2 italic">{txn.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function SellToPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sellers, setSellers] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [txnRes, clientRes] = await Promise.all([
        api.getTransactions("SALE"),
        api.getClients("SELLER"),
      ]);
      if (txnRes.success && txnRes.data) setTransactions(txnRes.data as Transaction[]);
      if (clientRes.success && clientRes.data) setSellers(clientRes.data as Client[]);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalSales = transactions.reduce((s, t) => s + Number(t.totalAmount), 0);
  const totalDue = transactions.reduce((s, t) => s + Number(t.balanceDue), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Sell To</h1>
          <p className="text-gray-500 text-sm mt-1">Sales records — items you sell to retailers/buyers</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Plus className="w-4 h-4" />
          New Sale
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Sales</p>
          <p className="text-2xl font-bold mt-1">₹{totalSales.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Pending Receivables</p>
          <p className="text-2xl font-bold mt-1 text-red-600">₹{totalDue.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Transactions</p>
          <p className="text-2xl font-bold mt-1">{transactions.length}</p>
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <LoadingSpinner />
      ) : transactions.length === 0 ? (
        <EmptyState message="No sales records yet. Add your first sale entry." />
      ) : (
        <div className="space-y-3">
          {transactions.map((txn) => (
            <TransactionRow key={txn.id} txn={txn} />
          ))}
        </div>
      )}

      <NewSaleModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
        sellers={sellers}
      />
    </div>
  );
}
