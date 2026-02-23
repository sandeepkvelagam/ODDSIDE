import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, Switch, Alert, Linking,
  Platform, ScrollView, Animated, TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, ANIMATION } from "../styles/liquidGlass";
import { PageHeader } from "../components/ui";
import { BottomSheetScreen } from "../components/BottomSheetScreen";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [gameUpdates, setGameUpdates] = useState(true);
  const [settlements, setSettlements] = useState(true);
  const [groupInvites, setGroupInvites] = useState(true);

  // Engagement preferences
  const [engMutedAll, setEngMutedAll] = useState(false);
  const [engMutedCategories, setEngMutedCategories] = useState<string[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring.bouncy }),
    ]).start();
    fetchEngagementPrefs();
  }, []);

  const fetchEngagementPrefs = async () => {
    try {
      const res = await api.get("/engagement/preferences");
      if (res.data) {
        setEngMutedAll(res.data.muted_all || false);
        setEngMutedCategories(res.data.muted_categories || []);
      }
    } catch {}
  };

  const updateEngPref = async (key: string, value: any) => {
    try {
      await api.put("/engagement/preferences", { [key]: value });
    } catch {}
  };

  const toggleEngMuteAll = (v: boolean) => {
    setEngMutedAll(v);
    updateEngPref("muted_all", v);
  };

  const toggleEngCategory = (cat: string) => {
    const updated = engMutedCategories.includes(cat)
      ? engMutedCategories.filter(c => c !== cat)
      : [...engMutedCategories, cat];
    setEngMutedCategories(updated);
    updateEngPref("muted_categories", updated);
  };

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <PageHeader
            title="Notification Settings"
            subtitle="Manage your alerts"
            onClose={() => navigation.goBack()}
          />
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Push Settings ── */}
            <Text style={[styles.sectionLabel, { color: colors.moonstone }]}>PUSH NOTIFICATIONS</Text>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.toggleRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.toggleIcon, { backgroundColor: COLORS.glass.glowOrange }]}>
                  <Ionicons name="notifications" size={19} color={COLORS.orange} />
                </View>
                <View style={styles.toggleBody}>
                  <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Push Notifications</Text>
                  <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>Alerts for games, settlements & more</Text>
                </View>
                <Switch
                  value={pushEnabled}
                  onValueChange={(v) => {
                    if (v) {
                      Alert.alert("Enable Notifications", "Open device Settings to enable.", [
                        { text: "Cancel", style: "cancel" },
                        { text: "Settings", onPress: () => Platform.OS === "ios" ? Linking.openURL("app-settings:") : Linking.openSettings() },
                      ]);
                    }
                    setPushEnabled(v);
                  }}
                  trackColor={{ false: colors.glassBg, true: COLORS.orange }}
                  thumbColor="#fff"
                />
              </View>

              {[
                { icon: "game-controller-outline", color: COLORS.trustBlue, title: "Game Updates", desc: "Buy-ins, cash-outs, game status", value: gameUpdates, set: setGameUpdates },
                { icon: "wallet-outline", color: COLORS.status.success, title: "Settlements & Wallet", desc: "Payment requests & wallet activity", value: settlements, set: setSettlements },
                { icon: "people-outline", color: "#A855F7", title: "Group Invites", desc: "Invitations to join groups", value: groupInvites, set: setGroupInvites },
              ].map((item, i, arr) => (
                <View
                  key={item.title}
                  style={[styles.toggleRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
                  <View style={[styles.toggleIcon, { backgroundColor: item.color + "18" }]}>
                    <Ionicons name={item.icon as any} size={19} color={item.color} />
                  </View>
                  <View style={styles.toggleBody}>
                    <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={item.value}
                    onValueChange={item.set}
                    trackColor={{ false: colors.glassBg, true: COLORS.orange }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>

            {/* ── Engagement Notifications ── */}
            <Text style={[styles.sectionLabel, { color: colors.moonstone, marginTop: 24 }]}>ENGAGEMENT NOTIFICATIONS</Text>

            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[styles.toggleRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                <View style={[styles.toggleIcon, { backgroundColor: COLORS.glass.glowOrange }]}>
                  <Ionicons name="sparkles" size={19} color={COLORS.orange} />
                </View>
                <View style={styles.toggleBody}>
                  <Text style={[styles.toggleTitle, { color: colors.textPrimary }]}>Mute All Engagement</Text>
                  <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>Pause nudges, celebrations & digests</Text>
                </View>
                <Switch
                  value={engMutedAll}
                  onValueChange={toggleEngMuteAll}
                  trackColor={{ false: colors.glassBg, true: "#ef4444" }}
                  thumbColor="#fff"
                />
              </View>

              {!engMutedAll && [
                { cat: "inactive_group", icon: "calendar-outline", color: COLORS.trustBlue, title: "Inactive Nudges", desc: "Game scheduling reminders" },
                { cat: "milestone", icon: "trophy-outline", color: "#EAB308", title: "Milestones", desc: "Game count celebrations" },
                { cat: "big_winner", icon: "flame-outline", color: "#F97316", title: "Winner Celebrations", desc: "Big win announcements" },
                { cat: "digest", icon: "bar-chart-outline", color: "#A855F7", title: "Weekly Digest", desc: "Group activity summaries" },
              ].map((item, i, arr) => (
                <View
                  key={item.cat}
                  style={[styles.toggleRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                >
                  <View style={[styles.toggleIcon, { backgroundColor: item.color + "18" }]}>
                    <Ionicons name={item.icon as any} size={19} color={item.color} />
                  </View>
                  <View style={styles.toggleBody}>
                    <Text style={[styles.toggleTitle, { color: engMutedCategories.includes(item.cat) ? colors.textMuted : colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.toggleDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={!engMutedCategories.includes(item.cat)}
                    onValueChange={() => toggleEngCategory(item.cat)}
                    trackColor={{ false: colors.glassBg, true: COLORS.orange }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>

            {/* Info text */}
            <Text style={[styles.infoText, { color: colors.textMuted }]}>
              Manage which notifications you receive. You can also configure notifications in your device settings.
            </Text>

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

  // Toggle rows
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  toggleIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toggleBody: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: "500" },
  toggleDesc: { fontSize: 12, marginTop: 2 },

  infoText: {
    fontSize: 12,
    marginTop: 16,
    textAlign: "center",
    lineHeight: 18,
  },
});

export default NotificationsScreen;
