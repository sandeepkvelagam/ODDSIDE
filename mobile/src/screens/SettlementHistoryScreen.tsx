import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { getThemedColors } from "../styles/liquidGlass";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;


export function SettlementHistoryScreen() {
  const { isDark, colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const lc = getThemedColors(isDark, colors);

  const [consolidated, setConsolidated] = useState<any>(null);
  const [settledGames, setSettledGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const [consolidatedRes, gamesRes] = await Promise.all([
        api
          .get("/ledger/consolidated")
          .catch(() => ({
            data: { net_balance: 0, total_you_owe: 0, total_owed_to_you: 0 },
          })),
        api.get("/games").catch(() => ({ data: [] })),
      ]);
      setConsolidated(consolidatedRes.data);
      const allGames = Array.isArray(gamesRes.data) ? gamesRes.data : [];
      setSettledGames(
        allGames
          .filter(
            (g: any) => g.status === "ended" || g.status === "settled"
          )
          .sort(
            (a: any, b: any) =>
              new Date(b.ended_at || b.created_at || 0).getTime() -
              new Date(a.ended_at || a.created_at || 0).getTime()
          )
      );
    } catch (e: any) {
      setError(e?.message || "Failed to load settlements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const youOwe = consolidated?.total_you_owe || 0;
  const owedToYou = consolidated?.total_owed_to_you || 0;
  const netBalance = owedToYou - youOwe;

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: lc.jetDark }]}>
        <ActivityIndicator size="large" color={lc.orange} />
        <Text style={[styles.loadingText, { color: lc.textMuted }]}>
          Loading settlements...
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
        style={[
          styles.pageHeader,
          { borderBottomColor: lc.liquidGlassBorder },
        ]}
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
          Settlements
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
          <View
            style={[
              styles.errorBanner,
              { borderColor: "rgba(239,68,68,0.3)" },
            ]}
          >
            <Ionicons name="alert-circle" size={16} color={lc.danger} />
            <Text style={[styles.errorText, { color: lc.danger }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Outstanding Balance Summary */}
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
              OUTSTANDING BALANCE
            </Text>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Ionicons name="arrow-up-outline" size={20} color={lc.danger} />
                <Text style={[styles.summaryValue, { color: lc.danger }]}>
                  ${youOwe.toFixed(0)}
                </Text>
                <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>
                  You Owe
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: lc.liquidGlassBorder },
                ]}
              />
              <View style={styles.summaryItem}>
                <Ionicons
                  name="arrow-down-outline"
                  size={20}
                  color={lc.success}
                />
                <Text style={[styles.summaryValue, { color: lc.success }]}>
                  ${owedToYou.toFixed(0)}
                </Text>
                <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>
                  Owed to You
                </Text>
              </View>
              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: lc.liquidGlassBorder },
                ]}
              />
              <View style={styles.summaryItem}>
                <Ionicons
                  name="swap-horizontal-outline"
                  size={20}
                  color={netBalance >= 0 ? lc.success : lc.danger}
                />
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color: netBalance >= 0 ? lc.success : lc.danger,
                    },
                  ]}
                >
                  {netBalance >= 0 ? "+" : ""}${netBalance.toFixed(0)}
                </Text>
                <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>
                  Net
                </Text>
              </View>
            </View>

            {(youOwe > 0 || owedToYou > 0) && (
              <TouchableOpacity
                style={[
                  styles.manageButton,
                  {
                    backgroundColor: lc.trustBlue,
                  },
                ]}
                onPress={() =>
                  navigation.navigate("RequestAndPay" as any)
                }
                activeOpacity={0.8}
              >
                <Ionicons name="cash-outline" size={16} color="#fff" />
                <Text style={styles.manageButtonText}>Manage Balances</Text>
                <Ionicons name="chevron-forward" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Past Games */}
        <View
          style={[
            styles.liquidCard,
            {
              backgroundColor: lc.liquidGlassBg,
              borderColor: lc.liquidGlassBorder,
            },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="trophy-outline" size={16} color={lc.moonstone} />
            <Text style={[styles.cardSectionTitle, { color: lc.moonstone }]}>
              PAST GAMES
            </Text>
            <Text style={[styles.countBadge, { color: lc.textMuted }]}>
              {settledGames.length}
            </Text>
          </View>
          <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
            {settledGames.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="receipt-outline"
                  size={48}
                  color={lc.textMuted}
                />
                <Text
                  style={[
                    styles.emptyTitle,
                    { color: lc.textSecondary },
                  ]}
                >
                  No settlements yet
                </Text>
                <Text
                  style={[styles.emptySubtext, { color: lc.textMuted }]}
                >
                  Completed games will appear here
                </Text>
              </View>
            ) : (
              settledGames.map((game: any, idx: number) => {
                const netResult = game.user_net_result || 0;
                const isWin = netResult > 0;
                const isLoss = netResult < 0;
                return (
                  <View key={game.game_id || idx}>
                    <TouchableOpacity
                      style={styles.gameRow}
                      onPress={() =>
                        navigation.navigate("Settlement", {
                          gameId: game.game_id,
                        })
                      }
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.gameIcon,
                          {
                            backgroundColor: isWin
                              ? "rgba(34,197,94,0.15)"
                              : isLoss
                              ? "rgba(239,68,68,0.15)"
                              : lc.liquidGlassBg,
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            isWin
                              ? "trending-up"
                              : isLoss
                              ? "trending-down"
                              : "remove-outline"
                          }
                          size={18}
                          color={
                            isWin
                              ? lc.success
                              : isLoss
                              ? lc.danger
                              : lc.textMuted
                          }
                        />
                      </View>
                      <View style={styles.gameInfo}>
                        <Text
                          style={[
                            styles.gameName,
                            { color: lc.textPrimary },
                          ]}
                          numberOfLines={1}
                        >
                          {game.name ||
                            game.title ||
                            game.group_name ||
                            "Game Night"}
                        </Text>
                        <Text
                          style={[
                            styles.gameDetails,
                            { color: lc.textMuted },
                          ]}
                        >
                          {formatDate(game.ended_at || game.created_at)}
                          {game.player_count
                            ? ` · ${game.player_count} players`
                            : ""}
                        </Text>
                      </View>
                      <View style={styles.gameResult}>
                        {netResult !== 0 && (
                          <Text
                            style={[
                              styles.gameNet,
                              {
                                color: isWin
                                  ? lc.success
                                  : isLoss
                                  ? lc.danger
                                  : lc.textMuted,
                              },
                            ]}
                          >
                            {netResult >= 0 ? "+" : ""}$
                            {netResult.toFixed(0)}
                          </Text>
                        )}
                        <Ionicons
                          name="chevron-forward"
                          size={16}
                          color={lc.textMuted}
                        />
                      </View>
                    </TouchableOpacity>
                    {idx < settledGames.length - 1 && (
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
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  countBadge: { fontSize: 12, marginLeft: "auto" },
  summaryGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingTop: 14,
  },
  summaryItem: { alignItems: "center", gap: 6, flex: 1 },
  summaryDivider: { width: 1, height: 50 },
  summaryValue: { fontSize: 22, fontWeight: "700" },
  summaryLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  manageButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  emptyContainer: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySubtext: { fontSize: 13 },
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  gameIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  gameInfo: { flex: 1, gap: 3 },
  gameName: { fontSize: 14, fontWeight: "600" },
  gameDetails: { fontSize: 12 },
  gameResult: { flexDirection: "row", alignItems: "center", gap: 6 },
  gameNet: { fontSize: 16, fontWeight: "700" },
  divider: { height: 1, marginLeft: 52 },
});
