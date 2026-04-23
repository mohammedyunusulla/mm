import { View, Text, StyleSheet } from "react-native";

export default function ClientsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Clients</Text>
      <Text style={styles.placeholder}>
        Buyers & Sellers list will appear here.{"\n"}
        Uses the same shared types as the web app.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  placeholder: { textAlign: "center", color: "#9ca3af", marginTop: 32, fontSize: 14, lineHeight: 22 },
});
