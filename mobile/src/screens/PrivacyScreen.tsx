import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Switch, Linking, Alert,
  ActivityIndicator, ScrollView, TouchableOpacity, Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";
import { COLORS, ANIMATION } from "../styles/liquidGlass";
import { PageHeader } from "../components/ui";
import { BottomSheetScreen } from "../components/BottomSheetScreen";

export function PrivacyScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();
  const [helpImprove, setHelpImprove] = useState(user?.help_improve_ai ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring.bouncy }),
    ]).start();
  }, []);

  useEffect(() => {
    if (user?.help_improve_ai !== undefined) setHelpImprove(user.help_improve_ai);
  }, [user?.help_improve_ai]);

  const handleToggle = async (value: boolean) => {
    setHelpImprove(value);
    setIsSaving(true);
    try {
      await api.put("/users/me", { help_improve_ai: value });
      await refreshUser?.();
    } catch (e: any) {
      setHelpImprove(!value);
      Alert.alert("Not available right now", e?.response?.data?.detail || "Please try again.");
    } finally { setIsSaving(false); }
  };

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <PageHeader
            title="Privacy"
            subtitle="Data & permissions"
            onClose={() => navigation.goBack()}
          />
        </Animated.View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Trust Banner ── */}
            <View style={[styles.trustCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.trustHeader}>
                <View style={[styles.trustIcon, { backgroundColor: COLORS.glass.glowBlue }]}>
                  <Ionicons name="shield-checkmark" size={22} color={COLORS.trustBlue} />
                </View>
                <View style={styles.trustText}>
                  <Text style={[styles.trustTitle, { color: colors.textPrimary }]}>Your data is safe</Text>
                  <Text style={[styles.trustDesc, { color: colors.textMuted }]}>
                    Encrypted at rest and in transit. Never sold to third parties.
                  </Text>
                </View>
              </View>
              <View style={styles.linksRow}>
                {[
                  { label: "Privacy Center", url: "https://kvitt.app/privacy" },
                  { label: "Privacy Policy", url: "https://kvitt.app/privacy-policy" },
                ].map((l) => (
                  <TouchableOpacity
                    key={l.label}
                    style={[styles.linkChip, { backgroundColor: COLORS.glass.bg, borderColor: COLORS.glass.border }]}
                    onPress={() => Linking.openURL(l.url)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="open-outline" size={13} color={COLORS.orange} />
                    <Text style={styles.linkText}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── Data Usage ── */}
            <Text style={[styles.sectionLabel, { color: colors.moonstone }]}>DATA USAGE</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.toggleRow}>
                <View style={[styles.toggleIcon, { backgroundColor: COLORS.glass.glowOrange }]}>
                  <Ionicons name="analytics-outline" size={20} color={COLORS.orange} />
                </View>
                <View style={styles.toggleBody}>
                  <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Help improve Kvitt</Text>
                  <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>
                    Share anonymised game data to improve AI features and app performance.
                  </Text>
                  <TouchableOpacity
                    onPress={() => Linking.openURL("https://kvitt.app/learn-more")}
                    style={styles.learnMore}
                  >
                    <Text style={styles.learnMoreText}>Learn More</Text>
                    <Ionicons name="chevron-forward" size={12} color={COLORS.orange} />
                  </TouchableOpacity>
                </View>
                {isSaving
                  ? <ActivityIndicator size="small" color={COLORS.orange} />
                  : <Switch value={helpImprove} onValueChange={handleToggle} trackColor={{ false: COLORS.glass.bg, true: COLORS.orange }} thumbColor="#fff" />
                }
              </View>
            </View>

            {/* ── Your Rights ── */}
            <Text style={[styles.sectionLabel, { color: colors.moonstone }]}>YOUR RIGHTS</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {[
                { icon: "download-outline", color: COLORS.trustBlue, title: "Export your data", desc: "Download all your Kvitt data", url: "https://kvitt.app/data-export" },
                { icon: "trash-outline", color: COLORS.status.danger, title: "Request deletion", desc: "Permanently delete all your data", url: "https://kvitt.app/delete-data" },
              ].map((item, i, arr) => (
                <TouchableOpacity
                  key={item.title}
                  style={[styles.rightRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                  onPress={() => Linking.openURL(item.url)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.rightIcon, { backgroundColor: item.color + "18" }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <View style={styles.rightText}>
                    <Text style={[styles.rightTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.rightDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                  </View>
                  <Ionicons name="open-outline" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.footerNote, { borderColor: colors.border }]}>
              <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                You can request account deletion at any time from Profile → Danger Zone.
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

  trustCard: { borderRadius: 20, borderWidth: 1, padding: 18, marginBottom: 8 },
  trustHeader: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 14 },
  trustIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  trustText: { flex: 1 },
  trustTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  trustDesc: { fontSize: 13, lineHeight: 18 },
  linksRow: { flexDirection: "row", gap: 10 },
  linkChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1,
  },
  linkText: { color: COLORS.orange, fontSize: 12, fontWeight: "500" },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    marginTop: 24, marginBottom: 10, textTransform: "uppercase",
  },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },

  toggleRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 16 },
  toggleIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toggleBody: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  toggleDesc: { fontSize: 13, lineHeight: 18 },
  learnMore: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  learnMoreText: { color: COLORS.orange, fontSize: 12, fontWeight: "500" },

  rightRow: { flexDirection: "row", alignItems: "center", padding: 16, gap: 14 },
  rightIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rightText: { flex: 1 },
  rightTitle: { fontSize: 15, fontWeight: "500" },
  rightDesc: { fontSize: 12, marginTop: 2 },

  footerNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginTop: 20, padding: 14, borderRadius: 14, borderWidth: 1,
  },
  footerText: { flex: 1, fontSize: 12, lineHeight: 18 },
});

export default PrivacyScreen;
