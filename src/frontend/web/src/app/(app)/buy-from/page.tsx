"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, ChevronDown, ChevronUp, Pencil, Printer, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import type { Transaction, Client } from "@mandi/shared";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { useYear } from "@/components/YearProvider";

function NewTransactionModal({
  isOpen,
  onClose,
  onSaved,
  buyers,
  transactions,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  buyers: Client[];
  transactions: Transaction[];
}) {
  const [clientId, setClientId] = useState("");
  const [items, setItems] = useState([{ itemName: "", quantity: "", unit: "kg", pricePerUnit: "" }]);
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [arrivalNumber, setArrivalNumber] = useState("");

  // Auto-fill arrival number based on existing transactions
  useEffect(() => {
    const maxArrival = transactions.reduce((max, t) => {
      const num = parseInt(t.arrivalNumber || "0", 10);
      return num > max ? num : max;
    }, 0);
    setArrivalNumber(String(maxArrival + 1));
  }, [transactions]);
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [commissionAmount, setCommissionAmount] = useState("");
  const [labourAmount, setLabourAmount] = useState("");
  const [vehicleRent, setVehicleRent] = useState("");
  const [saving, setSaving] = useState(false);

  const selectedBuyer = buyers.find((b) => b.id === clientId);
  const availableAdvance = selectedBuyer ? Number(selectedBuyer.advanceBalance) : 0;

  const addItem = () => setItems([...items, { itemName: "", quantity: "", unit: "kg", pricePerUnit: "" }]);

  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const removeItem = (idx: number) => {
    if (items.length > 1) setItems(items.filter((_, i) => i !== idx));
  };

  const calculatedAmount = items.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.pricePerUnit) || 0;
    return sum + qty * price;
  }, 0);

  const labour = parseFloat(labourAmount) || 0;
  const rent = parseFloat(vehicleRent) || 0;

  // Auto-calculate commission: 2% of calculated amount
  const calculatedCommission = Math.max(0, Math.round(calculatedAmount * 0.02 * 100) / 100);

  const totalAmount = calculatedAmount - calculatedCommission - labour - rent;

  // Auto-apply advance when client or total changes
  useEffect(() => {
    if (totalAmount > 0 && availableAdvance > 0) {
      const applied = Math.min(availableAdvance, totalAmount);
      setPaidAmount(String(applied));
    } else {
      setPaidAmount("0");
    }
  }, [clientId, totalAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createTransaction({
        clientId,
        type: "PURCHASE",
        items: items.map((i) => ({
          itemName: i.itemName,
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit,
          pricePerUnit: parseFloat(i.pricePerUnit) || 0,
        })),
        paidAmount: parseFloat(paidAmount) || 0,
        notes,
        date: txDate,
        arrivalNumber: arrivalNumber || undefined,
        vehicleNumber: vehicleNumber || undefined,
        commissionAmount: calculatedCommission > 0 ? calculatedCommission : undefined,
        labourAmount: labourAmount ? parseFloat(labourAmount) : undefined,
        vehicleRent: vehicleRent ? parseFloat(vehicleRent) : undefined,
      });
      onSaved();
      onClose();
      setClientId("");
      setItems([{ itemName: "", quantity: "", unit: "kg", pricePerUnit: "" }]);
      setPaidAmount("");
      setNotes("");
      setTxDate(new Date().toISOString().slice(0, 10));
      setArrivalNumber("");
      setVehicleNumber("");
      setLabourAmount("");
      setVehicleRent("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Purchase Entry">
      <form onSubmit={handleSubmit} className="space-y-3 max-h-[80vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Buyer (Buy From) *</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
              required
            >
              <option value="">Select buyer...</option>
              {buyers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Date</label>
            <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Arrival No.</label>
            <input value={arrivalNumber} onChange={(e) => setArrivalNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="ARR-001" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Vehicle No.</label>
            <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="MH-12-AB-1234" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Commission (2%)</label>
            <input type="number" value={calculatedCommission || ""} readOnly
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg bg-gray-50 text-gray-600 outline-none" placeholder="Auto" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Labour</label>
            <input type="number" value={labourAmount} onChange={(e) => setLabourAmount(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Vehicle Rent</label>
            <input type="number" value={vehicleRent} onChange={(e) => setVehicleRent(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">Items *</label>
            <button type="button" onClick={addItem} className="text-xs text-green-600 hover:text-green-700 font-medium">
              + Add Item
            </button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-2 space-y-1.5">
                <div className="flex gap-2 items-center">
                  <input
                    placeholder="Item name"
                    value={item.itemName}
                    onChange={(e) => updateItem(idx, "itemName", e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    required
                  />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 px-1 text-sm shrink-0">
                      ✕
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Qty" type="number" value={item.quantity}
                    onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    className="px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" required />
                  <select value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)}
                    className="px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                    <option value="kg">kg</option>
                    <option value="dozen">dozen</option>
                    <option value="crate">crate</option>
                    <option value="piece">piece</option>
                  </select>
                  <input placeholder="₹/unit" type="number" value={item.pricePerUnit}
                    onChange={(e) => updateItem(idx, "pricePerUnit", e.target.value)}
                    className="px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" required />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Total</label>
            <div className="px-2.5 py-1.5 bg-gray-50 border rounded-lg text-sm font-semibold">
              ₹{totalAmount.toLocaleString("en-IN")}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Paid Amount</label>
            <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
          </div>
        </div>

        {/* Advance Notice */}
        {availableAdvance > 0 && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg text-sm">
            <span className="text-blue-500">₹</span>
            <span className="text-blue-700">
              <span className="font-semibold">₹{availableAdvance.toLocaleString("en-IN")}</span> advance available — auto-applied to paid amount
            </span>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function printInvoice(txn: Transaction) {
  const w = window.open("", "_blank", "width=800,height=600");
  if (!w) return;
  const mandiName = typeof window !== "undefined" ? localStorage.getItem("mandiName") || "Mandi Manager" : "Mandi Manager";
  const items = txn.items.map((it, idx) =>
    `<tr>
     <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151">${idx + 1}</td>
     <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151">${it.itemName}</td>
     <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151">${it.quantity} ${it.unit}</td>
     <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151">₹${Number(it.pricePerUnit).toLocaleString("en-IN")}</td>
     <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:500;color:#111827">₹${Number(it.total).toLocaleString("en-IN")}</td></tr>`
  ).join("");

  const deductions = [
    txn.commissionAmount && Number(txn.commissionAmount) > 0 ? `<tr><td colspan="4" style="text-align:right;padding:6px 12px;color:#6b7280">Commission:</td><td style="text-align:right;padding:6px 12px;color:#dc2626">− ₹${Number(txn.commissionAmount).toLocaleString("en-IN")}</td></tr>` : "",
    txn.labourAmount && Number(txn.labourAmount) > 0 ? `<tr><td colspan="4" style="text-align:right;padding:6px 12px;color:#6b7280">Labour:</td><td style="text-align:right;padding:6px 12px;color:#dc2626">− ₹${Number(txn.labourAmount).toLocaleString("en-IN")}</td></tr>` : "",
    txn.vehicleRent && Number(txn.vehicleRent) > 0 ? `<tr><td colspan="4" style="text-align:right;padding:6px 12px;color:#6b7280">Vehicle Rent:</td><td style="text-align:right;padding:6px 12px;color:#dc2626">− ₹${Number(txn.vehicleRent).toLocaleString("en-IN")}</td></tr>` : "",
  ].join("");

  const calcTotal = txn.items.reduce((s, it) => s + Number(it.total), 0);

  w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${txn.invoiceNumber || txn.id.slice(0,8)}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; padding: 0; background: #f3f4f6; }
      .invoice-wrapper { max-width: 720px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
      .invoice-header { background: linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%); color: white; padding: 28px 32px; }
      .mandi-name { font-size: 26px; font-weight: 700; letter-spacing: 0.5px; }
      .invoice-label { font-size: 13px; opacity: 0.85; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
      .invoice-meta { display: flex; justify-content: space-between; align-items: start; padding: 20px 32px; border-bottom: 1px solid #e5e7eb; }
      .meta-left { }
      .meta-label { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
      .meta-value { font-size: 14px; color: #111827; font-weight: 500; margin-bottom: 10px; }
      .meta-right { text-align: right; }
      .invoice-body { padding: 0 32px 24px; }
      table { width: 100%; border-collapse: collapse; margin-top: 16px; }
      th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; border-bottom: 2px solid #d1d5db; background: #f9fafb; }
      th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: right; }
      .subtotal-row td { padding: 10px 12px; border-top: 2px solid #d1d5db; font-weight: 600; color: #111827; }
      .total-section { margin: 20px 32px; padding: 20px 24px; background: #f0fdf4; border-radius: 10px; border: 1px solid #bbf7d0; }
      .total-row { display: flex; justify-content: space-between; align-items: center; padding: 4px 0; font-size: 14px; color: #374151; }
      .total-row.grand { font-size: 20px; font-weight: 700; color: #065f46; padding-top: 12px; margin-top: 8px; border-top: 2px solid #86efac; }
      .total-row.due { color: #dc2626; font-weight: 600; }
      .notes-section { margin: 0 32px 24px; padding: 12px 16px; background: #fffbeb; border-radius: 8px; border: 1px solid #fde68a; font-size: 13px; color: #92400e; }
      .footer { text-align: center; padding: 16px 32px 24px; color: #9ca3af; font-size: 12px; }
      .print-btn { display: block; margin: 0 auto 20px; padding: 10px 32px; background: #059669; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; }
      .print-btn:hover { background: #047857; }
      @media print { .print-btn { display: none; } .invoice-wrapper { box-shadow: none; margin: 0; } body { background: #fff; } }
    </style></head><body>
    <div class="invoice-wrapper">
      <div class="invoice-header">
        <div class="mandi-name">${mandiName}</div>
        <div class="invoice-label">Purchase Invoice</div>
      </div>

      <div class="invoice-meta">
        <div class="meta-left">
          <div class="meta-label">Bill To</div>
          <div class="meta-value">${txn.client?.name || "—"}</div>
          <div class="meta-label">Phone</div>
          <div class="meta-value">${txn.client?.phone || "—"}</div>
        </div>
        <div class="meta-right">
          <div class="meta-label">Invoice No.</div>
          <div class="meta-value">${txn.invoiceNumber || "—"}</div>
          <div class="meta-label">Date</div>
          <div class="meta-value">${new Date(txn.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
          ${txn.arrivalNumber ? `<div class="meta-label">Arrival No.</div><div class="meta-value">${txn.arrivalNumber}</div>` : ""}
          ${txn.vehicleNumber ? `<div class="meta-label">Vehicle No.</div><div class="meta-value">${txn.vehicleNumber}</div>` : ""}
        </div>
      </div>

      <div class="invoice-body">
        <table>
          <thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
          <tbody>
            ${items}
            <tr class="subtotal-row"><td colspan="4" style="text-align:right">Subtotal</td><td style="text-align:right">₹${calcTotal.toLocaleString("en-IN")}</td></tr>
            ${deductions}
          </tbody>
        </table>
      </div>

      <div class="total-section">
        <div class="total-row"><span>Subtotal</span><span>₹${calcTotal.toLocaleString("en-IN")}</span></div>
        ${Number(txn.commissionAmount) > 0 ? `<div class="total-row"><span>Commission</span><span>− ₹${Number(txn.commissionAmount).toLocaleString("en-IN")}</span></div>` : ""}
        ${Number(txn.labourAmount) > 0 ? `<div class="total-row"><span>Labour</span><span>− ₹${Number(txn.labourAmount).toLocaleString("en-IN")}</span></div>` : ""}
        ${Number(txn.vehicleRent) > 0 ? `<div class="total-row"><span>Vehicle Rent</span><span>− ₹${Number(txn.vehicleRent).toLocaleString("en-IN")}</span></div>` : ""}
        <div class="total-row grand"><span>Net Total</span><span>₹${Number(txn.totalAmount).toLocaleString("en-IN")}</span></div>
        <div class="total-row"><span>Paid Amount</span><span>₹${Number(txn.paidAmount).toLocaleString("en-IN")}</span></div>
        ${Number(txn.advanceUsed) > 0 ? `<div class="total-row"><span>Advance Used</span><span>₹${Number(txn.advanceUsed).toLocaleString("en-IN")}</span></div>` : ""}
        ${Number(txn.balanceDue) > 0 ? `<div class="total-row due"><span>Balance Due</span><span>₹${Number(txn.balanceDue).toLocaleString("en-IN")}</span></div>` : ""}
      </div>

      ${txn.notes ? `<div class="notes-section"><strong>Notes:</strong> ${txn.notes}</div>` : ""}

      <div class="footer">Thank you for your business!</div>
      <button class="print-btn" onclick="window.print()">🖨️ Print Invoice</button>
    </div>
    </body></html>`);
  w.document.close();
}

function EditTransactionModal({
  isOpen,
  onClose,
  onSaved,
  txn,
  buyers,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  txn: Transaction;
  buyers: Client[];
}) {
  const [items, setItems] = useState(txn.items.map((i) => ({
    itemName: i.itemName, quantity: String(i.quantity), unit: i.unit, pricePerUnit: String(i.pricePerUnit),
  })));
  const [paidAmount, setPaidAmount] = useState(String(txn.paidAmount));
  const [notes, setNotes] = useState(txn.notes || "");
  const [txDate, setTxDate] = useState(txn.date.slice(0, 10));
  const [arrivalNumber, setArrivalNumber] = useState(txn.arrivalNumber || "");
  const [vehicleNumber, setVehicleNumber] = useState(txn.vehicleNumber || "");
  const [labourAmount, setLabourAmount] = useState(txn.labourAmount ? String(txn.labourAmount) : "");
  const [vehicleRent, setVehicleRent] = useState(txn.vehicleRent ? String(txn.vehicleRent) : "");
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems([...items, { itemName: "", quantity: "", unit: "kg", pricePerUnit: "" }]);
  const updateItem = (idx: number, field: string, value: string) => {
    const updated = [...items]; updated[idx] = { ...updated[idx], [field]: value }; setItems(updated);
  };
  const removeItem = (idx: number) => { if (items.length > 1) setItems(items.filter((_, i) => i !== idx)); };

  const calculatedAmount = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.pricePerUnit) || 0), 0);

  const labour = parseFloat(labourAmount) || 0;
  const rent = parseFloat(vehicleRent) || 0;

  const calculatedCommission = Math.max(0, Math.round(calculatedAmount * 0.02 * 100) / 100);

  const totalAmount = calculatedAmount - calculatedCommission - labour - rent;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateTransaction(txn.id, {
        items: items.map((i) => ({
          itemName: i.itemName, quantity: parseFloat(i.quantity) || 0, unit: i.unit, pricePerUnit: parseFloat(i.pricePerUnit) || 0,
        })),
        paidAmount: parseFloat(paidAmount) || 0,
        notes, date: txDate,
        arrivalNumber: arrivalNumber || undefined,
        vehicleNumber: vehicleNumber || undefined,
        commissionAmount: calculatedCommission > 0 ? calculatedCommission : undefined,
        labourAmount: labourAmount ? parseFloat(labourAmount) : undefined,
        vehicleRent: vehicleRent ? parseFloat(vehicleRent) : undefined,
      });
      onSaved();
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Purchase Entry">
      <form onSubmit={handleSubmit} className="space-y-3 max-h-[80vh] overflow-y-auto pr-1">
        <div className="px-2.5 py-1.5 bg-gray-50 border rounded-lg text-sm text-gray-600">
          Client: <strong>{txn.client?.name}</strong> &nbsp;|&nbsp; Invoice: <strong>{txn.invoiceNumber || "—"}</strong>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Date</label>
            <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Arrival No.</label>
            <input value={arrivalNumber} onChange={(e) => setArrivalNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Vehicle No.</label>
            <input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Commission (2%)</label>
            <input type="number" value={calculatedCommission || ""} readOnly
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg bg-gray-50 text-gray-600 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Labour</label>
            <input type="number" value={labourAmount} onChange={(e) => setLabourAmount(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Vehicle Rent</label>
            <input type="number" value={vehicleRent} onChange={(e) => setVehicleRent(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="0" />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-medium text-gray-700">Items *</label>
            <button type="button" onClick={addItem} className="text-xs text-green-600 hover:text-green-700 font-medium">+ Add Item</button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="border rounded-lg p-2 space-y-1.5">
                <div className="flex gap-2 items-center">
                  <input placeholder="Item name" value={item.itemName} onChange={(e) => updateItem(idx, "itemName", e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" required />
                  {items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <input placeholder="Qty" type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                    className="px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" required />
                  <select value={item.unit} onChange={(e) => updateItem(idx, "unit", e.target.value)}
                    className="px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none">
                    <option value="kg">kg</option><option value="dozen">dozen</option><option value="crate">crate</option><option value="piece">piece</option>
                  </select>
                  <input placeholder="₹/unit" type="number" value={item.pricePerUnit} onChange={(e) => updateItem(idx, "pricePerUnit", e.target.value)}
                    className="px-2 py-1 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" required />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Total</label>
            <div className="px-2.5 py-1.5 bg-gray-50 border rounded-lg text-sm font-semibold">₹{totalAmount.toLocaleString("en-IN")}</div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-0.5">Paid Amount</label>
            <input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-0.5">Notes</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 outline-none" placeholder="Optional notes..." />
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm">
            {saving ? "Saving..." : "Update"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TransactionRow({ txn, onEdit, onDelete, buyers }: { txn: Transaction; onEdit: () => void; onDelete: () => void; buyers: Client[] }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition"
      >
        <div className="flex items-center gap-4 text-left">
          <div>
            <p className="font-semibold">{txn.client?.name || "Unknown"}</p>
            <p className="text-xs text-gray-400">
              {txn.invoiceNumber && <span className="text-gray-500 font-mono mr-2">{txn.invoiceNumber}</span>}
              {new Date(txn.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-semibold">₹{Number(txn.totalAmount).toLocaleString("en-IN")}</p>
            {Number(txn.balanceDue) > 0 ? (
              <p className="text-xs text-red-600">Due: ₹{Number(txn.balanceDue).toLocaleString("en-IN")}</p>
            ) : (
              <p className="text-xs text-green-600">Paid</p>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-4 border-t border-gray-100">
          {/* Meta info */}
          {(txn.arrivalNumber || txn.vehicleNumber) && (
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              {txn.arrivalNumber && <span>Arrival: {txn.arrivalNumber}</span>}
              {txn.vehicleNumber && <span>Vehicle: {txn.vehicleNumber}</span>}
            </div>
          )}
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
          {/* Extras */}
          {(Number(txn.commissionAmount) > 0 || Number(txn.labourAmount) > 0 || Number(txn.vehicleRent) > 0) && (
            <div className="flex gap-4 mt-2 text-xs text-gray-500 border-t border-gray-100 pt-2">
              {Number(txn.commissionAmount) > 0 && <span>Commission: ₹{Number(txn.commissionAmount).toLocaleString("en-IN")}</span>}
              {Number(txn.labourAmount) > 0 && <span>Labour: ₹{Number(txn.labourAmount).toLocaleString("en-IN")}</span>}
              {Number(txn.vehicleRent) > 0 && <span>V.Rent: ₹{Number(txn.vehicleRent).toLocaleString("en-IN")}</span>}
            </div>
          )}
          <div className="flex justify-between mt-3 pt-2 border-t border-gray-100 text-sm">
            <span className="text-gray-500">Paid: ₹{Number(txn.paidAmount).toLocaleString("en-IN")}</span>
            <span className="font-semibold">Total: ₹{Number(txn.totalAmount).toLocaleString("en-IN")}</span>
          </div>
          {txn.notes && <p className="text-xs text-gray-400 mt-2 italic">{txn.notes}</p>}
          <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button onClick={(e) => { e.stopPropagation(); printInvoice(txn); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              <Printer className="w-3.5 h-3.5" /> Invoice
            </button>
            {!confirmDelete ? (
              <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button onClick={async (e) => { e.stopPropagation(); setDeleting(true); await api.deleteTransaction(txn.id); onDelete(); }}
                  disabled={deleting}
                  className="px-3 py-1.5 text-xs text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition">
                  {deleting ? "Deleting..." : "Confirm"}
                </button>
                <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                  className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BuyFromPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [buyers, setBuyers] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const { yearStart, yearEnd } = useYear();

  const loadData = async () => {
    setLoading(true);
    try {
      const [txnRes, clientRes] = await Promise.all([
        api.getTransactions("PURCHASE", undefined, yearStart, yearEnd),
        api.getClients("BUYER"),
      ]);
      if (txnRes.success && txnRes.data) setTransactions(txnRes.data as Transaction[]);
      if (clientRes.success && clientRes.data) setBuyers(clientRes.data as Client[]);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [yearStart, yearEnd]);

  const totalPurchases = transactions.reduce((s, t) => s + Number(t.totalAmount), 0);
  const totalDue = transactions.reduce((s, t) => s + Number(t.balanceDue), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Buy From</h1>
          <p className="text-gray-500 text-sm mt-1">Purchase records — items you buy from farmers/suppliers</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Plus className="w-4 h-4" />
          New Purchase
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Total Purchases</p>
          <p className="text-2xl font-bold mt-1">₹{totalPurchases.toLocaleString("en-IN")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm text-gray-500">Pending Payments</p>
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
        <EmptyState message="No purchase records yet. Add your first purchase entry." />
      ) : (
        <div className="space-y-3">
          {transactions.map((txn) => (
            <TransactionRow key={txn.id} txn={txn} onEdit={() => setEditTxn(txn)} onDelete={loadData} buyers={buyers} />
          ))}
        </div>
      )}

      <NewTransactionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
        buyers={buyers}
        transactions={transactions}
      />

      {editTxn && (
        <EditTransactionModal
          isOpen={!!editTxn}
          onClose={() => setEditTxn(null)}
          onSaved={loadData}
          txn={editTxn}
          buyers={buyers}
        />
      )}
    </div>
  );
}
