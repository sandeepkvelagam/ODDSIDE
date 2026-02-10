import React from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";

// Glass design colors
const COLORS = {
  background: "#141414",
  surface: "rgba(255,255,255,0.08)",
  textPrimary: "rgba(255,255,255,0.92)",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.14)",
  borderLight: "rgba(255,255,255,0.08)",
};

export function SettingsScreen() {
  const { user, signOut } = useAuth();
  const [hapticEnabled, setHapticEnabled] = React.useState(true);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const openWebApp = () => {
    Linking.openURL("https://poker-app-upgrade.preview.emergentagent.com");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Email Banner */}
      <View style={styles.emailBanner}>
        <Text style={styles.emailText}>{user?.email || ""}</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.card}>
        <TouchableOpacity style={styles.menuItem} onPress={openWebApp} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="person-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={openWebApp} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="card-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Billing</Text>
          <Text style={styles.menuRightText}>Free plan</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Capabilities Section */}
      <View style={[styles.card, styles.cardMargin]}>
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="options-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Capabilities</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="extension-puzzle-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Connectors</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="people-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Permissions</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* App Settings Section */}
      <View style={[styles.card, styles.cardMargin]}>
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="moon-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Appearance</Text>
          <Text style={styles.menuRightText}>System</Text>
          <Ionicons name="chevron-expand" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="globe-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Speech language</Text>
          <Text style={styles.menuRightText}>EN</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Privacy</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={openWebApp} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="link-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Shared links</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Haptic Feedback Toggle */}
      <View style={[styles.card, styles.cardMargin]}>
        <View style={styles.menuItem}>
          <View style={styles.iconCircle}>
            <Ionicons name="phone-portrait-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Haptic feedback</Text>
          <Switch
            value={hapticEnabled}
            onValueChange={setHapticEnabled}
            trackColor={{ false: "rgba(255,255,255,0.1)", true: "#3b82f6" }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Sign Out */}
      <View style={[styles.card, styles.cardMargin]}>
        <TouchableOpacity style={styles.menuItem} onPress={handleSignOut} activeOpacity={0.7}>
          <View style={styles.iconCircle}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Log out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Kvitt v0.4.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  emailBanner: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emailText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "500",
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardMargin: {
    marginTop: 16,
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
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
  menuRightText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: "500",
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: 60,
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
});
