"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Search, Phone, MapPin, X, Pencil, Trash2, IndianRupee, FileText, Clock, ChevronRight, Wallet, Printer, Check, Camera } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Client, ClientType, Transaction, AdvancePayment } from "@mandi/shared";
import Modal from "@/components/Modal";
import LoadingSpinner from "@/components/LoadingSpinner";
import EmptyState from "@/components/EmptyState";
import { useDebounce } from "@/hooks/useDebounce";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function ClientModal({
  isOpen,
  onClose,
  clientType,
  onSaved,
  editClient,
}: {
  isOpen: boolean;
  onClose: () => void;
  clientType: ClientType;
  onSaved: () => void;
  editClient: Client | null;
}) {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    type: clientType,
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editClient) {
      setForm({
        name: editClient.name,
        phone: editClient.phone,
        address: editClient.address || "",
        type: editClient.type,
        notes: editClient.notes || "",
      });
      setImagePreview(editClient.imageUrl ? `${API_URL}${editClient.imageUrl}` : null);
    } else {
      setForm({ name: "", phone: "", address: "", type: clientType, notes: "" });
      setImagePreview(null);
    }
    setImageFile(null);
  }, [editClient, clientType]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let clientId = editClient?.id;
      if (editClient) {
        await api.updateClient(editClient.id, form);
      } else {
        const result = await api.createClient(form);
        clientId = (result.data as { id?: string })?.id;
      }

      // Upload image if selected
      if (imageFile && clientId) {
        await api.uploadClientImage(clientId, imageFile);
      }

      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const title = `${editClient ? "Edit" : "Add"} ${clientType === "BUYER" ? "Buyer" : "Seller"}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Image upload */}
        <div className="flex justify-center">
          <div className="relative">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition overflow-hidden"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <Camera className="w-6 h-6 text-gray-400" />
              )}
            </div>
            {imagePreview && (
              <button
                type="button"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 text-center">Click to upload photo</p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
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
  );
}

function ClientCard({
  client,
  onClick,
}: {
  client: Client;
  onClick: (c: Client) => void;
}) {
  return (
    <button
      onClick={() => onClick(client)}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md hover:border-green-200 transition text-left w-full"
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg">{client.name}</h3>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            Number(client.balanceDue) > 0
              ? "bg-red-100 text-red-700"
              : "bg-green-100 text-green-700"
          }`}
        >
          ₹{Number(client.balanceDue).toLocaleString("en-IN")}
        </span>
      </div>
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5" />
          {client.phone}
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5" />
          {client.address}
        </div>
      </div>
      {client.notes && (
        <p className="text-xs text-gray-400 mt-2 italic">{client.notes}</p>
      )}
    </button>
  );
}

function AdvanceInvoiceModal({
  payment,
  client,
  onClose,
}: {
  payment: AdvancePayment;
  client: Client;
  onClose: () => void;
}) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const w = window.open("", "_blank", "width=620,height=750");
    if (!w) return;
    w.document.write(`<html><head><title>${payment.invoiceNumber}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:32px;color:#111;background:#fff}.header{text-align:center;border-bottom:2px solid #1d4ed8;padding-bottom:14px;margin-bottom:18px}.co{font-size:22px;font-weight:700;color:#1d4ed8}.sub{font-size:11px;color:#6b7280;margin-top:3px}.row{display:flex;justify-content:space-between;font-size:13px;margin:6px 0}.lbl{color:#6b7280}.val{font-weight:600}.amtbox{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:16px;text-align:center;margin:20px 0}.amt{font-size:28px;font-weight:700;color:#1d4ed8}.amt-lbl{font-size:11px;color:#6b7280;margin-top:3px}.note{text-align:center;font-size:11px;color:#9ca3af;font-style:italic;margin-top:8px}.sigs{display:flex;justify-content:space-between;margin-top:48px}.sig{border-top:1px solid #9ca3af;padding-top:4px;width:120px;text-align:center;font-size:10px;color:#9ca3af}.foot{text-align:center;font-size:10px;color:#d1d5db;margin-top:20px;border-top:1px solid #e5e7eb;padding-top:12px}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
  };

  const dateStr = new Date(payment.date).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
          <h3 className="text-sm font-semibold">Invoice Preview</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[75vh] p-4 bg-gray-50">
          <div ref={printRef} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="header">
              <p className="co">MANDI MANAGER</p>
              <p className="sub">Advance Payment Receipt</p>
            </div>

            <div className="space-y-2.5">
              <div className="row"><span className="lbl">Invoice No.</span><span className="val font-mono text-gray-800">{payment.invoiceNumber}</span></div>
              <div className="row"><span className="lbl">Date</span><span className="val">{dateStr}</span></div>
              <div className="row"><span className="lbl">Client</span><span className="val">{client.name}</span></div>
              <div className="row"><span className="lbl">Phone</span><span className="val">{client.phone}</span></div>
              {client.address && (
                <div className="row"><span className="lbl">Address</span><span className="val text-right max-w-[55%]">{client.address}</span></div>
              )}
            </div>

            <div className="amtbox mt-5">
              <p className="amt-lbl">Amount Received</p>
              <p className="amt">₹{Number(payment.amount).toLocaleString("en-IN")}</p>
            </div>

            {payment.note && (
              <p className="note">Note: {payment.note}</p>
            )}

            <div className="sigs">
              <div className="sig">Client Signature</div>
              <div className="sig">Authorized By</div>
            </div>
            <p className="foot">Generated by Mandi Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdvancePaymentModal({
  client,
  onClose,
  onBalanceChange,
}: {
  client: Client;
  onClose: () => void;
  onBalanceChange: (newBalance: number) => void;
}) {
  const [history, setHistory] = useState<AdvancePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [invoicePayment, setInvoicePayment] = useState<AdvancePayment | null>(null);
  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmt, setEditAmt] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getAdvancePayments(client.id);
      if (res.success && res.data) setHistory(res.data as AdvancePayment[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [client.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      const res = await api.addAdvancePayment(client.id, amt, note, date);
      const newBalance = (res.success && res.data)
        ? Number((res.data as { updatedClient: Client }).updatedClient.advanceBalance)
        : Number(client.advanceBalance) + amt;
      onBalanceChange(newBalance);
      setAmount("");
      setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      await loadHistory();
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p: AdvancePayment) => {
    setEditingId(p.id);
    setEditAmt(String(p.amount));
    setEditNote(p.note || "");
    setEditDate(p.date.slice(0, 10));
    setDeleteConfirmId(null);
  };

  const cancelEdit = () => setEditingId(null);

  const handleUpdate = async (p: AdvancePayment) => {
    const amt = parseFloat(editAmt);
    if (!amt || amt <= 0) return;
    setEditSaving(true);
    try {
      const res = await api.updateAdvancePayment(p.id, { amount: amt, note: editNote, date: editDate });
      if (res.success && res.data) {
        const { client: updatedClient } = res.data as { payment: AdvancePayment; client: Client };
        onBalanceChange(Number(updatedClient.advanceBalance));
      }
      setEditingId(null);
      await loadHistory();
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (p: AdvancePayment) => {
    setDeletingId(p.id);
    try {
      const res = await api.deleteAdvancePayment(p.id);
      if (res.success && res.data) {
        onBalanceChange(Number((res.data as Client).advanceBalance));
      }
      setDeleteConfirmId(null);
      await loadHistory();
    } finally {
      setDeletingId(null);
    }
  };

  const total = history.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-semibold">Advance Payments</h3>
            <p className="text-xs text-gray-400 mt-0.5">{client.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Add new payment form */}
        <form onSubmit={handleSubmit} className="px-6 py-4 border-b border-gray-100 bg-blue-50 space-y-3">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Record New Advance</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-400 text-sm">₹</span>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                required
                autoFocus
              />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              required
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            />
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium shrink-0"
            >
              {saving ? "Saving..." : "Add"}
            </button>
          </div>
        </form>

        {/* History */}
        <div className="flex-1 overflow-y-auto max-h-96">
          {loading ? (
            <div className="space-y-2 p-6">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Wallet className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No advance payments yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {history.map((p) => (
                <div key={p.id} className="px-5 py-3 hover:bg-gray-50">
                  {editingId === p.id ? (
                    /* ── Inline edit form ── */
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <span className="absolute left-2.5 top-2 text-gray-400 text-sm">₹</span>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            value={editAmt}
                            onChange={(e) => setEditAmt(e.target.value)}
                            className="w-full pl-6 pr-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                          />
                        </div>
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="Note (optional)"
                          className="flex-1 px-2 py-1.5 text-sm border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button
                          onClick={() => handleUpdate(p)}
                          disabled={editSaving}
                          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />{editSaving ? "..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-3 py-1.5 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : deleteConfirmId === p.id ? (
                    /* ── Delete confirmation ── */
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-red-600 font-medium">Delete ₹{Number(p.amount).toLocaleString("en-IN")} advance?</p>
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={deletingId === p.id}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                        >
                          {deletingId === p.id ? "..." : "Yes, delete"}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1 text-xs border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* ── Normal row ── */
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-blue-600">+₹{Number(p.amount).toLocaleString("en-IN")}</p>
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">{p.invoiceNumber}</span>
                        </div>
                        {p.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.note}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setInvoicePayment(p)}
                          title="View Invoice"
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => startEdit(p)}
                          title="Edit"
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setDeleteConfirmId(p.id); setEditingId(null); }}
                          title="Delete"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer total */}
        {history.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500 font-medium">Total Advance Paid</span>
            <span className="text-sm font-bold text-blue-600">₹{total.toLocaleString("en-IN")}</span>
          </div>
        )}
      </div>

      {invoicePayment && (
        <AdvanceInvoiceModal
          payment={invoicePayment}
          client={client}
          onClose={() => setInvoicePayment(null)}
        />
      )}
    </div>
  );
}

function ClientDetailPanel({
  client,
  onClose,
  onEdit,
  onDelete,
  onClientUpdate,
}: {
  client: Client;
  onClose: () => void;
  onEdit: (c: Client) => void;
  onDelete: (id: string) => void;
  onClientUpdate?: (updated: Client) => void;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txnLoading, setTxnLoading] = useState(true);
  const [advanceBalance, setAdvanceBalance] = useState(Number(client.advanceBalance));
  const [showAdvanceModal, setShowAdvanceModal] = useState(false);

  // Sync local state when parent provides a refreshed client
  useEffect(() => {
    setAdvanceBalance(Number(client.advanceBalance));
  }, [client.advanceBalance]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    const load = async () => {
      setTxnLoading(true);
      try {
        const txnType = client.type === "BUYER" ? "PURCHASE" : "SALE";
        const res = await api.getTransactions(txnType, client.id);
        if (res.success && res.data) {
          const sorted = [...(res.data as Transaction[])].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setTransactions(sorted.slice(0, 5));
        }
      } finally {
        setTxnLoading(false);
      }
    };
    load();
  }, [client.id, client.type]);

  const viewAllHref = client.type === "BUYER" ? "/buy-from" : "/sell-to";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* Modal box — stop propagation so clicking inside doesn't close */}
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold">{client.name}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  client.type === "BUYER" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                }`}>
                  {client.type === "BUYER" ? "Buyer" : "Seller"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Added {new Date(client.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(client)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition font-medium"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => onDelete(client.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition font-medium"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
            <button onClick={onClose} className="ml-1 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Body — two columns ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

            {/* ── LEFT: Client info ── */}
            <div className="p-6 space-y-5">
              {/* Balance summary pills */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-xl px-4 py-3 ${Number(client.balanceDue) > 0 ? "bg-red-50" : "bg-green-50"}`}>
                  <p className="text-xs text-gray-500 mb-1">Balance Due</p>
                  <p className={`text-lg font-bold ${Number(client.balanceDue) > 0 ? "text-red-600" : "text-green-600"}`}>
                    ₹{Number(client.balanceDue).toLocaleString("en-IN")}
                  </p>
                  <p className={`text-xs mt-0.5 ${Number(client.balanceDue) > 0 ? "text-red-400" : "text-green-500"}`}>
                    {Number(client.balanceDue) > 0 ? "Outstanding" : "All clear"}
                  </p>
                </div>
                <button
                  onClick={() => setShowAdvanceModal(true)}
                  className="bg-blue-50 hover:bg-blue-100 transition rounded-xl px-4 py-3 text-left"
                >
                  <p className="text-xs text-gray-500 mb-1">Advance Payment</p>
                  <p className={`text-lg font-bold ${advanceBalance > 0 ? "text-blue-600" : "text-gray-400"}`}>
                    ₹{advanceBalance.toLocaleString("en-IN")}
                  </p>
                  <p className="text-xs text-blue-400 mt-0.5">Tap to view / add</p>
                </button>
              </div>

              {/* Contact details */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Contact</p>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Phone</p>
                    <p className="font-medium">{client.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Address</p>
                    <p className="font-medium">{client.address}</p>
                  </div>
                </div>
              </div>

              {/* Meta */}
              <p className="text-xs text-gray-400">
                Last updated {new Date(client.updatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            {/* ── RIGHT: Recent transactions ── */}
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recent Transactions</p>
                </div>
                <Link
                  href={viewAllHref}
                  onClick={onClose}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  View all <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {txnLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No transactions yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Transactions will appear here once added
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transactions.map((txn) => {
                    const itemSummary =
                      txn.items.length === 1
                        ? txn.items[0].itemName
                        : `${txn.items[0].itemName} +${txn.items.length - 1} more`;
                    const isPaid = Number(txn.balanceDue) === 0;
                    return (
                      <div
                        key={txn.id}
                        className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3.5 transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isPaid ? "bg-green-400" : "bg-red-400"}`} />
                          <div>
                            <p className="text-sm font-medium">{itemSummary}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(txn.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">₹{Number(txn.totalAmount).toLocaleString("en-IN")}</p>
                          {isPaid ? (
                            <p className="text-xs text-green-600">Paid</p>
                          ) : (
                            <p className="text-xs text-red-500">Due ₹{Number(txn.balanceDue).toLocaleString("en-IN")}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advance Payment sub-modal */}
      {showAdvanceModal && (
        <AdvancePaymentModal
          client={{ ...client, advanceBalance }}
          onClose={() => setShowAdvanceModal(false)}
          onBalanceChange={(newBalance) => {
            setAdvanceBalance(newBalance);
            onClientUpdate?.({ ...client, advanceBalance: newBalance });
          }}
        />
      )}
    </div>
  );
}

export default function ClientsPage() {
  const [activeTab, setActiveTab] = useState<ClientType>("BUYER");
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [detailClient, setDetailClient] = useState<Client | null>(null);

  const loadClients = async () => {
    setLoading(true);
    try {
      const res = await api.getClients(activeTab, debouncedSearch || undefined);
      if (res.success && res.data) {
        setClients(res.data as Client[]);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [activeTab, debouncedSearch]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this client?")) return;
    setDetailClient(null);
    await api.deleteClient(id);
    loadClients();
  };

  const handleEdit = (client: Client) => {
    setDetailClient(null);
    setEditClient(client);
    setModalOpen(true);
  };

  const isBuyer = activeTab === "BUYER";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your buyers and sellers
          </p>
        </div>
        <button
          onClick={() => {
            setEditClient(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          <Plus className="w-4 h-4" />
          Add {isBuyer ? "Buyer" : "Seller"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => { setActiveTab("BUYER"); setSearch(""); }}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "BUYER"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Buyers (Buy From)
        </button>
        <button
          onClick={() => { setActiveTab("SELLER"); setSearch(""); }}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "SELLER"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Sellers (Sell To)
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
        />
      </div>

      {/* Client List */}
      {loading ? (
        <LoadingSpinner />
      ) : clients.length === 0 ? (
        <EmptyState message={`No ${isBuyer ? "buyers" : "sellers"} found. Add one to get started.`} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={setDetailClient}
            />
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {detailClient && (
        <ClientDetailPanel
          client={detailClient}
          onClose={() => setDetailClient(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClientUpdate={(updated) => {
            setDetailClient(updated);
            setClients((prev) => prev.map((c) => c.id === updated.id ? updated : c));
          }}
        />
      )}

      {/* Edit/Create Modal */}
      <ClientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        clientType={activeTab}
        onSaved={loadClients}
        editClient={editClient}
      />
    </div>
  );
}
