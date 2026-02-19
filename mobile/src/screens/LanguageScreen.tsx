import React, { useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../context/LanguageContext";
import { useTheme } from "../context/ThemeContext";
import { COLORS, ANIMATION } from "../styles/liquidGlass";
import { PageHeader } from "../components/ui";
import { BottomSheetScreen } from "../components/BottomSheetScreen";

export function LanguageScreen() {
  const navigation = useNavigation();
  const { language, setLanguage, supportedLanguages, t } = useLanguage();
  const { colors } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring.bouncy }),
    ]).start();
  }, []);

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <PageHeader
            title={t.settings.language}
            subtitle="Select your preferred language"
            onClose={() => navigation.goBack()}
          />
        </Animated.View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            <Text style={[styles.sectionLabel, { color: colors.moonstone }]}>AVAILABLE LANGUAGES</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {supportedLanguages.map((lang, index) => {
                const isSelected = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    testID={`language-option-${lang.code}`}
                    style={[
                      styles.langRow,
                      isSelected && { backgroundColor: COLORS.glass.glowOrange },
                      index < supportedLanguages.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                    onPress={() => setLanguage(lang.code)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.flag}>{lang.flag}</Text>
                    <View style={styles.langInfo}>
                      <Text style={[styles.langName, { color: isSelected ? COLORS.orange : colors.textPrimary }]}>
                        {lang.nativeName}
                      </Text>
                      {lang.name !== lang.nativeName && (
                        <Text style={[styles.langNameEn, { color: colors.textMuted }]}>{lang.name}</Text>
                      )}
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={COLORS.orange} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={[styles.note, { borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
              <Text style={[styles.noteText, { color: colors.textMuted }]}>
                Language affects all text in the app. Restart may be needed for full effect.
              </Text>
            </View>

          </Animated.View>
          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </BottomSheetScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    marginTop: 8, marginBottom: 10, textTransform: "uppercase",
  },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  langRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 18, gap: 14,
  },
  flag: { fontSize: 28, width: 36, textAlign: "center" },
  langInfo: { flex: 1 },
  langName: { fontSize: 16, fontWeight: "500" },
  langNameEn: { fontSize: 12, marginTop: 2 },

  note: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginTop: 20, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  noteText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

export default LanguageScreen;
