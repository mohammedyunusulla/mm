import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { api } from "../../lib/api";

interface DashboardData {
  totalBuyers: number;
  totalSellers: number;
  todayPurchases: number;
  todaySales: number;
  todayExpenses: number;
  totalReceivable: number;
  totalPayable: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    totalAmount: number;
    date: string;
    client?: { name: string; type: string };
  }>;
}

function StatCard({
  label,
  value,
  bg,
  prefix = "",
}: {
  label: string;
  value: number;
  bg: string;
  prefix?: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>
        {prefix}
        {value.toLocaleString("en-IN")}
      </Text>
    </View>
  );
}

export default function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const res = await api.getDashboard();
    if (res.success && res.data) {
      setData(res.data);
    }
  }, []);

  useEffect(() => {
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load dashboard</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
    >
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.grid}>
        <StatCard label="Total Buyers" value={data.totalBuyers} bg="#eff6ff" />
        <StatCard label="Total Sellers" value={data.totalSellers} bg="#faf5ff" />
        <StatCard label="Today Purchases" value={data.todayPurchases} bg="#fff7ed" prefix="₹" />
        <StatCard label="Today Sales" value={data.todaySales} bg="#f0fdf4" prefix="₹" />
        <StatCard label="Today Expenses" value={data.todayExpenses} bg="#fef2f2" prefix="₹" />
        <StatCard label="Receivable" value={data.totalReceivable} bg="#ecfdf5" prefix="₹" />
        <StatCard label="Payable" value={data.totalPayable} bg="#fefce8" prefix="₹" />
      </View>

      {data.recentTransactions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Transactions</Text>
          {data.recentTransactions.map((t) => (
            <View key={t.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txClient}>{t.client?.name ?? "Unknown"}</Text>
                <Text style={styles.txDate}>
                  {t.type} &middot; {new Date(t.date).toLocaleDateString("en-IN")}
                </Text>
              </View>
              <Text
                style={[
                  styles.txAmount,
                  { color: t.type === "SALE" ? "#16a34a" : "#dc2626" },
                ]}
              >
                ₹{t.totalAmount.toLocaleString("en-IN")}
              </Text>
            </View>
          ))}
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  errorText: { color: "#6b7280", fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  txRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  txLeft: { flex: 1 },
  txClient: { fontSize: 15, fontWeight: "600", color: "#111827" },
  txDate: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  txAmount: { fontSize: 16, fontWeight: "bold" },
});
