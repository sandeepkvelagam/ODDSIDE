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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";

export function SettingsScreen() {
  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ]
    );
  };

  const openWebApp = () => {
    Linking.openURL("https://kvitt-poker-app.preview.emergentagent.com");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Account Section */}
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} onPress={openWebApp}>
            <View style={styles.menuIcon}>
              <Ionicons name="person-outline" size={22} color="#3b82f6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Edit Profile</Text>
              <Text style={styles.menuSubtext}>Change name and picture on web</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#444" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.menuItem} onPress={openWebApp}>
            <View style={styles.menuIcon}>
              <Ionicons name="star-outline" size={22} color="#f59e0b" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Premium</Text>
              <Text style={styles.menuSubtext}>Upgrade for more features</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#444" />
          </TouchableOpacity>
        </View>

        {/* App Section */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>APP</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.menuItem} onPress={openWebApp}>
            <View style={styles.menuIcon}>
              <Ionicons name="globe-outline" size={22} color="#22c55e" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Open Web App</Text>
              <Text style={styles.menuSubtext}>Full features available on web</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#444" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <Ionicons name="information-circle-outline" size={22} color="#666" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuLabel}>Version</Text>
              <Text style={styles.menuSubtext}>0.3.0 (Mobile Beta)</Text>
            </View>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Kvitt - Poker Game Ledger</Text>
          <Text style={styles.footerSubtext}>Made with ♠️ for poker players</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  sectionTitle: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#141421",
    borderRadius: 12,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  menuSubtext: {
    color: "#666",
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    marginLeft: 64,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  signOutText: {
    color: "#ef4444",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    alignItems: "center",
    marginTop: 40,
    paddingBottom: 20,
  },
  footerText: {
    color: "#444",
    fontSize: 14,
  },
  footerSubtext: {
    color: "#333",
    fontSize: 12,
    marginTop: 4,
  },
});
