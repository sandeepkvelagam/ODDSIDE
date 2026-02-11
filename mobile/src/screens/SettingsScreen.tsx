import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { themeMode, setThemeMode, isDark, colors } = useTheme();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [showAppearancePopup, setShowAppearancePopup] = useState(false);

  const userName = user?.name || user?.email?.split("@")[0] || "Player";

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  };

  const getAppearanceLabel = () => {
    switch (themeMode) {
      case "light": return "Light";
      case "dark": return "Dark";
      case "system": return "System";
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Main card with rounded top */}
      <View style={[styles.mainCard, { backgroundColor: colors.surface }]}>
        {/* Header inside the card */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.glassButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="close" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Settings</Text>

          <TouchableOpacity
            style={[styles.glassButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
            activeOpacity={0.7}
          >
            <Ionicons name="information-circle-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Name and Email box */}
          <View style={[styles.profileBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.nameText, { color: colors.textPrimary }]}>{userName}</Text>
            <Text style={[styles.emailText, { color: colors.textSecondary }]}>{user?.email || ""}</Text>
          </View>

          {/* Section 1: Profile & Billing */}
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
            activeOpacity={0.7}
          >
            <Ionicons name="card-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Billing</Text>
            <Text style={[styles.menuValue, { color: colors.textSecondary }]}>Free plan</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Section 2: Appearance, Language, Notifications, Privacy */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => setShowAppearancePopup(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="moon-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Appearance</Text>
            <Text style={[styles.menuValue, { color: colors.textSecondary }]}>{getAppearanceLabel()}</Text>
            <Ionicons name="chevron-expand" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Language</Text>
            <Text style={[styles.menuValue, { color: colors.textSecondary }]}>English</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => navigation.navigate("Notifications")}
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

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Section 3: Haptic feedback */}
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

          {/* Section 4: Log out */}
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: "transparent" }]}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={22} color={colors.textPrimary} />
            <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>Log out</Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>

      {/* Appearance Popup */}
      <Modal
        visible={showAppearancePopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAppearancePopup(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowAppearancePopup(false)}
        >
          <Pressable style={[styles.appearancePopup, { backgroundColor: colors.popupBg }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.popupTitle, { color: colors.textPrimary }]}>Appearance</Text>

            <TouchableOpacity
              style={[
                styles.popupOption,
                themeMode === "light" && styles.popupOptionSelected,
                { borderColor: themeMode === "light" ? colors.orange : colors.border }
              ]}
              onPress={() => {
                setThemeMode("light");
                setShowAppearancePopup(false);
              }}
            >
              <Ionicons name="sunny-outline" size={20} color={themeMode === "light" ? colors.orange : colors.textPrimary} />
              <Text style={[styles.popupOptionText, { color: themeMode === "light" ? colors.orange : colors.textPrimary }]}>Light</Text>
              {themeMode === "light" && <Ionicons name="checkmark" size={20} color={colors.orange} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.popupOption,
                themeMode === "dark" && styles.popupOptionSelected,
                { borderColor: themeMode === "dark" ? colors.orange : colors.border }
              ]}
              onPress={() => {
                setThemeMode("dark");
                setShowAppearancePopup(false);
              }}
            >
              <Ionicons name="moon-outline" size={20} color={themeMode === "dark" ? colors.orange : colors.textPrimary} />
              <Text style={[styles.popupOptionText, { color: themeMode === "dark" ? colors.orange : colors.textPrimary }]}>Dark</Text>
              {themeMode === "dark" && <Ionicons name="checkmark" size={20} color={colors.orange} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.popupOption,
                themeMode === "system" && styles.popupOptionSelected,
                { borderColor: themeMode === "system" ? colors.orange : colors.border }
              ]}
              onPress={() => {
                setThemeMode("system");
                setShowAppearancePopup(false);
              }}
            >
              <Ionicons name="phone-portrait-outline" size={20} color={themeMode === "system" ? colors.orange : colors.textPrimary} />
              <Text style={[styles.popupOptionText, { color: themeMode === "system" ? colors.orange : colors.textPrimary }]}>System</Text>
              {themeMode === "system" && <Ionicons name="checkmark" size={20} color={colors.orange} />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainCard: {
    flex: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: "hidden",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  profileBox: {
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 28,
    borderWidth: 1,
  },
  nameText: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 2,
  },
  emailText: {
    fontSize: 15,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
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
    height: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  appearancePopup: {
    width: 280,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  popupOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  popupOptionSelected: {
    backgroundColor: "rgba(232, 132, 92, 0.08)",
  },
  popupOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
});
