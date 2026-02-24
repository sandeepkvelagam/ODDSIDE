import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Invite = {
  invite_id: string;
  group_id: string;
  group_name?: string;
  inviter?: { name?: string; email?: string };
  status: string;
};

const LIQUID_COLORS = {
  jetDark: "#282B2B",
  jetSurface: "#323535",
  orange: "#EE6C29",
  trustBlue: "#3B82F6",
  moonstone: "#7AA6B3",
  liquidGlassBg: "rgba(255, 255, 255, 0.06)",
  liquidGlassBorder: "rgba(255, 255, 255, 0.12)",
  liquidInnerBg: "rgba(255, 255, 255, 0.03)",
  textPrimary: "#F5F5F5",
  textSecondary: "#B8B8B8",
  textMuted: "#7A7A7A",
  success: "#22C55E",
  danger: "#EF4444",
};

export function PendingRequestsScreen() {
  const { isDark, colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const lc = isDark ? LIQUID_COLORS : {
    ...LIQUID_COLORS,
    jetDark: colors.background,
    jetSurface: colors.surface,
    liquidGlassBg: "rgba(0, 0, 0, 0.04)",
    liquidGlassBorder: "rgba(0, 0, 0, 0.10)",
    liquidInnerBg: "rgba(0, 0, 0, 0.03)",
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
  };

  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [responding, setResponding] = useState<Record<string, "accept" | "decline">>({});
  const [error, setError] = useState<string | null>(null);

  const fetchInvites = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/users/invites");
      setInvites(res.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => { fetchInvites(); }, [fetchInvites]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchInvites();
    setRefreshing(false);
  }, [fetchInvites]);

  const respond = useCallback(async (invite_id: string, action: "accept" | "decline") => {
    setResponding((prev) => ({ ...prev, [invite_id]: action }));
    try {
      await api.post(`/users/invites/${invite_id}/respond`, { action });
      setInvites((prev) => prev.filter((i) => i.invite_id !== invite_id));
    } catch (e: any) {
      // silently remove optimistic state on error
    } finally {
      setResponding((prev) => {
        const next = { ...prev };
        delete next[invite_id];
        return next;
      });
    }
  }, []);

  const renderInviteCard = ({ item }: { item: Invite }) => {
    const groupInitial = (item.group_name || "G")[0].toUpperCase();
    const inviterName = item.inviter?.name || item.inviter?.email || "Someone";
    const isPending = responding[item.invite_id];

    return (
      <View style={[styles.inviteCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
        <View style={[styles.cardInner, { backgroundColor: lc.liquidInnerBg }]}>
          {/* Group avatar + info */}
          <View style={styles.cardTop}>
            <View style={[styles.groupAvatar, { backgroundColor: "rgba(238,108,41,0.15)" }]}>
              <Text style={[styles.groupAvatarText, { color: lc.orange }]}>{groupInitial}</Text>
            </View>
            <View style={styles.groupInfo}>
              <Text style={[styles.groupName, { color: lc.textPrimary }]} numberOfLines={1}>
                {item.group_name || "Unknown Group"}
              </Text>
              <Text style={[styles.inviterText, { color: lc.textMuted }]}>
                Invited by {inviterName}
              </Text>
            </View>
            <View style={[styles.inviteBadge, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
              <Text style={[styles.inviteBadgeText, { color: lc.trustBlue }]}>Group Invite</Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: "rgba(239,68,68,0.4)" }]}
              onPress={() => respond(item.invite_id, "decline")}
              activeOpacity={0.8}
              disabled={!!isPending}
            >
              {isPending === "decline" ? (
                <ActivityIndicator size="small" color={lc.danger} />
              ) : (
                <>
                  <Ionicons name="close" size={14} color={lc.danger} />
                  <Text style={[styles.declineBtnText, { color: lc.danger }]}>Decline</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: lc.trustBlue }, !!isPending && styles.btnDisabled]}
              onPress={() => respond(item.invite_id, "accept")}
              activeOpacity={0.8}
              disabled={!!isPending}
            >
              {isPending === "accept" ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={14} color="#fff" />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: lc.jetDark, paddingTop: insets.top }]}>
      {/* Page Header */}
      <View style={[styles.pageHeader, { borderBottomColor: lc.liquidGlassBorder }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={lc.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: lc.textPrimary }]}>Pending Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {error && (
        <View style={[styles.errorBanner, { borderColor: "rgba(239,68,68,0.3)" }]}>
          <Ionicons name="alert-circle" size={16} color={lc.danger} />
          <Text style={[styles.errorText, { color: lc.danger }]}>{error}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={lc.orange} />
          <Text style={[styles.loadingText, { color: lc.textMuted }]}>Loading requests...</Text>
        </View>
      ) : invites.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="mail-open-outline" size={56} color={lc.textMuted} />
          <Text style={[styles.emptyTitle, { color: lc.textSecondary }]}>No Pending Requests</Text>
          <Text style={[styles.emptySubtext, { color: lc.textMuted }]}>
            Group invites and requests will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={invites}
          keyExtractor={(i) => i.invite_id}
          renderItem={renderInviteCard}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={lc.orange} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 14,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 16,
    gap: 10,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1 },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  loadingText: { fontSize: 14, marginTop: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginTop: 8 },
  emptySubtext: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  list: { padding: 16, gap: 12 },
  inviteCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 3,
  },
  cardInner: {
    borderRadius: 17,
    padding: 16,
    gap: 16,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  groupAvatarText: { fontSize: 18, fontWeight: "700" },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: "600" },
  inviterText: { fontSize: 12, marginTop: 2 },
  inviteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  inviteBadgeText: { fontSize: 10, fontWeight: "600" },
  cardActions: {
    flexDirection: "row",
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  declineBtnText: { fontSize: 14, fontWeight: "600" },
  acceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  acceptBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
  btnDisabled: { opacity: 0.5 },
});
