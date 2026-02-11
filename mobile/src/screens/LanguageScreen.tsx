import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "en-IN", name: "English (India)" },
  { code: "en-GB", name: "English (United Kingdom)" },
  { code: "fr", name: "French" },
  { code: "fr-CA", name: "French (Canada)" },
  { code: "de", name: "German" },
  { code: "de-AT", name: "German (Austria)" },
  { code: "hi", name: "Hindi" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "pt", name: "Portuguese" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ru", name: "Russian" },
  { code: "es", name: "Spanish" },
  { code: "es-MX", name: "Spanish (Mexico)" },
  { code: "zh", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "ar", name: "Arabic" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
  { code: "tr", name: "Turkish" },
  { code: "vi", name: "Vietnamese" },
  { code: "th", name: "Thai" },
  { code: "sv", name: "Swedish" },
];

export function LanguageScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [selectedLanguage, setSelectedLanguage] = useState("en");

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

          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Speech language</Text>
            <View style={[styles.comingSoonBadge, { backgroundColor: colors.orange }]}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Language List */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.languageItem, { borderBottomColor: colors.border }]}
              onPress={() => setSelectedLanguage(lang.code)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.languageName,
                  { color: selectedLanguage === lang.code ? "#3b82f6" : colors.textPrimary },
                ]}
              >
                {lang.name}
              </Text>
              {selectedLanguage === lang.code && (
                <Ionicons name="checkmark" size={22} color="#3b82f6" />
              )}
            </TouchableOpacity>
          ))}
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
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  comingSoonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  languageName: {
    fontSize: 16,
  },
});
