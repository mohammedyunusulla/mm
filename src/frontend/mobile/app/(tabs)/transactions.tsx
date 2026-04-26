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
import type { Client, TransactionType } from "@mandi/shared";

interface TransactionItem {
  itemName: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
}

interface Transaction {
  id: string;
  clientId: string;
  client?: { name: string; type: string };
  type: TransactionType;
  items: Array<{ id: string; itemName: string; quantity: number; unit: string; pricePerUnit: number; total: number }>;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  notes?: string;
  date: string;
}

export default function TransactionsScreen() {
  const [mode, setMode] = useState<TransactionType>("PURCHASE");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [items, setItems] = useState<TransactionItem[]>([{ itemName: "", quantity: "", unit: "kg", pricePerUnit: "" }]);
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchTransactions = useCallback(async () => {
    const res = await api.getTransactions(mode);
    if (res.success && res.data) {
      setTransactions(res.data as Transaction[]);
    }
  }, [mode]);

  useEffect(() => {
    setLoading(true);
    fetchTransactions().finally(() => setLoading(false));
  }, [fetchTransactions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTransactions();
    setRefreshing(false);
  }, [fetchTransactions]);

  const openForm = async () => {
    const clientType = mode === "PURCHASE" ? "SELLER" : "BUYER";
    const res = await api.getClients(clientType);
    if (res.success && res.data) {
      setClients(res.data as Client[]);
    }
    setSelectedClientId("");
    setItems([{ itemName: "", quantity: "", unit: "kg", pricePerUnit: "" }]);
    setPaidAmount("");
    setNotes("");
    setShowForm(true);
  };

  const addItem = () => {
    setItems([...items, { itemName: "", quantity: "", unit: "kg", pricePerUnit: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof TransactionItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const calcTotal = () =>
    items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0) * (parseFloat(i.pricePerUnit) || 0), 0);

  const handleSave = async () => {
    if (!selectedClientId) {
      Alert.alert("Error", "Select a client");
      return;
    }
    const parsedItems = items.map((i) => ({
      itemName: i.itemName.trim(),
      quantity: parseFloat(i.quantity) || 0,
      unit: i.unit.trim() || "kg",
      pricePerUnit: parseFloat(i.pricePerUnit) || 0,
    }));

    if (parsedItems.some((i) => !i.itemName || i.quantity <= 0)) {
      Alert.alert("Error", "Fill in all item details");
      return;
    }

    setSaving(true);
    const res = await api.createTransaction({
      clientId: selectedClientId,
      type: mode,
      items: parsedItems,
      paidAmount: parseFloat(paidAmount) || 0,
      notes: notes.trim() || undefined,
    });
    setSaving(false);

    if (res.success) {
      setShowForm(false);
      fetchTransactions();
    } else {
      Alert.alert("Error", res.error || "Failed to save");
    }
  };

  const handleDelete = (t: Transaction) => {
    Alert.alert("Delete Transaction", "Delete this transaction? Balances will be reversed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await api.deleteTransaction(t.id);
          if (res.success) fetchTransactions();
          else Alert.alert("Error", res.error || "Failed to delete");
        },
      },
    ]);
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const expanded = expandedId === item.id;
    return (
      <TouchableOpacity
        style={styles.txCard}
        onPress={() => setExpandedId(expanded ? null : item.id)}
        onLongPress={() => handleDelete(item)}
      >
        <View style={styles.txHeader}>
          <Text style={styles.txClient}>{item.client?.name ?? "Unknown"}</Text>
          <Text style={[styles.txTotal, { color: mode === "SALE" ? "#16a34a" : "#dc2626" }]}>
            ₹{Number(item.totalAmount).toLocaleString("en-IN")}
          </Text>
        </View>
        <View style={styles.txMeta}>
          <Text style={styles.txDate}>{new Date(item.date).toLocaleDateString("en-IN")}</Text>
          <Text style={styles.txPaid}>Paid: ₹{Number(item.paidAmount).toLocaleString("en-IN")}</Text>
          {Number(item.balanceDue) > 0 && (
            <Text style={styles.txDue}>Due: ₹{Number(item.balanceDue).toLocaleString("en-IN")}</Text>
          )}
        </View>
        {expanded && (
          <View style={styles.txItems}>
            {item.items.map((li) => (
              <Text key={li.id} style={styles.txItemLine}>
                {li.itemName} — {li.quantity} {li.unit} × ₹{li.pricePerUnit} = ₹{Number(li.total).toLocaleString("en-IN")}
              </Text>
            ))}
            {item.notes ? <Text style={styles.txNotes}>Note: {item.notes}</Text> : null}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  const total = transactions.reduce((s, t) => s + Number(t.totalAmount), 0);

  return (
    <View style={styles.container}>
      {/* Mode Toggle */}
      <View style={styles.modeRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "PURCHASE" && styles.modeBtnActivePurchase]}
          onPress={() => setMode("PURCHASE")}
        >
          <Text style={[styles.modeBtnText, mode === "PURCHASE" && styles.modeBtnTextActive]}>
            Buy From (Purchases)
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, mode === "SALE" && styles.modeBtnActiveSale]}
          onPress={() => setMode("SALE")}
        >
          <Text style={[styles.modeBtnText, mode === "SALE" && styles.modeBtnTextActive]}>
            Sell To (Sales)
          </Text>
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{transactions.length} transactions</Text>
        <Text style={styles.summaryTotal}>Total: ₹{total.toLocaleString("en-IN")}</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No {mode === "PURCHASE" ? "purchase" : "sale"} transactions yet</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={openForm}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* New Transaction Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>
                New {mode === "PURCHASE" ? "Purchase" : "Sale"}
              </Text>

              <Text style={styles.label}>
                {mode === "PURCHASE" ? "Seller" : "Buyer"} *
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientPicker}>
                {clients.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.clientChip, selectedClientId === c.id && styles.clientChipActive]}
                    onPress={() => setSelectedClientId(c.id)}
                  >
                    <Text style={[styles.clientChipText, selectedClientId === c.id && { color: "#fff" }]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {clients.length === 0 && (
                  <Text style={styles.noClients}>No {mode === "PURCHASE" ? "sellers" : "buyers"} found</Text>
                )}
              </ScrollView>

              <Text style={[styles.label, { marginTop: 16 }]}>Items</Text>
              {items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <TextInput
                    style={[styles.input, { flex: 2 }]}
                    placeholder="Item name"
                    value={item.itemName}
                    onChangeText={(v) => updateItem(idx, "itemName", v)}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Qty"
                    value={item.quantity}
                    onChangeText={(v) => updateItem(idx, "quantity", v)}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.input, { flex: 0.7 }]}
                    placeholder="Unit"
                    value={item.unit}
                    onChangeText={(v) => updateItem(idx, "unit", v)}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Price"
                    value={item.pricePerUnit}
                    onChangeText={(v) => updateItem(idx, "pricePerUnit", v)}
                    keyboardType="numeric"
                  />
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(idx)} style={styles.removeItemBtn}>
                      <Text style={styles.removeItemText}>✕</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
                <Text style={styles.addItemText}>+ Add Item</Text>
              </TouchableOpacity>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>₹{calcTotal().toLocaleString("en-IN")}</Text>
              </View>

              <Text style={styles.label}>Paid Amount (₹)</Text>
              <TextInput
                style={styles.input}
                value={paidAmount}
                onChangeText={setPaidAmount}
                placeholder="0"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Optional notes" />

              <View style={styles.modalBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]} onPress={handleSave} disabled={saving}>
                  <Text style={styles.saveBtnText}>{saving ? "Saving..." : "Save"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f9fafb" },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  modeBtnActivePurchase: { backgroundColor: "#dc2626", borderColor: "#dc2626" },
  modeBtnActiveSale: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  modeBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  modeBtnTextActive: { color: "#fff" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  summaryText: { fontSize: 13, color: "#6b7280" },
  summaryTotal: { fontSize: 13, fontWeight: "700", color: "#111827" },
  txCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  txHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  txClient: { fontSize: 15, fontWeight: "700", color: "#111827" },
  txTotal: { fontSize: 16, fontWeight: "bold" },
  txMeta: { flexDirection: "row", gap: 12, marginTop: 4 },
  txDate: { fontSize: 12, color: "#6b7280" },
  txPaid: { fontSize: 12, color: "#16a34a" },
  txDue: { fontSize: 12, color: "#dc2626", fontWeight: "600" },
  txItems: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  txItemLine: { fontSize: 13, color: "#374151", marginBottom: 4 },
  txNotes: { fontSize: 12, color: "#6b7280", fontStyle: "italic", marginTop: 4 },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: "90%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#111827", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: "#f9fafb",
  },
  clientPicker: { flexDirection: "row", maxHeight: 40 },
  clientChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    marginRight: 8,
  },
  clientChipActive: { backgroundColor: "#16a34a" },
  clientChipText: { fontSize: 13, fontWeight: "500", color: "#374151" },
  noClients: { fontSize: 13, color: "#9ca3af", paddingVertical: 8 },
  itemRow: { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 8 },
  addItemBtn: { alignSelf: "flex-start", marginTop: 4, marginBottom: 12 },
  addItemText: { fontSize: 14, color: "#2563eb", fontWeight: "600" },
  removeItemBtn: { padding: 4 },
  removeItemText: { fontSize: 16, color: "#dc2626", fontWeight: "bold" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    marginTop: 4,
  },
  totalLabel: { fontSize: 16, fontWeight: "600", color: "#111827" },
  totalValue: { fontSize: 18, fontWeight: "bold", color: "#111827" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 20, marginBottom: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  cancelBtnText: { fontSize: 15, color: "#374151", fontWeight: "500" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#16a34a", alignItems: "center" },
  saveBtnText: { fontSize: 15, color: "#fff", fontWeight: "600" },
});
