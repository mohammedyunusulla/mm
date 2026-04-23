import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Super Admin — Mandi Manager",
};

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900">
      {children}
    </div>
  );
}
