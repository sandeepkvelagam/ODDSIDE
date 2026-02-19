import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { GlassIconButton, GlassSurface } from "../components/ui";
import { BottomSheetScreen } from "../components/BottomSheetScreen";
import { useTheme } from "../context/ThemeContext";

export function BillingScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();

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

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <GlassIconButton
            icon={<Ionicons name="chevron-back" size={22} color={colors.textPrimary} />}
            onPress={() => navigation.goBack()}
            variant="ghost"
          />
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Billing</Text>
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </View>
          <View style={{ width: 48 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Coming Soon Notice */}
            <GlassSurface glowVariant="orange" style={styles.noticeCard}>
              <View style={styles.noticeIcon}>
                <Ionicons name="time" size={32} color={COLORS.orange} />
              </View>
              <Text style={styles.noticeTitle}>Premium Features</Text>
              <Text style={styles.noticeDesc}>
                We're working on exciting premium features. Stay tuned for updates!
              </Text>
            </GlassSurface>

            {/* Current Plan */}
            <Text style={styles.sectionTitle}>CURRENT PLAN</Text>
            <GlassSurface style={styles.planCard}>
              <View style={styles.planHeader}>
                <View style={[styles.planIcon, { backgroundColor: COLORS.glass.glowGreen }]}>
                  <Ionicons name="diamond" size={24} color={COLORS.status.success} />
                </View>
                <View style={styles.planInfo}>
                  <Text style={styles.planName}>Free Plan</Text>
                  <Text style={styles.planPrice}>$0.00/month</Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeText}>Active</Text>
                </View>
              </View>
              <View style={styles.planFeatures}>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.status.success} />
                  <Text style={styles.featureText}>Unlimited groups</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.status.success} />
                  <Text style={styles.featureText}>Unlimited games</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={COLORS.status.success} />
                  <Text style={styles.featureText}>AI Poker Assistant</Text>
                </View>
              </View>
            </GlassSurface>

            {/* Menu Items */}
            <Text style={styles.sectionTitle}>SUBSCRIPTION OPTIONS</Text>
            <GlassSurface noPadding>
              <TouchableOpacity
                style={[styles.menuItem, styles.borderBottom]}
                activeOpacity={0.7}
                disabled
              >
                <View style={[styles.menuIcon, { backgroundColor: COLORS.glass.glowBlue }]}>
                  <Ionicons name="card" size={18} color={COLORS.trustBlue} />
                </View>
                <Text style={styles.menuLabel}>Manage subscription</Text>
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>Soon</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                activeOpacity={0.7}
                disabled
              >
                <View style={[styles.menuIcon, { backgroundColor: "rgba(168, 85, 247, 0.15)" }]}>
                  <Ionicons name="refresh" size={18} color="#A855F7" />
                </View>
                <Text style={styles.menuLabel}>Restore purchases</Text>
                <View style={styles.menuBadge}>
                  <Text style={styles.menuBadgeText}>Soon</Text>
                </View>
              </TouchableOpacity>
            </GlassSurface>
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
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
    paddingTop: 16,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  comingSoonBadge: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  comingSoonText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.container,
  },
  // Notice Card
  noticeCard: {
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  noticeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.glass.glowOrange,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  noticeTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginBottom: SPACING.xs,
  },
  noticeDesc: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
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
  // Plan Card
  planCard: {},
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  planPrice: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: COLORS.glass.glowGreen,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  activeText: {
    color: COLORS.status.success,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  planFeatures: {
    gap: SPACING.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  featureText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
  },
  // Menu Items
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.cardPadding,
    gap: SPACING.md,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.body,
  },
  menuBadge: {
    backgroundColor: COLORS.glass.bg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  menuBadgeText: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});

export default BillingScreen;
