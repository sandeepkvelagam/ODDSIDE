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
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

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

export function RequestAndPayScreen() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const lc = isDark
    ? LIQUID_COLORS
    : {
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

  const [balances, setBalances] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"owed" | "owes">("owed");
  const [requestingPayment, setRequestingPayment] = useState<string | null>(null);
  const [payingStripe, setPayingStripe] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/ledger/balances");
      setBalances(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load balances");
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

  // Creditor sends payment nudge to debtor
  const handleRequestPayment = async (ledgerId: string) => {
    setRequestingPayment(ledgerId);
    try {
      await api.post(`/ledger/${ledgerId}/request-payment`);
      Alert.alert("Sent", "Payment request sent!");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to send request");
    } finally {
      setRequestingPayment(null);
    }
  };

  // Debtor pays via Stripe
  const handlePayWithStripe = async (ledgerId: string) => {
    setPayingStripe(ledgerId);
    try {
      const originUrl = Constants.expoConfig?.extra?.apiUrl || "https://kvitt.app";
      const res = await api.post(`/settlements/${ledgerId}/pay`, {
        origin_url: originUrl,
      });
      if (res.data?.url) {
        const canOpen = await Linking.canOpenURL(res.data.url);
        if (canOpen) {
          await Linking.openURL(res.data.url);
        } else {
          Alert.alert("Error", "Unable to open payment page.");
        }
      } else {
        Alert.alert("Error", "Failed to create payment link.");
      }
    } catch (e: any) {
      Alert.alert(
        "Payment Error",
        e?.response?.data?.detail || e?.message || "Failed to initiate payment"
      );
    } finally {
      setPayingStripe(null);
    }
  };

  // Toggle paid status
  const handleMarkPaid = async (ledgerId: string, currentPaid: boolean) => {
    setMarkingPaid(ledgerId);
    try {
      await api.patch(`/ledger/${ledgerId}`, { paid: !currentPaid });
      await fetchBalances();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to update");
    } finally {
      setMarkingPaid(null);
    }
  };

  const owedToYou = balances?.owed || [];
  const youOwe = balances?.owes || [];
  const totalOwed = owedToYou.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const totalOwes = youOwe.reduce((s: number, e: any) => s + (e.amount || 0), 0);
  const netBalance = totalOwed - totalOwes;

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
        <View style={{ width: 40 }} />
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
              activeList.map((entry: any, idx: number) => {
                const isPaid = entry.paid === true || entry.status === "paid";
                const otherUser =
                  activeTab === "owed" ? entry.from_user : entry.to_user;
                const otherName =
                  otherUser?.name ||
                  otherUser?.email ||
                  entry.from_name ||
                  entry.to_name ||
                  "Player";
                const initial = (otherName || "?")[0].toUpperCase();

                return (
                  <View key={entry.ledger_id || idx}>
                    <View style={styles.entryRow}>
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
                          {entry.game_name || entry.group_name || "Game"}
                          {isPaid && " · Settled"}
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
                        ${(entry.amount || 0).toFixed(2)}
                      </Text>
                    </View>

                    {/* Actions */}
                    {!isPaid && (
                      <View style={styles.entryActions}>
                        {activeTab === "owed" ? (
                          <>
                            {/* Creditor: Request Payment */}
                            <TouchableOpacity
                              style={[
                                styles.actionButton,
                                {
                                  backgroundColor: lc.orange,
                                },
                              ]}
                              onPress={() =>
                                handleRequestPayment(entry.ledger_id)
                              }
                              disabled={requestingPayment === entry.ledger_id}
                            >
                              {requestingPayment === entry.ledger_id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Ionicons
                                    name="notifications-outline"
                                    size={14}
                                    color="#fff"
                                  />
                                  <Text style={styles.actionButtonText}>
                                    Request
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                            {/* Creditor: Mark Paid */}
                            <TouchableOpacity
                              style={[
                                styles.actionButton,
                                {
                                  backgroundColor: lc.liquidGlassBg,
                                  borderWidth: 1,
                                  borderColor: lc.liquidGlassBorder,
                                },
                              ]}
                              onPress={() =>
                                handleMarkPaid(entry.ledger_id, false)
                              }
                              disabled={markingPaid === entry.ledger_id}
                            >
                              {markingPaid === entry.ledger_id ? (
                                <ActivityIndicator
                                  size="small"
                                  color={lc.textMuted}
                                />
                              ) : (
                                <>
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={14}
                                    color={lc.textMuted}
                                  />
                                  <Text
                                    style={[
                                      styles.actionButtonText,
                                      { color: lc.textMuted },
                                    ]}
                                  >
                                    Mark Paid
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </>
                        ) : (
                          <>
                            {/* Debtor: Pay with Stripe */}
                            <TouchableOpacity
                              style={[
                                styles.actionButton,
                                { backgroundColor: "#635bff" },
                              ]}
                              onPress={() =>
                                handlePayWithStripe(entry.ledger_id)
                              }
                              disabled={payingStripe === entry.ledger_id}
                            >
                              {payingStripe === entry.ledger_id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <>
                                  <Ionicons
                                    name="card-outline"
                                    size={14}
                                    color="#fff"
                                  />
                                  <Text style={styles.actionButtonText}>
                                    Pay
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                            {/* Debtor: Mark Paid */}
                            <TouchableOpacity
                              style={[
                                styles.actionButton,
                                {
                                  backgroundColor: lc.liquidGlassBg,
                                  borderWidth: 1,
                                  borderColor: lc.liquidGlassBorder,
                                },
                              ]}
                              onPress={() =>
                                handleMarkPaid(entry.ledger_id, false)
                              }
                              disabled={markingPaid === entry.ledger_id}
                            >
                              {markingPaid === entry.ledger_id ? (
                                <ActivityIndicator
                                  size="small"
                                  color={lc.textMuted}
                                />
                              ) : (
                                <>
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={14}
                                    color={lc.textMuted}
                                  />
                                  <Text
                                    style={[
                                      styles.actionButtonText,
                                      { color: lc.textMuted },
                                    ]}
                                  >
                                    Mark Paid
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </>
                        )}
                      </View>
                    )}

                    {/* Paid badge */}
                    {isPaid && (
                      <View style={styles.paidBadgeRow}>
                        <View
                          style={[
                            styles.paidBadge,
                            {
                              backgroundColor: "rgba(34,197,94,0.15)",
                              borderColor: "rgba(34,197,94,0.3)",
                            },
                          ]}
                        >
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color={lc.success}
                          />
                          <Text style={{ color: lc.success, fontSize: 12, fontWeight: "600" }}>
                            Settled
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleMarkPaid(entry.ledger_id, true)}
                          disabled={markingPaid === entry.ledger_id}
                        >
                          <Text
                            style={{
                              color: lc.textMuted,
                              fontSize: 11,
                              textDecorationLine: "underline",
                            }}
                          >
                            Undo
                          </Text>
                        </TouchableOpacity>
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
    paddingBottom: 8,
    paddingLeft: 52,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    minWidth: 90,
  },
  actionButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  paidBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 8,
    paddingLeft: 52,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
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
