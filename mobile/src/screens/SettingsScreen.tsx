import React from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

export function SettingsScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: signOut,
      },
    ]);
  };

  const openWebApp = () => {
    Linking.openURL("https://poker-app-upgrade.preview.emergentagent.com");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarText}>
            {(user?.name || user?.email || "?")[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.profileName}>{user?.name || "Player"}</Text>
        <Text style={styles.profileEmail}>{user?.email || ""}</Text>
      </View>

      {/* Account Section */}
      <Text style={styles.sectionTitle}>ACCOUNT</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.menuItem} onPress={openWebApp}>
          <View style={[styles.menuIconBox, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
            <Ionicons name="person-outline" size={20} color="#3b82f6" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Edit Profile</Text>
            <Text style={styles.menuSubtext}>Manage on web app</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#444" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.menuItem} onPress={openWebApp}>
          <View style={[styles.menuIconBox, { backgroundColor: "rgba(245,158,11,0.12)" }]}>
            <Ionicons name="star-outline" size={20} color="#f59e0b" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Premium</Text>
            <Text style={styles.menuSubtext}>Upgrade for more features</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#444" />
        </TouchableOpacity>
      </View>

      {/* App Section */}
      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>APP</Text>
      <View style={styles.card}>
        <TouchableOpacity style={styles.menuItem} onPress={openWebApp}>
          <View style={[styles.menuIconBox, { backgroundColor: "rgba(34,197,94,0.12)" }]}>
            <Ionicons name="globe-outline" size={20} color="#22c55e" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Open Web App</Text>
            <Text style={styles.menuSubtext}>Full features on web</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#444" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <View style={styles.menuItem}>
          <View style={[styles.menuIconBox, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
            <Ionicons name="information-circle-outline" size={20} color="#888" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.menuLabel}>Version</Text>
            <Text style={styles.menuSubtext}>0.4.0 (Mobile Beta)</Text>
          </View>
        </View>
      </View>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
        data-testid="sign-out-button"
      >
        <Ionicons name="log-out-outline" size={18} color="#ef4444" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Kvitt - Your side, settled.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: "#141421",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(239,110,89,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  profileAvatarText: {
    color: "#EF6E59",
    fontSize: 24,
    fontWeight: "700",
  },
  profileName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  profileEmail: {
    color: "#777",
    fontSize: 13,
    marginTop: 4,
  },
  sectionTitle: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#141421",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  menuSubtext: {
    color: "#666",
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginLeft: 60,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    padding: 14,
    borderRadius: 12,
    marginTop: 28,
    gap: 8,
  },
  signOutText: {
    color: "#ef4444",
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    color: "#444",
    fontSize: 13,
  },
});
