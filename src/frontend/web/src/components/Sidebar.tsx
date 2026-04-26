"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ShoppingCart,
  Package,
  IndianRupee,
  BarChart3,
  Store,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/buy-from", label: "Buy From", icon: ShoppingCart },
  { href: "/sell-to", label: "Sell To", icon: Package },
  { href: "/expenses", label: "Expenses", icon: IndianRupee },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/users", label: "Users", icon: UserPlus, adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setRole(payload.role || "");
      }
    } catch {}
  }, []);

  return (
    <aside className="w-64 bg-slate-800 text-white min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Store className="w-8 h-8 text-green-400" />
          <div>
            <h1 className="text-xl font-bold">Mandi Manager</h1>
            <p className="text-xs text-slate-400">Digital Record Book</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems
          .filter((item) => !(item as any).adminOnly || role === "ADMIN")
          .map((item) => {
          const isActive = pathname === item.href.split("?")[0];
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? "bg-green-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
