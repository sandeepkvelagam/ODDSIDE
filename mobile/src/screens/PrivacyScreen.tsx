import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Linking,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { RightDrawer } from "../components/RightDrawer";

export function PrivacyScreen() {
  const { colors } = useTheme();
  const { user, refreshUser } = useAuth();
  const [helpImprove, setHelpImprove] = useState(user?.help_improve_ai ?? true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.help_improve_ai !== undefined) {
      setHelpImprove(user.help_improve_ai);
    }
  }, [user?.help_improve_ai]);

  const handleToggle = async (value: boolean) => {
    setHelpImprove(value);
    setIsSaving(true);
    try {
      await api.put("/users/me", { help_improve_ai: value });
      if (refreshUser) await refreshUser();
    } catch (error: any) {
      setHelpImprove(!value); // Revert on error
      Alert.alert("Error", error?.response?.data?.detail || "Failed to save preference");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RightDrawer title="Privacy">
      <View style={styles.content}>
        {/* Data Privacy Section */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Data privacy</Text>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Kvitt believes in transparent data practices.
        </Text>

        <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
          Keeping your data safe is a priority. Learn how your information is protected when using Kvitt products, and visit our{" "}
          <Text style={styles.link} onPress={() => Linking.openURL("https://kvitt.app/privacy")}>
            Privacy Center
          </Text>
          {" "}and{" "}
          <Text style={styles.link} onPress={() => Linking.openURL("https://kvitt.app/privacy-policy")}>
            Privacy Policy
          </Text>
          {" "}for more details.
        </Text>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Help Improve Section */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleText}>
            <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Help improve Kvitt</Text>
            <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>
              Allow the use of your game data and app usage to help improve Kvitt features and AI assistance.{" "}
              <Text style={styles.link} onPress={() => Linking.openURL("https://kvitt.app/learn-more")}>
                Learn More
              </Text>
            </Text>
          </View>
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.orange} />
          ) : (
            <Switch
              value={helpImprove}
              onValueChange={handleToggle}
              trackColor={{ false: "rgba(0,0,0,0.1)", true: colors.orange }}
              thumbColor="#fff"
            />
          )}
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
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 15,
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
  },
  link: {
    color: "#EF6E59",
    textDecorationLine: "underline",
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 6,
  },
  toggleDesc: {
    fontSize: 15,
    lineHeight: 22,
  },
});
