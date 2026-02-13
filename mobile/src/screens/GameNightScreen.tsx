import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  AppState,
  AppStateStatus,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "../components/ui/Screen";
import { Card } from "../components/ui/Card";
import { api, getGame } from "../api/games";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { Socket } from "socket.io-client";
import { createSocket } from "../lib/socket";

type R = RouteProp<RootStackParamList, "GameNight">;

const BUY_IN_OPTIONS = [5, 10, 20, 50, 100];

export function GameNightScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const route = useRoute<R>();
  const navigation = useNavigation();
  const { gameId } = route.params;

  const socketRef = useRef<Socket | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Duration timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Buy-in sheet state
  const [showBuyInSheet, setShowBuyInSheet] = useState(false);
  const [buyInAmount, setBuyInAmount] = useState(20);
  const [submittingBuyIn, setSubmittingBuyIn] = useState(false);

  // Cash-out sheet state
  const [showCashOutSheet, setShowCashOutSheet] = useState(false);
  const [cashOutChips, setCashOutChips] = useState("");
  const [submittingCashOut, setSubmittingCashOut] = useState(false);

  // Resync state
  const resyncInFlight = useRef(false);
  const pendingResync = useRef(false);
  const lastReqId = useRef(0);
  const lastResyncAt = useRef(0);

  const resyncGameState = useCallback(async () => {
    const now = Date.now();
    if (resyncInFlight.current) {
      pendingResync.current = true;
      return;
    }
    if (now - lastResyncAt.current < 750) {
      pendingResync.current = true;
      return;
    }

    resyncInFlight.current = true;
    lastResyncAt.current = now;
    const reqId = ++lastReqId.current;

    try {
      const data = await getGame(gameId);
      if (reqId === lastReqId.current) {
        setSnapshot(data);
        setError(null);
      }
    } catch (e: any) {
      if (reqId === lastReqId.current) {
        setError(e?.message ?? "Failed to sync game state");
      }
    } finally {
      resyncInFlight.current = false;
      if (pendingResync.current) {
        pendingResync.current = false;
        setTimeout(() => resyncGameState(), 0);
      }
    }
  }, [gameId]);

  const setupSocket = useCallback(async () => {
    try {
      const s = await createSocket();
      socketRef.current = s;

      s.on("connect", async () => {
        setConnected(true);
        setReconnecting(false);
        await resyncGameState();
      });

      s.on("disconnect", () => {
        setConnected(false);
        setReconnecting(true);
      });

      s.on("game_update", () => {
        resyncGameState();
      });

      s.emit("join_game", { game_id: gameId }, (ack: any) => {
        if (ack?.error) {
          setError(`join_game failed: ${ack.error}`);
        }
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to connect socket");
    }
  }, [gameId, resyncGameState]);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await resyncGameState();
      await setupSocket();
    })();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameId, resyncGameState, setupSocket]);

  // Duration timer
  useEffect(() => {
    if (snapshot?.started_at && snapshot?.status === "active") {
      const startTime = new Date(snapshot.started_at).getTime();
      const updateTimer = () => {
        const now = Date.now();
        setElapsedSeconds(Math.floor((now - startTime) / 1000));
      };
      updateTimer();
      timerRef.current = setInterval(updateTimer, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [snapshot?.started_at, snapshot?.status]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        resyncGameState();
        if (socketRef.current && !socketRef.current.connected) {
          setReconnecting(true);
        }
      }
    };
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [resyncGameState]);

  // Game data
  const players = snapshot?.players ?? [];
  const isHost = snapshot?.host_id === user?.user_id;
  const currentPlayer = players.find((p: any) => p.user_id === user?.user_id);
  const isInGame = !!currentPlayer;
  const hasCashedOut = currentPlayer?.cashed_out === true;
  const gameStatus = snapshot?.status || "unknown";
  const isActive = gameStatus === "active";

  const totalPot = players.reduce((sum: number, p: any) => sum + (p.total_buy_in || 0), 0);
  const totalChips = players.reduce((sum: number, p: any) => sum + (p.chips || 0), 0);
  const chipValue = snapshot?.chip_value || (snapshot?.buy_in_amount && snapshot?.chips_per_buy_in ? snapshot.buy_in_amount / snapshot.chips_per_buy_in : 1);

  // Format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m ${secs}s`;
  };

  // Handle buy-in
  const handleBuyIn = async () => {
    setSubmittingBuyIn(true);
    try {
      await api.post(`/games/${gameId}/buy-in`, { amount: buyInAmount });
      setShowBuyInSheet(false);
      await resyncGameState();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Buy-in failed");
    } finally {
      setSubmittingBuyIn(false);
    }
  };

  // Handle cash-out
  const handleCashOut = async () => {
    const chips = parseInt(cashOutChips, 10);
    if (isNaN(chips) || chips < 0) {
      setError("Please enter a valid chip count");
      return;
    }
    setSubmittingCashOut(true);
    try {
      await api.post(`/games/${gameId}/cash-out`, { chips });
      setShowCashOutSheet(false);
      setCashOutChips("");
      await resyncGameState();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Cash-out failed");
    } finally {
      setSubmittingCashOut(false);
    }
  };

  // Calculate cash-out preview
  const cashOutChipsNum = parseInt(cashOutChips, 10) || 0;
  const cashOutValue = cashOutChipsNum * chipValue;
  const netResult = cashOutValue - (currentPlayer?.total_buy_in || 0);

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Connection Status */}
        {reconnecting && (
          <View style={[styles.reconnectBanner, { backgroundColor: "rgba(161, 98, 7, 0.2)", borderColor: "rgba(234, 179, 8, 0.4)" }]}>
            <Ionicons name="sync" size={16} color="#fef08a" />
            <Text style={styles.reconnectText}>Reconnecting...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#fca5a5" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color="#fca5a5" />
            </TouchableOpacity>
          </View>
        )}

        {/* Game Stats Bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatDuration(elapsedSeconds)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Duration</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{players.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Players</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="disc-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalChips}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Chips</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="cash-outline" size={18} color={colors.orange} />
            <Text style={[styles.statValue, { color: colors.orange }]}>${totalPot}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Pot</Text>
          </View>
        </View>

        {/* Host Controls */}
        {isHost && isActive && (
          <View style={[styles.hostCard, { backgroundColor: colors.surface, borderColor: "rgba(234, 179, 8, 0.3)" }]}>
            <View style={styles.hostHeader}>
              <Ionicons name="shield" size={18} color="#fbbf24" />
              <Text style={[styles.hostTitle, { color: colors.textPrimary }]}>Host Controls</Text>
            </View>
            <View style={styles.hostActions}>
              <TouchableOpacity
                style={[styles.hostButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
                onPress={() => {/* Add player functionality */}}
              >
                <Ionicons name="person-add" size={18} color={colors.textSecondary} />
                <Text style={[styles.hostButtonText, { color: colors.textSecondary }]}>Add Player</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.hostButton, { backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.3)" }]}
                onPress={async () => {
                  try {
                    await api.post(`/games/${gameId}/end`);
                    await resyncGameState();
                  } catch (e: any) {
                    setError(e?.response?.data?.detail || "Failed to end game");
                  }
                }}
              >
                <Ionicons name="stop-circle" size={18} color={colors.danger} />
                <Text style={[styles.hostButtonText, { color: colors.danger }]}>End Game</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Your Stats (if in game) */}
        {isInGame && (
          <View style={[styles.yourStatsCard, { backgroundColor: colors.surface, borderColor: colors.orange + "40" }]}>
            <View style={styles.yourStatsHeader}>
              <Ionicons name="person" size={18} color={colors.orange} />
              <Text style={[styles.yourStatsTitle, { color: colors.textPrimary }]}>Your Position</Text>
              {hasCashedOut && (
                <View style={[styles.cashedOutBadge, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                  <Text style={styles.cashedOutText}>Cashed Out</Text>
                </View>
              )}
            </View>
            <View style={styles.yourStatsRow}>
              <View style={styles.yourStatItem}>
                <Text style={[styles.yourStatValue, { color: colors.textPrimary }]}>{currentPlayer?.chips || 0}</Text>
                <Text style={[styles.yourStatLabel, { color: colors.textMuted }]}>Chips</Text>
              </View>
              <View style={styles.yourStatItem}>
                <Text style={[styles.yourStatValue, { color: colors.textPrimary }]}>${currentPlayer?.total_buy_in || 0}</Text>
                <Text style={[styles.yourStatLabel, { color: colors.textMuted }]}>Buy-in</Text>
              </View>
              <View style={styles.yourStatItem}>
                <Text style={[styles.yourStatValue, { color: colors.textPrimary }]}>${((currentPlayer?.chips || 0) * chipValue).toFixed(0)}</Text>
                <Text style={[styles.yourStatLabel, { color: colors.textMuted }]}>Value</Text>
              </View>
              <View style={styles.yourStatItem}>
                <Text style={[
                  styles.yourStatValue,
                  { color: ((currentPlayer?.chips || 0) * chipValue) - (currentPlayer?.total_buy_in || 0) >= 0 ? colors.success : colors.danger }
                ]}>
                  {((currentPlayer?.chips || 0) * chipValue) - (currentPlayer?.total_buy_in || 0) >= 0 ? "+" : ""}
                  ${(((currentPlayer?.chips || 0) * chipValue) - (currentPlayer?.total_buy_in || 0)).toFixed(0)}
                </Text>
                <Text style={[styles.yourStatLabel, { color: colors.textMuted }]}>Net</Text>
              </View>
            </View>
          </View>
        )}

        {/* Players List */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Players</Text>
        <View style={[styles.playersCard, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
          {players.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No players yet</Text>
          ) : (
            players.map((p: any, idx: number) => {
              const playerNet = (p.chips || 0) * chipValue - (p.total_buy_in || 0);
              const isCurrentUser = p.user_id === user?.user_id;
              const isPlayerHost = p.user_id === snapshot?.host_id;

              return (
                <View key={p?.user_id || idx}>
                  <View style={styles.playerRow}>
                    <View style={[styles.playerAvatar, { backgroundColor: isCurrentUser ? "rgba(239,110,89,0.15)" : "rgba(59,130,246,0.15)" }]}>
                      <Text style={[styles.playerAvatarText, { color: isCurrentUser ? colors.orange : "#3b82f6" }]}>
                        {(p?.name || p?.email || "?")[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.playerInfo}>
                      <View style={styles.playerNameRow}>
                        <Text style={[styles.playerName, { color: colors.textPrimary }]}>
                          {p?.name || p?.email || "Player"}
                          {isCurrentUser && <Text style={{ color: colors.textMuted }}> (You)</Text>}
                        </Text>
                        {isPlayerHost && (
                          <Ionicons name="shield" size={14} color="#fbbf24" style={{ marginLeft: 6 }} />
                        )}
                      </View>
                      <View style={styles.playerChipsRow}>
                        <Text style={[styles.playerChips, { color: colors.textMuted }]}>
                          {p.chips || 0} chips · ${p.total_buy_in || 0} buy-in
                        </Text>
                        {p.cashed_out && (
                          <View style={[styles.statusBadge, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                            <Text style={styles.statusBadgeText}>Out</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Text style={[
                      styles.playerNet,
                      { color: playerNet >= 0 ? colors.success : colors.danger }
                    ]}>
                      {playerNet >= 0 ? "+" : ""}${playerNet.toFixed(0)}
                    </Text>
                  </View>
                  {idx < players.length - 1 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              );
            })
          )}
        </View>

        {/* Game Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Chip Value</Text>
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>${chipValue.toFixed(2)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Status</Text>
            <View style={[styles.infoStatusBadge, isActive ? styles.statusActiveStyle : styles.statusEndedStyle]}>
              {isActive && <View style={styles.liveDot} />}
              <Text style={[styles.infoStatusText, { color: isActive ? "#22c55e" : colors.textMuted }]}>
                {isActive ? "Live" : gameStatus}
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing for action bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Bar */}
      {isActive && isInGame && !hasCashedOut && (
        <View style={[styles.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.glassBorder }]}>
          <TouchableOpacity
            style={[styles.actionButton, styles.buyInButton, { borderColor: colors.orange }]}
            onPress={() => setShowBuyInSheet(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={colors.orange} />
            <Text style={[styles.actionButtonText, { color: colors.orange }]}>Buy In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.cashOutButton, { backgroundColor: colors.orange }]}
            onPress={() => {
              setCashOutChips(String(currentPlayer?.chips || 0));
              setShowCashOutSheet(true);
            }}
          >
            <Ionicons name="exit-outline" size={20} color="#fff" />
            <Text style={[styles.actionButtonText, { color: "#fff" }]}>Cash Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Buy-In Sheet */}
      <Modal visible={showBuyInSheet} animationType="slide" transparent onRequestClose={() => setShowBuyInSheet(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowBuyInSheet(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Buy In</Text>

            <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>Select Amount</Text>
            <View style={styles.optionRow}>
              {BUY_IN_OPTIONS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.optionButton,
                    { borderColor: colors.glassBorder },
                    buyInAmount === amount && { borderColor: colors.orange, backgroundColor: "rgba(239,110,89,0.15)" },
                  ]}
                  onPress={() => setBuyInAmount(amount)}
                >
                  <Text style={[styles.optionText, { color: colors.textPrimary }, buyInAmount === amount && { color: colors.orange }]}>
                    ${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.previewCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>You'll receive</Text>
              <Text style={[styles.previewValue, { color: colors.orange }]}>
                {Math.floor(buyInAmount / chipValue)} chips
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.orange }, submittingBuyIn && styles.buttonDisabled]}
              onPress={handleBuyIn}
              disabled={submittingBuyIn}
            >
              {submittingBuyIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Confirm Buy In</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cash-Out Sheet */}
      <Modal visible={showCashOutSheet} animationType="slide" transparent onRequestClose={() => setShowCashOutSheet(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowCashOutSheet(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Cash Out</Text>

            <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>Your Chips</Text>
            <TextInput
              style={[styles.chipInput, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.glassBorder }]}
              value={cashOutChips}
              onChangeText={setCashOutChips}
              keyboardType="number-pad"
              placeholder="Enter chip count"
              placeholderTextColor={colors.textMuted}
            />

            <View style={[styles.summaryCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Your chips</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>{cashOutChipsNum}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Cash value</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>${cashOutValue.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total buy-in</Text>
                <Text style={[styles.summaryValue, { color: colors.textPrimary }]}>${currentPlayer?.total_buy_in || 0}</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textPrimary, fontWeight: "600" }]}>Net Result</Text>
                <Text style={[styles.summaryValue, styles.netResult, { color: netResult >= 0 ? colors.success : colors.danger }]}>
                  {netResult >= 0 ? "+" : ""}${netResult.toFixed(2)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.orange }, submittingCashOut && styles.buttonDisabled]}
              onPress={handleCashOut}
              disabled={submittingCashOut}
            >
              {submittingCashOut ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Confirm Cash Out</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: 32,
  },
  reconnectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 18,
  },
  reconnectText: {
    color: "#fef08a",
    fontSize: 14,
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
  statsBar: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 18,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hostCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 18,
  },
  hostHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  hostTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  hostActions: {
    flexDirection: "row",
    gap: 12,
  },
  hostButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  hostButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  yourStatsCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 18,
  },
  yourStatsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  yourStatsTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  cashedOutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cashedOutText: {
    color: "#22c55e",
    fontSize: 12,
    fontWeight: "600",
  },
  yourStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  yourStatItem: {
    alignItems: "center",
    gap: 4,
  },
  yourStatValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  yourStatLabel: {
    fontSize: 11,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  playersCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 18,
  },
  emptyText: {
    fontSize: 14,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 14,
  },
  playerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  playerAvatarText: {
    fontSize: 18,
    fontWeight: "600",
  },
  playerInfo: {
    flex: 1,
    gap: 4,
  },
  playerNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  playerName: {
    fontSize: 15,
    fontWeight: "600",
  },
  playerChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerChips: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: "#22c55e",
    fontSize: 11,
    fontWeight: "600",
  },
  playerNet: {
    fontSize: 16,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    marginLeft: 58,
  },
  infoCard: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  infoStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusActiveStyle: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  statusEndedStyle: {
    backgroundColor: "rgba(128,128,128,0.15)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  infoStatusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 20,
    paddingBottom: 34,
    gap: 14,
    borderTopWidth: 1,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  buyInButton: {
    borderWidth: 2,
  },
  cashOutButton: {},
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
    alignSelf: "center",
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 24,
    textAlign: "center",
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  optionText: {
    fontSize: 18,
    fontWeight: "600",
  },
  previewCard: {
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 24,
  },
  previewLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  chipInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 18,
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 18,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryDivider: {
    height: 1,
    marginVertical: 4,
  },
  netResult: {
    fontSize: 18,
  },
  submitButton: {
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    minHeight: 56,
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
