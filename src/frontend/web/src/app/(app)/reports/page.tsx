"use client";

import { useEffect, useState } from "react";
import { Calendar, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { api } from "@/lib/api";
import type { ReportSummary } from "@mandi/shared";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.getSummary(from, to);
      if (res.success && res.data) {
        setSummary(res.data as ReportSummary);
      } else {
        setError(res.error || "Failed to load report.");
      }
    } catch {
      setError("Network error loading report.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [from, to]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Reports</h1>

      {/* Date Range */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div>
            <label className="text-sm text-gray-500 block">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 block">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : error || !summary ? (
        <p className="text-red-500">{error || "Failed to load report."}</p>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingDown className="w-5 h-5 text-orange-600" />
                </div>
                <span className="text-sm text-gray-500">Total Purchases</span>
              </div>
              <p className="text-2xl font-bold">₹{summary.purchases.total.toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-400 mt-1">
                {summary.purchases.count} transactions | Paid: ₹{summary.purchases.paid.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm text-gray-500">Total Sales</span>
              </div>
              <p className="text-2xl font-bold">₹{summary.sales.total.toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-400 mt-1">
                {summary.sales.count} transactions | Paid: ₹{summary.sales.paid.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <IndianRupee className="w-5 h-5 text-red-600" />
                </div>
                <span className="text-sm text-gray-500">Total Expenses</span>
              </div>
              <p className="text-2xl font-bold">₹{summary.expenses.total.toLocaleString("en-IN")}</p>
              <p className="text-xs text-gray-400 mt-1">{summary.expenses.count} entries</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${summary.profit >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
                  <IndianRupee
                    className={`w-5 h-5 ${summary.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  />
                </div>
                <span className="text-sm text-gray-500">Net Profit/Loss</span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  summary.profit >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {summary.profit >= 0 ? "+" : ""}₹{summary.profit.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-gray-400 mt-1">Sales − Purchases − Expenses</p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Period Breakdown</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-600">Total Sales Revenue</span>
                <span className="font-semibold text-green-600">
                  +₹{summary.sales.total.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-600">Total Purchase Cost</span>
                <span className="font-semibold text-orange-600">
                  −₹{summary.purchases.total.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b">
                <span className="text-gray-600">Total Expenses</span>
                <span className="font-semibold text-red-600">
                  −₹{summary.expenses.total.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="font-semibold text-gray-900">Net Result</span>
                <span
                  className={`text-xl font-bold ${
                    summary.profit >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {summary.profit >= 0 ? "+" : ""}₹{summary.profit.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
