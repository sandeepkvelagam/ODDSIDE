import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  Alert,
  Linking,
  Platform,
  ScrollView,
  Animated,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { BottomSheetScreen } from "../components/BottomSheetScreen";
import { api } from "../api/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Invite = {
  invite_id: string;
  group_id: string;
  group?: { name: string; description?: string };
  inviter?: { name: string; picture?: string };
  created_at: string;
};

type AppNotification = {
  notification_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  data?: any;
};

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingToInvite, setRespondingToInvite] = useState<string | null>(null);

  // Push settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [gameUpdates, setGameUpdates] = useState(true);
  const [settlements, setSettlements] = useState(true);
  const [groupInvites, setGroupInvites] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring.bouncy }),
    ]).start();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [notifRes, inviteRes] = await Promise.all([
        api.get("/notifications").catch(() => ({ data: [] })),
        api.get("/users/invites").catch(() => ({ data: [] })),
      ]);
      const notifs = Array.isArray(notifRes.data) ? notifRes.data : [];
      setNotifications(notifs);
      const invites = Array.isArray(inviteRes.data) ? inviteRes.data : [];
      setPendingInvites(invites);
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleRespondToInvite = async (inviteId: string, accept: boolean) => {
    setRespondingToInvite(inviteId);
    try {
      const res = await api.post(`/users/invites/${inviteId}/respond`, { accept });
      if (accept && res.data?.group_id) {
        const invite = pendingInvites.find(i => i.invite_id === inviteId);
        Alert.alert(
          "Joined!",
          `Welcome to ${invite?.group?.name || "the group"}!`,
          [{
            text: "View Group",
            onPress: () => {
              navigation.goBack();
              navigation.navigate("GroupHub", {
                groupId: res.data.group_id,
                groupName: invite?.group?.name,
              });
            }
          }, { text: "OK" }]
        );
      }
      // Remove from list
      setPendingInvites(prev => prev.filter(i => i.invite_id !== inviteId));
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to respond to invite");
    } finally {
      setRespondingToInvite(null);
    }
  };

  const handleMarkRead = async (notifId: string) => {
    try {
      await api.put(`/notifications/${notifId}/read`).catch(() => {});
      setNotifications(prev => prev.map(n => n.notification_id === notifId ? { ...n, read: true } : n));
    } catch {}
  };

  const handleToggleNotifications = (value: boolean) => {
    if (value) {
      Alert.alert("Enable Notifications", "To receive notifications, enable them in Settings.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => Platform.OS === "ios" ? Linking.openURL("app-settings:") : Linking.openSettings(),
        },
      ]);
    }
    setNotificationsEnabled(value);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const hours = diff / (1000 * 60 * 60);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${Math.floor(hours)}h ago`;
    if (hours < 48) return "Yesterday";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case "game_started": return { icon: "play-circle", color: COLORS.status.success };
      case "game_ended": return { icon: "stop-circle", color: COLORS.text.muted };
      case "buy_in": return { icon: "add-circle", color: COLORS.trustBlue };
      case "cash_out": return { icon: "remove-circle", color: COLORS.orange };
      case "settlement_generated": return { icon: "calculator", color: COLORS.status.warning };
      case "invite_accepted": return { icon: "person-add", color: COLORS.status.success };
      case "admin_transferred": return { icon: "shield", color: "#EAB308" };
      case "game_invite":
      case "invite_sent": return { icon: "mail", color: COLORS.orange };
      default: return { icon: "notifications", color: COLORS.moonstone };
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const totalBadge = pendingInvites.length + unreadCount;

  return (
    <BottomSheetScreen>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color={COLORS.text.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {totalBadge > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{totalBadge}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 44 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />}
        >
          {loadingNotifs ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.orange} />
            </View>
          ) : (
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              {/* Pending Group Invites */}
              {pendingInvites.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>PENDING INVITES ({pendingInvites.length})</Text>
                  {pendingInvites.map((invite) => (
                    <View key={invite.invite_id} style={styles.inviteCard}>
                      <View style={styles.inviteIconWrap}>
                        <Ionicons name="people" size={22} color={COLORS.orange} />
                      </View>
                      <View style={styles.inviteInfo}>
                        <Text style={styles.inviteGroupName}>{invite.group?.name || "Unknown Group"}</Text>
                        <Text style={styles.inviteFrom}>
                          Invited by {invite.inviter?.name || "someone"}
                        </Text>
                        {invite.group?.description ? (
                          <Text style={styles.inviteDesc} numberOfLines={1}>
                            {invite.group.description}
                          </Text>
                        ) : null}
                        <Text style={styles.inviteDate}>{formatDate(invite.created_at)}</Text>
                      </View>
                      <View style={styles.inviteActions}>
                        {respondingToInvite === invite.invite_id ? (
                          <ActivityIndicator size="small" color={COLORS.orange} />
                        ) : (
                          <>
                            <TouchableOpacity
                              style={[styles.inviteBtn, { backgroundColor: COLORS.orange }]}
                              onPress={() => handleRespondToInvite(invite.invite_id, true)}
                            >
                              <Ionicons name="checkmark" size={16} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.inviteBtn, { backgroundColor: COLORS.glass.bg, borderWidth: 1, borderColor: COLORS.glass.border }]}
                              onPress={() => handleRespondToInvite(invite.invite_id, false)}
                            >
                              <Ionicons name="close" size={16} color={COLORS.text.muted} />
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              )}

              {/* Activity Feed */}
              {notifications.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, pendingInvites.length > 0 && { marginTop: SPACING.xl }]}>
                    ACTIVITY
                  </Text>
                  <View style={styles.notifList}>
                    {notifications.slice(0, 20).map((notif, idx) => {
                      const { icon, color } = getNotifIcon(notif.type);
                      return (
                        <TouchableOpacity
                          key={notif.notification_id || idx}
                          style={[
                            styles.notifItem,
                            idx < notifications.length - 1 && styles.notifItemBorder,
                            !notif.read && styles.notifItemUnread,
                          ]}
                          onPress={() => handleMarkRead(notif.notification_id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.notifIcon, { backgroundColor: color + "20" }]}>
                            <Ionicons name={icon as any} size={18} color={color} />
                          </View>
                          <View style={styles.notifContent}>
                            <Text style={styles.notifTitle} numberOfLines={1}>{notif.title}</Text>
                            <Text style={styles.notifMessage} numberOfLines={2}>{notif.message}</Text>
                            <Text style={styles.notifDate}>{formatDate(notif.created_at)}</Text>
                          </View>
                          {!notif.read && <View style={styles.unreadDot} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Empty state */}
              {pendingInvites.length === 0 && notifications.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-outline" size={48} color={COLORS.text.muted} />
                  <Text style={styles.emptyTitle}>All Caught Up</Text>
                  <Text style={styles.emptySubtext}>No pending invites or activity</Text>
                </View>
              )}

              {/* Push Notification Settings */}
              <Text style={[styles.sectionTitle, { marginTop: SPACING.xxl }]}>PUSH NOTIFICATIONS</Text>

              {/* Main Toggle */}
              <View style={styles.toggleCard}>
                <View style={styles.toggleRow}>
                  <View style={[styles.iconContainer, { backgroundColor: COLORS.glass.glowOrange }]}>
                    <Ionicons name="notifications" size={22} color={COLORS.orange} />
                  </View>
                  <View style={styles.toggleText}>
                    <Text style={styles.toggleTitle}>Push Notifications</Text>
                    <Text style={styles.toggleDesc}>Receive alerts about your poker games</Text>
                  </View>
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={handleToggleNotifications}
                    trackColor={{ false: COLORS.glass.bg, true: COLORS.orange }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              {/* Notification Types */}
              {notificationsEnabled && (
                <View style={styles.toggleList}>
                  {[
                    { icon: "game-controller", color: COLORS.trustBlue, title: "Game Updates", desc: "Buy-ins, cash-outs, game status", value: gameUpdates, setter: setGameUpdates },
                    { icon: "wallet", color: COLORS.status.success, title: "Settlements", desc: "Payment requests and confirmations", value: settlements, setter: setSettlements },
                    { icon: "people", color: "#A855F7", title: "Group Invites", desc: "Invitations to join groups", value: groupInvites, setter: setGroupInvites },
                  ].map((item, idx, arr) => (
                    <View
                      key={item.title}
                      style={[styles.toggleRow, styles.toggleRowInner, idx < arr.length - 1 && styles.borderBottom]}
                    >
                      <View style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}>
                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <View style={styles.toggleText}>
                        <Text style={styles.toggleTitle}>{item.title}</Text>
                        <Text style={styles.toggleDesc}>{item.desc}</Text>
                      </View>
                      <Switch
                        value={item.value}
                        onValueChange={item.setter}
                        trackColor={{ false: COLORS.glass.bg, true: COLORS.orange }}
                        thumbColor="#fff"
                      />
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
          )}

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
  headerBadge: {
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  headerBadgeText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.container },
  loadingContainer: { paddingVertical: 60, alignItems: "center" },

  sectionTitle: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    letterSpacing: 1,
    marginBottom: SPACING.md,
  },

  // Invite cards
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1.5,
    borderColor: COLORS.orange + "40",
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  inviteIconWrap: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass.glowOrange,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteInfo: { flex: 1 },
  inviteGroupName: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  inviteFrom: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: 2,
  },
  inviteDesc: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.micro,
    marginTop: 2,
  },
  inviteDate: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.micro,
    marginTop: 4,
  },
  inviteActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  inviteBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },

  // Notification list
  notifList: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
  },
  notifItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  notifItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  notifItemUnread: {
    backgroundColor: COLORS.glass.inner,
  },
  notifIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: { flex: 1 },
  notifTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  notifMessage: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: 2,
    lineHeight: 18,
  },
  notifDate: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.micro,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.orange,
    marginTop: 4,
  },

  // Empty
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xxxl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  emptySubtext: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
  },

  // Push settings
  toggleCard: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  toggleList: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xl,
    overflow: "hidden",
    marginBottom: SPACING.md,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  toggleRowInner: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: { flex: 1 },
  toggleTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.medium,
    marginBottom: 2,
  },
  toggleDesc: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
  },
});

export default NotificationsScreen;
