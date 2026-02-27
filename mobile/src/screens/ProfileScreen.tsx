import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollView, Text, View, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Animated, Linking,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { GlassInput, GlassButton, PageHeader } from "../components/ui";
import { BottomSheetScreen } from "../components/BottomSheetScreen";
import Constants from "expo-constants";

type Balance = {
  user: { user_id: string; name: string; picture?: string };
  net_amount: number;
  direction: "owed_to_you" | "you_owe";
  display_amount: number;
  game_count?: number;
  game_breakdown?: Array<{
    game_id: string;
    game_title: string;
    game_date?: string;
    amount: number;
    direction: string;
    ledger_ids: string[];
  }>;
  offset_explanation?: {
    offset_amount: number;
    gross_you_owe: number;
    gross_they_owe: number;
  } | null;
  all_ledger_ids?: string[];
};

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();

  const [fullName, setFullName] = useState(user?.name || "");
  const [nickname, setNickname] = useState(user?.nickname || user?.name?.split(" ")[0] || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [balances, setBalances] = useState<{
    consolidated: Balance[];
    total_you_owe: number;
    total_owed_to_you: number;
    net_balance: number;
    people_count?: number;
  } | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [payingUserId, setPayingUserId] = useState<string | null>(null);
  const [requestingUserId, setRequestingUserId] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring.bouncy }),
    ]).start();
    fetchBalances();
  }, []);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await api.get("/ledger/consolidated-detailed");
      setBalances(res.data);
    } catch {}
    finally { setBalancesLoading(false); }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBalances();
    setRefreshing(false);
  }, [fetchBalances]);

  const handleUpdate = async () => {
    if (!fullName.trim()) return;
    setIsUpdating(true);
    try {
      await api.put("/users/me", { name: fullName.trim(), nickname: nickname.trim() });
      await refreshUser?.();
      Alert.alert("All set", "Profile updated.");
    } catch (e: any) {
      Alert.alert("Update unavailable", e?.response?.data?.detail || "Please try again.");
    } finally { setIsUpdating(false); }
  };

  const handlePayNet = async (person: Balance) => {
    setPayingUserId(person.user.user_id);
    try {
      const allLedgerIds = person.all_ledger_ids ||
        person.game_breakdown?.flatMap(g => g.ledger_ids) || [];
      const originUrl = Constants.expoConfig?.extra?.apiUrl || "https://kvitt.app";
      const res = await api.post("/ledger/pay-net/prepare", {
        other_user_id: person.user.user_id,
        ledger_ids: allLedgerIds,
        origin_url: originUrl,
      });
      if (res.data?.checkout_url) {
        await Linking.openURL(res.data.checkout_url);
      } else {
        Alert.alert("Payment link unavailable", "Please try again.");
      }
    } catch (e: any) {
      Alert.alert("Payment unavailable", e?.response?.data?.detail || "Please try again.");
    } finally {
      setPayingUserId(null);
    }
  };

  const handleRequestPayment = async (person: Balance) => {
    setRequestingUserId(person.user.user_id);
    try {
      const firstLedgerId = person.game_breakdown?.[0]?.ledger_ids?.[0] ||
        person.all_ledger_ids?.[0];
      if (!firstLedgerId) {
        Alert.alert("No entry available", "No pending ledger entry to request.");
        return;
      }
      await api.post(`/ledger/${firstLedgerId}/request-payment`);
      Alert.alert("All set", "Payment request sent.");
    } catch (e: any) {
      Alert.alert("Request unavailable", e?.response?.data?.detail || "Please try again.");
    } finally {
      setRequestingUserId(null);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Account", "This action cannot be undone. All your data will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await api.delete("/users/me"); }
          catch (e: any) { Alert.alert("Not available right now", e?.response?.data?.detail || "Please try again."); }
        },
      },
    ]);
  };

  const changed = fullName !== (user?.name || "") || nickname !== (user?.nickname || user?.name?.split(" ")[0] || "");
  const netBal = balances?.net_balance ?? 0;

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <PageHeader
            title="Profile"
            onClose={() => navigation.goBack()}
          />
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Profile Details ── */}
            <Text style={[styles.sectionLabel, { color: colors.moonstone, marginTop: 0 }]}>PROFILE DETAILS</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <GlassInput
                label="Full Name"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
                containerStyle={{ marginBottom: 12 }}
              />
              <GlassInput
                label="Nickname"
                placeholder="Enter your nickname"
                value={nickname}
                onChangeText={setNickname}
                containerStyle={{ marginBottom: 16 }}
              />
              <GlassButton
                variant={changed ? "primary" : "ghost"}
                size="large"
                fullWidth
                onPress={handleUpdate}
                loading={isUpdating}
                disabled={!changed}
              >
                Save Changes
              </GlassButton>
            </View>

            {/* ── Net Balance Hero ── */}
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.heroLabel, { color: colors.textMuted }]}>NET BALANCE</Text>
              <Text style={[styles.heroValue, { color: netBal >= 0 ? COLORS.status.success : COLORS.status.danger }]}>
                {balancesLoading ? "..." : `${netBal >= 0 ? "+" : ""}$${Math.abs(netBal).toFixed(2)}`}
              </Text>
              <View style={styles.heroRow}>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>You Owe (Net)</Text>
                  <Text style={[styles.heroStatValue, { color: COLORS.status.danger }]}>
                    ${(balances?.total_you_owe ?? 0).toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>Owed to You (Net)</Text>
                  <Text style={[styles.heroStatValue, { color: COLORS.status.success }]}>
                    ${(balances?.total_owed_to_you ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Smart Balances ── */}
            {!balancesLoading && (balances?.consolidated?.length ?? 0) > 0 && (
              <>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 24, marginBottom: 10 }}>
                  <Ionicons name="flash" size={14} color={COLORS.orange} />
                  <Text style={[styles.sectionLabel, { color: colors.moonstone, marginTop: 0, marginBottom: 0 }]}>SMART BALANCES</Text>
                  {(balances?.people_count ?? 0) > 0 && (
                    <View style={{ backgroundColor: "rgba(238,108,41,0.15)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: "600", color: COLORS.orange }}>
                        {balances!.people_count} {balances!.people_count === 1 ? "person" : "people"}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {balances!.consolidated.map((item, i) => {
                    const isExpanded = expandedUser === item.user?.user_id;
                    return (
                      <View key={item.user?.user_id || i}>
                        {/* Collapsed row — tap to expand */}
                        <TouchableOpacity
                          style={[styles.row, i < balances!.consolidated.length - 1 && !isExpanded && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                          onPress={() => setExpandedUser(isExpanded ? null : item.user?.user_id)}
                          activeOpacity={0.7}
                        >
                          <View style={[styles.avatar, { backgroundColor: item.direction === "you_owe" ? COLORS.glass.glowRed : COLORS.glass.glowGreen }]}>
                            <Text style={[styles.avatarText, { color: colors.textPrimary }]}>
                              {item.user?.name?.[0]?.toUpperCase() || "?"}
                            </Text>
                          </View>
                          <View style={styles.rowInfo}>
                            <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>
                              {item.direction === "you_owe" ? `You owe ${item.user?.name}` : `${item.user?.name} owes you`}
                            </Text>
                            <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                              {item.game_count || 1} game{(item.game_count || 1) > 1 ? "s" : ""}
                              {item.offset_explanation ? " \u00b7 auto-netted" : ""}
                            </Text>
                          </View>
                          <Text style={[styles.rowAmount, { color: item.direction === "you_owe" ? COLORS.status.danger : COLORS.status.success }]}>
                            ${item.display_amount.toFixed(2)}
                          </Text>
                          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                        </TouchableOpacity>

                        {/* Expanded content */}
                        {isExpanded && (
                          <View style={{
                            backgroundColor: item.direction === "you_owe" ? "rgba(239,68,68,0.04)" : "rgba(34,197,94,0.04)",
                            paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4,
                            borderBottomWidth: i < balances!.consolidated.length - 1 ? 1 : 0,
                            borderBottomColor: colors.border,
                          }}>
                            {/* Offset explanation */}
                            {item.offset_explanation && (
                              <View style={{ backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.25)", borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10 }}>
                                <Text style={{ color: "#f59e0b", fontWeight: "600", fontSize: 12 }}>Auto-netted across {item.game_count} games</Text>
                                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
                                  You owed ${item.offset_explanation.gross_you_owe.toFixed(2)} \u00b7 They owed ${item.offset_explanation.gross_they_owe.toFixed(2)} \u00b7 Offset ${item.offset_explanation.offset_amount.toFixed(2)}
                                </Text>
                              </View>
                            )}

                            {/* Game-by-game rows */}
                            {item.game_breakdown?.map((game, gi) => (
                              <View key={game.game_id || gi} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 8, paddingHorizontal: 4 }}>
                                <View style={{ flex: 1, marginRight: 12 }}>
                                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "500" }}>{game.game_title}</Text>
                                  <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                                    {game.game_date ? new Date(game.game_date).toLocaleDateString() : "Recent"}
                                  </Text>
                                </View>
                                <Text style={{ fontVariant: ["tabular-nums"], fontWeight: "700", fontSize: 13, color: game.direction === "you_owe" ? COLORS.status.danger : COLORS.status.success }}>
                                  {game.direction === "you_owe" ? "-" : "+"}${game.amount.toFixed(2)}
                                </Text>
                              </View>
                            ))}

                            {/* Action buttons */}
                            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                              {item.direction === "you_owe" ? (
                                <TouchableOpacity
                                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, flex: 1, backgroundColor: "#635bff", paddingVertical: 10, borderRadius: 10 }}
                                  onPress={() => handlePayNet(item)}
                                  disabled={payingUserId === item.user?.user_id}
                                  activeOpacity={0.7}
                                >
                                  {payingUserId === item.user?.user_id
                                    ? <ActivityIndicator size="small" color="#fff" />
                                    : <><Ionicons name="card-outline" size={14} color="#fff" /><Text style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}>Pay Net ${item.display_amount.toFixed(0)}</Text></>
                                  }
                                </TouchableOpacity>
                              ) : (
                                <TouchableOpacity
                                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, flex: 1, borderWidth: 1, borderColor: colors.border, paddingVertical: 10, borderRadius: 10 }}
                                  onPress={() => handleRequestPayment(item)}
                                  disabled={requestingUserId === item.user?.user_id}
                                  activeOpacity={0.7}
                                >
                                  {requestingUserId === item.user?.user_id
                                    ? <ActivityIndicator size="small" color={COLORS.orange} />
                                    : <><Ionicons name="notifications-outline" size={14} color={COLORS.orange} /><Text style={{ color: COLORS.orange, fontWeight: "600", fontSize: 12 }}>Request ${item.display_amount.toFixed(0)}</Text></>
                                  }
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {!balancesLoading && (!balances || (balances.total_you_owe === 0 && balances.total_owed_to_you === 0)) && (
              <View style={[styles.emptyCard, { backgroundColor: COLORS.glass.glowGreen, borderColor: COLORS.status.success + "40" }]}>
                <Ionicons name="checkmark-circle" size={32} color={COLORS.status.success} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All settled up!</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>No pending balances</Text>
              </View>
            )}

            {/* ── Danger Zone ── */}
            <Text style={[styles.sectionLabel, { color: COLORS.status.danger + "CC" }]}>DANGER ZONE</Text>
            <View style={[styles.card, { backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }]}>
              <TouchableOpacity style={styles.dangerRow} onPress={handleDelete} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={20} color={COLORS.status.danger} />
                <View style={styles.dangerText}>
                  <Text style={styles.dangerTitle}>Delete Account</Text>
                  <Text style={[styles.dangerSub, { color: colors.textMuted }]}>Permanently delete all data. Cannot be undone.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.status.danger} />
              </TouchableOpacity>
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

  heroCard: {
    borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24, alignItems: "center",
  },
  heroLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 6 },
  heroValue: { fontSize: 44, fontWeight: "700", letterSpacing: -1, marginBottom: 16 },
  heroRow: { flexDirection: "row", width: "100%", alignItems: "center" },
  heroStat: { flex: 1, alignItems: "center", gap: 4 },
  heroStatLabel: { fontSize: 12 },
  heroStatValue: { fontSize: 18, fontWeight: "700" },
  heroDivider: { width: 1, height: 36, marginHorizontal: 16 },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    marginTop: 24, marginBottom: 10, textTransform: "uppercase",
  },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden", padding: 16, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "600" },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "500" },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 17, fontWeight: "700" },

  emptyCard: {
    borderRadius: 20, borderWidth: 1, padding: 24,
    alignItems: "center", gap: 8, marginBottom: 4, marginTop: 24,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13 },

  dangerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  dangerText: { flex: 1 },
  dangerTitle: { color: COLORS.status.danger, fontSize: 15, fontWeight: "600" },
  dangerSub: { fontSize: 12, marginTop: 2 },
});

export default ProfileScreen;
