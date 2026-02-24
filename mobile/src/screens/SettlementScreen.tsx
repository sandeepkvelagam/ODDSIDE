import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";
import Constants from "expo-constants";
import { PostGameSurveyModal } from "../components/feedback/PostGameSurveyModal";

type R = RouteProp<RootStackParamList, "Settlement">;

// Liquid Glass Design System Colors
const LIQUID_COLORS = {
  jetDark: "#282B2B",
  jetSurface: "#323535",
  orange: "#EE6C29",
  orangeDark: "#C45A22",
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

export function SettlementScreen() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const route = useRoute<R>();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { gameId } = route.params;

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

  const [settlement, setSettlement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [payingStripe, setPayingStripe] = useState<string | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyChecked, setSurveyChecked] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get(`/games/${gameId}/settlement`);
      setSettlement(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load settlement");
    } finally {
      setLoading(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (!settlement || surveyChecked) return;
    setSurveyChecked(true);
    api.get(`/feedback/surveys/${gameId}`)
      .then((res) => {
        const surveys = res.data?.surveys || res.data || [];
        const already = surveys.some((s: any) => s.user_id === user?.user_id);
        if (!already) {
          const timer = setTimeout(() => setShowSurvey(true), 1500);
          return () => clearTimeout(timer);
        }
      })
      .catch(() => {});
  }, [settlement, gameId, user?.user_id, surveyChecked]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleMarkPaid = async (ledgerId: string, currentPaid: boolean) => {
    setMarkingPaid(ledgerId);
    try {
      await api.patch(`/ledger/${ledgerId}`, { paid: !currentPaid });
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to update payment");
    } finally {
      setMarkingPaid(null);
    }
  };

  const handlePayWithStripe = async (ledgerId: string) => {
    setPayingStripe(ledgerId);
    try {
      const originUrl = Constants.expoConfig?.extra?.apiUrl || "https://kvitt.app";
      const res = await api.post(`/settlements/${ledgerId}/pay`, { origin_url: originUrl });
      if (res.data?.url) {
        const canOpen = await Linking.canOpenURL(res.data.url);
        if (canOpen) {
          await Linking.openURL(res.data.url);
        } else {
          Alert.alert("Error", "Unable to open payment page. Please try again.");
        }
      } else {
        Alert.alert("Error", "Failed to create payment link. Please try again.");
      }
    } catch (e: any) {
      Alert.alert("Payment Error", e?.response?.data?.detail || e?.message || "Failed to initiate payment");
    } finally {
      setPayingStripe(null);
    }
  };

  const results = settlement?.results || [];
  const payments = settlement?.payments || [];
  const totalPot = results.reduce((sum: number, r: any) => sum + (r.total_buy_in || 0), 0);
  const totalOut = results.reduce((sum: number, r: any) => sum + (r.cash_out || 0), 0);
  const winnersCount = results.filter((r: any) => (r.net_result || 0) > 0).length;
  const losersCount = results.filter((r: any) => (r.net_result || 0) < 0).length;
  const hasDiscrepancy = Math.abs(totalPot - totalOut) > 0.01;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: lc.jetDark }]}>
        <ActivityIndicator size="large" color={lc.orange} />
        <Text style={[styles.loadingText, { color: lc.textMuted }]}>Loading settlement...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: lc.jetDark, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { borderBottomColor: lc.liquidGlassBorder }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={lc.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: lc.textPrimary }]}>Settlement</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={lc.orange} />
        }
      >
        {error && (
          <View style={[styles.errorBanner, { borderColor: "rgba(239,68,68,0.3)" }]}>
            <Ionicons name="alert-circle" size={16} color={lc.danger} />
            <Text style={[styles.errorText, { color: lc.danger }]}>{error}</Text>
          </View>
        )}

        {/* Game Summary Card */}
        <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
          <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
            <Text style={[styles.cardSectionTitle, { color: lc.moonstone }]}>GAME SUMMARY</Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Ionicons name="cash-outline" size={22} color={lc.orange} />
                <Text style={[styles.summaryValue, { color: lc.textPrimary }]}>${totalPot.toFixed(0)}</Text>
                <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>Total Pot</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: lc.liquidGlassBorder }]} />
              <View style={styles.summaryItem}>
                <Ionicons name="trending-up" size={22} color={lc.success} />
                <Text style={[styles.summaryValue, { color: lc.success }]}>{winnersCount}</Text>
                <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>Winners</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: lc.liquidGlassBorder }]} />
              <View style={styles.summaryItem}>
                <Ionicons name="trending-down" size={22} color={lc.danger} />
                <Text style={[styles.summaryValue, { color: lc.danger }]}>{losersCount}</Text>
                <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>Losers</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Discrepancy Warning */}
        {hasDiscrepancy && (
          <View style={[styles.discrepancyBanner, { backgroundColor: "rgba(234,179,8,0.12)", borderColor: "rgba(234,179,8,0.3)" }]}>
            <Ionicons name="warning-outline" size={18} color="#eab308" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#eab308", fontWeight: "600", fontSize: 13 }}>Chip Discrepancy Detected</Text>
              <Text style={{ color: lc.textMuted, fontSize: 12, marginTop: 2 }}>
                Buy-ins: ${totalPot.toFixed(2)} · Cash-outs: ${totalOut.toFixed(2)} · Diff: ${Math.abs(totalPot - totalOut).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Results Card */}
        <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="podium" size={16} color={lc.trustBlue} />
            <Text style={[styles.cardSectionTitle, { color: lc.moonstone }]}>RESULTS</Text>
          </View>
          <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
            {results.length === 0 ? (
              <Text style={[styles.emptyText, { color: lc.textMuted }]}>No results available</Text>
            ) : (
              results
                .sort((a: any, b: any) => (b.net_result || 0) - (a.net_result || 0))
                .map((result: any, idx: number) => {
                  const netResult = result.net_result || 0;
                  const isWinner = netResult > 0;
                  const isLoser = netResult < 0;
                  const isCurrentUser = result.user_id === user?.user_id;

                  return (
                    <View key={result.user_id || idx}>
                      <View style={styles.resultRow}>
                        <Text style={[styles.rankText, { color: lc.textMuted }]}>#{idx + 1}</Text>
                        <View style={[
                          styles.resultAvatar,
                          { backgroundColor: isCurrentUser ? "rgba(238,108,41,0.15)" : "rgba(59,130,246,0.15)" }
                        ]}>
                          <Text style={[styles.resultAvatarText, { color: isCurrentUser ? lc.orange : lc.trustBlue }]}>
                            {(result.name || result.email || "?")[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.resultInfo}>
                          <Text style={[styles.resultName, { color: lc.textPrimary }]}>
                            {result.name || result.email || "Player"}
                            {isCurrentUser && <Text style={{ color: lc.textMuted }}> (You)</Text>}
                          </Text>
                          <Text style={[styles.resultDetails, { color: lc.textMuted }]}>
                            ${result.total_buy_in || 0} in · ${result.cash_out || 0} out
                          </Text>
                        </View>
                        <View style={styles.resultNet}>
                          <Text style={[
                            styles.resultNetValue,
                            { color: isWinner ? lc.success : isLoser ? lc.danger : lc.textMuted }
                          ]}>
                            {netResult >= 0 ? "+" : ""}${netResult.toFixed(0)}
                          </Text>
                          {isWinner && <Ionicons name="arrow-up" size={14} color={lc.success} />}
                          {isLoser && <Ionicons name="arrow-down" size={14} color={lc.danger} />}
                        </View>
                      </View>
                      {idx < results.length - 1 && <View style={[styles.divider, { backgroundColor: lc.liquidGlassBorder }]} />}
                    </View>
                  );
                })
            )}
          </View>
        </View>

        {/* Payments Card */}
        <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: payments.length > 0 ? "rgba(59,130,246,0.25)" : lc.liquidGlassBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="lock-closed" size={16} color={lc.trustBlue} />
            <Text style={[styles.cardSectionTitle, { color: lc.moonstone }]}>PAYMENTS</Text>
          </View>
          <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
            {payments.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 20 }}>
                <Ionicons name="checkmark-circle" size={40} color={lc.success} />
                <Text style={[styles.emptyText, { color: lc.success, marginTop: 8 }]}>
                  No payments needed — everyone broke even!
                </Text>
              </View>
            ) : (
              payments.map((payment: any, idx: number) => {
                const isFromUser = payment.from_user_id === user?.user_id;
                const isToUser = payment.to_user_id === user?.user_id;
                const canMarkPaid = isFromUser || isToUser;
                const isPaid = payment.paid === true;

                return (
                  <View key={payment.ledger_id || idx}>
                    <View style={styles.paymentEntry}>
                      <View style={styles.paymentFlow}>
                        <View style={[styles.paymentAvatar, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                          <Text style={[styles.paymentAvatarText, { color: lc.danger }]}>
                            {(payment.from_name || "?")[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.paymentArrow}>
                          <View style={[styles.arrowLine, { backgroundColor: lc.liquidGlassBorder }]} />
                          <Ionicons name="arrow-forward" size={16} color={lc.textMuted} />
                          <View style={[styles.arrowLine, { backgroundColor: lc.liquidGlassBorder }]} />
                        </View>
                        <View style={[styles.paymentAvatar, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                          <Text style={[styles.paymentAvatarText, { color: lc.success }]}>
                            {(payment.to_name || "?")[0].toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.paymentDetails}>
                        <Text style={[styles.paymentNames, { color: lc.textPrimary }]}>
                          {payment.from_name || "Player"} → {payment.to_name || "Player"}
                        </Text>
                        <Text style={[styles.paymentAmount, { color: lc.orange }]}>${payment.amount?.toFixed(2)}</Text>
                        {isPaid && (
                          <Text style={{ color: lc.success, fontSize: 11, marginTop: 2 }}>✓ Settled</Text>
                        )}
                      </View>
                      <View style={styles.paymentActions}>
                        {isFromUser && !isPaid && (
                          <TouchableOpacity
                            style={[styles.stripeButton, { backgroundColor: "#635bff" }]}
                            onPress={() => handlePayWithStripe(payment.ledger_id)}
                            disabled={payingStripe === payment.ledger_id}
                          >
                            {payingStripe === payment.ledger_id ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Ionicons name="card-outline" size={14} color="#fff" />
                                <Text style={styles.stripeButtonText}>Pay</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                        {canMarkPaid && (
                          <TouchableOpacity
                            style={[
                              styles.markPaidButton,
                              isPaid
                                ? { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.3)" }
                                : { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder },
                            ]}
                            onPress={() => handleMarkPaid(payment.ledger_id, isPaid)}
                            disabled={markingPaid === payment.ledger_id}
                          >
                            {markingPaid === payment.ledger_id ? (
                              <ActivityIndicator size="small" color={lc.textMuted} />
                            ) : (
                              <>
                                <Ionicons
                                  name={isPaid ? "checkmark-circle" : "checkmark-circle-outline"}
                                  size={16}
                                  color={isPaid ? lc.success : lc.textMuted}
                                />
                                <Text style={[styles.markPaidText, { color: isPaid ? lc.success : lc.textMuted }]}>
                                  {isPaid ? "Paid" : "Mark Paid"}
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    {idx < payments.length - 1 && <View style={[styles.divider, { backgroundColor: lc.liquidGlassBorder }]} />}
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PostGameSurveyModal
        visible={showSurvey}
        onClose={() => setShowSurvey(false)}
        gameId={gameId}
        groupId={settlement?.group_id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  // Header
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
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },
  // Liquid Glass card
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
  liquidInner: {
    borderRadius: 20,
    padding: 16,
  },
  cardSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  // Discrepancy
  discrepancyBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  // Summary
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 12,
  },
  summaryItem: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 50,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
  },
  // Results
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  rankText: {
    fontSize: 13,
    fontWeight: "600",
    width: 28,
    textAlign: "center",
  },
  resultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  resultAvatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  resultInfo: {
    flex: 1,
    gap: 3,
  },
  resultName: {
    fontSize: 14,
    fontWeight: "600",
  },
  resultDetails: {
    fontSize: 12,
  },
  resultNet: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resultNetValue: {
    fontSize: 17,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginLeft: 80,
  },
  // Payments
  paymentEntry: {
    paddingVertical: 14,
    gap: 12,
  },
  paymentFlow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  paymentAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentAvatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  paymentArrow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    maxWidth: 80,
  },
  arrowLine: {
    flex: 1,
    height: 1,
  },
  paymentDetails: {
    alignItems: "center",
    gap: 3,
  },
  paymentNames: {
    fontSize: 13,
    fontWeight: "500",
  },
  paymentAmount: {
    fontSize: 22,
    fontWeight: "700",
  },
  paymentActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  stripeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 80,
  },
  stripeButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  markPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 110,
  },
  markPaidText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
