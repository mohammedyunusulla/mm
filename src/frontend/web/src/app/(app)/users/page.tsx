"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  Shield,
  User,
  KeyRound,
  Pencil,
  Trash2,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface StaffUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: "ADMIN" | "MANAGER";
  isActive: boolean;
  createdAt: string;
}

interface CreateForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "ADMIN" | "MANAGER";
}

const EMPTY_FORM: CreateForm = { name: "", email: "", phone: "", password: "", role: "MANAGER" };

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Reset password modal
  const [resetTarget, setResetTarget] = useState<StaffUser | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit user modal
  const [editTarget, setEditTarget] = useState<StaffUser | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", phone: "", role: "MANAGER" as "ADMIN" | "MANAGER" });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/users`, { headers: authHeaders() });
      if (res.status === 401) { router.push("/login"); return; }
      if (res.status === 403) { setError("Admin access required"); setLoading(false); return; }
      const data = await res.json();
      if (data.success) setUsers(data.data);
      else setError(data.error || "Failed to load users");
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetchUsers();
  }, [router, fetchUsers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email && !form.phone) {
      setCreateError("Email or phone is required");
      return;
    }
    setCreating(true);
    setCreateError("");
    try {
      const body: Record<string, string> = { name: form.name, password: form.password, role: form.role };
      if (form.email) body.email = form.email;
      if (form.phone) body.phone = form.phone;

      const res = await fetch(`${API_URL}/api/auth/users`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm(EMPTY_FORM);
        fetchUsers();
      } else {
        setCreateError(data.error || "Failed to create user");
      }
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (user: StaffUser) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${user.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
      } else {
        setError(data.error || "Failed to update user");
      }
    } catch {
      setError("Failed to update user");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    setResetMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${resetTarget.id}/password`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ newPassword: resetPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setResetMsg({ type: "success", text: "Password reset successfully" });
        setResetPassword("");
      } else {
        setResetMsg({ type: "error", text: data.error || "Failed to reset password" });
      }
    } catch {
      setResetMsg({ type: "error", text: "Network error" });
    } finally {
      setResetting(false);
    }
  };

  const openEdit = (user: StaffUser) => {
    setEditTarget(user);
    setEditForm({ name: user.name, email: user.email || "", phone: user.phone || "", role: user.role });
    setEditError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setEditing(true);
    setEditError("");
    try {
      const body: Record<string, string> = { name: editForm.name, role: editForm.role };
      if (editForm.email) body.email = editForm.email;
      if (editForm.phone) body.phone = editForm.phone;

      const res = await fetch(`${API_URL}/api/auth/users/${editTarget.id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setEditTarget(null);
        fetchUsers();
      } else {
        setEditError(data.error || "Failed to update user");
      }
    } catch {
      setEditError("Network error");
    } finally {
      setEditing(false);
    }
  };

  const handleDeleteUser = async (user: StaffUser) => {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_URL}/api/auth/users/${user.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        setError(data.error || "Failed to delete user");
      }
    } catch {
      setError("Network error");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-green-400" /> Manage Users
        </h2>
        <button
          onClick={() => { setShowCreate(true); setForm(EMPTY_FORM); setCreateError(""); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-sm mb-1">Total Users</div>
          <div className="text-2xl font-bold text-gray-900">{users.length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-sm mb-1">Admins</div>
          <div className="text-2xl font-bold text-indigo-600">{users.filter((u) => u.role === "ADMIN").length}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="text-gray-500 text-sm mb-1">Managers</div>
          <div className="text-2xl font-bold text-green-600">{users.filter((u) => u.role === "MANAGER").length}</div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading…</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <UserPlus className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p>No users yet. Add the first one.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">User</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Phone</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Role</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-right px-5 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-xs ${user.role === "ADMIN" ? "bg-indigo-600" : "bg-green-600"}`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-600">{user.email || "—"}</td>
                  <td className="px-5 py-4 text-gray-600">{user.phone || "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === "ADMIN"
                        ? "bg-indigo-900/60 text-indigo-300"
                        : "bg-green-900/60 text-green-300"
                    }`}>
                      {user.role === "ADMIN" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                      {user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {user.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        title="Edit User"
                        className="p-1.5 text-gray-400 hover:text-green-600 transition"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setResetTarget(user); setResetPassword(""); setResetMsg(null); }}
                        title="Reset Password"
                        className="p-1.5 text-gray-400 hover:text-indigo-600 transition"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggle(user)}
                        title={user.isActive ? "Disable" : "Enable"}
                        className="p-1.5 text-gray-400 hover:text-gray-700 transition"
                      >
                        {user.isActive
                          ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                          : <ToggleLeft className="w-5 h-5" />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        title="Delete User"
                        className="p-1.5 text-gray-400 hover:text-red-600 transition"
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

      {/* Create User Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-lg">Add New User</h3>
              <button onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setCreateError(""); }} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{createError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  placeholder="John Doe" minLength={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email <span className="text-gray-400">(optional)</span></label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="user@example.com" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone <span className="text-gray-400">(optional)</span></label>
                  <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="9876543210" minLength={10} maxLength={15} />
                </div>
              </div>
              <p className="text-xs text-gray-400">At least one of email or phone is required for login.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                  <input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    placeholder="Min 8 characters" minLength={8} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "ADMIN" | "MANAGER" })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm">
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); setCreateError(""); }}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm">Cancel</button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium">
                  {creating ? "Creating…" : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-lg">Edit User</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="px-6 py-5 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{editError}</div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                <input required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  minLength={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                  <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    minLength={10} maxLength={15} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "ADMIN" | "MANAGER" })}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm">
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm">Cancel</button>
                <button type="submit" disabled={editing}
                  className="flex-1 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium">
                  {editing ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 text-lg">Reset Password</h3>
              <button onClick={() => setResetTarget(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="px-6 py-5 space-y-4">
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                Resetting password for: <strong className="text-gray-900">{resetTarget.name}</strong>
                <span className="text-gray-400 ml-2">({resetTarget.email || resetTarget.phone})</span>
              </div>
              {resetMsg && (
                <div className={`p-3 rounded-lg text-sm ${resetMsg.type === "success" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-600"}`}>
                  {resetMsg.text}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
                <input
                  required
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  placeholder="Min 8 characters"
                  minLength={8}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setResetTarget(null)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition text-sm">Cancel</button>
                <button type="submit" disabled={resetting}
                  className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium">
                  {resetting ? "Resetting…" : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
