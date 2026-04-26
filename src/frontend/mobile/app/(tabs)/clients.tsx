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
import type { Client, ClientType } from "@mandi/shared";

type FilterType = "ALL" | "BUYER" | "SELLER";

export default function ClientsScreen() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("ALL");

  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formType, setFormType] = useState<ClientType>("BUYER");
  const [formNotes, setFormNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // Advance modal state
  const [advanceClient, setAdvanceClient] = useState<Client | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState("");
  const [advanceNote, setAdvanceNote] = useState("");
  const [advanceSaving, setAdvanceSaving] = useState(false);

  const fetchClients = useCallback(async () => {
    const typeParam = filter === "ALL" ? undefined : filter;
    const res = await api.getClients(typeParam, search || undefined);
    if (res.success && res.data) {
      setClients(res.data as Client[]);
    }
  }, [filter, search]);

  useEffect(() => {
    fetchClients().finally(() => setLoading(false));
  }, [fetchClients]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchClients();
    setRefreshing(false);
  }, [fetchClients]);

  const openCreateForm = () => {
    setEditingClient(null);
    setFormName("");
    setFormPhone("");
    setFormAddress("");
    setFormType("BUYER");
    setFormNotes("");
    setShowForm(true);
  };

  const openEditForm = (c: Client) => {
    setEditingClient(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormAddress(c.address);
    setFormType(c.type);
    setFormNotes(c.notes ?? "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formPhone.trim() || !formAddress.trim()) {
      Alert.alert("Error", "Name, phone, and address are required");
      return;
    }
    setSaving(true);
    const data = {
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      type: formType,
      notes: formNotes.trim() || undefined,
    };

    const res = editingClient
      ? await api.updateClient(editingClient.id, data)
      : await api.createClient(data);

    setSaving(false);
    if (res.success) {
      setShowForm(false);
      fetchClients();
    } else {
      Alert.alert("Error", res.error || "Failed to save");
    }
  };

  const handleDelete = (c: Client) => {
    Alert.alert("Delete Client", `Delete "${c.name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const res = await api.deleteClient(c.id);
          if (res.success) fetchClients();
          else Alert.alert("Error", res.error || "Failed to delete");
        },
      },
    ]);
  };

  const handleAdvanceSave = async () => {
    if (!advanceClient) return;
    const amount = parseFloat(advanceAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Enter a valid amount");
      return;
    }
    setAdvanceSaving(true);
    const res = await api.addAdvancePayment(advanceClient.id, amount, advanceNote.trim() || undefined);
    setAdvanceSaving(false);
    if (res.success) {
      setAdvanceClient(null);
      setAdvanceAmount("");
      setAdvanceNote("");
      fetchClients();
    } else {
      Alert.alert("Error", res.error || "Failed to add advance");
    }
  };

  const renderClient = ({ item }: { item: Client }) => (
    <TouchableOpacity style={styles.clientCard} onPress={() => openEditForm(item)} onLongPress={() => handleDelete(item)}>
      <View style={styles.clientHeader}>
        <View style={[styles.typeBadge, { backgroundColor: item.type === "BUYER" ? "#dbeafe" : "#f3e8ff" }]}>
          <Text style={[styles.typeBadgeText, { color: item.type === "BUYER" ? "#1d4ed8" : "#7c3aed" }]}>
            {item.type}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.advanceBtn}
          onPress={() => { setAdvanceClient(item); setAdvanceAmount(""); setAdvanceNote(""); }}
        >
          <Text style={styles.advanceBtnText}>+ Advance</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.clientName}>{item.name}</Text>
      <Text style={styles.clientPhone}>{item.phone}</Text>
      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Balance: </Text>
        <Text style={[styles.balanceValue, { color: Number(item.balanceDue) > 0 ? "#dc2626" : "#16a34a" }]}>
          ₹{Number(item.balanceDue).toLocaleString("en-IN")}
        </Text>
        {Number(item.advanceBalance) > 0 && (
          <>
            <Text style={styles.balanceLabel}>  Advance: </Text>
            <Text style={[styles.balanceValue, { color: "#2563eb" }]}>
              ₹{Number(item.advanceBalance).toLocaleString("en-IN")}
            </Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Search + Filter */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search clients..."
        value={search}
        onChangeText={setSearch}
      />
      <View style={styles.filterRow}>
        {(["ALL", "BUYER", "SELLER"] as FilterType[]).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={<Text style={styles.empty}>No clients found</Text>}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openCreateForm}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Client Form Modal */}
      <Modal visible={showForm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editingClient ? "Edit Client" : "New Client"}</Text>

              <Text style={styles.label}>Name *</Text>
              <TextInput style={styles.input} value={formName} onChangeText={setFormName} placeholder="Client name" />

              <Text style={styles.label}>Phone *</Text>
              <TextInput style={styles.input} value={formPhone} onChangeText={setFormPhone} placeholder="Phone number" keyboardType="phone-pad" />

              <Text style={styles.label}>Address *</Text>
              <TextInput style={styles.input} value={formAddress} onChangeText={setFormAddress} placeholder="Address" multiline />

              <Text style={styles.label}>Type</Text>
              <View style={styles.typeRow}>
                {(["BUYER", "SELLER"] as ClientType[]).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, formType === t && styles.typeBtnActive]}
                    onPress={() => setFormType(t)}
                  >
                    <Text style={[styles.typeBtnText, formType === t && styles.typeBtnTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Notes</Text>
              <TextInput style={styles.input} value={formNotes} onChangeText={setFormNotes} placeholder="Optional notes" multiline />

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

      {/* Advance Payment Modal */}
      <Modal visible={!!advanceClient} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Advance</Text>
            <Text style={styles.modalSubtitle}>For: {advanceClient?.name}</Text>

            <Text style={styles.label}>Amount (₹) *</Text>
            <TextInput
              style={styles.input}
              value={advanceAmount}
              onChangeText={setAdvanceAmount}
              placeholder="Enter amount"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Note</Text>
            <TextInput style={styles.input} value={advanceNote} onChangeText={setAdvanceNote} placeholder="Optional note" />

            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setAdvanceClient(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.saveBtn, advanceSaving && { opacity: 0.5 }]} onPress={handleAdvanceSave} disabled={advanceSaving}>
                <Text style={styles.saveBtnText}>{advanceSaving ? "Saving..." : "Add Advance"}</Text>
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
  searchInput: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  filterBtnActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  filterBtnText: { fontSize: 13, color: "#374151", fontWeight: "500" },
  filterBtnTextActive: { color: "#fff" },
  clientCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  clientHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  typeBadgeText: { fontSize: 11, fontWeight: "700" },
  advanceBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: "#eff6ff" },
  advanceBtnText: { fontSize: 12, fontWeight: "600", color: "#2563eb" },
  clientName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  clientPhone: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  balanceRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  balanceLabel: { fontSize: 12, color: "#6b7280" },
  balanceValue: { fontSize: 13, fontWeight: "700" },
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
  modalContent: { backgroundColor: "#fff", borderRadius: 16, padding: 24, maxHeight: "85%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", color: "#111827", marginBottom: 4 },
  modalSubtitle: { fontSize: 14, color: "#6b7280", marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f9fafb",
  },
  typeRow: { flexDirection: "row", gap: 10 },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  typeBtnActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  typeBtnText: { fontSize: 14, fontWeight: "600", color: "#374151" },
  typeBtnTextActive: { color: "#fff" },
  modalBtns: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: "#d1d5db", alignItems: "center" },
  cancelBtnText: { fontSize: 15, color: "#374151", fontWeight: "500" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: "#16a34a", alignItems: "center" },
  saveBtnText: { fontSize: 15, color: "#fff", fontWeight: "600" },
});
