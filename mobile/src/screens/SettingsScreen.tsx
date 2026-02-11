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
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

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

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const [hapticEnabled, setHapticEnabled] = React.useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const userName = user?.name || user?.email?.split("@")[0] || "Player";
  const userInitial = userName[0]?.toUpperCase() || "?";

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>

        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Profile Section */}
        <TouchableOpacity
          style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate("Profile")}
          activeOpacity={0.7}
        >
          <View style={[styles.avatar, { backgroundColor: colors.orange }]}>
            <Text style={styles.avatarText}>{userInitial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: colors.textPrimary }]}>{userName}</Text>
            <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>{user?.email || ""}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Account Section */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuItem} onPress={openWebApp} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="card-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Billing</Text>
            <Text style={[styles.menuRightText, { color: colors.textSecondary }]}>Free plan</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Capabilities Section */}
        <View style={[styles.card, styles.cardMargin, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="options-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Capabilities</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="extension-puzzle-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Connectors</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="people-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Permissions</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* App Settings Section */}
        <View style={[styles.card, styles.cardMargin, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="moon-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Appearance</Text>
            <Text style={[styles.menuRightText, { color: colors.textSecondary }]}>System</Text>
            <Ionicons name="chevron-expand" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="globe-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Speech language</Text>
            <Text style={[styles.menuRightText, { color: colors.textSecondary }]}>EN</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="notifications-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Notifications</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity style={styles.menuItem} onPress={() => {}} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="shield-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Privacy</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

          <TouchableOpacity style={styles.menuItem} onPress={openWebApp} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="link-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Shared links</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Haptic Feedback Toggle */}
        <View style={[styles.card, styles.cardMargin, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.menuItem}>
            <View style={[styles.iconCircle, { backgroundColor: colors.borderLight }]}>
              <Ionicons name="phone-portrait-outline" size={20} color={colors.textPrimary} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Haptic feedback</Text>
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: "rgba(255,255,255,0.1)", true: colors.orange }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={[styles.card, styles.cardMargin, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut} activeOpacity={0.7}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            </View>
            <Text style={[styles.menuLabel, { color: "#ef4444" }]}>Log out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>Kvitt v0.4.0</Text>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 18,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "600",
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 2,
  },
  card: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
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
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  menuRightText: {
    fontSize: 15,
    fontWeight: "500",
    marginRight: 8,
  },
  divider: {
    height: 1,
    marginLeft: 60,
  },
  footer: {
    alignItems: "center",
    marginTop: 32,
  },
  footerText: {
    fontSize: 13,
  },
});
