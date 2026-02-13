import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { RightDrawer } from "../components/RightDrawer";

export function LanguageScreen() {
  const { colors } = useTheme();
  const { language, setLanguage, supportedLanguages, t } = useLanguage();

  const handleLanguageSelect = async (langCode: typeof language) => {
    await setLanguage(langCode);
  };

  return (
    <RightDrawer title={t.settings.language}>
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
    </RightDrawer>
  );
}

const styles = StyleSheet.create({
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
