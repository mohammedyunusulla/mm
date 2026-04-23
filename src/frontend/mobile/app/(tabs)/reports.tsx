import { View, Text, StyleSheet } from "react-native";

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Reports</Text>
      <Text style={styles.placeholder}>
        Period-based reports with profit/loss summary.{"\n"}
        Same API as the web version.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  heading: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  placeholder: { textAlign: "center", color: "#9ca3af", marginTop: 32, fontSize: 14, lineHeight: 22 },
});
