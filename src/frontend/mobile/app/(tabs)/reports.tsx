import { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { api } from "../../lib/api";

interface SummaryData {
  purchases: { count: number; total: number; paid: number; due: number };
  sales: { count: number; total: number; paid: number; due: number };
  expenses: { count: number; total: number; byCategory: Array<{ category: string; total: number }> };
  profit: number;
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function ReportsScreen() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [fromDate, setFromDate] = useState(formatDate(firstOfMonth));
  const [toDate, setToDate] = useState(formatDate(today));
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    const res = await api.getSummary(
      fromDate ? new Date(fromDate).toISOString() : undefined,
      toDate ? new Date(toDate + "T23:59:59").toISOString() : undefined
    );
    if (res.success && res.data) {
      setData(res.data as SummaryData);
    }
    setLoading(false);
    setHasLoaded(true);
  }, [fromDate, toDate]);

  // Quick date presets
  const setPreset = (label: string) => {
    const now = new Date();
    let from: Date;
    if (label === "Today") {
      from = now;
    } else if (label === "This Week") {
      from = new Date(now);
      from.setDate(now.getDate() - now.getDay());
    } else if (label === "This Month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      from = new Date(now.getFullYear(), 0, 1);
    }
    setFromDate(formatDate(from));
    setToDate(formatDate(now));
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Date Range</Text>

      <View style={styles.dateRow}>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>From</Text>
          <TextInput
            style={styles.dateInput}
            value={fromDate}
            onChangeText={setFromDate}
            placeholder="YYYY-MM-DD"
          />
        </View>
        <View style={styles.dateField}>
          <Text style={styles.dateLabel}>To</Text>
          <TextInput
            style={styles.dateInput}
            value={toDate}
            onChangeText={setToDate}
            placeholder="YYYY-MM-DD"
          />
        </View>
      </View>

      <View style={styles.presetRow}>
        {["Today", "This Week", "This Month", "This Year"].map((p) => (
          <TouchableOpacity key={p} style={styles.presetBtn} onPress={() => setPreset(p)}>
            <Text style={styles.presetText}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.generateBtn} onPress={fetchSummary} disabled={loading}>
        <Text style={styles.generateBtnText}>{loading ? "Loading..." : "Generate Report"}</Text>
      </TouchableOpacity>

      {loading && (
        <View style={styles.centerPad}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      )}

      {!loading && hasLoaded && data && (
        <>
          {/* Profit/Loss */}
          <View style={[styles.profitCard, { backgroundColor: data.profit >= 0 ? "#f0fdf4" : "#fef2f2" }]}>
            <Text style={styles.profitLabel}>{data.profit >= 0 ? "Profit" : "Loss"}</Text>
            <Text style={[styles.profitValue, { color: data.profit >= 0 ? "#16a34a" : "#dc2626" }]}>
              ₹{Math.abs(data.profit).toLocaleString("en-IN")}
            </Text>
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, { backgroundColor: "#fff7ed" }]}>
              <Text style={styles.summaryLabel}>Purchases</Text>
              <Text style={styles.summaryValue}>₹{data.purchases.total.toLocaleString("en-IN")}</Text>
              <Text style={styles.summaryMeta}>{data.purchases.count} transactions</Text>
              <Text style={styles.summaryMeta}>Paid: ₹{data.purchases.paid.toLocaleString("en-IN")}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#f0fdf4" }]}>
              <Text style={styles.summaryLabel}>Sales</Text>
              <Text style={styles.summaryValue}>₹{data.sales.total.toLocaleString("en-IN")}</Text>
              <Text style={styles.summaryMeta}>{data.sales.count} transactions</Text>
              <Text style={styles.summaryMeta}>Paid: ₹{data.sales.paid.toLocaleString("en-IN")}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: "#fef2f2" }]}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={styles.summaryValue}>₹{data.expenses.total.toLocaleString("en-IN")}</Text>
              <Text style={styles.summaryMeta}>{data.expenses.count} records</Text>
            </View>
          </View>

          {/* Expenses by Category */}
          {data.expenses.byCategory.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Expenses by Category</Text>
              {data.expenses.byCategory.map((e) => (
                <View key={e.category} style={styles.catRow}>
                  <Text style={styles.catName}>{e.category}</Text>
                  <Text style={styles.catAmount}>₹{e.total.toLocaleString("en-IN")}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}

      {!loading && hasLoaded && !data && (
        <Text style={styles.errorText}>Failed to load report</Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  dateRow: { flexDirection: "row", gap: 12, marginBottom: 12 },
  dateField: { flex: 1 },
  dateLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  dateInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  presetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
  },
  presetText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  generateBtn: {
    backgroundColor: "#16a34a",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  generateBtnText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  centerPad: { alignItems: "center", marginTop: 20 },
  profitCard: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  profitLabel: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  profitValue: { fontSize: 28, fontWeight: "bold" },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryCard: {
    width: "48%",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  summaryMeta: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  catRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  catName: { fontSize: 14, color: "#374151", fontWeight: "500" },
  catAmount: { fontSize: 14, fontWeight: "700", color: "#111827" },
  errorText: { textAlign: "center", color: "#dc2626", marginTop: 20, fontSize: 15 },
});
