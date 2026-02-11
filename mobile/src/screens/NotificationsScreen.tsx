import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";

export function NotificationsScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { colors } = useTheme();

  const handleToggleNotifications = (value: boolean) => {
    if (value) {
      Alert.alert(
        "Notifications disabled",
        "To receive notifications, enable them in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
    } else {
      setNotificationsEnabled(false);
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
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Notification toggle */}
        <View style={styles.content}>
          <View style={[styles.notificationRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            <View style={styles.notificationText}>
              <Text style={[styles.notificationTitle, { color: colors.textPrimary }]}>
                Allow notifications
              </Text>
              <Text style={[styles.notificationDesc, { color: colors.textSecondary }]}>
                Get notified when Kvitt finishes responding
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: "rgba(0,0,0,0.1)", true: colors.orange }}
              thumbColor="#fff"
            />
          </View>
        </View>
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
  headerSpacer: {
    width: 44,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    gap: 14,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  notificationDesc: {
    fontSize: 14,
  },
});
