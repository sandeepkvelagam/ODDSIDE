import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";

export function PrivacyScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [helpImprove, setHelpImprove] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 4 }]}>
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

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Privacy</Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
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
                Allow the use of your chats and coding sessions to train and improve Kvitt AI models.{" "}
                <Text style={styles.link} onPress={() => Linking.openURL("https://kvitt.app/learn-more")}>
                  Learn More
                </Text>
              </Text>
            </View>
            <Switch
              value={helpImprove}
              onValueChange={setHelpImprove}
              trackColor={{ false: "rgba(0,0,0,0.1)", true: "#3b82f6" }}
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
    marginTop: 8,
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
    color: "#3b82f6",
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
