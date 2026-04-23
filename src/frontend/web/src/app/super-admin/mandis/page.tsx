"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Users,
  Building2,
  LogOut,
  X,
  AlertTriangle,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Mandi {
  id: string;
  slug: string;
  name: string;
  adminEmail: string;
  isActive: boolean;
  createdAt: string;
  stats?: { users: number; clients: number };
}

interface CreateForm {
  slug: string;
  name: string;
  dbUrl: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
}

const EMPTY_FORM: CreateForm = {
  slug: "",
  name: "",
  dbUrl: "",
  adminName: "",
  adminEmail: "",
  adminPassword: "",
};

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("super_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function MandisPage() {
  const router = useRouter();
  const [mandis, setMandis] = useState<Mandi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<Mandi | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMandis = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/super/mandis`, { headers: authHeaders() });
      if (res.status === 401) { router.push("/super-admin"); return; }
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
    if (!token) { router.push("/super-admin"); return; }
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
      setError("Failed to update mandi status");
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
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm(EMPTY_FORM);
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
      setError("Failed to delete mandi");
    } finally {
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("super_token");
    router.push("/super-admin");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top bar */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-white">Mandi Manager — Super Admin</h1>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
          <LogOut className="w-4 h-4" /> Log out
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Total Mandis</div>
            <div className="text-3xl font-bold text-white">{mandis.length}</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="text-slate-400 text-sm mb-1">Active Mandis</div>
            <div className="text-3xl font-bold text-emerald-400">{mandis.filter((m) => m.isActive).length}</div>
          </div>
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Store className="w-5 h-5 text-indigo-400" /> All Mandis
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New Mandi
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{error}</div>
        )}

        {/* Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-slate-400">Loading…</div>
          ) : mandis.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Store className="w-10 h-10 mx-auto mb-3 text-slate-600" />
              <p>No mandis yet. Create the first one.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Name / Slug</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Admin Email</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Created</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Status</th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {mandis.map((mandi) => (
                  <tr key={mandi.id} className="hover:bg-slate-700/30 transition">
                    <td className="px-5 py-4">
                      <div className="font-medium text-white">{mandi.name}</div>
                      <div className="text-slate-400 text-xs font-mono mt-0.5">{mandi.slug}</div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{mandi.adminEmail}</td>
                    <td className="px-5 py-4 text-slate-400">
                      {new Date(mandi.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${mandi.isActive ? "bg-emerald-900/60 text-emerald-300" : "bg-slate-700 text-slate-400"}`}>
                        {mandi.stats && (
                          <span className="flex items-center gap-1 mr-1">
                            <Users className="w-3 h-3" /> {mandi.stats.users}
                          </span>
                        )}
                        {mandi.isActive ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggle(mandi)}
                          title={mandi.isActive ? "Disable" : "Enable"}
                          className="p-1.5 text-slate-400 hover:text-white transition"
                        >
                          {mandi.isActive ? <ToggleRight className="w-5 h-5 text-emerald-400" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => setDeleteTarget(mandi)}
                          title="Delete"
                          className="p-1.5 text-slate-400 hover:text-red-400 transition"
                        >
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
      </main>

      {/* Create Mandi Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="font-semibold text-white text-lg">Create New Mandi</h3>
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setCreateError(""); }} className="text-slate-400 hover:text-white">
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
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Al-Barakah Mandi" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Slug <span className="text-slate-500">(unique)</span></label>
                  <input required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                    placeholder="al-barakah" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Database URL <span className="text-slate-500">(pre-created Postgres DB)</span></label>
                <input required value={form.dbUrl} onChange={(e) => setForm({ ...form, dbUrl: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
                  placeholder="postgresql://user:pass@host:5432/db_name" />
                <p className="text-xs text-slate-500 mt-1">Create the Postgres database first, then paste the connection string here.</p>
              </div>
              <div className="border-t border-slate-700 pt-4">
                <p className="text-xs text-slate-500 mb-3 font-medium uppercase tracking-wide">Admin Account</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Admin Name</label>
                    <input required value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="Mohammed Al-Rashid" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Admin Email</label>
                    <input required type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                      placeholder="admin@mandi.com" />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-slate-400 mb-1">Admin Password</label>
                  <input required type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="Strong password" minLength={8} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setCreateError(""); }}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium">
                  {creating ? "Creating…" : "Create Mandi"}
                </button>
              </div>
            </form>
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
              This removes the mandi from the platform registry. The tenant database is <strong className="text-white">not</strong> dropped — you must delete it manually if needed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm font-medium">
                {deleting ? "Deleting…" : "Delete Mandi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
