import { Tabs } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../../lib/auth";

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.tabEmoji, focused && styles.tabEmojiActive]}>{name}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { logout, tenant } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarPosition: "bottom",
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#6b7280",
        headerStyle: { backgroundColor: "#16a34a" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "bold" },
        headerRight: () => (
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: tenant?.name || "Dashboard",
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => <TabIcon name="📊" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: ({ focused }) => <TabIcon name="👥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: "Transactions",
          tabBarIcon: ({ focused }) => <TabIcon name="🔄" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: "Expenses",
          tabBarIcon: ({ focused }) => <TabIcon name="💰" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: "Reports",
          tabBarIcon: ({ focused }) => <TabIcon name="📈" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: { alignItems: "center", justifyContent: "center" },
  tabEmoji: { fontSize: 20 },
  tabEmojiActive: { transform: [{ scale: 1.15 }] },
  logoutBtn: { marginRight: 16, paddingVertical: 4, paddingHorizontal: 10 },
  logoutText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
