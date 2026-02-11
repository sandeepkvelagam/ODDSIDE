import React, { useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  useColorScheme,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

// Light theme - matching Claude app
const LIGHT_COLORS = {
  background: "#e8e4de",
  surface: "#f7f5f2",
  inputBg: "#ffffff",
  textPrimary: "#1a1a1a",
  textSecondary: "#5c5c5c",
  textMuted: "#8c8c8c",
  border: "rgba(0, 0, 0, 0.08)",
  buttonBg: "#1a1a1a",
  buttonDisabled: "#9a9a9a",
  danger: "#b91c1c",
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
  buttonBg: "#ffffff",
  buttonDisabled: "#555555",
  danger: "#ef4444",
};

export function ProfileScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  const [fullName, setFullName] = useState(user?.name || "");
  const [nickname, setNickname] = useState(user?.name?.split(" ")[0] || "");
  const [preferences, setPreferences] = useState("When learning new concepts, I find analogies particularly helpful.");

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => {} },
      ]
    );
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
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Profile</Text>

          <View style={styles.headerButton} />
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
            style={[styles.button, { backgroundColor: colors.buttonBg }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: isDark ? "#1a1a1a" : "#ffffff" }]}>Update Profile</Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Personal Preferences */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Personal Preferences</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary }]}
            value={preferences}
            onChangeText={setPreferences}
            placeholder="Add your preferences..."
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
            style={[styles.button, { backgroundColor: colors.buttonDisabled }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { color: "#ffffff" }]}>Save Preferences</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
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
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  textArea: {
    borderRadius: 12,
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
