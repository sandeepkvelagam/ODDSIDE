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
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { COLORS, BLUR_INTENSITY, glassStyles } from "../styles/glass";

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
        <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
        <Text style={styles.emailText}>{user?.email || ""}</Text>
      </View>

      {/* Profile Section */}
      <View style={styles.card}>
        <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity style={styles.menuItem} onPress={openWebApp} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="person-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={openWebApp} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="card-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Billing</Text>
          <Text style={styles.menuRightText}>Free plan</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Capabilities Section */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="options-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Capabilities</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="extension-puzzle-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Connectors</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="people-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Permissions</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* App Settings Section */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="moon-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Appearance</Text>
          <Text style={styles.menuRightText}>System</Text>
          <Ionicons name="chevron-expand" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="globe-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Speech language</Text>
          <Text style={styles.menuRightText}>EN</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="shield-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Privacy</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.menuItem} onPress={openWebApp} activeOpacity={0.7}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
            <Ionicons name="link-outline" size={20} color={COLORS.textPrimary} />
          </View>
          <Text style={styles.menuLabel}>Shared links</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Haptic Feedback Toggle */}
      <View style={[styles.card, { marginTop: 16 }]}>
        <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
        
        <View style={styles.menuItem}>
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
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
      <View style={[styles.card, { marginTop: 16 }]}>
        <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
        
        <TouchableOpacity style={styles.menuItem} onPress={handleSignOut} activeOpacity={0.7} testID="sign-out-button">
          <View style={[styles.iconCircle, { backgroundColor: "rgba(255,255,255,0.08)" }]}>
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
    backgroundColor: "#141414",
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
    overflow: "hidden",
  },
  emailText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "500",
    zIndex: 1,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
