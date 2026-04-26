"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, KeyRound, Check } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("super_token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ id: string; username: string; createdAt: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("super_token");
    if (!token) { router.push("/admin"); return; }

    fetch(`${API_URL}/api/super/profile`, { headers: authHeaders() })
      .then((r) => { if (r.status === 401) { router.push("/admin"); return null; } return r.json(); })
      .then((data) => { if (data?.success) setProfile(data.data); })
      .finally(() => setLoading(false));
  }, [router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }

    setChanging(true);
    try {
      const res = await fetch(`${API_URL}/api/super/profile`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPwSuccess("Password updated successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPwError(data.error || "Failed to change password");
      }
    } catch {
      setPwError("Network error");
    } finally {
      setChanging(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-400">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-8">
        <User className="w-5 h-5 text-indigo-400" /> My Profile
      </h2>

      {/* Profile info */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600/20 rounded-full flex items-center justify-center">
            <User className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <div className="text-lg font-semibold text-white">{profile?.username}</div>
            <div className="text-sm text-slate-400">
              Platform Admin &middot; Member since {profile ? new Date(profile.createdAt).toLocaleDateString() : ""}
            </div>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-md font-semibold text-white flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-indigo-400" /> Change Password
        </h3>

        {pwError && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{pwError}</div>
        )}
        {pwSuccess && (
          <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-700 text-emerald-300 rounded-lg text-sm flex items-center gap-2">
            <Check className="w-4 h-4" /> {pwSuccess}
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              placeholder="Enter current password"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Min 8 characters"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 text-white rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Repeat new password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={changing}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition text-sm font-medium"
          >
            {changing ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
