"use client";

import { useEffect, useState } from "react";
import { Calendar, TrendingUp, TrendingDown, IndianRupee, Download, FileText } from "lucide-react";
import { api } from "@/lib/api";
import type { ReportSummary, Transaction } from "@mandi/shared";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stmtLoading, setStmtLoading] = useState(false);
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

          {/* Statements Section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-500" />
              Download Statements
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Generate and download PDF statements for the selected date range.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => generateStatement("PURCHASE")}
                disabled={stmtLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Purchase Statement
              </button>
              <button
                onClick={() => generateStatement("SALE")}
                disabled={stmtLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Sale Statement
              </button>
              <button
                onClick={() => generateStatement("BOTH")}
                disabled={stmtLoading}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Combined Statement
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  async function generateStatement(type: "PURCHASE" | "SALE" | "BOTH") {
    setStmtLoading(true);
    try {
      const mandiName = typeof window !== "undefined" ? localStorage.getItem("mandiName") || "Mandi Manager" : "Mandi Manager";
      const fromDate = new Date(from).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
      const toDate = new Date(to).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

      let purchases: Transaction[] = [];
      let sales: Transaction[] = [];

      if (type === "PURCHASE" || type === "BOTH") {
        const res = await api.getTransactions("PURCHASE", undefined, from, to);
        if (res.success && res.data) purchases = res.data as Transaction[];
      }
      if (type === "SALE" || type === "BOTH") {
        const res = await api.getTransactions("SALE", undefined, from, to);
        if (res.success && res.data) sales = res.data as Transaction[];
      }

      const titleMap = { PURCHASE: "Purchase Statement", SALE: "Sale Statement", BOTH: "Combined Statement" };
      const colorMap = { PURCHASE: "#ea580c", SALE: "#2563eb", BOTH: "#059669" };
      const bgMap = { PURCHASE: "#fff7ed", SALE: "#eff6ff", BOTH: "#f0fdf4" };
      const gradientMap = {
        PURCHASE: "linear-gradient(135deg, #9a3412 0%, #ea580c 50%, #f97316 100%)",
        SALE: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #3b82f6 100%)",
        BOTH: "linear-gradient(135deg, #065f46 0%, #047857 50%, #059669 100%)",
      };

      const renderTable = (txns: Transaction[], label: string, color: string) => {
        if (txns.length === 0) return `<p style="color:#9ca3af;padding:12px 0;">No ${label.toLowerCase()} records found.</p>`;
        const totalAmt = txns.reduce((s, t) => s + Number(t.totalAmount), 0);
        const totalPaid = txns.reduce((s, t) => s + Number(t.paidAmount), 0);
        const totalDue = txns.reduce((s, t) => s + Number(t.balanceDue), 0);
        const rows = txns.map((t, i) =>
          `<tr style="border-bottom:1px solid #e5e7eb">
            <td style="padding:10px 12px;color:#6b7280">${i + 1}</td>
            <td style="padding:10px 12px">${new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
            <td style="padding:10px 12px;font-weight:500">${t.client?.name || "—"}</td>
            <td style="padding:10px 12px;color:#6b7280;font-family:monospace;font-size:12px">${t.invoiceNumber || "—"}</td>
            <td style="padding:10px 12px;text-align:right">₹${Number(t.totalAmount).toLocaleString("en-IN")}</td>
            <td style="padding:10px 12px;text-align:right;color:#059669">₹${Number(t.paidAmount).toLocaleString("en-IN")}</td>
            <td style="padding:10px 12px;text-align:right;color:${Number(t.balanceDue) > 0 ? "#dc2626" : "#059669"};font-weight:${Number(t.balanceDue) > 0 ? "600" : "400"}">₹${Number(t.balanceDue).toLocaleString("en-IN")}</td>
          </tr>`
        ).join("");

        return `
          <div style="margin-top:24px">
            <h3 style="font-size:16px;font-weight:600;color:${color};margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid ${color}">${label} (${txns.length})</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="background:#f9fafb;border-bottom:2px solid #d1d5db">
                  <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">#</th>
                  <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Date</th>
                  <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Client</th>
                  <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Invoice</th>
                  <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Amount</th>
                  <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Paid</th>
                  <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Due</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
              <tfoot>
                <tr style="background:#f9fafb;border-top:2px solid #d1d5db;font-weight:700">
                  <td colspan="4" style="padding:10px 12px;text-align:right">Total</td>
                  <td style="padding:10px 12px;text-align:right">₹${totalAmt.toLocaleString("en-IN")}</td>
                  <td style="padding:10px 12px;text-align:right;color:#059669">₹${totalPaid.toLocaleString("en-IN")}</td>
                  <td style="padding:10px 12px;text-align:right;color:${totalDue > 0 ? "#dc2626" : "#059669"}">₹${totalDue.toLocaleString("en-IN")}</td>
                </tr>
              </tfoot>
            </table>
          </div>`;
      };

      let tablesHtml = "";
      if (type === "PURCHASE" || type === "BOTH") {
        tablesHtml += renderTable(purchases, "Purchases", "#ea580c");
      }
      if (type === "SALE" || type === "BOTH") {
        tablesHtml += renderTable(sales, "Sales", "#2563eb");
      }

      // Summary for combined
      let summaryHtml = "";
      if (type === "BOTH") {
        const totalPurchases = purchases.reduce((s, t) => s + Number(t.totalAmount), 0);
        const totalSales = sales.reduce((s, t) => s + Number(t.totalAmount), 0);
        const net = totalSales - totalPurchases;
        summaryHtml = `
          <div style="margin-top:24px;padding:20px 24px;background:${bgMap[type]};border-radius:10px;border:1px solid #d1d5db">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:12px">Summary</h3>
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px"><span>Total Purchases</span><span style="color:#ea580c;font-weight:600">₹${totalPurchases.toLocaleString("en-IN")}</span></div>
            <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px"><span>Total Sales</span><span style="color:#2563eb;font-weight:600">₹${totalSales.toLocaleString("en-IN")}</span></div>
            <div style="display:flex;justify-content:space-between;padding:12px 0 0;margin-top:8px;border-top:2px solid #d1d5db;font-size:18px;font-weight:700"><span>Net</span><span style="color:${net >= 0 ? "#059669" : "#dc2626"}">${net >= 0 ? "+" : ""}₹${net.toLocaleString("en-IN")}</span></div>
          </div>`;
      }

      const w = window.open("", "_blank", "width=900,height=700");
      if (!w) return;

      w.document.write(`<!DOCTYPE html><html><head><title>${titleMap[type]}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f3f4f6; }
          .wrapper { max-width: 820px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: ${gradientMap[type]}; color: white; padding: 28px 32px; }
          .mandi-name { font-size: 26px; font-weight: 700; }
          .stmt-label { font-size: 13px; opacity: 0.85; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
          .period { font-size: 12px; opacity: 0.7; margin-top: 8px; }
          .body { padding: 24px 32px; }
          .footer { text-align: center; padding: 16px 32px 24px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 24px; }
          .btn-row { display: flex; gap: 12px; justify-content: center; margin: 20px 0; }
          .btn { padding: 10px 28px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; }
          .btn-print { background: ${colorMap[type]}; color: white; }
          .btn-print:hover { opacity: 0.9; }
          @media print { .btn-row { display: none; } .wrapper { box-shadow: none; margin: 0; border-radius: 0; } body { background: #fff; } }
        </style></head><body>
        <div class="wrapper">
          <div class="header">
            <div class="mandi-name">${mandiName}</div>
            <div class="stmt-label">${titleMap[type]}</div>
            <div class="period">${fromDate} — ${toDate}</div>
          </div>
          <div class="body">
            ${tablesHtml}
            ${summaryHtml}
          </div>
          <div class="btn-row">
            <button class="btn btn-print" onclick="window.print()">📄 Download / Print PDF</button>
          </div>
          <div class="footer">Generated by ${mandiName} • ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
        </div>
        </body></html>`);
      w.document.close();
    } finally {
      setStmtLoading(false);
    }
  }
}
