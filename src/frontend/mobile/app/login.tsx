import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useAuth } from "../lib/auth";
import { getSavedTenantSlug } from "../lib/api";

export default function LoginScreen() {
  const { login } = useAuth();
  const [tenantSlug, setTenantSlug] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getSavedTenantSlug();
      if (saved) setTenantSlug(saved);
    })();
  }, []);

  const handleLogin = async () => {
    if (!tenantSlug.trim()) {
      Alert.alert("Error", "Please enter your Mandi ID (slug)");
      return;
    }
    if (!identifier.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email/phone and password");
      return;
    }

    setLoading(true);
    try {
      const error = await login(identifier.trim(), password, tenantSlug.trim().toLowerCase());
      if (error) {
        Alert.alert("Login Failed", error);
      }
    } catch {
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🏪</Text>
          </View>
          <Text style={styles.title}>Mandi Manager</Text>
          <Text style={styles.subtitle}>Sign in to your mandi</Text>

          <Text style={styles.label}>Mandi ID</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. demo-mandi"
            value={tenantSlug}
            onChangeText={setTenantSlug}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Email or Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="admin@demo.com or 9876543210"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ecfdf5" },
  scroll: { flexGrow: 1, justifyContent: "center", padding: 20 },
  card: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: { alignItems: "center", marginBottom: 8 },
  icon: { fontSize: 48 },
  title: { fontSize: 24, fontWeight: "bold", textAlign: "center", color: "#111827" },
  subtitle: { fontSize: 14, textAlign: "center", color: "#6b7280", marginBottom: 24, marginTop: 4 },
  label: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
  },
  button: {
    backgroundColor: "#16a34a",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
