import React from "react";
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
import { useLanguage } from "../context/LanguageContext";

export function LanguageScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { language, setLanguage, supportedLanguages, t } = useLanguage();

  const handleLanguageSelect = async (langCode: typeof language) => {
    await setLanguage(langCode);
  };

  return (
    <View
      testID="language-screen"
      style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top + 4 }]}
    >
      {/* Main card with rounded top */}
      <View style={[styles.mainCard, { backgroundColor: colors.surface }]}>
        {/* Header inside the card */}
        <View style={styles.header}>
          <TouchableOpacity
            testID="language-back-button"
            style={[styles.glassButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            {t.settings.language}
          </Text>

          <View style={styles.headerSpacer} />
        </View>

        {/* Language List */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {supportedLanguages.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              testID={`language-option-${lang.code}`}
              style={[styles.languageItem, { borderBottomColor: colors.border }]}
              onPress={() => handleLanguageSelect(lang.code)}
              activeOpacity={0.7}
            >
              <Text style={styles.flag}>{lang.flag}</Text>
              <View style={styles.languageInfo}>
                <Text
                  style={[
                    styles.languageName,
                    { color: language === lang.code ? colors.orange : colors.textPrimary },
                  ]}
                >
                  {lang.nativeName}
                </Text>
                {lang.name !== lang.nativeName && (
                  <Text style={[styles.languageNameEn, { color: colors.textSecondary }]}>
                    {lang.name}
                  </Text>
                )}
              </View>
              {language === lang.code && (
                <Ionicons name="checkmark-circle" size={24} color={colors.orange} />
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
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 14,
  },
  flag: {
    fontSize: 28,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "500",
  },
  languageNameEn: {
    fontSize: 13,
    marginTop: 2,
  },
});
