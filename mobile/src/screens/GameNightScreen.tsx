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
  Animated,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api, getGame } from "../api/games";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { Socket } from "socket.io-client";
import { createSocket } from "../lib/socket";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type R = RouteProp<RootStackParamList, "GameNight">;

const BUY_IN_OPTIONS = [5, 10, 20, 50, 100];

// Liquid Glass Design System Colors (matching DashboardV2)
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
  liquidGlowOrange: "rgba(238, 108, 41, 0.15)",
  liquidGlowBlue: "rgba(59, 130, 246, 0.15)",
  textPrimary: "#F5F5F5",
  textSecondary: "#B8B8B8",
  textMuted: "#7A7A7A",
  success: "#22C55E",
  danger: "#EF4444",
};

// Poker hand rankings data
const HAND_RANKINGS = [
  { rank: 1, name: "Royal Flush", desc: "A, K, Q, J, 10, all same suit", example: "A♠ K♠ Q♠ J♠ 10♠" },
  { rank: 2, name: "Straight Flush", desc: "Five consecutive cards, same suit", example: "9♥ 8♥ 7♥ 6♥ 5♥" },
  { rank: 3, name: "Four of a Kind", desc: "Four cards of same rank", example: "K♠ K♥ K♦ K♣ 2♠" },
  { rank: 4, name: "Full House", desc: "Three of a kind + a pair", example: "J♠ J♥ J♦ 8♣ 8♠" },
  { rank: 5, name: "Flush", desc: "Five cards of same suit", example: "A♣ J♣ 8♣ 6♣ 2♣" },
  { rank: 6, name: "Straight", desc: "Five consecutive cards", example: "10♠ 9♥ 8♦ 7♣ 6♠" },
  { rank: 7, name: "Three of a Kind", desc: "Three cards of same rank", example: "7♠ 7♥ 7♦ K♣ 2♠" },
  { rank: 8, name: "Two Pair", desc: "Two different pairs", example: "Q♠ Q♥ 5♦ 5♣ 2♠" },
  { rank: 9, name: "One Pair", desc: "Two cards of same rank", example: "10♠ 10♥ A♦ 8♣ 4♠" },
  { rank: 10, name: "High Card", desc: "Highest card plays", example: "A♠ J♥ 8♦ 6♣ 2♠" },
];

export function GameNightScreen() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { gameId } = route.params;

  // Use liquid glass colors - with light theme adjustments
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

  // Host/Admin color - amber that's readable on both themes
  const hostColor = isDark ? "#fbbf24" : "#b45309"; // amber-400 in dark, amber-700 in light
  const hostBgColor = isDark ? "rgba(234,179,8,0.15)" : "rgba(180,83,9,0.12)";
  const hostBorderColor = isDark ? "rgba(234,179,8,0.3)" : "rgba(180,83,9,0.25)";

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

  // Admin buy-in dialog state
  const [showAdminBuyInSheet, setShowAdminBuyInSheet] = useState(false);
  const [selectedPlayerForBuyIn, setSelectedPlayerForBuyIn] = useState<string | null>(null);
  const [adminBuyInAmount, setAdminBuyInAmount] = useState(20);
  const [submittingAdminBuyIn, setSubmittingAdminBuyIn] = useState(false);

  // Admin cash-out dialog state
  const [showAdminCashOutSheet, setShowAdminCashOutSheet] = useState(false);
  const [selectedPlayerForCashOut, setSelectedPlayerForCashOut] = useState<string | null>(null);
  const [adminCashOutChips, setAdminCashOutChips] = useState("");
  const [submittingAdminCashOut, setSubmittingAdminCashOut] = useState(false);

  // Add player dialog state
  const [showAddPlayerSheet, setShowAddPlayerSheet] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchingPlayers, setSearchingPlayers] = useState(false);
  const [submittingAddPlayer, setSubmittingAddPlayer] = useState(false);

  // Edit chips dialog state
  const [showEditChipsSheet, setShowEditChipsSheet] = useState(false);
  const [editChipsPlayer, setEditChipsPlayer] = useState<any>(null);
  const [editChipsValue, setEditChipsValue] = useState("");
  const [submittingEditChips, setSubmittingEditChips] = useState(false);

  // Hand rankings modal
  const [showHandRankings, setShowHandRankings] = useState(false);

  // Game Thread/Chat state
  const [showGameThread, setShowGameThread] = useState(false);
  const [thread, setThread] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);

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

  // Load game thread
  const loadThread = useCallback(async () => {
    setLoadingThread(true);
    try {
      const res = await api.get(`/games/${gameId}/thread`);
      setThread(Array.isArray(res.data) ? res.data : []);
    } catch (e: any) {
      console.error("Failed to load thread:", e);
    } finally {
      setLoadingThread(false);
    }
  }, [gameId]);

  // Send message to thread
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;
    setSendingMessage(true);
    try {
      await api.post(`/games/${gameId}/thread`, { content: newMessage.trim() });
      setNewMessage("");
      await loadThread();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  // Format message time
  const formatMessageTime = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

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

  // Search players
  const searchPlayers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchingPlayers(true);
    try {
      const res = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
      const currentPlayerIds = players.map((p: any) => p.user_id);
      const filtered = (res.data || []).filter((u: any) => !currentPlayerIds.includes(u.user_id));
      setSearchResults(filtered);
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setSearchingPlayers(false);
    }
  };

  // Game data
  const players = snapshot?.players ?? [];
  const isHost = snapshot?.host_id === user?.user_id;
  const currentPlayer = players.find((p: any) => p.user_id === user?.user_id);
  const isInGame = !!currentPlayer;
  const hasCashedOut = currentPlayer?.cashed_out === true;
  const gameStatus = snapshot?.status || "unknown";
  const isActive = gameStatus === "active";
  const isScheduled = gameStatus === "scheduled";
  const isEnded = gameStatus === "ended";

  const totalPot = players.reduce((sum: number, p: any) => sum + (p.total_buy_in || 0), 0);
  const totalChips = players.reduce((sum: number, p: any) => sum + (p.chips || 0), 0);
  const chipValue = snapshot?.chip_value || (snapshot?.buy_in_amount && snapshot?.chips_per_buy_in ? snapshot.buy_in_amount / snapshot.chips_per_buy_in : 1);
  const defaultBuyIn = snapshot?.buy_in_amount || 20;
  const chipsPerBuyIn = snapshot?.chips_per_buy_in || 20;

  // Players grouped by status
  const activePlayers = players.filter((p: any) => !p.cashed_out);
  const cashedOutPlayers = players.filter((p: any) => p.cashed_out);
  const allPlayersCashedOut = players.length > 0 && players.every((p: any) => p.cashed_out);

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

  // Handle start game
  const handleStartGame = async () => {
    try {
      await api.post(`/games/${gameId}/start`);
      await resyncGameState();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to start game");
    }
  };

  // Handle end game
  const handleEndGame = async () => {
    try {
      await api.post(`/games/${gameId}/end`);
      await resyncGameState();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to end game");
    }
  };

  // Handle join game
  const handleJoinGame = async () => {
    try {
      await api.post(`/games/${gameId}/join`);
      await resyncGameState();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to join game");
    }
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

  // Admin: Handle buy-in for a player
  const handleAdminBuyIn = async () => {
    if (!selectedPlayerForBuyIn) return;
    setSubmittingAdminBuyIn(true);
    try {
      await api.post(`/games/${gameId}/admin-buy-in`, {
        user_id: selectedPlayerForBuyIn,
        amount: adminBuyInAmount,
      });
      setShowAdminBuyInSheet(false);
      setSelectedPlayerForBuyIn(null);
      await resyncGameState();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Admin buy-in failed");
    } finally {
      setSubmittingAdminBuyIn(false);
    }
  };

  // Admin: Handle cash-out for a player
  const handleAdminCashOut = async () => {
    if (!selectedPlayerForCashOut) return;
    const chips = parseInt(adminCashOutChips, 10);
    if (isNaN(chips) || chips < 0) {
      setError("Please enter a valid chip count");
      return;
    }
    setSubmittingAdminCashOut(true);
    try {
      await api.post(`/games/${gameId}/admin-cash-out`, {
        user_id: selectedPlayerForCashOut,
        chips,
      });
      setShowAdminCashOutSheet(false);
      setSelectedPlayerForCashOut(null);
      setAdminCashOutChips("");
      await resyncGameState();
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Admin cash-out failed");
    } finally {
      setSubmittingAdminCashOut(false);
    }
  };

  // Add player to game
  const handleAddPlayer = async (playerId: string) => {
    setSubmittingAddPlayer(true);
    try {
      await api.post(`/games/${gameId}/add-player`, { user_id: playerId });
      setShowAddPlayerSheet(false);
      setPlayerSearchQuery("");
      setSearchResults([]);
      await resyncGameState();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to add player");
    } finally {
      setSubmittingAddPlayer(false);
    }
  };

  // Edit chips for cashed out player
  const handleEditChips = async () => {
    if (!editChipsPlayer) return;
    const chips = parseInt(editChipsValue, 10);
    if (isNaN(chips) || chips < 0) {
      setError("Please enter a valid chip count");
      return;
    }
    setSubmittingEditChips(true);
    try {
      await api.post(`/games/${gameId}/edit-player-chips`, {
        user_id: editChipsPlayer.user_id,
        chips_count: chips,
      });
      setShowEditChipsSheet(false);
      setEditChipsPlayer(null);
      setEditChipsValue("");
      await resyncGameState();
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Failed to edit chips");
    } finally {
      setSubmittingEditChips(false);
    }
  };

  // Cash-out preview
  const cashOutChipsNum = parseInt(cashOutChips, 10) || 0;
  const cashOutValue = cashOutChipsNum * chipValue;
  const netResult = cashOutValue - (currentPlayer?.total_buy_in || 0);

  // Selected player info for admin cash-out
  const selectedCashOutPlayer = players.find((p: any) => p.user_id === selectedPlayerForCashOut);
  const adminCashOutChipsNum = parseInt(adminCashOutChips, 10) || 0;
  const adminCashOutValue = adminCashOutChipsNum * chipValue;

  return (
    <View style={[styles.container, { backgroundColor: lc.jetDark, paddingTop: insets.top }]}>
      {/* Header - Clean with just back chevron */}
      <View style={[styles.header, { borderBottomColor: lc.liquidGlassBorder }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={lc.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: lc.textPrimary }]} numberOfLines={1}>
            {snapshot?.name || "Game Night"}
          </Text>
          <View style={styles.headerBadges}>
            {/* Connection Status */}
            <View style={[
              styles.connectionBadge,
              { backgroundColor: connected ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }
            ]}>
              <View style={[styles.connectionDot, { backgroundColor: connected ? lc.success : lc.danger }]} />
              <Text style={[styles.connectionText, { color: connected ? lc.success : lc.danger }]}>
                {connected ? "Live" : "Offline"}
              </Text>
            </View>
            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              isActive ? { backgroundColor: "rgba(34,197,94,0.15)" } : 
              isScheduled ? { backgroundColor: hostBgColor } :
              { backgroundColor: lc.liquidGlassBg }
            ]}>
              <Text style={[
                styles.statusBadgeText,
                { color: isActive ? lc.success : isScheduled ? hostColor : lc.textMuted }
              ]}>
                {gameStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Hand Rankings Button */}
        <TouchableOpacity
          style={[styles.headerIconButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
          onPress={() => setShowHandRankings(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={20} color={lc.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Error Banner */}
        {error && (
          <View style={[styles.errorBanner, { borderColor: "rgba(239,68,68,0.3)" }]}>
            <Ionicons name="alert-circle" size={16} color={lc.danger} />
            <Text style={[styles.errorText, { color: lc.danger }]}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Ionicons name="close" size={18} color={lc.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Reconnecting Banner */}
        {reconnecting && (
          <View style={[styles.reconnectBanner, { backgroundColor: hostBgColor, borderColor: hostBorderColor }]}>
            <Ionicons name="sync" size={16} color={hostColor} />
            <Text style={[styles.reconnectText, { color: hostColor }]}>Reconnecting...</Text>
          </View>
        )}

        {/* Game Info Card */}
        <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
          <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
            {/* Host Info */}
            <View style={styles.hostRow}>
              <View style={[styles.hostBadge, { backgroundColor: hostBgColor }]}>
                <Ionicons name="shield" size={12} color={hostColor} />
                <Text style={[styles.hostText, { color: hostColor }]}>
                  {snapshot?.host?.name || "Host"} Admin
                </Text>
              </View>
            </View>

            {/* Chip Value Info */}
            <View style={styles.chipInfoRow}>
              <View style={styles.chipInfoItem}>
                <Ionicons name="disc-outline" size={14} color={lc.orange} />
                <Text style={[styles.chipInfoText, { color: lc.textPrimary }]}>
                  ${defaultBuyIn} = {chipsPerBuyIn} chips
                </Text>
              </View>
              <View style={[styles.chipInfoDivider, { backgroundColor: lc.liquidGlassBorder }]} />
              <View style={styles.chipInfoItem}>
                <Text style={[styles.chipInfoText, { color: lc.textMuted }]}>
                  ${chipValue.toFixed(2)}/chip
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Game Stats Bar */}
        <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
          <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={18} color={lc.textMuted} />
                <Text style={[styles.statValue, { color: lc.textPrimary }]}>{formatDuration(elapsedSeconds)}</Text>
                <Text style={[styles.statLabel, { color: lc.textMuted }]}>Duration</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: lc.liquidGlassBorder }]} />
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={18} color={lc.textMuted} />
                <Text style={[styles.statValue, { color: lc.textPrimary }]}>{players.length}</Text>
                <Text style={[styles.statLabel, { color: lc.textMuted }]}>Players</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: lc.liquidGlassBorder }]} />
              <View style={styles.statItem}>
                <Ionicons name="disc-outline" size={18} color={lc.textMuted} />
                <Text style={[styles.statValue, { color: lc.textPrimary }]}>{totalChips}</Text>
                <Text style={[styles.statLabel, { color: lc.textMuted }]}>Chips</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: lc.liquidGlassBorder }]} />
              <View style={styles.statItem}>
                <Ionicons name="cash-outline" size={18} color={lc.orange} />
                <Text style={[styles.statValue, { color: lc.orange }]}>${totalPot}</Text>
                <Text style={[styles.statLabel, { color: lc.textMuted }]}>Pot</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Host Controls */}
        {isHost && (
          <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: hostBorderColor }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="shield" size={16} color={hostColor} />
                <Text style={[styles.sectionTitle, { color: hostColor }]}>HOST CONTROLS</Text>
              </View>
            </View>
            <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
              <View style={styles.hostActionsRow}>
                {isScheduled && (
                  <TouchableOpacity
                    style={[styles.hostActionButton, { backgroundColor: lc.success }]}
                    onPress={handleStartGame}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={styles.hostActionText}>Start Game</Text>
                  </TouchableOpacity>
                )}
                {isActive && (
                  <>
                    <TouchableOpacity
                      style={[styles.hostActionButton, { backgroundColor: "rgba(34,197,94,0.15)", borderWidth: 1, borderColor: "rgba(34,197,94,0.3)" }]}
                      onPress={() => setShowAdminBuyInSheet(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="add-circle" size={18} color={lc.success} />
                      <Text style={[styles.hostActionText, { color: lc.success }]}>Buy-In</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.hostActionButton, { backgroundColor: "rgba(249,115,22,0.15)", borderWidth: 1, borderColor: "rgba(249,115,22,0.3)" }]}
                      onPress={() => setShowAdminCashOutSheet(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="remove-circle" size={18} color="#f97316" />
                      <Text style={[styles.hostActionText, { color: "#f97316" }]}>Cash Out</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.hostActionButton, { backgroundColor: lc.liquidGlassBg, borderWidth: 1, borderColor: lc.liquidGlassBorder }]}
                      onPress={() => setShowAddPlayerSheet(true)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="person-add" size={18} color={lc.trustBlue} />
                      <Text style={[styles.hostActionText, { color: lc.trustBlue }]}>Add</Text>
                    </TouchableOpacity>
                  </>
                )}
                {isActive && allPlayersCashedOut && (
                  <TouchableOpacity
                    style={[styles.hostActionButton, { backgroundColor: lc.danger }]}
                    onPress={handleEndGame}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="stop-circle" size={18} color="#fff" />
                    <Text style={styles.hostActionText}>End Game</Text>
                  </TouchableOpacity>
                )}
                {isEnded && (
                  <TouchableOpacity
                    style={[styles.hostActionButton, { backgroundColor: lc.trustBlue }]}
                    onPress={() => navigation.navigate("Settlement" as any, { gameId })}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="calculator" size={18} color="#fff" />
                    <Text style={styles.hostActionText}>Settlement</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Your Stats (if in game) */}
        {isInGame && (
          <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.orange + "40" }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="person" size={16} color={lc.orange} />
                <Text style={[styles.sectionTitle, { color: lc.moonstone }]}>YOUR POSITION</Text>
              </View>
              {hasCashedOut && (
                <View style={[styles.cashedOutBadge, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                  <Ionicons name="checkmark-circle" size={12} color={lc.success} />
                  <Text style={[styles.cashedOutText, { color: lc.success }]}>Cashed Out</Text>
                </View>
              )}
            </View>
            <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
              <View style={styles.yourStatsRow}>
                <View style={styles.yourStatItem}>
                  <Text style={[styles.yourStatValue, { color: lc.textPrimary }]}>{currentPlayer?.chips || 0}</Text>
                  <Text style={[styles.yourStatLabel, { color: lc.textMuted }]}>Chips</Text>
                </View>
                <View style={styles.yourStatItem}>
                  <Text style={[styles.yourStatValue, { color: lc.textPrimary }]}>${currentPlayer?.total_buy_in || 0}</Text>
                  <Text style={[styles.yourStatLabel, { color: lc.textMuted }]}>Buy-in</Text>
                </View>
                <View style={styles.yourStatItem}>
                  <Text style={[styles.yourStatValue, { color: lc.textPrimary }]}>${((currentPlayer?.chips || 0) * chipValue).toFixed(0)}</Text>
                  <Text style={[styles.yourStatLabel, { color: lc.textMuted }]}>Value</Text>
                </View>
                <View style={styles.yourStatItem}>
                  <Text style={[
                    styles.yourStatValue,
                    { color: ((currentPlayer?.chips || 0) * chipValue) - (currentPlayer?.total_buy_in || 0) >= 0 ? lc.success : lc.danger }
                  ]}>
                    {((currentPlayer?.chips || 0) * chipValue) - (currentPlayer?.total_buy_in || 0) >= 0 ? "+" : ""}
                    ${(((currentPlayer?.chips || 0) * chipValue) - (currentPlayer?.total_buy_in || 0)).toFixed(0)}
                  </Text>
                  <Text style={[styles.yourStatLabel, { color: lc.textMuted }]}>Net</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Not in game - Join button */}
        {!isInGame && isActive && (
          <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.trustBlue + "40" }]}>
            <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
              <View style={styles.joinContainer}>
                <Text style={[styles.joinText, { color: lc.textSecondary }]}>You haven't joined this game yet.</Text>
                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: lc.trustBlue }]}
                  onPress={handleJoinGame}
                  activeOpacity={0.8}
                >
                  <Ionicons name="enter" size={18} color="#fff" />
                  <Text style={styles.joinButtonText}>Join Game</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Active Players */}
        {activePlayers.length > 0 && (
          <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <View style={[styles.liveDot, { backgroundColor: lc.success }]} />
                <Text style={[styles.sectionTitle, { color: lc.moonstone }]}>ACTIVE PLAYERS</Text>
              </View>
              <Text style={[styles.countBadge, { color: lc.textMuted }]}>{activePlayers.length}</Text>
            </View>
            <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
              {activePlayers.map((p: any, idx: number) => {
                const playerNet = (p.chips || 0) * chipValue - (p.total_buy_in || 0);
                const isCurrentUser = p.user_id === user?.user_id;
                const isPlayerHost = p.user_id === snapshot?.host_id;

                return (
                  <View key={p?.user_id || idx}>
                    <View style={styles.playerRow}>
                      <View style={[styles.playerAvatar, { backgroundColor: isCurrentUser ? lc.liquidGlowOrange : lc.liquidGlowBlue }]}>
                        <Text style={[styles.playerAvatarText, { color: isCurrentUser ? lc.orange : lc.trustBlue }]}>
                          {(p?.user?.name || p?.name || p?.email || "?")[0].toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.playerInfo}>
                        <View style={styles.playerNameRow}>
                          <Text style={[styles.playerName, { color: lc.textPrimary }]}>
                            {p?.user?.name || p?.name || p?.email || `Player ${idx + 1}`}
                            {isCurrentUser && <Text style={{ color: lc.textMuted }}> (You)</Text>}
                          </Text>
                          {isPlayerHost && (
                            <Ionicons name="shield" size={14} color={hostColor} style={{ marginLeft: 6 }} />
                          )}
                        </View>
                        <Text style={[styles.playerChips, { color: lc.textMuted }]}>
                          {p.chips || 0} chips · ${p.total_buy_in || 0} buy-in
                        </Text>
                      </View>

                      {/* Admin Transaction Buttons */}
                      {isHost && isActive && !isCurrentUser && (
                        <View style={styles.playerActions}>
                          <TouchableOpacity
                            style={[styles.playerActionButton, { backgroundColor: "rgba(34,197,94,0.15)" }]}
                            onPress={() => {
                              setSelectedPlayerForBuyIn(p.user_id);
                              setShowAdminBuyInSheet(true);
                            }}
                          >
                            <Ionicons name="add" size={16} color={lc.success} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.playerActionButton, { backgroundColor: "rgba(249,115,22,0.15)" }]}
                            onPress={() => {
                              setSelectedPlayerForCashOut(p.user_id);
                              setAdminCashOutChips(String(p.chips || 0));
                              setShowAdminCashOutSheet(true);
                            }}
                          >
                            <Ionicons name="remove" size={16} color="#f97316" />
                          </TouchableOpacity>
                        </View>
                      )}

                      {!isHost && (
                        <Text style={[
                          styles.playerNet,
                          { color: playerNet >= 0 ? lc.success : lc.danger }
                        ]}>
                          {playerNet >= 0 ? "+" : ""}${playerNet.toFixed(0)}
                        </Text>
                      )}
                    </View>
                    {idx < activePlayers.length - 1 && <View style={[styles.divider, { backgroundColor: lc.liquidGlassBorder }]} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Cashed Out Players */}
        {cashedOutPlayers.length > 0 && (
          <View style={[styles.liquidCard, { backgroundColor: lc.liquidGlassBg, borderColor: "rgba(34,197,94,0.2)" }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="checkmark-circle" size={16} color={lc.success} />
                <Text style={[styles.sectionTitle, { color: lc.success }]}>CASHED OUT</Text>
              </View>
              <Text style={[styles.countBadge, { color: lc.textMuted }]}>{cashedOutPlayers.length}</Text>
            </View>
            <View style={[styles.liquidInner, { backgroundColor: lc.liquidInnerBg }]}>
              {cashedOutPlayers.map((p: any, idx: number) => {
                const playerNet = (p.cash_out_value || 0) - (p.total_buy_in || 0);
                const isCurrentUser = p.user_id === user?.user_id;
                const isPlayerHost = p.user_id === snapshot?.host_id;

                return (
                  <View key={p?.user_id || idx}>
                    <View style={styles.playerRow}>
                      <View style={[styles.playerAvatar, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                        <Ionicons name="checkmark" size={20} color={lc.success} />
                      </View>
                      <View style={styles.playerInfo}>
                        <View style={styles.playerNameRow}>
                          <Text style={[styles.playerName, { color: lc.textPrimary }]}>
                            {p?.user?.name || p?.name || p?.email || `Player ${idx + 1}`}
                            {isCurrentUser && <Text style={{ color: lc.textMuted }}> (You)</Text>}
                          </Text>
                          {isPlayerHost && (
                            <Ionicons name="shield" size={14} color={hostColor} style={{ marginLeft: 6 }} />
                          )}
                        </View>
                        <Text style={[styles.playerChips, { color: lc.textMuted }]}>
                          ${p.cash_out_value || 0} returned · ${p.total_buy_in || 0} buy-in
                        </Text>
                      </View>

                      {/* Edit chips button for host */}
                      {isHost && (
                        <TouchableOpacity
                          style={[styles.editButton, { backgroundColor: lc.liquidGlassBg }]}
                          onPress={() => {
                            setEditChipsPlayer(p);
                            setEditChipsValue(String(p.chips_returned || p.chips || 0));
                            setShowEditChipsSheet(true);
                          }}
                        >
                          <Ionicons name="pencil" size={14} color={lc.textMuted} />
                        </TouchableOpacity>
                      )}

                      <Text style={[
                        styles.playerNet,
                        { color: playerNet >= 0 ? lc.success : lc.danger }
                      ]}>
                        {playerNet >= 0 ? "+" : ""}${playerNet.toFixed(0)}
                      </Text>
                    </View>
                    {idx < cashedOutPlayers.length - 1 && <View style={[styles.divider, { backgroundColor: lc.liquidGlassBorder }]} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* AI Assistant Button */}
        <TouchableOpacity
          style={[styles.aiButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.orange + "40" }]}
          onPress={() => navigation.navigate("AIAssistant")}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={20} color={lc.orange} />
          <Text style={[styles.aiButtonText, { color: lc.orange }]}>AI Poker Assistant</Text>
          <View style={[styles.aiBetaBadge, { backgroundColor: lc.orange }]}>
            <Text style={styles.aiBetaText}>BETA</Text>
          </View>
        </TouchableOpacity>

        {/* Bottom spacing */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Bar */}
      {isActive && isInGame && !hasCashedOut && (
        <View style={[styles.actionBar, { backgroundColor: lc.jetSurface, borderTopColor: lc.liquidGlassBorder }]}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: "transparent", borderWidth: 2, borderColor: lc.orange }]}
            onPress={() => setShowBuyInSheet(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle-outline" size={20} color={lc.orange} />
            <Text style={[styles.actionButtonText, { color: lc.orange }]}>Buy In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: lc.trustBlue }]}
            onPress={() => {
              setCashOutChips(String(currentPlayer?.chips || 0));
              setShowCashOutSheet(true);
            }}
            activeOpacity={0.8}
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
          <View style={[styles.sheetContainer, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: lc.textPrimary }]}>Buy In</Text>

            <Text style={[styles.optionLabel, { color: lc.textSecondary }]}>Select Amount</Text>
            <View style={styles.optionRow}>
              {BUY_IN_OPTIONS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.optionButton,
                    { borderColor: lc.liquidGlassBorder },
                    buyInAmount === amount && { borderColor: lc.orange, backgroundColor: lc.liquidGlowOrange },
                  ]}
                  onPress={() => setBuyInAmount(amount)}
                >
                  <Text style={[styles.optionText, { color: lc.textPrimary }, buyInAmount === amount && { color: lc.orange }]}>
                    ${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.previewCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
              <Text style={[styles.previewLabel, { color: lc.textMuted }]}>You'll receive</Text>
              <Text style={[styles.previewValue, { color: lc.orange }]}>
                {Math.floor(buyInAmount / chipValue)} chips
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: lc.trustBlue }, submittingBuyIn && styles.buttonDisabled]}
              onPress={handleBuyIn}
              disabled={submittingBuyIn}
              activeOpacity={0.8}
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
          <View style={[styles.sheetContainer, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: lc.textPrimary }]}>Cash Out</Text>

            <Text style={[styles.optionLabel, { color: lc.textSecondary }]}>Your Chips</Text>
            <TextInput
              style={[styles.chipInput, { backgroundColor: lc.liquidGlassBg, color: lc.textPrimary, borderColor: lc.liquidGlassBorder }]}
              value={cashOutChips}
              onChangeText={setCashOutChips}
              keyboardType="number-pad"
              placeholder="Enter chip count"
              placeholderTextColor={lc.textMuted}
            />

            <View style={[styles.summaryCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>Your chips</Text>
                <Text style={[styles.summaryValue, { color: lc.textPrimary }]}>{cashOutChipsNum}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>Cash value</Text>
                <Text style={[styles.summaryValue, { color: lc.textPrimary }]}>${cashOutValue.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>Total buy-in</Text>
                <Text style={[styles.summaryValue, { color: lc.textPrimary }]}>${currentPlayer?.total_buy_in || 0}</Text>
              </View>
              <View style={[styles.summaryDivider, { backgroundColor: lc.liquidGlassBorder }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: lc.textPrimary, fontWeight: "600" }]}>Net Result</Text>
                <Text style={[styles.summaryValue, styles.netResultText, { color: netResult >= 0 ? lc.success : lc.danger }]}>
                  {netResult >= 0 ? "+" : ""}${netResult.toFixed(2)}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: lc.trustBlue }, submittingCashOut && styles.buttonDisabled]}
              onPress={handleCashOut}
              disabled={submittingCashOut}
              activeOpacity={0.8}
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

      {/* Admin Buy-In Sheet */}
      <Modal visible={showAdminBuyInSheet} animationType="slide" transparent onRequestClose={() => setShowAdminBuyInSheet(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAdminBuyInSheet(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: lc.textPrimary }]}>Add Buy-In</Text>
            <Text style={[styles.sheetSubtitle, { color: lc.textMuted }]}>Select a player and buy-in amount</Text>

            <Text style={[styles.optionLabel, { color: lc.textSecondary }]}>Select Player</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerSelectScroll}>
              {activePlayers.map((p: any) => (
                <TouchableOpacity
                  key={p.user_id}
                  style={[
                    styles.playerSelectButton,
                    { borderColor: lc.liquidGlassBorder },
                    selectedPlayerForBuyIn === p.user_id && { borderColor: lc.orange, backgroundColor: lc.liquidGlowOrange },
                  ]}
                  onPress={() => setSelectedPlayerForBuyIn(p.user_id)}
                >
                  <View style={[styles.playerSelectAvatar, { backgroundColor: lc.liquidGlowBlue }]}>
                    <Text style={[styles.playerSelectAvatarText, { color: lc.trustBlue }]}>
                      {(p?.user?.name || p?.name || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.playerSelectName, { color: selectedPlayerForBuyIn === p.user_id ? lc.orange : lc.textPrimary }]} numberOfLines={1}>
                    {p?.user?.name || p?.name || "Player"}
                  </Text>
                  <Text style={[styles.playerSelectChips, { color: lc.textMuted }]}>{p.chips} chips</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.optionLabel, { color: lc.textSecondary, marginTop: 16 }]}>Select Amount</Text>
            <View style={styles.optionRow}>
              {BUY_IN_OPTIONS.map((amount) => (
                <TouchableOpacity
                  key={amount}
                  style={[
                    styles.optionButton,
                    { borderColor: lc.liquidGlassBorder },
                    adminBuyInAmount === amount && { borderColor: lc.orange, backgroundColor: lc.liquidGlowOrange },
                  ]}
                  onPress={() => setAdminBuyInAmount(amount)}
                >
                  <Text style={[styles.optionText, { color: lc.textPrimary }, adminBuyInAmount === amount && { color: lc.orange }]}>
                    ${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: lc.success }, (!selectedPlayerForBuyIn || submittingAdminBuyIn) && styles.buttonDisabled]}
              onPress={handleAdminBuyIn}
              disabled={!selectedPlayerForBuyIn || submittingAdminBuyIn}
              activeOpacity={0.8}
            >
              {submittingAdminBuyIn ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Confirm Buy-In</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Admin Cash-Out Sheet */}
      <Modal visible={showAdminCashOutSheet} animationType="slide" transparent onRequestClose={() => setShowAdminCashOutSheet(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAdminCashOutSheet(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: lc.textPrimary }]}>Cash Out Player</Text>
            <Text style={[styles.sheetSubtitle, { color: lc.textMuted }]}>Enter chip count</Text>

            <Text style={[styles.optionLabel, { color: lc.textSecondary }]}>Select Player</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.playerSelectScroll}>
              {activePlayers.map((p: any) => (
                <TouchableOpacity
                  key={p.user_id}
                  style={[
                    styles.playerSelectButton,
                    { borderColor: lc.liquidGlassBorder },
                    selectedPlayerForCashOut === p.user_id && { borderColor: "#f97316", backgroundColor: "rgba(249,115,22,0.15)" },
                  ]}
                  onPress={() => {
                    setSelectedPlayerForCashOut(p.user_id);
                    setAdminCashOutChips(String(p.chips || 0));
                  }}
                >
                  <View style={[styles.playerSelectAvatar, { backgroundColor: lc.liquidGlowBlue }]}>
                    <Text style={[styles.playerSelectAvatarText, { color: lc.trustBlue }]}>
                      {(p?.user?.name || p?.name || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.playerSelectName, { color: selectedPlayerForCashOut === p.user_id ? "#f97316" : lc.textPrimary }]} numberOfLines={1}>
                    {p?.user?.name || p?.name || "Player"}
                  </Text>
                  <Text style={[styles.playerSelectChips, { color: lc.textMuted }]}>{p.chips} chips</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.optionLabel, { color: lc.textSecondary, marginTop: 16 }]}>Chips to Return</Text>
            <TextInput
              style={[styles.chipInput, { backgroundColor: lc.liquidGlassBg, color: lc.textPrimary, borderColor: lc.liquidGlassBorder }]}
              value={adminCashOutChips}
              onChangeText={setAdminCashOutChips}
              keyboardType="number-pad"
              placeholder="Enter chip count"
              placeholderTextColor={lc.textMuted}
            />

            {selectedCashOutPlayer && (
              <View style={[styles.summaryCard, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>Cash value</Text>
                  <Text style={[styles.summaryValue, { color: lc.textPrimary }]}>${adminCashOutValue.toFixed(2)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: lc.textMuted }]}>Total buy-in</Text>
                  <Text style={[styles.summaryValue, { color: lc.textPrimary }]}>${selectedCashOutPlayer?.total_buy_in || 0}</Text>
                </View>
                <View style={[styles.summaryDivider, { backgroundColor: lc.liquidGlassBorder }]} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: lc.textPrimary, fontWeight: "600" }]}>Net Result</Text>
                  <Text style={[styles.summaryValue, styles.netResultText, { color: (adminCashOutValue - (selectedCashOutPlayer?.total_buy_in || 0)) >= 0 ? lc.success : lc.danger }]}>
                    {(adminCashOutValue - (selectedCashOutPlayer?.total_buy_in || 0)) >= 0 ? "+" : ""}${(adminCashOutValue - (selectedCashOutPlayer?.total_buy_in || 0)).toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: "#f97316" }, (!selectedPlayerForCashOut || submittingAdminCashOut) && styles.buttonDisabled]}
              onPress={handleAdminCashOut}
              disabled={!selectedPlayerForCashOut || submittingAdminCashOut}
              activeOpacity={0.8}
            >
              {submittingAdminCashOut ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Confirm Cash Out</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Player Sheet */}
      <Modal visible={showAddPlayerSheet} animationType="slide" transparent onRequestClose={() => setShowAddPlayerSheet(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowAddPlayerSheet(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: lc.textPrimary }]}>Add Player</Text>
            <Text style={[styles.sheetSubtitle, { color: lc.textMuted }]}>Search by email or name</Text>

            <TextInput
              style={[styles.searchInput, { backgroundColor: lc.liquidGlassBg, color: lc.textPrimary, borderColor: lc.liquidGlassBorder }]}
              value={playerSearchQuery}
              onChangeText={(text) => {
                setPlayerSearchQuery(text);
                searchPlayers(text);
              }}
              placeholder="Search by email or name..."
              placeholderTextColor={lc.textMuted}
              autoCapitalize="none"
            />

            {searchingPlayers && (
              <ActivityIndicator size="small" color={lc.orange} style={{ marginVertical: 16 }} />
            )}

            <ScrollView style={styles.searchResultsScroll} showsVerticalScrollIndicator={false}>
              {searchResults.map((player: any) => (
                <TouchableOpacity
                  key={player.user_id}
                  style={[styles.searchResultItem, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
                  onPress={() => handleAddPlayer(player.user_id)}
                  activeOpacity={0.8}
                  disabled={submittingAddPlayer}
                >
                  <View style={[styles.searchResultAvatar, { backgroundColor: lc.liquidGlowBlue }]}>
                    <Text style={[styles.searchResultAvatarText, { color: lc.trustBlue }]}>
                      {(player.name || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.searchResultInfo}>
                    <Text style={[styles.searchResultName, { color: lc.textPrimary }]}>{player.name}</Text>
                    <Text style={[styles.searchResultEmail, { color: lc.textMuted }]}>{player.email}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.addPlayerButton, { backgroundColor: lc.trustBlue }]}
                    onPress={() => handleAddPlayer(player.user_id)}
                    disabled={submittingAddPlayer}
                  >
                    <Text style={styles.addPlayerButtonText}>Add</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}

              {playerSearchQuery && searchResults.length === 0 && !searchingPlayers && (
                <Text style={[styles.noResultsText, { color: lc.textMuted }]}>
                  No users found matching "{playerSearchQuery}"
                </Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Chips Sheet */}
      <Modal visible={showEditChipsSheet} animationType="slide" transparent onRequestClose={() => setShowEditChipsSheet(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowEditChipsSheet(false)} />
          <View style={[styles.sheetContainer, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: lc.textPrimary }]}>Edit Chips</Text>
            <Text style={[styles.sheetSubtitle, { color: lc.textMuted }]}>
              {editChipsPlayer?.user?.name || editChipsPlayer?.name || "Player"}
            </Text>

            <Text style={[styles.optionLabel, { color: lc.textSecondary }]}>New Chip Count</Text>
            <TextInput
              style={[styles.chipInput, { backgroundColor: lc.liquidGlassBg, color: lc.textPrimary, borderColor: lc.liquidGlassBorder }]}
              value={editChipsValue}
              onChangeText={setEditChipsValue}
              keyboardType="number-pad"
              placeholder="Enter chip count"
              placeholderTextColor={lc.textMuted}
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: lc.trustBlue }, submittingEditChips && styles.buttonDisabled]}
              onPress={handleEditChips}
              disabled={submittingEditChips}
              activeOpacity={0.8}
            >
              {submittingEditChips ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Hand Rankings Modal */}
      <Modal visible={showHandRankings} animationType="slide" transparent onRequestClose={() => setShowHandRankings(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowHandRankings(false)} />
          <View style={[styles.handRankingsSheet, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.handRankingsHeader}>
              <Text style={[styles.sheetTitle, { color: lc.textPrimary }]}>Poker Hand Rankings</Text>
              <TouchableOpacity onPress={() => setShowHandRankings(false)}>
                <Ionicons name="close" size={24} color={lc.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.sheetSubtitle, { color: lc.textMuted }]}>Best to worst, top to bottom</Text>

            <ScrollView style={styles.handRankingsList} showsVerticalScrollIndicator={false}>
              {HAND_RANKINGS.map((hand) => (
                <View key={hand.rank} style={[styles.handRankItem, { borderBottomColor: lc.liquidGlassBorder }]}>
                  <View style={[styles.handRankNumber, { backgroundColor: lc.liquidGlowOrange }]}>
                    <Text style={[styles.handRankNumberText, { color: lc.orange }]}>{hand.rank}</Text>
                  </View>
                  <View style={styles.handRankInfo}>
                    <Text style={[styles.handRankName, { color: lc.textPrimary }]}>{hand.name}</Text>
                    <Text style={[styles.handRankDesc, { color: lc.textMuted }]}>{hand.desc}</Text>
                    <Text style={[styles.handRankExample, { color: lc.textSecondary }]}>{hand.example}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerBadges: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  connectionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  connectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connectionText: {
    fontSize: 10,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  // Error/Reconnect banners
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  reconnectBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  reconnectText: {
    fontSize: 14,
  },
  // Liquid Card
  liquidCard: {
    borderRadius: 20,
    padding: 4,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  liquidInner: {
    borderRadius: 16,
    padding: 16,
  },
  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: "500",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  // Host info
  hostRow: {
    marginBottom: 12,
  },
  hostBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hostText: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Chip info
  chipInfoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chipInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
  },
  chipInfoText: {
    fontSize: 13,
    fontWeight: "500",
  },
  chipInfoDivider: {
    width: 1,
    height: 16,
  },
  // Stats row
  statsRow: {
    flexDirection: "row",
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
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Host actions
  hostActionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  hostActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 90,
  },
  hostActionText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  // Your stats
  cashedOutBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cashedOutText: {
    fontSize: 11,
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
    fontSize: 10,
    textTransform: "uppercase",
  },
  // Join container
  joinContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  joinText: {
    fontSize: 14,
    marginBottom: 16,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Player row
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
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
  playerChips: {
    fontSize: 13,
  },
  playerActions: {
    flexDirection: "row",
    gap: 8,
  },
  playerActionButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  playerNet: {
    fontSize: 16,
    fontWeight: "700",
  },
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  divider: {
    height: 1,
    marginLeft: 56,
  },
  // AI Button
  aiButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  aiButtonText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  aiBetaBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  aiBetaText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  // Action bar
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    padding: 16,
    paddingBottom: 34,
    gap: 12,
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
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
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
    marginBottom: 8,
    textAlign: "center",
  },
  sheetSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  optionText: {
    fontSize: 16,
    fontWeight: "600",
  },
  previewCard: {
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    alignItems: "center",
    marginBottom: 20,
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
    padding: 16,
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 10,
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
  netResultText: {
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
  // Player select
  playerSelectScroll: {
    marginBottom: 8,
  },
  playerSelectButton: {
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 10,
    width: 90,
  },
  playerSelectAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  playerSelectAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  playerSelectName: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  playerSelectChips: {
    fontSize: 10,
    marginTop: 2,
  },
  // Search results
  searchResultsScroll: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  searchResultAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchResultEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  addPlayerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addPlayerButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  noResultsText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  // Hand rankings
  handRankingsSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  handRankingsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  handRankingsList: {
    marginTop: 16,
  },
  handRankItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 14,
  },
  handRankNumber: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  handRankNumberText: {
    fontSize: 14,
    fontWeight: "700",
  },
  handRankInfo: {
    flex: 1,
  },
  handRankName: {
    fontSize: 15,
    fontWeight: "600",
  },
  handRankDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  handRankExample: {
    fontSize: 13,
    marginTop: 4,
    letterSpacing: 1,
  },
});
