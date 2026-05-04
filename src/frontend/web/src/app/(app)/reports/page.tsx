"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, TrendingUp, TrendingDown, IndianRupee, Download, FileText } from "lucide-react";
import { api } from "@/lib/api";
import type { ReportSummary, Transaction } from "@mandi/shared";
import LoadingSpinner from "@/components/LoadingSpinner";

type StmtType = "PURCHASE" | "SALE" | "BOTH";

function StatementTable({ transactions, label, color }: { transactions: Transaction[]; label: string; color: string }) {
  if (transactions.length === 0) return <p className="text-gray-400 py-3">No {label.toLowerCase()} records found.</p>;
  const totalAmt = transactions.reduce((s, t) => s + Number(t.totalAmount), 0);
  const totalPaid = transactions.reduce((s, t) => s + Number(t.paidAmount), 0);
  const totalDue = transactions.reduce((s, t) => s + Number(t.balanceDue), 0);

  return (
    <div className="mt-4">
      <h3 className="text-base font-semibold mb-3 pb-2" style={{ color, borderBottom: `2px solid ${color}` }}>
        {label} ({transactions.length})
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase">#</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase">Date</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase">Client</th>
              <th className="text-left py-2 px-3 text-xs text-gray-500 uppercase">Invoice</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase">Amount</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase">Paid</th>
              <th className="text-right py-2 px-3 text-xs text-gray-500 uppercase">Due</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t, i) => (
              <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2.5 px-3 text-gray-400">{i + 1}</td>
                <td className="py-2.5 px-3">{new Date(t.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</td>
                <td className="py-2.5 px-3 font-medium">{t.client?.name || "—"}</td>
                <td className="py-2.5 px-3 text-gray-400 font-mono text-xs">{t.invoiceNumber || "—"}</td>
                <td className="py-2.5 px-3 text-right">₹{Number(t.totalAmount).toLocaleString("en-IN")}</td>
                <td className="py-2.5 px-3 text-right text-green-600">₹{Number(t.paidAmount).toLocaleString("en-IN")}</td>
                <td className={`py-2.5 px-3 text-right font-semibold ${Number(t.balanceDue) > 0 ? "text-red-600" : "text-green-600"}`}>
                  ₹{Number(t.balanceDue).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200 font-bold">
              <td colSpan={4} className="py-2.5 px-3 text-right">Total</td>
              <td className="py-2.5 px-3 text-right">₹{totalAmt.toLocaleString("en-IN")}</td>
              <td className="py-2.5 px-3 text-right text-green-600">₹{totalPaid.toLocaleString("en-IN")}</td>
              <td className={`py-2.5 px-3 text-right ${totalDue > 0 ? "text-red-600" : "text-green-600"}`}>₹{totalDue.toLocaleString("en-IN")}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeStmt, setActiveStmt] = useState<StmtType>("BOTH");
  const [stmtLoading, setStmtLoading] = useState(false);
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [sales, setSales] = useState<Transaction[]>([]);
  const stmtRef = useRef<HTMLDivElement>(null);
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

  const loadStatements = async (type?: StmtType) => {
    const t = type || activeStmt;
    setStmtLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        (t === "PURCHASE" || t === "BOTH") ? api.getTransactions("PURCHASE", undefined, from, to) : Promise.resolve({ success: true, data: [] }),
        (t === "SALE" || t === "BOTH") ? api.getTransactions("SALE", undefined, from, to) : Promise.resolve({ success: true, data: [] }),
      ]);
      if (pRes.success && pRes.data) setPurchases(pRes.data as Transaction[]);
      if (sRes.success && sRes.data) setSales(sRes.data as Transaction[]);
    } finally {
      setStmtLoading(false);
    }
  };

  useEffect(() => {
    if (summary) loadStatements();
  }, [from, to, summary]);

  const handleTabChange = (type: StmtType) => {
    setActiveStmt(type);
    loadStatements(type);
  };

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                Statements
              </h2>
              <button
                onClick={() => downloadStatement()}
                disabled={stmtLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50 text-sm"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2 mb-4 border-b border-gray-200 pb-3">
              <button
                onClick={() => handleTabChange("BOTH")}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                  activeStmt === "BOTH" ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Combined
              </button>
              <button
                onClick={() => handleTabChange("PURCHASE")}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                  activeStmt === "PURCHASE" ? "bg-orange-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Purchases
              </button>
              <button
                onClick={() => handleTabChange("SALE")}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition ${
                  activeStmt === "SALE" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Sales
              </button>
            </div>

            {/* Statement Content */}
            <div ref={stmtRef}>
              {stmtLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  {(activeStmt === "PURCHASE" || activeStmt === "BOTH") && (
                    <StatementTable transactions={purchases} label="Purchases" color="#ea580c" />
                  )}
                  {(activeStmt === "SALE" || activeStmt === "BOTH") && (
                    <StatementTable transactions={sales} label="Sales" color="#2563eb" />
                  )}
                  {activeStmt === "BOTH" && (purchases.length > 0 || sales.length > 0) && (
                    <div className="mt-5 p-5 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                      <h3 className="text-lg font-bold text-gray-900 mb-4">Summary</h3>
                      <div className="flex justify-between py-2 text-base">
                        <span className="text-gray-700">Total Purchases</span>
                        <span className="font-bold text-orange-600">₹{purchases.reduce((s, t) => s + Number(t.totalAmount), 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div className="flex justify-between py-2 text-base">
                        <span className="text-gray-700">Total Sales</span>
                        <span className="font-bold text-blue-600">₹{sales.reduce((s, t) => s + Number(t.totalAmount), 0).toLocaleString("en-IN")}</span>
                      </div>
                      {(() => {
                        const net = sales.reduce((s, t) => s + Number(t.totalAmount), 0) - purchases.reduce((s, t) => s + Number(t.totalAmount), 0);
                        return (
                          <div className="flex justify-between pt-4 mt-3 border-t-2 border-gray-300 text-xl font-bold">
                            <span className="text-gray-900">Net Result</span>
                            <span className={net >= 0 ? "text-green-700" : "text-red-600"}>
                              {net >= 0 ? "+" : ""}₹{net.toLocaleString("en-IN")}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  function downloadStatement() {
    const mandiName = typeof window !== "undefined" ? localStorage.getItem("mandiName") || "Mandi Manager" : "Mandi Manager";
    const fromDate = new Date(from).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    const toDate = new Date(to).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const titleMap: Record<StmtType, string> = { PURCHASE: "Purchase Statement", SALE: "Sale Statement", BOTH: "Combined Statement" };
    const colorMap: Record<StmtType, string> = { PURCHASE: "#ea580c", SALE: "#2563eb", BOTH: "#059669" };
    const gradientMap: Record<StmtType, string> = {
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
            <thead><tr style="background:#f9fafb;border-bottom:2px solid #d1d5db">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase">#</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase">Date</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase">Client</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-size:11px;text-transform:uppercase">Invoice</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase">Amount</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase">Paid</th>
              <th style="padding:8px 12px;text-align:right;color:#6b7280;font-size:11px;text-transform:uppercase">Due</th>
            </tr></thead>
            <tbody>${rows}</tbody>
            <tfoot><tr style="background:#f9fafb;border-top:2px solid #d1d5db;font-weight:700">
              <td colspan="4" style="padding:10px 12px;text-align:right">Total</td>
              <td style="padding:10px 12px;text-align:right">₹${totalAmt.toLocaleString("en-IN")}</td>
              <td style="padding:10px 12px;text-align:right;color:#059669">₹${totalPaid.toLocaleString("en-IN")}</td>
              <td style="padding:10px 12px;text-align:right;color:${totalDue > 0 ? "#dc2626" : "#059669"}">₹${totalDue.toLocaleString("en-IN")}</td>
            </tr></tfoot>
          </table>
        </div>`;
    };

    let tablesHtml = "";
    if (activeStmt === "PURCHASE" || activeStmt === "BOTH") tablesHtml += renderTable(purchases, "Purchases", "#ea580c");
    if (activeStmt === "SALE" || activeStmt === "BOTH") tablesHtml += renderTable(sales, "Sales", "#2563eb");

    let summaryHtml = "";
    if (activeStmt === "BOTH") {
      const totalP = purchases.reduce((s, t) => s + Number(t.totalAmount), 0);
      const totalS = sales.reduce((s, t) => s + Number(t.totalAmount), 0);
      const net = totalS - totalP;
      summaryHtml = `
        <div style="margin-top:24px;padding:24px;background:#ffffff;border-radius:10px;border:2px solid #d1d5db">
          <h3 style="font-size:18px;font-weight:700;margin-bottom:16px;color:#111827">Summary</h3>
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:15px"><span style="color:#374151">Total Purchases</span><span style="color:#ea580c;font-weight:700">₹${totalP.toLocaleString("en-IN")}</span></div>
          <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:15px"><span style="color:#374151">Total Sales</span><span style="color:#2563eb;font-weight:700">₹${totalS.toLocaleString("en-IN")}</span></div>
          <div style="display:flex;justify-content:space-between;padding:14px 0 0;margin-top:10px;border-top:2px solid #9ca3af;font-size:20px;font-weight:700"><span style="color:#111827">Net Result</span><span style="color:${net >= 0 ? "#059669" : "#dc2626"}">${net >= 0 ? "+" : ""}₹${net.toLocaleString("en-IN")}</span></div>
        </div>`;
    }

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>${titleMap[activeStmt]}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; background: #f3f4f6; }
        .wrapper { max-width: 820px; margin: 20px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: ${gradientMap[activeStmt]}; color: white; padding: 28px 32px; }
        .mandi-name { font-size: 26px; font-weight: 700; }
        .stmt-label { font-size: 13px; opacity: 0.85; margin-top: 4px; letter-spacing: 1px; text-transform: uppercase; }
        .period { font-size: 12px; opacity: 0.7; margin-top: 8px; }
        .body { padding: 24px 32px; }
        .footer { text-align: center; padding: 16px 32px 24px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; margin-top: 24px; }
        .btn-row { display: flex; gap: 12px; justify-content: center; margin: 20px 0; }
        .btn { padding: 10px 28px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; }
        .btn-print { background: ${colorMap[activeStmt]}; color: white; }
        @media print { .btn-row { display: none; } .wrapper { box-shadow: none; margin: 0; border-radius: 0; } body { background: #fff; } }
      </style></head><body>
      <div class="wrapper">
        <div class="header">
          <div class="mandi-name">${mandiName}</div>
          <div class="stmt-label">${titleMap[activeStmt]}</div>
          <div class="period">${fromDate} — ${toDate}</div>
        </div>
        <div class="body">${tablesHtml}${summaryHtml}</div>
        <div class="btn-row"><button class="btn btn-print" onclick="window.print()">📄 Print / Save as PDF</button></div>
        <div class="footer">Generated by ${mandiName} • ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
      </div></body></html>`);
    w.document.close();
  }
}
