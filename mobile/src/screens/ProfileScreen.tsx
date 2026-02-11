import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";

export function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();
  const { isDark, colors } = useTheme();

  const [fullName, setFullName] = useState(user?.name || "");
  const [nickname, setNickname] = useState(user?.nickname || user?.name?.split(" ")[0] || "");
  const [preferences, setPreferences] = useState(user?.preferences || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await api.put("/users/me", {
        name: fullName.trim(),
        nickname: nickname.trim(),
      });

      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert("Success", "Profile updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.detail || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleSavePreferences = async () => {
    setIsUpdatingPreferences(true);
    try {
      await api.put("/users/me", {
        preferences: preferences.trim(),
      });

      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert("Success", "Preferences saved successfully");
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.detail || "Failed to save preferences");
    } finally {
      setIsUpdatingPreferences(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/users/me");
              Alert.alert("Account Deleted", "Your account has been deleted.");
            } catch (error: any) {
              Alert.alert("Error", error?.response?.data?.detail || "Failed to delete account");
            }
          },
        },
      ]
    );
  };

  const profileChanged = fullName !== (user?.name || "") || nickname !== (user?.nickname || user?.name?.split(" ")[0] || "");
  const preferencesChanged = preferences !== (user?.preferences || "");

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

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profile</Text>

          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Full Name */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary }]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textMuted}
          />

          {/* Nickname */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Nickname</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Enter your nickname"
            placeholderTextColor={colors.textMuted}
          />

          {/* Update Profile Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: profileChanged ? colors.buttonBg : colors.buttonDisabled }
            ]}
            onPress={handleUpdateProfile}
            disabled={!profileChanged || isUpdatingProfile}
            activeOpacity={0.8}
          >
            {isUpdatingProfile ? (
              <ActivityIndicator color={isDark ? "#1a1a1a" : "#ffffff"} />
            ) : (
              <Text style={[styles.buttonText, { color: isDark ? "#1a1a1a" : "#ffffff" }]}>Update Profile</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Personal Preferences */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Personal Preferences</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary }]}
            value={preferences}
            onChangeText={setPreferences}
            placeholder="When learning new concepts, I find analogies particularly helpful."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Your preferences will apply to all conversations, within Anthropic's guidelines.
          </Text>

          {/* Save Preferences Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: preferencesChanged ? colors.buttonBg : colors.buttonDisabled }
            ]}
            onPress={handleSavePreferences}
            disabled={!preferencesChanged || isUpdatingPreferences}
            activeOpacity={0.8}
          >
            {isUpdatingPreferences ? (
              <ActivityIndicator color={isDark ? "#1a1a1a" : "#ffffff"} />
            ) : (
              <Text style={[styles.buttonText, { color: isDark ? "#1a1a1a" : "#ffffff" }]}>Save Preferences</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Delete Account */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete account</Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  textArea: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 100,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  button: {
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
