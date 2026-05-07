"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Store } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("rememberMe");
    if (saved) {
      const { tenantSlug: slug, identifier: id } = JSON.parse(saved);
      setTenantSlug(slug || "");
      setIdentifier(id || "");
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const trimmedIdentifier = identifier.trim();
      const trimmedTenantSlug = tenantSlug.trim().toLowerCase();
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: trimmedIdentifier,
          password,
          tenantSlug: trimmedTenantSlug,
        }),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem("token", data.data.token);
        if (data.data.user?.name) {
          localStorage.setItem("userName", data.data.user.name);
        }
        if (data.data.user?.email) {
          localStorage.setItem("userEmail", data.data.user.email);
        }
        if (data.data.tenant?.name) {
          localStorage.setItem("mandiName", data.data.tenant.name);
        }
        if (data.data.subscription) {
          localStorage.setItem("subscription", JSON.stringify(data.data.subscription));
        }
        if (rememberMe) {
          localStorage.setItem(
            "rememberMe",
            JSON.stringify({ tenantSlug: trimmedTenantSlug, identifier: trimmedIdentifier })
          );
        } else {
          localStorage.removeItem("rememberMe");
        }
        router.push("/dashboard");
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error. Is the API server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="w-full max-w-md">
        <div className="rounded-2xl shadow-xl p-8 bg-white">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-green-100">
              <Store className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Mandi Manager</h1>
            <p className="mt-1 text-gray-500">Sign in to your mandi</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 border rounded-lg text-sm bg-red-50 border-red-200 text-red-700">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mandi / Business ID
              </label>
              <input
                type="text"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="my-mandi"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email or Phone</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="admin@mandi.com or 9876543210"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition text-gray-900"
                placeholder="••••••"
                required
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <span className="text-sm text-gray-600">Remember me</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white rounded-lg font-medium disabled:opacity-50 transition bg-green-600 hover:bg-green-700"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
