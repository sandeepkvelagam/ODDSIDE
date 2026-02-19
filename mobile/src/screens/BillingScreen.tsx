import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { PageHeader } from "../components/ui";
import { BottomSheetScreen } from "../components/BottomSheetScreen";
import { useTheme } from "../context/ThemeContext";

const PLAN_FEATURES = [
  { icon: "people-outline", text: "Unlimited groups & members" },
  { icon: "game-controller-outline", text: "Unlimited games" },
  { icon: "sparkles-outline", text: "AI Poker Assistant" },
  { icon: "wallet-outline", text: "Kvitt Wallet" },
];

export function BillingScreen() {
  const navigation = useNavigation();
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
            title="Billing"
            subtitle="Subscription & payments"
            onClose={() => navigation.goBack()}
          />
        </Animated.View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Current Plan ── */}
            <View style={[styles.planHero, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.planHeroTop}>
                <View style={styles.planIconWrap}>
                  <Ionicons name="diamond" size={26} color={COLORS.status.success} />
                </View>
                <View style={styles.planHeroInfo}>
                  <View style={styles.planNameRow}>
                    <Text style={[styles.planName, { color: colors.textPrimary }]}>Free Plan</Text>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>Active</Text>
                    </View>
                  </View>
                  <Text style={[styles.planPrice, { color: colors.textMuted }]}>$0.00 / month</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.featureGrid}>
                {PLAN_FEATURES.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={16} color={COLORS.status.success} />
                    <Text style={[styles.featureText, { color: colors.textSecondary }]}>{f.text}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Coming Soon Banner ── */}
            <View style={[styles.bannerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.bannerIcon}>
                <Ionicons name="time-outline" size={24} color={COLORS.orange} />
              </View>
              <View style={styles.bannerText}>
                <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>Premium Features Coming</Text>
                <Text style={[styles.bannerDesc, { color: colors.textMuted }]}>
                  Advanced analytics, priority support, and unlimited AI credits are on the way.
                </Text>
              </View>
            </View>

            {/* ── Subscription Options ── */}
            <Text style={[styles.sectionLabel, { color: colors.moonstone }]}>SUBSCRIPTION OPTIONS</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                { icon: "card-outline", color: COLORS.trustBlue, label: "Manage subscription", sub: "Upgrade or cancel your plan" },
                { icon: "refresh-outline", color: "#A855F7", label: "Restore purchases", sub: "Restore previous app purchases" },
              ].map((item, i, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  disabled
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + "20" }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={[styles.menuLabel, { color: colors.textMuted }]}>{item.label}</Text>
                    <Text style={[styles.menuSub, { color: colors.textMuted }]}>{item.sub}</Text>
                  </View>
                  <View style={styles.soonPill}>
                    <Text style={styles.soonText}>Soon</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── Links ── */}
            <Text style={[styles.sectionLabel, { color: colors.moonstone }]}>LEGAL</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                { icon: "document-text-outline", label: "Terms of Service", url: "https://kvitt.app/terms" },
                { icon: "shield-outline", label: "Privacy Policy", url: "https://kvitt.app/privacy" },
                { icon: "document-outline", label: "Acceptable Use Policy", url: "https://kvitt.app/acceptable-use" },
              ].map((item, i, arr) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.menuRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  onPress={() => Linking.openURL(item.url)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.menuIcon, { backgroundColor: COLORS.glass.glowOrange }]}>
                    <Ionicons name={item.icon as any} size={18} color={COLORS.orange} />
                  </View>
                  <Text style={[styles.menuLabel, { color: colors.textPrimary, flex: 1 }]}>{item.label}</Text>
                  <Ionicons name="open-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
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

  planHero: {
    borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 16,
  },
  planHeroTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  planIconWrap: {
    width: 52, height: 52, borderRadius: 14,
    backgroundColor: COLORS.glass.glowGreen, alignItems: "center", justifyContent: "center",
  },
  planHeroInfo: { flex: 1 },
  planNameRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  planName: { fontSize: 18, fontWeight: "700" },
  activePill: {
    backgroundColor: COLORS.glass.glowGreen, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  activePillText: { color: COLORS.status.success, fontSize: 11, fontWeight: "700" },
  planPrice: { fontSize: 14 },
  divider: { height: 1, marginBottom: 16 },
  featureGrid: { gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 14 },

  bannerCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, flexDirection: "row",
    alignItems: "flex-start", gap: 14, marginBottom: 8,
  },
  bannerIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.glass.glowOrange, alignItems: "center", justifyContent: "center",
  },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  bannerDesc: { fontSize: 13, lineHeight: 18 },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    marginTop: 24, marginBottom: 10, textTransform: "uppercase",
  },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  menuRow: {
    flexDirection: "row", alignItems: "center", padding: 16, gap: 14,
  },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "500" },
  menuSub: { fontSize: 12, marginTop: 2 },
  soonPill: {
    backgroundColor: COLORS.glass.bg, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.glass.border,
  },
  soonText: { color: COLORS.text.muted, fontSize: 11, fontWeight: "600" },
});

export default BillingScreen;
