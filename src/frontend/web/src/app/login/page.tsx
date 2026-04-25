"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Store, ShieldCheck } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

type LoginMode = "mandi" | "platform";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("mandi");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (m: LoginMode) => {
    setMode(m);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "mandi") {
        const res = await fetch(`${API_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, tenantSlug }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem("token", data.data.token);
          router.push("/dashboard");
        } else {
          setError(data.error || "Login failed");
        }
      } else {
        const res = await fetch(`${API_URL}/api/super/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem("super_token", data.data.token);
          router.push("/super-admin/mandis");
        } else {
          setError(data.error || "Login failed");
        }
      }
    } catch {
      setError("Network error. Is the API server running?");
    } finally {
      setLoading(false);
    }
  };

  const isMandi = mode === "mandi";

  return (
    <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
      isMandi ? "bg-gradient-to-br from-green-50 to-emerald-100" : "bg-slate-900"
    }`}>
      <div className="w-full max-w-md">
        <div className={`rounded-2xl shadow-xl p-8 transition-colors duration-300 ${
          isMandi ? "bg-white" : "bg-slate-800 border border-slate-700"
        }`}>
          {/* Header */}
          <div className="text-center mb-6">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
              isMandi ? "bg-green-100" : "bg-indigo-900"
            }`}>
              {isMandi
                ? <Store className="w-8 h-8 text-green-600" />
                : <ShieldCheck className="w-8 h-8 text-indigo-400" />
              }
            </div>
            <h1 className={`text-2xl font-bold ${isMandi ? "text-gray-900" : "text-white"}`}>
              Mandi Manager
            </h1>
            <p className={`mt-1 ${isMandi ? "text-gray-500" : "text-slate-400"}`}>
              {isMandi ? "Sign in to your mandi" : "Platform administration"}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex mb-6 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => switchMode("mandi")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                isMandi
                  ? "bg-green-600 text-white"
                  : "bg-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              Mandi Login
            </button>
            <button
              type="button"
              onClick={() => switchMode("platform")}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                !isMandi
                  ? "bg-indigo-600 text-white"
                  : "bg-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Platform Admin
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className={`mb-4 p-3 border rounded-lg text-sm ${
              isMandi
                ? "bg-red-50 border-red-200 text-red-700"
                : "bg-red-900/50 border-red-700 text-red-300"
            }`}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isMandi && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mandi / Business ID
                </label>
                <input
                  type="text"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                  placeholder="my-mandi"
                  required
                />
              </div>
            )}

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isMandi ? "text-gray-700" : "text-slate-300"
              }`}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${
                  isMandi
                    ? "border border-gray-300 focus:ring-green-500"
                    : "bg-slate-700 border border-slate-600 text-white focus:ring-indigo-500 placeholder-slate-400"
                }`}
                placeholder={isMandi ? "admin@mandi.com" : "super@mandi.app"}
                required
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${
                isMandi ? "text-gray-700" : "text-slate-300"
              }`}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full px-4 py-3 rounded-lg focus:ring-2 focus:border-transparent outline-none transition ${
                  isMandi
                    ? "border border-gray-300 focus:ring-green-500"
                    : "bg-slate-700 border border-slate-600 text-white focus:ring-indigo-500 placeholder-slate-400"
                }`}
                placeholder="••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 text-white rounded-lg font-medium disabled:opacity-50 transition ${
                isMandi
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              }`}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
