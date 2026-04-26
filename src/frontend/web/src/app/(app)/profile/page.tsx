"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCircle, Save, KeyRound } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/login"); return; }
    fetch(`${API_URL}/api/auth/me`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setUser(data.data);
        else router.push("/login");
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: "error", text: "New passwords do not match" });
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/password`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPwMsg({ type: "success", text: "Password updated successfully" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwMsg({ type: "error", text: data.error || "Failed to change password" });
      }
    } catch {
      setPwMsg({ type: "error", text: "Network error" });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
        <UserCircle className="w-6 h-6 text-green-400" /> My Profile
      </h2>

      {/* Profile info */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg text-sm">
              {user?.name}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg text-sm capitalize">
              {user?.role?.toLowerCase()}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg text-sm">
              {user?.email}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 text-gray-900 rounded-lg text-sm">
              {user?.phone || "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-amber-500" /> Change Password
        </h3>
        {pwMsg && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${
            pwMsg.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
              : "bg-red-50 border border-red-200 text-red-600"
          }`}>{pwMsg.text}</div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Current Password</label>
            <input required type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
              placeholder="Enter current password" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">New Password</label>
              <input required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="Min 8 characters" minLength={8} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Confirm New Password</label>
              <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 text-gray-900 rounded-lg outline-none focus:ring-2 focus:ring-green-500 text-sm"
                placeholder="Repeat new password" minLength={8} />
            </div>
          </div>
          <button type="submit" disabled={changingPassword}
            className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition text-sm font-medium">
            {changingPassword ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
