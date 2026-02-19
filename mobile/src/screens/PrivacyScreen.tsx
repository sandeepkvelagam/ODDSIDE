import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Linking,
  Alert,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { GlassIconButton, GlassSurface } from "../components/ui";
import { BottomSheetScreen } from "../components/BottomSheetScreen";

export function PrivacyScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const [helpImprove, setHelpImprove] = useState(user?.help_improve_ai ?? true);
  const [isSaving, setIsSaving] = useState(false);

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
      setHelpImprove(!value);
      Alert.alert("Error", error?.response?.data?.detail || "Failed to save preference");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <BottomSheetScreen>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <GlassIconButton
            icon={<Ionicons name="close" size={22} color={COLORS.text.primary} />}
            onPress={() => navigation.goBack()}
            variant="ghost"
          />
          <Text style={styles.headerTitle}>Privacy</Text>
          <View style={{ width: 48 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Data Privacy Section */}
            <GlassSurface glowVariant="blue" style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <View style={[styles.iconContainer, { backgroundColor: COLORS.glass.glowBlue }]}>
                  <Ionicons name="shield-checkmark" size={24} color={COLORS.trustBlue} />
                </View>
                <Text style={styles.infoTitle}>Data Privacy</Text>
              </View>
              <Text style={styles.infoDescription}>
                Kvitt believes in transparent data practices. Keeping your data safe is a priority.
              </Text>
              
              <View style={styles.linksRow}>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => Linking.openURL("https://kvitt.app/privacy")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="document-text-outline" size={16} color={COLORS.orange} />
                  <Text style={styles.linkText}>Privacy Center</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.linkButton}
                  onPress={() => Linking.openURL("https://kvitt.app/privacy-policy")}
                  activeOpacity={0.7}
                >
                  <Ionicons name="shield-outline" size={16} color={COLORS.orange} />
                  <Text style={styles.linkText}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </GlassSurface>

            {/* Help Improve Section */}
            <Text style={styles.sectionTitle}>DATA USAGE</Text>
            <GlassSurface>
              <View style={styles.toggleRow}>
                <View style={[styles.iconContainer, { backgroundColor: COLORS.glass.glowOrange }]}>
                  <Ionicons name="analytics" size={22} color={COLORS.orange} />
                </View>
                <View style={styles.toggleText}>
                  <Text style={styles.toggleTitle}>Help improve Kvitt</Text>
                  <Text style={styles.toggleDesc}>
                    Allow the use of your game data and app usage to help improve Kvitt features and AI assistance.
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL("https://kvitt.app/learn-more")}
                    style={styles.learnMore}
                  >
                    <Text style={styles.learnMoreText}>Learn More</Text>
                    <Ionicons name="open-outline" size={14} color={COLORS.orange} />
                  </TouchableOpacity>
                </View>
                {isSaving ? (
                  <ActivityIndicator size="small" color={COLORS.orange} />
                ) : (
                  <Switch
                    value={helpImprove}
                    onValueChange={handleToggle}
                    trackColor={{ false: COLORS.glass.bg, true: COLORS.orange }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            </GlassSurface>

            {/* Additional Info */}
            <View style={styles.footerInfo}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.text.muted} />
              <Text style={styles.footerText}>
                Your data is encrypted and stored securely. You can request data deletion at any time.
              </Text>
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </BottomSheetScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.jetDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
    paddingTop: 16,
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
  // Info Card
  infoCard: {
    marginBottom: SPACING.lg,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  infoDescription: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  linksRow: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  linkButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.glass.bg,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  linkText: {
    color: COLORS.orange,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  // Section
  sectionTitle: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    letterSpacing: 1,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  // Toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: SPACING.xs,
  },
  toggleDesc: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    lineHeight: 20,
  },
  learnMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  learnMoreText: {
    color: COLORS.orange,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  // Footer
  footerInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.sm,
  },
  footerText: {
    flex: 1,
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    lineHeight: 18,
  },
});

export default PrivacyScreen;
