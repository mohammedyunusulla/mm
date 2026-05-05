"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Pencil,
  Users,
  X,
  AlertTriangle,
  Search,
  CreditCard,
  Clock,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type PlanTier = "TRIAL" | "STANDARD" | "PREMIUM";
type SubStatus = "ACTIVE" | "GRACE" | "READONLY" | "BLOCKED";

interface Mandi {
  id: string;
  slug: string;
  name: string;
  phone: string;
  adminEmail: string;
  isActive: boolean;
  plan: PlanTier;
  subscriptionEndDate: string;
  subscriptionStatus: SubStatus;
  daysRemaining: number;
  maxUsers: number;
  maxClients: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateForm {
  slug: string;
  name: string;
  phone: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  plan: PlanTier;
}

interface EditForm {
  name: string;
  slug: string;
  phone: string;
  adminEmail: string;
  plan: PlanTier;
}

const EMPTY_CREATE: CreateForm = { slug: "", name: "", phone: "", adminName: "", adminEmail: "", adminPassword: "", plan: "TRIAL" };

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("super_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function MandisPage() {
  const router = useRouter();
  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit modal
  const [editTarget, setEditTarget] = useState<Mandi | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", slug: "", phone: "", adminEmail: "", plan: "TRIAL" });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  // Reset mandi admin password (inside edit modal)
  const [resetPassword, setResetPassword] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Credits modal
  const [creditsTarget, setCreditsTarget] = useState<Mandi | null>(null);
  const [creditDays, setCreditDays] = useState(30);
  const [addingCredits, setAddingCredits] = useState(false);
  const [creditsMsg, setCreditsMsg] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Mandi | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Detail view
  const [detailMandi, setDetailMandi] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadMandiDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/super/mandis/${id}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setDetailMandi(data.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchMandis = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/super/mandis`, { headers: authHeaders() });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      if (data.success) setMandis(data.data);
      else setError(data.error || "Failed to load mandis");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("super_token");
    if (!token) { router.push("/admin"); return; }
    fetchMandis();
  }, [router, fetchMandis]);

  const handleToggle = async (mandi: Mandi) => {
    try {
      const res = await fetch(`${API_URL}/api/super/mandis/${mandi.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !mandi.isActive }),
      });
      const data = await res.json();
      if (data.success) setMandis((prev) => prev.map((m) => m.id === mandi.id ? { ...m, isActive: !m.isActive } : m));
    } catch {
      setError("Failed to update status");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch(`${API_URL}/api/super/mandis`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setCreateForm(EMPTY_CREATE);
        fetchMandis();
      } else {
        setCreateError(data.error || "Failed to create mandi");
      }
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (mandi: Mandi) => {
    setEditTarget(mandi);
    setEditForm({ name: mandi.name, slug: mandi.slug, phone: mandi.phone, adminEmail: mandi.adminEmail, plan: mandi.plan });
    setEditError("");
    setResetPassword("");
    setResetMsg(null);
  };

  const handleResetMandiPassword = async () => {
    if (!editTarget || !resetPassword) return;
    setResettingPassword(true);
    setResetMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/super/mandis/${editTarget.id}/reset-password`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ newPassword: resetPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setResetMsg({ type: "success", text: "Admin password reset successfully" });
        setResetPassword("");
      } else {
        setResetMsg({ type: "error", text: data.error || "Failed to reset password" });
      }
    } catch {
      setResetMsg({ type: "error", text: "Network error" });
    } finally {
      setResettingPassword(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditing(true);
    setEditError("");
    try {
      const res = await fetch(`${API_URL}/api/super/mandis/${editTarget.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (data.success) {
        setMandis((prev) => prev.map((m) => m.id === editTarget.id ? { ...m, ...data.data } : m));
        setEditTarget(null);
      } else {
        setEditError(data.error || "Failed to update");
      }
    } catch {
      setEditError("Network error");
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/super/mandis/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setMandis((prev) => prev.filter((m) => m.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch {
      setError("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddCredits = async () => {
    if (!creditsTarget) return;
    setAddingCredits(true);
    setCreditsMsg("");
    try {
      const res = await fetch(`${API_URL}/api/super/mandis/${creditsTarget.id}/credits`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ days: creditDays }),
      });
      const data = await res.json();
      if (data.success) {
        setCreditsMsg(data.message);
        fetchMandis();
        setTimeout(() => { setCreditsTarget(null); setCreditsMsg(""); }, 2000);
      } else {
        setCreditsMsg(data.error || "Failed to add credits");
      }
    } catch {
      setCreditsMsg("Network error");
    } finally {
      setAddingCredits(false);
    }
  };

  const statusBadge = (status: SubStatus) => {
    const map: Record<SubStatus, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: "bg-emerald-900/60", text: "text-emerald-300", label: "Active" },
      GRACE: { bg: "bg-yellow-900/60", text: "text-yellow-300", label: "Grace Period" },
      READONLY: { bg: "bg-orange-900/60", text: "text-orange-300", label: "Read Only" },
      BLOCKED: { bg: "bg-red-900/60", text: "text-red-300", label: "Blocked" },
    };
    const s = map[status] || map.ACTIVE;
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>{s.label}</span>;
  };

  const planBadge = (plan: PlanTier) => {
    const map: Record<PlanTier, { bg: string; text: string }> = {
      TRIAL: { bg: "bg-slate-700", text: "text-slate-300" },
      STANDARD: { bg: "bg-indigo-900/60", text: "text-indigo-300" },
      PREMIUM: { bg: "bg-purple-900/60", text: "text-purple-300" },
    };
    const p = map[plan] || map.TRIAL;
    return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.bg} ${p.text}`}>{plan}</span>;
  };

  const filtered = mandis.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Total Mandis</div>
          <div className="text-3xl font-bold text-white">{mandis.length}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Active</div>
          <div className="text-3xl font-bold text-emerald-400">{mandis.filter((m) => m.isActive).length}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Disabled</div>
          <div className="text-3xl font-bold text-slate-400">{mandis.filter((m) => !m.isActive).length}</div>
        </div>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Store className="w-5 h-5 text-indigo-400" /> All Mandis
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search mandis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 w-56"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New Mandi
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Store className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p>{search ? "No mandis match your search." : "No mandis yet. Create the first one."}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Name / Slug</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Phone</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Plan</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Subscription</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.map((mandi) => (
                <tr key={mandi.id} className="hover:bg-slate-700/30 transition cursor-pointer" onClick={() => loadMandiDetail(mandi.id)}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-white hover:text-indigo-400 transition">{mandi.name}</div>
                    <div className="text-slate-400 text-xs font-mono mt-0.5">{mandi.slug}</div>
                  </td>
                  <td className="px-5 py-4 text-slate-300">{mandi.phone}</td>
                  <td className="px-5 py-4">{planBadge(mandi.plan)}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      {statusBadge(mandi.subscriptionStatus)}
                      <span className="text-xs text-slate-500">
                        {mandi.daysRemaining > 0
                          ? `${mandi.daysRemaining}d remaining`
                          : "Expired"}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${mandi.isActive ? "bg-emerald-900/60 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>
                      {mandi.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => { setCreditsTarget(mandi); setCreditDays(30); setCreditsMsg(""); }} title="Add Credits" className="p-1.5 text-slate-400 hover:text-emerald-400 transition">
                        <CreditCard className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEdit(mandi)} title="Edit" className="p-1.5 text-slate-400 hover:text-indigo-400 transition">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleToggle(mandi)} title={mandi.isActive ? "Disable" : "Enable"} className="p-1.5 text-slate-400 hover:text-white transition">
                        {mandi.isActive ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button onClick={() => setDeleteTarget(mandi)} title="Delete" className="p-1.5 text-slate-400 hover:text-red-400 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Mandi Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="font-semibold text-white text-lg">Create New Mandi</h3>
              <button onClick={() => { setShowCreate(false); setCreateForm(EMPTY_CREATE); setCreateError(""); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {createError && (
                <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{createError}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Mandi Name</label>
                  <input required value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Al-Barakah Mandi" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Slug <span className="text-slate-500">(unique ID)</span></label>
                  <input required value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                    placeholder="al-barakah" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                <input required type="tel" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="9876543210" minLength={10} maxLength={15} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Plan</label>
                <select value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value as PlanTier })}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="TRIAL">Trial (7 days, 2 users, 20 clients)</option>
                  <option value="STANDARD">Standard (30 days, 5 users, 200 clients)</option>
                  <option value="PREMIUM">Premium (30 days, unlimited)</option>
                </select>
              </div>
              <div className="border-t border-slate-700 pt-4">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Admin Account</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Admin Name</label>
                    <input required value={createForm.adminName} onChange={(e) => setCreateForm({ ...createForm, adminName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Mohammed Al-Rashid" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Admin Email</label>
                    <input required type="email" value={createForm.adminEmail} onChange={(e) => setCreateForm({ ...createForm, adminEmail: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="admin@mandi.com" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Admin Password</label>
                  <input required type="password" value={createForm.adminPassword} onChange={(e) => setCreateForm({ ...createForm, adminPassword: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Strong password" minLength={8} />
                </div>
              </div>
              <p className="text-xs text-slate-500">The database will be created automatically from the slug.</p>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setCreateForm(EMPTY_CREATE); setCreateError(""); }}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium">
                  {creating ? "Creating…" : "Create Mandi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Mandi Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="font-semibold text-white text-lg">Edit Mandi</h3>
              <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="px-6 py-5 space-y-4">
              {editError && (
                <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{editError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Mandi Name</label>
                <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Slug</label>
                <input required value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Phone Number</label>
                <input required type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  minLength={10} maxLength={15} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Admin Email</label>
                <input required type="email" value={editForm.adminEmail} onChange={(e) => setEditForm({ ...editForm, adminEmail: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Plan</label>
                <select value={editForm.plan} onChange={(e) => setEditForm({ ...editForm, plan: e.target.value as PlanTier })}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="TRIAL">Trial (2 users, 20 clients)</option>
                  <option value="STANDARD">Standard (5 users, 200 clients)</option>
                  <option value="PREMIUM">Premium (unlimited)</option>
                </select>
              </div>
              {editTarget && (
                <div className="bg-slate-700/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-1">Current Subscription</div>
                  <div className="flex items-center gap-2">
                    {statusBadge(editTarget.subscriptionStatus)}
                    <span className="text-xs text-slate-300">
                      Expires: {new Date(editTarget.subscriptionEndDate).toLocaleDateString()}
                      {editTarget.daysRemaining > 0 && ` (${editTarget.daysRemaining}d left)`}
                    </span>
                  </div>
                </div>
              )}
              <div className="border-t border-slate-700 pt-4">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Reset Admin Password</p>
                {resetMsg && (
                  <div className={`p-2.5 rounded-lg text-sm mb-3 ${
                    resetMsg.type === "success"
                      ? "bg-emerald-900/50 border border-emerald-700 text-emerald-300"
                      : "bg-red-900/50 border border-red-700 text-red-300"
                  }`}>{resetMsg.text}</div>
                )}
                <div className="flex gap-2">
                  <input type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                    placeholder="New password (min 8 chars)" minLength={8} />
                  <button type="button" onClick={handleResetMandiPassword}
                    disabled={resettingPassword || resetPassword.length < 8}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition text-sm font-medium whitespace-nowrap">
                    {resettingPassword ? "Resetting…" : "Reset"}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm">Cancel</button>
                <button type="submit" disabled={editing}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium">
                  {editing ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credits Modal */}
      {creditsTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white text-lg flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" /> Add Credits
              </h3>
              <button onClick={() => setCreditsTarget(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-slate-400 text-sm mb-1">
              Extend subscription for <strong className="text-white">{creditsTarget.name}</strong>
            </p>
            <div className="bg-slate-700/50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                {statusBadge(creditsTarget.subscriptionStatus)}
                {planBadge(creditsTarget.plan)}
                <span className="text-slate-400">
                  Expires: {new Date(creditsTarget.subscriptionEndDate).toLocaleDateString()}
                </span>
              </div>
            </div>
            {creditsMsg && (
              <div className={`p-3 rounded-lg text-sm mb-4 ${creditsMsg.startsWith("Added") ? "bg-emerald-900/50 border border-emerald-700 text-emerald-300" : "bg-red-900/50 border border-red-700 text-red-300"}`}>
                {creditsMsg}
              </div>
            )}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-2">Quick Select</label>
              <div className="grid grid-cols-4 gap-2">
                {[7, 30, 90, 180].map((d) => (
                  <button key={d} onClick={() => setCreditDays(d)}
                    className={`py-2 rounded-lg text-sm font-medium transition ${creditDays === d ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-300 hover:bg-slate-600"}`}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Custom Days</label>
              <input type="number" min={1} max={365} value={creditDays} onChange={(e) => setCreditDays(Number(e.target.value))}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCreditsTarget(null)}
                className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm">Cancel</button>
              <button onClick={handleAddCredits} disabled={addingCredits || creditDays < 1}
                className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition text-sm font-medium">
                {addingCredits ? "Adding…" : `Add ${creditDays} Days`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-900/50 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Delete Mandi?</h3>
                <p className="text-slate-400 text-sm">{deleteTarget.name}</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              This removes the mandi from the platform. The database is <strong className="text-white">not</strong> dropped automatically.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm font-medium">
                {deleting ? "Deleting…" : "Delete Mandi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandi Detail Modal */}
      {detailMandi && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-800 z-10">
              <div>
                <h3 className="font-semibold text-white text-lg">{detailMandi.name}</h3>
                <p className="text-slate-400 text-xs font-mono">{detailMandi.slug}</p>
              </div>
              <button onClick={() => setDetailMandi(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {detailLoading ? (
              <div className="py-16 text-center text-slate-400">Loading…</div>
            ) : (
              <div className="px-6 py-5 space-y-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{detailMandi.stats?.admins ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-1">Admins</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{detailMandi.stats?.managers ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-1">Managers</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{(detailMandi.stats?.admins ?? 0) + (detailMandi.stats?.managers ?? 0)}</p>
                    <p className="text-xs text-slate-400 mt-1">Total Users</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-orange-900/30 border border-orange-800/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-orange-400">{detailMandi.stats?.buyers ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-1">Buy Clients (Buyers)</p>
                  </div>
                  <div className="bg-blue-900/30 border border-blue-800/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-blue-400">{detailMandi.stats?.sellers ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-1">Sell Clients (Sellers)</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-white">{detailMandi.stats?.transactions ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-1">Total Transactions</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-white">{detailMandi.stats?.expenses ?? 0}</p>
                    <p className="text-xs text-slate-400 mt-1">Total Expenses</p>
                  </div>
                </div>

                {/* Mandi Info */}
                <div className="bg-slate-700/30 rounded-xl p-4 space-y-2">
                  <h4 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wide">Mandi Info</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Phone</span>
                    <span className="text-white">{detailMandi.phone}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Admin Email</span>
                    <span className="text-white">{detailMandi.adminEmail}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Plan</span>
                    <span className="text-white">{detailMandi.plan}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Status</span>
                    <span className={detailMandi.isActive ? "text-emerald-400" : "text-red-400"}>{detailMandi.isActive ? "Active" : "Disabled"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Subscription</span>
                    <span className="text-white">{detailMandi.subscriptionStatus} ({detailMandi.daysRemaining}d remaining)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Created</span>
                    <span className="text-white">{new Date(detailMandi.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </div>
                </div>

                {/* Users Table */}
                {detailMandi.users && detailMandi.users.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-3 uppercase tracking-wide">Users & Last Login</h4>
                    <div className="bg-slate-700/30 rounded-xl overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-600">
                            <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Name</th>
                            <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Email / Phone</th>
                            <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Role</th>
                            <th className="text-left px-4 py-2.5 text-slate-400 font-medium">Last Login</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {detailMandi.users.map((u: any) => (
                            <tr key={u.id}>
                              <td className="px-4 py-2.5 text-white">{u.name}</td>
                              <td className="px-4 py-2.5 text-slate-300 text-xs">{u.email || u.phone || "—"}</td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "ADMIN" ? "bg-indigo-900/60 text-indigo-300" : "bg-slate-600 text-slate-300"}`}>
                                  {u.role}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-400 text-xs">
                                {u.lastLoginAt
                                  ? new Date(u.lastLoginAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                                  : "Never"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
