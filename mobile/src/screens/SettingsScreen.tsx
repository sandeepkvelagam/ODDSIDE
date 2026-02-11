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

// Light theme - matching Claude app
const LIGHT_COLORS = {
  background: "#e8e4de",
  surface: "#f7f5f2",
  inputBg: "#ffffff",
  textPrimary: "#1a1a1a",
  textSecondary: "#5c5c5c",
  textMuted: "#8c8c8c",
  border: "rgba(0, 0, 0, 0.08)",
  orange: "#e8845c",
};

// Dark theme
const DARK_COLORS = {
  background: "#0a0a0a",
  surface: "#1a1a1a",
  inputBg: "#2a2a2a",
  textPrimary: "rgba(255,255,255,0.92)",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.35)",
  border: "rgba(255,255,255,0.08)",
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
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Main card with rounded top */}
      <View style={[styles.mainCard, { backgroundColor: colors.surface }]}>
        {/* Header inside the card */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>

          <TouchableOpacity style={styles.headerButton} activeOpacity={0.7}>
            <Ionicons name="information-circle-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Email box */}
          <View style={[styles.emailBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.emailText, { color: colors.textPrimary }]}>{user?.email || ""}</Text>
          </View>

          {/* Menu items - no boxes, just lines */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Profile</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={openWebApp}
            activeOpacity={0.7}
          >
            <Ionicons name="card-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Billing</Text>
            <Text style={[styles.menuValue, { color: colors.textSecondary }]}>Free plan</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Spacer */}
          <View style={styles.spacer} />

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Capabilities</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="apps-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Connectors</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Permissions</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Spacer */}
          <View style={styles.spacer} />

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="moon-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Appearance</Text>
            <Text style={[styles.menuValue, { color: colors.textSecondary }]}>Light</Text>
            <Ionicons name="chevron-expand" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Speech language</Text>
            <Text style={[styles.menuValue, { color: colors.textSecondary }]}>EN</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="shield-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={openWebApp}
            activeOpacity={0.7}
          >
            <Ionicons name="link-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Shared links</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Spacer */}
          <View style={styles.spacer} />

          <View style={[styles.menuItem, { borderBottomColor: colors.border }]}>
            <Ionicons name="phone-portrait-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Haptic feedback</Text>
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: "rgba(0,0,0,0.1)", true: colors.orange }}
              thumbColor="#fff"
            />
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: "transparent" }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Log out</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainCard: {
    flex: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emailBox: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  emailText: {
    fontSize: 16,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
  },
  menuValue: {
    fontSize: 16,
    marginRight: 4,
  },
  spacer: {
    height: 16,
  },
});
