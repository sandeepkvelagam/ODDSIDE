import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useLanguage } from "../context/LanguageContext";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { GlassIconButton, GlassSurface } from "../components/ui";

export function LanguageScreen() {
  const navigation = useNavigation();
  const { language, setLanguage, supportedLanguages, t } = useLanguage();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        ...ANIMATION.spring.bouncy,
      }),
    ]).start();
  }, []);

  const handleLanguageSelect = async (langCode: typeof language) => {
    await setLanguage(langCode);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <GlassIconButton
            icon={<Ionicons name="chevron-back" size={22} color={COLORS.text.primary} />}
            onPress={() => navigation.goBack()}
            variant="ghost"
          />
          <Text style={styles.headerTitle}>{t.settings.language}</Text>
          <View style={{ width: 48 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <Text style={styles.sectionDescription}>
              Choose your preferred language for the app interface
            </Text>

            <GlassSurface style={styles.languageList} noPadding>
              {supportedLanguages.map((lang, index) => {
                const isSelected = language === lang.code;
                const scaleAnim = useRef(new Animated.Value(1)).current;

                const handlePressIn = () => {
                  Animated.spring(scaleAnim, {
                    toValue: 0.98,
                    ...ANIMATION.spring.press,
                  }).start();
                };

                const handlePressOut = () => {
                  Animated.spring(scaleAnim, {
                    toValue: 1,
                    ...ANIMATION.spring.snap,
                  }).start();
                };

                return (
                  <Animated.View key={lang.code} style={{ transform: [{ scale: scaleAnim }] }}>
                    <TouchableOpacity
                      testID={`language-option-${lang.code}`}
                      style={[
                        styles.languageItem,
                        isSelected && styles.languageItemSelected,
                        index < supportedLanguages.length - 1 && styles.languageItemBorder,
                      ]}
                      onPress={() => handleLanguageSelect(lang.code)}
                      onPressIn={handlePressIn}
                      onPressOut={handlePressOut}
                      activeOpacity={0.9}
                    >
                      <Text style={styles.flag}>{lang.flag}</Text>
                      <View style={styles.languageInfo}>
                        <Text
                          style={[
                            styles.languageName,
                            isSelected && { color: COLORS.orange },
                          ]}
                        >
                          {lang.nativeName}
                        </Text>
                        {lang.name !== lang.nativeName && (
                          <Text style={styles.languageNameEn}>
                            {lang.name}
                          </Text>
                        )}
                      </View>
                      {isSelected && (
                        <View style={styles.checkContainer}>
                          <Ionicons name="checkmark-circle" size={24} color={COLORS.orange} />
                        </View>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </GlassSurface>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.jetDark,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.container,
  },
  sectionDescription: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  languageList: {
    overflow: "hidden",
  },
  languageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.cardPadding,
    gap: SPACING.md,
  },
  languageItemSelected: {
    backgroundColor: COLORS.glass.glowOrange,
  },
  languageItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  flag: {
    fontSize: 28,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  languageNameEn: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: 2,
  },
  checkContainer: {
    marginLeft: SPACING.sm,
  },
});

export default LanguageScreen;
