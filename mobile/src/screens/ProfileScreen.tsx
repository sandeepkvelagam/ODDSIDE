import React from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

// Light theme - matching web app
const LIGHT_COLORS = {
  background: "#f7f5f2",
  surface: "rgba(0, 0, 0, 0.04)",
  textPrimary: "#1a1a1a",
  textSecondary: "#5c5c5c",
  textMuted: "#8c8c8c",
  border: "rgba(0, 0, 0, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.04)",
  orange: "#e8845c",
};

// Dark theme
const DARK_COLORS = {
  background: "#141414",
  surface: "rgba(255,255,255,0.08)",
  textPrimary: "rgba(255,255,255,0.92)",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.14)",
  borderLight: "rgba(255,255,255,0.08)",
  orange: "#e8845c",
};

export function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const userName = user?.name || user?.email?.split("@")[0] || "Player";
  const userInitial = userName[0]?.toUpperCase() || "?";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profile</Text>

        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.largeAvatar, { backgroundColor: colors.orange }]}>
            <Text style={styles.largeAvatarText}>{userInitial}</Text>
          </View>
          <Text style={[styles.profileName, { color: colors.textPrimary }]}>{userName}</Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email || ""}</Text>
        </View>

        {/* Account Section */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="person-outline" size={20} color={colors.textPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Display name</Text>
              <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{userName}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="mail-outline" size={20} color={colors.textPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Email</Text>
              <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{user?.email || ""}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Password</Text>
              <Text style={[styles.menuValue, { color: colors.textSecondary }]}>••••••••</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="language-outline" size={20} color={colors.textPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Language</Text>
              <Text style={[styles.menuValue, { color: colors.textSecondary }]}>English</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="cash-outline" size={20} color={colors.textPrimary} />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Currency</Text>
              <Text style={[styles.menuValue, { color: colors.textSecondary }]}>USD ($)</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text style={[styles.sectionHeader, { color: colors.textMuted }]}>ACCOUNT</Text>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.menuLabel, { color: "#ef4444" }]}>Delete account</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 8,
  },
  largeAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  largeAvatarText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "600",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 15,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginTop: 24,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuItemContent: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuValue: {
    fontSize: 14,
    marginTop: 2,
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },
});
