import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, Switch, Alert, Linking,
  Platform, ScrollView, Animated, TouchableOpacity,
  RefreshControl, ActivityIndicator,
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

type Invite = {
  invite_id: string;
  group_id: string;
  group?: { name: string; description?: string };
  inviter?: { name: string };
  created_at: string;
};

type AppNotification = {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  const [pushEnabled, setPushEnabled] = useState(false);
  const [gameUpdates, setGameUpdates] = useState(true);
  const [settlements, setSettlements] = useState(true);
  const [groupInvites, setGroupInvites] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring.bouncy }),
    ]).start();
    fetchData();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [nr, ir] = await Promise.all([
        api.get("/notifications").catch(() => ({ data: [] })),
        api.get("/users/invites").catch(() => ({ data: [] })),
      ]);
      setNotifications(Array.isArray(nr.data) ? nr.data : []);
      setPendingInvites(Array.isArray(ir.data) ? ir.data : []);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleInviteRespond = async (inviteId: string, accept: boolean) => {
    setRespondingTo(inviteId);
    try {
      const res = await api.post(`/users/invites/${inviteId}/respond`, { accept });
      if (accept && res.data?.group_id) {
        const invite = pendingInvites.find(i => i.invite_id === inviteId);
        Alert.alert("Joined!", `Welcome to ${invite?.group?.name || "the group"}!`, [
          {
            text: "View Group",
            onPress: () => {
              navigation.goBack();
              navigation.navigate("GroupHub", { groupId: res.data.group_id, groupName: invite?.group?.name });
            },
          },
          { text: "OK" },
        ]);
      }
      setPendingInvites(prev => prev.filter(i => i.invite_id !== inviteId));
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to respond");
    } finally { setRespondingTo(null); }
  };

  const formatTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = diff / 3600000;
    if (h < 1) return "Just now";
    if (h < 24) return `${Math.floor(h)}h ago`;
    if (h < 48) return "Yesterday";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getNotifStyle = (type: string) => {
    const map: Record<string, { icon: string; color: string }> = {
      game_started: { icon: "play-circle", color: COLORS.status.success },
      game_ended: { icon: "stop-circle", color: COLORS.text.muted },
      settlement_generated: { icon: "calculator", color: COLORS.status.warning },
      invite_accepted: { icon: "person-add", color: COLORS.status.success },
      wallet_received: { icon: "wallet", color: COLORS.status.success },
    };
    return map[type] || { icon: "notifications", color: COLORS.moonstone };
  };

  const handleMarkRead = async (id: string) => {
    await api.put(`/notifications/${id}/read`).catch(() => {});
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, read: true } : n));
  };

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <PageHeader
            title="Notifications"
            subtitle={pendingInvites.length > 0 ? `${pendingInvites.length} pending invite${pendingInvites.length > 1 ? 's' : ''}` : "Manage your alerts"}
            onClose={() => navigation.goBack()}
          />
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />}
        >
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.orange} />
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

              {/* ── Pending Invites ── */}
              {pendingInvites.length > 0 && (
                <>
                  <Text style={[styles.sectionLabel, { color: colors.moonstone }]}>
                    PENDING INVITES ({pendingInvites.length})
                  </Text>
                  {pendingInvites.map((inv) => (
                    <View key={inv.invite_id} style={[styles.inviteCard, { backgroundColor: colors.surface, borderColor: COLORS.orange + "50" }]}>
                      <View style={[styles.inviteIconWrap, { backgroundColor: COLORS.glass.glowOrange }]}>
                        <Ionicons name="people" size={20} color={COLORS.orange} />
                      </View>
                      <View style={styles.inviteBody}>
                        <Text style={[styles.inviteName, { color: colors.textPrimary }]}>{inv.group?.name || "Unknown Group"}</Text>
                        <Text style={[styles.inviteFrom, { color: colors.textMuted }]}>
                          Invited by {inv.inviter?.name || "someone"} · {formatTime(inv.created_at)}
                        </Text>
                        {inv.group?.description ? (
                          <Text style={[styles.inviteDesc, { color: colors.textMuted }]} numberOfLines={1}>{inv.group.description}</Text>
                        ) : null}
                      </View>
                      <View style={styles.inviteBtns}>
                        {respondingTo === inv.invite_id ? (
                          <ActivityIndicator size="small" color={COLORS.orange} />
                        ) : (
                          <>
                            <TouchableOpacity
                              style={[styles.inviteBtn, { backgroundColor: COLORS.orange }]}
                              onPress={() => handleInviteRespond(inv.invite_id, true)}
                            >
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.inviteBtn, { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder }]}
                              onPress={() => handleInviteRespond(inv.invite_id, false)}
                            >
                              <Ionicons name="close" size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* ── Empty ── */}
              {pendingInvites.length === 0 && (
                <View style={styles.emptyWrap}>
                  <Ionicons name="notifications-outline" size={44} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>All Caught Up</Text>
                  <Text style={[styles.emptySub, { color: colors.textMuted }]}>No pending invites</Text>
                </View>
              )}

              {/* ── Push Settings ── */}
              <Text style={[styles.sectionLabel, { color: colors.moonstone, marginTop: 24 }]}>PUSH NOTIFICATIONS</Text>

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

            </Animated.View>
          )}
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
  loadingWrap: { paddingVertical: 60, alignItems: "center" },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    marginTop: 8, marginBottom: 10, textTransform: "uppercase",
  },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },

  // Invites
  inviteCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 16, borderWidth: 1.5, padding: 14, marginBottom: 10,
  },
  inviteIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  inviteBody: { flex: 1 },
  inviteName: { fontSize: 15, fontWeight: "600" },
  inviteFrom: { fontSize: 12, marginTop: 2 },
  inviteDesc: { fontSize: 12, marginTop: 2 },
  inviteBtns: { flexDirection: "row", gap: 8 },
  inviteBtn: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  // Notifications
  notifRow: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  notifIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 2 },
  notifBody: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: "600" },
  notifMsg: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  notifTime: { fontSize: 11, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.orange, marginTop: 6 },

  // Empty
  emptyWrap: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13 },

  // Toggle rows
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 16 },
  toggleIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  toggleBody: { flex: 1 },
  toggleTitle: { fontSize: 15, fontWeight: "500" },
  toggleDesc: { fontSize: 12, marginTop: 2 },
});

export default NotificationsScreen;
