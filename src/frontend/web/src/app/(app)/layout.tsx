"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { useTheme } from "@/components/ThemeProvider";
import { AlertTriangle, Lock, LogOut, UserCircle, ChevronDown, Sun, Moon } from "lucide-react";

type SubStatus = "ACTIVE" | "GRACE" | "READONLY" | "BLOCKED";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [authChecked, setAuthChecked] = useState(false);
  const [subStatus, setSubStatus] = useState<SubStatus | null>(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    try {
      const raw = localStorage.getItem("subscription");
      if (raw) {
        const sub = JSON.parse(raw);
        setSubStatus(sub.status);
        setDaysRemaining(sub.daysRemaining ?? 0);
      }
    } catch {}
    try {
      const name = localStorage.getItem("userName");
      const email = localStorage.getItem("userEmail");
      if (name) setUserName(name);
      if (email) setUserEmail(email);
    } catch {}
    setAuthChecked(true);
  }, [router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("subscription");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    window.location.href = "/login";
  };

  if (!authChecked) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col bg-(--color-bg)">
        {/* Top header bar */}
        <header className="flex items-center justify-end px-6 py-3 border-b border-(--color-border) bg-(--color-header-bg)">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-3 px-3 py-1.5 text-sm text-(--color-text-secondary) hover:text-(--color-text) hover:bg-(--color-bg-hover) rounded-lg transition"
            >
              <div className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {userName ? userName.charAt(0).toUpperCase() : <UserCircle className="w-5 h-5" />}
              </div>
              <div className="text-left hidden sm:block">
                <div className="font-medium text-(--color-text) text-sm leading-tight">{userName || "User"}</div>
                {userEmail && <div className="text-xs text-(--color-text-muted) leading-tight">{userEmail}</div>}
              </div>
              <ChevronDown className={`w-4 h-4 text-(--color-text-muted) transition-transform ${menuOpen ? "rotate-180" : ""}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-(--color-card-bg) border border-(--color-border) rounded-xl shadow-2xl py-1 z-50">
                <div className="px-4 py-3 border-b border-(--color-border) sm:hidden">
                  <div className="text-sm font-medium text-(--color-text)">{userName || "User"}</div>
                  {userEmail && <div className="text-xs text-(--color-text-muted) mt-0.5">{userEmail}</div>}
                </div>
                <button
                  onClick={() => { setMenuOpen(false); router.push("/profile"); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-(--color-text-secondary) hover:bg-(--color-bg-hover) hover:text-(--color-text) transition"
                >
                  <UserCircle className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={() => { toggleTheme(); setMenuOpen(false); }}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-(--color-text-secondary) hover:bg-(--color-bg-hover) hover:text-(--color-text) transition"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
                <div className="border-t border-(--color-border) my-1" />
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-(--color-text-secondary) hover:bg-(--color-bg-hover) hover:text-red-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>
        {subStatus === "GRACE" && (
          <div className="bg-yellow-900/60 border-b border-yellow-700 px-6 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <p className="text-sm text-yellow-200">
              Your subscription has expired. You have <strong>{daysRemaining} day{daysRemaining !== 1 ? "s" : ""}</strong> of grace period remaining.
              Contact your administrator to renew.
            </p>
          </div>
        )}
        {subStatus === "READONLY" && (
          <div className="bg-orange-900/60 border-b border-orange-700 px-6 py-3 flex items-center gap-3">
            <Lock className="w-5 h-5 text-orange-400 shrink-0" />
            <p className="text-sm text-orange-200">
              Your account is in <strong>read-only mode</strong>. You can view data but cannot create or edit records.
              Contact your administrator to renew your subscription.
            </p>
          </div>
        )}
        <div className="p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
