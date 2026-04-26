"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Plus,
  Trash2,
  X,
  AlertTriangle,
  KeyRound,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Admin {
  id: string;
  username: string;
  createdAt: string;
}

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("super_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function AdminsPage() {
  const router = useRouter();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create
  const [showCreate, setShowCreate] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Reset password
  const [resetTarget, setResetTarget] = useState<Admin | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/super/admins`, { headers: authHeaders() });
      if (res.status === 401) { router.push("/admin"); return; }
      const data = await res.json();
      if (data.success) setAdmins(data.data);
      else setError(data.error || "Failed to load admins");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("super_token");
    if (!token) { router.push("/admin"); return; }
    fetchAdmins();
  }, [router, fetchAdmins]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch(`${API_URL}/api/super/admins`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setNewUsername("");
        setNewPassword("");
        fetchAdmins();
      } else {
        setCreateError(data.error || "Failed to create admin");
      }
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    setResetError("");
    setResetSuccess("");
    try {
      const res = await fetch(`${API_URL}/api/super/admins/${resetTarget.id}/reset-password`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ newPassword: resetPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setResetSuccess("Password reset successfully");
        setTimeout(() => { setResetTarget(null); setResetPassword(""); setResetSuccess(""); }, 1500);
      } else {
        setResetError(data.error || "Failed to reset password");
      }
    } catch {
      setResetError("Network error");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/super/admins/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setAdmins((prev) => prev.filter((a) => a.id !== deleteTarget.id));
        setDeleteTarget(null);
      } else {
        setError(data.error || "Failed to delete");
        setDeleteTarget(null);
      }
    } catch {
      setError("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-400" /> Platform Admins
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Admin
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{error}</div>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading…</div>
        ) : admins.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Shield className="w-10 h-10 mx-auto mb-3 text-slate-600" />
            <p>No admins found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Username</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Created</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-slate-700/30 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-600/20 rounded-full flex items-center justify-center">
                        <Shield className="w-4 h-4 text-indigo-400" />
                      </div>
                      <span className="font-medium text-white">{admin.username}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-400">
                    {new Date(admin.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setResetTarget(admin); setResetPassword(""); setResetError(""); setResetSuccess(""); }}
                        title="Reset Password"
                        className="p-1.5 text-slate-400 hover:text-amber-400 transition"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(admin)}
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

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="font-semibold text-white text-lg">New Platform Admin</h3>
              <button onClick={() => { setShowCreate(false); setNewUsername(""); setNewPassword(""); setCreateError(""); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {createError && (
                <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{createError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Username</label>
                <input required value={newUsername} onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="admin-username" minLength={2} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Password</label>
                <input required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Strong password" minLength={8} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setNewUsername(""); setNewPassword(""); setCreateError(""); }}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium">
                  {creating ? "Creating…" : "Create Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="font-semibold text-white text-lg">Reset Password</h3>
              <button onClick={() => { setResetTarget(null); setResetPassword(""); setResetError(""); setResetSuccess(""); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="px-6 py-5 space-y-4">
              <p className="text-slate-400 text-sm">
                Set a new password for <strong className="text-white">{resetTarget.username}</strong>
              </p>
              {resetError && (
                <div className="p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{resetError}</div>
              )}
              {resetSuccess && (
                <div className="p-3 bg-emerald-900/50 border border-emerald-700 text-emerald-300 rounded-lg text-sm">{resetSuccess}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">New Password</label>
                <input required type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="New strong password" minLength={8} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setResetTarget(null); setResetPassword(""); setResetError(""); setResetSuccess(""); }}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm">Cancel</button>
                <button type="submit" disabled={resetting}
                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition text-sm font-medium">
                  {resetting ? "Resetting…" : "Reset Password"}
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
                <h3 className="font-semibold text-white">Delete Admin?</h3>
                <p className="text-slate-400 text-sm">{deleteTarget.username}</p>
              </div>
            </div>
            <p className="text-slate-400 text-sm mb-6">
              This admin will lose access to the platform immediately.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition text-sm">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition text-sm font-medium">
                {deleting ? "Deleting…" : "Delete Admin"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
