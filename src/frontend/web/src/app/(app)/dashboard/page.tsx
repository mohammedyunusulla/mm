"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShoppingCart,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { DashboardStats } from "@mandi/shared";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useYear } from "@/components/YearProvider";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  prefix = "",
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  prefix?: string;
  href?: string;
}) {
  const content = (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${href ? "cursor-pointer hover:shadow-md hover:border-gray-200 transition-shadow" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">
            {prefix}
            {typeof value === "number" ? value.toLocaleString("en-IN") : value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { yearStart, yearEnd } = useYear();

  useEffect(() => {
    setLoading(true);
    api
      .getDashboard(yearStart, yearEnd)
      .then((res) => {
        if (res.success && res.data) {
          setStats(res.data as DashboardStats);
        } else {
          setError(res.error || "Failed to load dashboard data.");
        }
      })
      .catch(() => setError("Network error loading dashboard."))
      .finally(() => setLoading(false));
  }, [yearStart, yearEnd]);

  if (loading) return <LoadingSpinner />;

  if (error || !stats) {
    return <p className="text-red-500">{error || "Failed to load dashboard data."}</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Buyers"
          value={stats.totalBuyers}
          icon={ShoppingCart}
          color="bg-blue-500"
          href="/clients?tab=BUYER"
        />
        <StatCard
          title="Total Sellers"
          value={stats.totalSellers}
          icon={Users}
          color="bg-purple-500"
          href="/clients?tab=SELLER"
        />
        <StatCard
          title="Today's Purchases"
          value={stats.todayPurchases}
          icon={ArrowDownRight}
          color="bg-orange-500"
          prefix="₹"
          href="/buy-from"
        />
        <StatCard
          title="Today's Sales"
          value={stats.todaySales}
          icon={ArrowUpRight}
          color="bg-green-500"
          prefix="₹"
          href="/sell-to"
        />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Today's Expenses"
          value={stats.todayExpenses}
          icon={IndianRupee}
          color="bg-red-500"
          prefix="₹"
        />
        <StatCard
          title="Total Receivable"
          value={stats.totalReceivable}
          icon={TrendingUp}
          color="bg-emerald-500"
          prefix="₹"
        />
        <StatCard
          title="Total Payable"
          value={stats.totalPayable}
          icon={TrendingDown}
          color="bg-amber-500"
          prefix="₹"
        />
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Transactions</h2>
        {stats.recentTransactions.length === 0 ? (
          <p className="text-gray-500 text-sm">No transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Date</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Client</th>
                  <th className="text-left py-3 px-2 text-gray-500 font-medium">Type</th>
                  <th className="text-right py-3 px-2 text-gray-500 font-medium">Amount</th>
                  <th className="text-right py-3 px-2 text-gray-500 font-medium">Paid</th>
                  <th className="text-right py-3 px-2 text-gray-500 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentTransactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-3 px-2">
                      {new Date(txn.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="py-3 px-2 font-medium">{txn.client?.name || "—"}</td>
                    <td className="py-3 px-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${
                          txn.type === "PURCHASE"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {txn.type}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-right">
                      ₹{Number(txn.totalAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-2 text-right">
                      ₹{Number(txn.paidAmount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3 px-2 text-right font-medium">
                      ₹{Number(txn.balanceDue).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
