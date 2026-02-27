import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { getThemedColors } from "../styles/liquidGlass";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type ConsolidatedPerson = {
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

export function RequestAndPayScreen() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const lc = getThemedColors(isDark, colors);

  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"owed" | "owes">("owed");
  const [requestingPayment, setRequestingPayment] = useState<string | null>(null);
  const [payingUserId, setPayingUserId] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/ledger/consolidated-detailed");
      setBalances(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Balances unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBalances();
    setRefreshing(false);
  }, [fetchBalances]);

  // Request payment for a specific person (uses first ledger entry)
  const handleRequestPayment = async (person: ConsolidatedPerson) => {
    const firstLedgerId = person.game_breakdown?.[0]?.ledger_ids?.[0] ||
      person.all_ledger_ids?.[0];
    if (!firstLedgerId) {
      Alert.alert("No entry available", "No pending ledger entry to request.");
      return;
    }
    setRequestingPayment(person.user.user_id);
    try {
      await api.post(`/ledger/${firstLedgerId}/request-payment`);
      Alert.alert("All set", "Payment request sent.");
    } catch (e: any) {
      Alert.alert("Request unavailable", e?.response?.data?.detail || "Please try again.");
    } finally {
      setRequestingPayment(null);
    }
  };

  // Pay net via Stripe (cross-game consolidated payment)
  const handlePayNet = async (person: ConsolidatedPerson) => {
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

  const allEntries: ConsolidatedPerson[] = balances?.consolidated || [];
  const owedToYou = allEntries.filter(e => e.direction === "owed_to_you");
  const youOwe = allEntries.filter(e => e.direction === "you_owe");
  const totalOwed = balances?.total_owed_to_you || 0;
  const totalOwes = balances?.total_you_owe || 0;
  const netBalance = balances?.net_balance || 0;

  const activeList = activeTab === "owed" ? owedToYou : youOwe;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: lc.jetDark }]}>
        <ActivityIndicator size="large" color={lc.orange} />
        <Text style={[styles.loadingText, { color: lc.textMuted }]}>
          Loading balances...
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.wrapper,
        { backgroundColor: lc.jetDark, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View
        style={[styles.pageHeader, { borderBottomColor: lc.liquidGlassBorder }]}
      >
        <TouchableOpacity
          style={[
            styles.backButton,
            {
              backgroundColor: lc.liquidGlassBg,
              borderColor: lc.liquidGlassBorder,
            },
          ]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={lc.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: lc.textPrimary }]}>
          Request & Pay
        </Text>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
          onPress={() => navigation.navigate("Dashboard" as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={20} color={lc.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={lc.orange}
          />
        }
      >
        {error && (
          <View style={[styles.errorBanner, { borderColor: "rgba(239,68,68,0.3)" }]}>
            <Ionicons name="alert-circle" size={16} color={lc.danger} />
            <Text style={[styles.errorText, { color: lc.danger }]}>{error}</Text>
          </View>
        )}

        {/* Net Balance Summary */}
        <View
          style={[
            styles.liquidCard,
            {
              backgroundColor: lc.liquidGlassBg,
              borderColor: lc.liquidGlassBorder,
            },
          ]}
        >
          <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
            <Text style={[styles.cardSectionTitle, { color: lc.moonstone }]}>
              NET BALANCE
            </Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Ionicons name="arrow-up-outline" size={18} color={lc.danger} />
                <Text style={[styles.balanceLabel, { color: lc.textMuted }]}>
                  You Owe
                </Text>
                <Text style={[styles.balanceValue, { color: lc.danger }]}>
                  ${totalOwes.toFixed(2)}
                </Text>
              </View>
              <View
                style={[
                  styles.balanceDivider,
                  { backgroundColor: lc.liquidGlassBorder },
                ]}
              />
              <View style={styles.balanceItem}>
                <Ionicons name="arrow-down-outline" size={18} color={lc.success} />
                <Text style={[styles.balanceLabel, { color: lc.textMuted }]}>
                  Owed to You
                </Text>
                <Text style={[styles.balanceValue, { color: lc.success }]}>
                  ${totalOwed.toFixed(2)}
                </Text>
              </View>
            </View>
            <View
              style={[
                styles.netRow,
                {
                  backgroundColor:
                    netBalance >= 0
                      ? "rgba(34,197,94,0.1)"
                      : "rgba(239,68,68,0.1)",
                  borderColor:
                    netBalance >= 0
                      ? "rgba(34,197,94,0.25)"
                      : "rgba(239,68,68,0.25)",
                },
              ]}
            >
              <Text style={[styles.netLabel, { color: lc.textMuted }]}>NET</Text>
              <Text
                style={[
                  styles.netValue,
                  { color: netBalance >= 0 ? lc.success : lc.danger },
                ]}
              >
                {netBalance >= 0 ? "+" : ""}${netBalance.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View
          style={[
            styles.tabRow,
            {
              backgroundColor: lc.liquidGlassBg,
              borderColor: lc.liquidGlassBorder,
            },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "owed" && {
                backgroundColor: lc.success + "20",
                borderColor: lc.success + "40",
              },
            ]}
            onPress={() => setActiveTab("owed")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "owed" ? lc.success : lc.textMuted,
                },
              ]}
            >
              Owed to You ({owedToYou.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === "owes" && {
                backgroundColor: lc.danger + "20",
                borderColor: lc.danger + "40",
              },
            ]}
            onPress={() => setActiveTab("owes")}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === "owes" ? lc.danger : lc.textMuted,
                },
              ]}
            >
              You Owe ({youOwe.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Entries List */}
        <View
          style={[
            styles.liquidCard,
            {
              backgroundColor: lc.liquidGlassBg,
              borderColor:
                activeTab === "owed"
                  ? "rgba(34,197,94,0.25)"
                  : "rgba(239,68,68,0.25)",
            },
          ]}
        >
          <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
            {activeList.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name={
                    activeTab === "owed"
                      ? "checkmark-circle-outline"
                      : "wallet-outline"
                  }
                  size={48}
                  color={lc.textMuted}
                />
                <Text style={[styles.emptyTitle, { color: lc.textSecondary }]}>
                  {activeTab === "owed"
                    ? "No one owes you"
                    : "You don't owe anyone"}
                </Text>
                <Text style={[styles.emptySubtext, { color: lc.textMuted }]}>
                  {activeTab === "owed"
                    ? "Outstanding debts owed to you will appear here"
                    : "Your outstanding debts will appear here"}
                </Text>
              </View>
            ) : (
              activeList.map((person: ConsolidatedPerson, idx: number) => {
                const otherName = person.user?.name || "Player";
                const initial = (otherName || "?")[0].toUpperCase();
                const isExpanded = expandedUser === person.user?.user_id;

                return (
                  <View key={person.user?.user_id || idx}>
                    <TouchableOpacity
                      style={styles.entryRow}
                      onPress={() => setExpandedUser(isExpanded ? null : person.user?.user_id)}
                      activeOpacity={0.7}
                    >
                      {/* Avatar */}
                      <View
                        style={[
                          styles.entryAvatar,
                          {
                            backgroundColor:
                              activeTab === "owed"
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(59,130,246,0.15)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.entryAvatarText,
                            {
                              color:
                                activeTab === "owed"
                                  ? lc.danger
                                  : lc.trustBlue,
                            },
                          ]}
                        >
                          {initial}
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={styles.entryInfo}>
                        <Text
                          style={[styles.entryName, { color: lc.textPrimary }]}
                          numberOfLines={1}
                        >
                          {otherName}
                        </Text>
                        <Text
                          style={[styles.entryMeta, { color: lc.textMuted }]}
                          numberOfLines={1}
                        >
                          {person.game_count || 1} game{(person.game_count || 1) > 1 ? "s" : ""}
                          {person.offset_explanation ? " \u00b7 auto-netted" : ""}
                        </Text>
                      </View>

                      {/* Amount */}
                      <Text
                        style={[
                          styles.entryAmount,
                          {
                            color:
                              activeTab === "owed"
                                ? lc.success
                                : lc.danger,
                          },
                        ]}
                      >
                        ${person.display_amount.toFixed(2)}
                      </Text>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={lc.textMuted} />
                    </TouchableOpacity>

                    {/* Expanded: game breakdown + actions */}
                    {isExpanded && (
                      <View style={{ paddingLeft: 52, paddingBottom: 12 }}>
                        {/* Offset explanation */}
                        {person.offset_explanation && (
                          <View style={{ backgroundColor: "rgba(245,158,11,0.1)", borderColor: "rgba(245,158,11,0.25)", borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                            <Text style={{ color: "#f59e0b", fontWeight: "600", fontSize: 11 }}>Auto-netted across {person.game_count} games</Text>
                            <Text style={{ color: lc.textMuted, fontSize: 10, marginTop: 3 }}>
                              You owed ${person.offset_explanation.gross_you_owe.toFixed(2)} \u00b7 They owed ${person.offset_explanation.gross_they_owe.toFixed(2)} \u00b7 Offset ${person.offset_explanation.offset_amount.toFixed(2)}
                            </Text>
                          </View>
                        )}

                        {/* Game rows */}
                        {person.game_breakdown?.map((game, gi) => (
                          <View key={game.game_id || gi} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 6 }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text style={{ color: lc.textPrimary, fontSize: 12, fontWeight: "500" }}>{game.game_title}</Text>
                              <Text style={{ color: lc.textMuted, fontSize: 10 }}>
                                {game.game_date ? new Date(game.game_date).toLocaleDateString() : "Recent"}
                              </Text>
                            </View>
                            <Text style={{ fontVariant: ["tabular-nums"], fontWeight: "700", fontSize: 12, color: game.direction === "you_owe" ? lc.danger : lc.success }}>
                              {game.direction === "you_owe" ? "-" : "+"}${game.amount.toFixed(2)}
                            </Text>
                          </View>
                        ))}

                        {/* Action buttons */}
                        <View style={styles.entryActions}>
                          {activeTab === "owed" ? (
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: lc.orange }]}
                              onPress={() => handleRequestPayment(person)}
                              disabled={requestingPayment === person.user.user_id}
                              activeOpacity={0.7}
                            >
                              {requestingPayment === person.user.user_id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Ionicons name="notifications-outline" size={14} color="#fff" />
                                  <Text style={styles.actionButtonText}>Request ${person.display_amount.toFixed(0)}</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[styles.actionButton, { backgroundColor: "#635bff" }]}
                              onPress={() => handlePayNet(person)}
                              disabled={payingUserId === person.user.user_id}
                              activeOpacity={0.7}
                            >
                              {payingUserId === person.user.user_id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Ionicons name="card-outline" size={14} color="#fff" />
                                  <Text style={styles.actionButtonText}>Pay Net ${person.display_amount.toFixed(0)}</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}

                    {idx < activeList.length - 1 && (
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: lc.liquidGlassBorder },
                        ]}
                      />
                    )}
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Send Money via Wallet */}
        <TouchableOpacity
          style={[
            styles.sendMoneyButton,
            {
              backgroundColor: lc.liquidGlassBg,
              borderColor: lc.trustBlue + "40",
              borderWidth: 1.5,
            },
          ]}
          onPress={() => navigation.navigate("Wallet")}
          activeOpacity={0.8}
        >
          <Ionicons name="send-outline" size={18} color={lc.trustBlue} />
          <Text style={[styles.sendMoneyText, { color: lc.trustBlue }]}>
            Send Money via Wallet
          </Text>
          <Ionicons name="chevron-forward" size={14} color={lc.trustBlue} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
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
  container: { flex: 1 },
  content: { padding: 20, gap: 16 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: { fontSize: 15 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  errorText: { fontSize: 14, flex: 1 },
  liquidCard: {
    borderRadius: 24,
    padding: 4,
    borderWidth: 1.5,
    shadowColor: "rgba(255,255,255,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  liquidInner: { borderRadius: 20, padding: 16 },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  // Balance summary
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 12,
  },
  balanceItem: { alignItems: "center", gap: 4, flex: 1 },
  balanceDivider: { width: 1, height: 44 },
  balanceLabel: { fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 },
  balanceValue: { fontSize: 20, fontWeight: "700" },
  netRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  netLabel: { fontSize: 12, fontWeight: "600", letterSpacing: 1 },
  netValue: { fontSize: 20, fontWeight: "700" },
  // Tabs
  tabRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  tabText: { fontSize: 13, fontWeight: "600" },
  // Entries
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  entryAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  entryAvatarText: { fontSize: 16, fontWeight: "700" },
  entryInfo: { flex: 1, gap: 3 },
  entryName: { fontSize: 14, fontWeight: "600" },
  entryMeta: { fontSize: 12 },
  entryAmount: { fontSize: 17, fontWeight: "700" },
  entryActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    flex: 1,
  },
  actionButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  divider: { height: 1, marginLeft: 52 },
  emptyContainer: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySubtext: { fontSize: 13, textAlign: "center" },
  // Send money
  sendMoneyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 16,
  },
  sendMoneyText: { fontSize: 14, fontWeight: "600" },
});
