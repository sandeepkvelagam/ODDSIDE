import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { RightDrawer } from "../components/RightDrawer";

export function NotificationsScreen() {
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
    <RightDrawer title="Notifications">
      <View style={styles.content}>
        <View style={[styles.notificationRow, { borderBottomColor: colors.border }]}>
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, { color: colors.textPrimary }]}>
              Allow notifications
            </Text>
            <Text style={[styles.notificationDesc, { color: colors.textSecondary }]}>
              Get notified about game updates and settlements
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
    </RightDrawer>
  );
}

const styles = StyleSheet.create({
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
