import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { api } from "../../lib/api";
import type { Expense, ExpenseCategory } from "@mandi/shared";

const CATEGORIES: ExpenseCategory[] = ["LABOUR", "TRANSPORT", "RENT", "UTILITIES", "MAINTENANCE", "OTHER"];

const categoryColors: Record<string, { bg: string; text: string }> = {
  LABOUR: { bg: "#dbeafe", text: "#1d4ed8" },
  TRANSPORT: { bg: "#fef3c7", text: "#92400e" },
  RENT: { bg: "#fce7f3", text: "#9d174d" },
  UTILITIES: { bg: "#d1fae5", text: "#065f46" },
  MAINTENANCE: { bg: "#e0e7ff", text: "#3730a3" },
  OTHER: { bg: "#f3f4f6", text: "#374151" },
};

export default function ExpensesScreen() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("ALL");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("LABOUR");
  const [formAmount, setFormAmount] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchExpenses = useCallback(async () => {
    const cat = filterCat === "ALL" ? undefined : filterCat;
    const res = await api.getExpenses(cat);
    if (res.success && res.data) {
      setExpenses(res.data as Expense[]);
    }
  }, [filterCat]);

  useEffect(() => {
    fetchExpenses().finally(() => setLoading(false));
  }, [fetchExpenses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  }, [fetchExpenses]);

  const handleSave = async () => {
    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }
    if (!formDescription.trim()) {
      Alert.alert("Error", "Description is required");
      return;
    }

    setSaving(true);
    const res = await api.createExpense({
      category: formCategory,
      amount,
      description: formDescription.trim(),
    });
    setSaving(false);

    if (res.success) {
      setShowForm(false);
      setFormAmount("");
      setFormDescription("");
      fetchExpenses();
    } else {
      Alert.alert("Error", res.error || "Failed to save");
    }
  };

  const handleDelete = (exp: Expense) => {
    Alert.alert("Delete Expense", `Delete this ${exp.category} expense?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await api.deleteExpense(exp.id);
          if (res.success) fetchExpenses();
          else Alert.alert("Error", res.error || "Failed to delete");
        },
      },
    ]);
  };

  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount), 0);

  const renderExpense = ({ item }: { item: Expense }) => {
    const colors = categoryColors[item.category] || categoryColors.OTHER;
    return (
      <TouchableOpacity style={styles.expCard} onLongPress={() => handleDelete(item)}>
        <View style={styles.expHeader}>
          <View style={[styles.catBadge, { backgroundColor: colors.bg }]}>
            <Text style={[styles.catBadgeText, { color: colors.text }]}>{item.category}</Text>
          </View>
          <Text style={styles.expAmount}>₹{Number(item.amount).toLocaleString("en-IN")}</Text>
        </View>
        <Text style={styles.expDesc}>{item.description}</Text>
        <Text style={styles.expDate}>{new Date(item.date).toLocaleDateString("en-IN")}</Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <TouchableOpacity
          style={[styles.filterBtn, filterCat === "ALL" && styles.filterBtnActive]}
          onPress={() => setFilterCat("ALL")}
        >
          <Text style={[styles.filterBtnText, filterCat === "ALL" && styles.filterBtnTextActive]}>All</Text>
        </TouchableOpacity>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.filterBtn, filterCat === cat && styles.filterBtnActive]}
            onPress={() => setFilterCat(cat)}
          >
            <Text style={[styles.filterBtnText, filterCat === cat && styles.filterBtnTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Total */}
      <View style={styles.totalBar}>
        <Text style={styles.totalBarText}>{expenses.length} expenses</Text>
        <Text style={styles.totalBarAmount}>Total: ₹{totalExpenses.toLocaleString("en-IN")}</Text>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={(item) => item.id}
        renderItem={renderExpense}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No expenses found</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowForm(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* New Expense Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Expense</Text>

            <Text style={styles.label}>Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((cat) => {
                const colors = categoryColors[cat];
                const selected = formCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catOption, selected && { backgroundColor: colors.bg, borderColor: colors.text }]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text style={[styles.catOptionText, selected && { color: colors.text, fontWeight: "700" }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              value={formAmount}
              onChangeText={setFormAmount}
              placeholder="Enter amount"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={styles.input}
              value={formDescription}
              onChangeText={setFormDescription}
              placeholder="What was the expense for?"
              multiline
            />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  filterScroll: { maxHeight: 44, marginBottom: 12 },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginRight: 8,
  },
  filterBtnActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  filterBtnText: { fontSize: 12, color: "#374151", fontWeight: "500" },
  filterBtnTextActive: { color: "#fff" },
  totalBar: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  totalBarText: { fontSize: 13, color: "#6b7280" },
  totalBarAmount: { fontSize: 13, fontWeight: "700", color: "#111827" },
  expCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  expHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  catBadgeText: { fontSize: 11, fontWeight: "700" },
  expAmount: { fontSize: 16, fontWeight: "bold", color: "#dc2626" },
  expDesc: { fontSize: 14, color: "#374151" },
  expDate: { fontSize: 12, color: "#9ca3af", marginTop: 4 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 15 },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#16a34a",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: "#fff", fontSize: 28, fontWeight: "300", marginTop: -2 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 20 },
  modalContent: { backgroundColor: "#fff", borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#111827", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f9fafb",
  },
  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  catOptionText: { fontSize: 12, color: "#374151" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  cancelBtnText: { fontSize: 15, color: "#374151", fontWeight: "500" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#16a34a", alignItems: "center" },
  saveBtnText: { fontSize: 15, color: "#fff", fontWeight: "600" },
});
