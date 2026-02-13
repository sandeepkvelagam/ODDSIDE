import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type R = RouteProp<RootStackParamList, "Settlement">;

export function SettlementScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const route = useRoute<R>();
  const navigation = useNavigation();
  const { gameId } = route.params;

  const [settlement, setSettlement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);

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

  const results = settlement?.results || [];
  const payments = settlement?.payments || [];
  const totalPot = results.reduce((sum: number, r: any) => sum + (r.total_buy_in || 0), 0);
  const winnersCount = results.filter((r: any) => (r.net_result || 0) > 0).length;
  const losersCount = results.filter((r: any) => (r.net_result || 0) < 0).length;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.orange} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading settlement...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.orange} />
        }
      >
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#fca5a5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Game Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
          <Text style={[styles.summaryTitle, { color: colors.textSecondary }]}>Game Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Ionicons name="cash-outline" size={24} color={colors.orange} />
              <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>${totalPot}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Pot</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Ionicons name="trending-up" size={24} color={colors.success} />
              <Text style={[styles.summaryValue, { color: colors.success }]}>{winnersCount}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Winners</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Ionicons name="trending-down" size={24} color={colors.danger} />
              <Text style={[styles.summaryValue, { color: colors.danger }]}>{losersCount}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Losers</Text>
            </View>
          </View>
        </View>

        {/* Results Card */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Results</Text>
        <View style={[styles.resultsCard, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
          {results.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No results available</Text>
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
                      <View style={styles.resultRank}>
                        <Text style={[styles.rankText, { color: colors.textMuted }]}>#{idx + 1}</Text>
                      </View>
                      <View style={[
                        styles.resultAvatar,
                        { backgroundColor: isCurrentUser ? "rgba(239,110,89,0.15)" : "rgba(59,130,246,0.15)" }
                      ]}>
                        <Text style={[styles.resultAvatarText, { color: isCurrentUser ? colors.orange : "#3b82f6" }]}>
                          {(result.name || result.email || "?")[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.resultInfo}>
                        <Text style={[styles.resultName, { color: colors.textPrimary }]}>
                          {result.name || result.email || "Player"}
                          {isCurrentUser && <Text style={{ color: colors.textMuted }}> (You)</Text>}
                        </Text>
                        <Text style={[styles.resultDetails, { color: colors.textMuted }]}>
                          ${result.total_buy_in || 0} in · ${result.cash_out || 0} out
                        </Text>
                      </View>
                      <View style={styles.resultNet}>
                        <Text style={[
                          styles.resultNetValue,
                          { color: isWinner ? colors.success : isLoser ? colors.danger : colors.textMuted }
                        ]}>
                          {netResult >= 0 ? "+" : ""}${netResult.toFixed(0)}
                        </Text>
                        {isWinner && <Ionicons name="arrow-up" size={14} color={colors.success} />}
                        {isLoser && <Ionicons name="arrow-down" size={14} color={colors.danger} />}
                      </View>
                    </View>
                    {idx < results.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  </View>
                );
              })
          )}
        </View>

        {/* Payment Flows Card */}
        {payments.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Payments</Text>
            <View style={[styles.paymentsCard, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
              {payments.map((payment: any, idx: number) => {
                const isFromUser = payment.from_user_id === user?.user_id;
                const isToUser = payment.to_user_id === user?.user_id;
                const canMarkPaid = isFromUser || isToUser;
                const isPaid = payment.paid === true;

                return (
                  <View key={payment.ledger_id || idx}>
                    <View style={styles.paymentRow}>
                      <View style={styles.paymentFlow}>
                        <View style={[styles.paymentAvatar, { backgroundColor: "rgba(239,68,68,0.15)" }]}>
                          <Text style={[styles.paymentAvatarText, { color: colors.danger }]}>
                            {(payment.from_name || "?")[0].toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.paymentArrow}>
                          <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
                          <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
                          <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
                        </View>
                        <View style={[styles.paymentAvatar, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                          <Text style={[styles.paymentAvatarText, { color: colors.success }]}>
                            {(payment.to_name || "?")[0].toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.paymentDetails}>
                        <Text style={[styles.paymentNames, { color: colors.textPrimary }]}>
                          {payment.from_name || "Player"} → {payment.to_name || "Player"}
                        </Text>
                        <Text style={[styles.paymentAmount, { color: colors.orange }]}>${payment.amount?.toFixed(2)}</Text>
                      </View>
                      {canMarkPaid && (
                        <TouchableOpacity
                          style={[
                            styles.markPaidButton,
                            isPaid
                              ? { backgroundColor: "rgba(34,197,94,0.15)", borderColor: "rgba(34,197,94,0.3)" }
                              : { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
                          ]}
                          onPress={() => handleMarkPaid(payment.ledger_id, isPaid)}
                          disabled={markingPaid === payment.ledger_id}
                        >
                          {markingPaid === payment.ledger_id ? (
                            <ActivityIndicator size="small" color={colors.textMuted} />
                          ) : (
                            <>
                              <Ionicons
                                name={isPaid ? "checkmark-circle" : "checkmark-circle-outline"}
                                size={18}
                                color={isPaid ? colors.success : colors.textMuted}
                              />
                              <Text style={[styles.markPaidText, { color: isPaid ? colors.success : colors.textMuted }]}>
                                {isPaid ? "Paid" : "Mark Paid"}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                    {idx < payments.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 28,
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
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
    gap: 10,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    flex: 1,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    marginBottom: 28,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 18,
    textAlign: "center",
  },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 50,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 12,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  resultsCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 28,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  resultRank: {
    width: 28,
    alignItems: "center",
  },
  rankText: {
    fontSize: 14,
    fontWeight: "600",
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
    fontWeight: "600",
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  resultName: {
    fontSize: 15,
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
    fontSize: 18,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginLeft: 80,
  },
  paymentsCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  paymentRow: {
    paddingVertical: 14,
    gap: 14,
  },
  paymentFlow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  paymentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  paymentAvatarText: {
    fontSize: 18,
    fontWeight: "600",
  },
  paymentArrow: {
    flexDirection: "row",
    alignItems: "center",
    width: 60,
  },
  arrowLine: {
    flex: 1,
    height: 1,
  },
  paymentDetails: {
    alignItems: "center",
    gap: 4,
  },
  paymentNames: {
    fontSize: 14,
    fontWeight: "500",
  },
  paymentAmount: {
    fontSize: 22,
    fontWeight: "700",
  },
  markPaidButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "center",
    minWidth: 130,
  },
  markPaidText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
