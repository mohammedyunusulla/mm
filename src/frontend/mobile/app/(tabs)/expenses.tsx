import { View, Text, StyleSheet } from "react-native";

export default function ExpensesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Expenses</Text>
      <Text style={styles.placeholder}>
        Track labour, transport, rent & other expenses.{"\n"}
        Add, filter, and delete expenses.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  placeholder: { textAlign: "center", color: "#9ca3af", marginTop: 32, fontSize: 14, lineHeight: 22 },
});
