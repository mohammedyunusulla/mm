import { View, Text, ScrollView, StyleSheet } from "react-native";

export default function DashboardScreen() {
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>Dashboard</Text>

      <View style={styles.grid}>
        <View style={[styles.card, { backgroundColor: "#eff6ff" }]}>
          <Text style={styles.cardLabel}>Total Buyers</Text>
          <Text style={styles.cardValue}>—</Text>
        </View>
        <View style={[styles.card, { backgroundColor: "#faf5ff" }]}>
          <Text style={styles.cardLabel}>Total Sellers</Text>
          <Text style={styles.cardValue}>—</Text>
        </View>
        <View style={[styles.card, { backgroundColor: "#fff7ed" }]}>
          <Text style={styles.cardLabel}>Today Purchases</Text>
          <Text style={styles.cardValue}>₹ —</Text>
        </View>
        <View style={[styles.card, { backgroundColor: "#f0fdf4" }]}>
          <Text style={styles.cardLabel}>Today Sales</Text>
          <Text style={styles.cardValue}>₹ —</Text>
        </View>
      </View>

      <Text style={styles.placeholder}>
        Connect to the API server to see live data.{"\n"}
        Run: npm run dev:api
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: "47%",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  cardValue: { fontSize: 20, fontWeight: "bold", color: "#111827" },
  placeholder: {
    textAlign: "center",
    color: "#9ca3af",
    marginTop: 32,
    fontSize: 14,
    lineHeight: 22,
  },
});
