import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Text,
  View,
  ScrollView,
  StyleSheet,
  AppState,
  AppStateStatus,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getGame } from "../api/games";
import type { RootStackParamList } from "../navigation/RootNavigator";
import type { Socket } from "socket.io-client";
import { createSocket, disconnectSocket } from "../lib/socket";

type RouteProps = RouteProp<RootStackParamList, "GameNight">;

export function GameNightScreen() {
  const route = useRoute<RouteProps>();
  const { gameId } = route.params;

  // Socket reference
  const socketRef = useRef<Socket | null>(null);

  // UI State
  const [gameData, setGameData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection state
  const [socketConnected, setSocketConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string>("None");

  // Resync throttling
  const resyncInFlight = useRef(false);
  const pendingResync = useRef(false);
  const lastResyncAt = useRef(0);

  // Fetch game data from REST API (with throttling)
  const fetchGameData = useCallback(async (force = false) => {
    const now = Date.now();

    // Throttle unless forced
    if (!force) {
      if (resyncInFlight.current) {
        pendingResync.current = true;
        return;
      }
      if (now - lastResyncAt.current < 750) {
        pendingResync.current = true;
        return;
      }
    }

    resyncInFlight.current = true;
    lastResyncAt.current = now;

    try {
      const data = await getGame(gameId);
      setGameData(data);
      setError(null);
    } catch (e: any) {
      const message = e?.response?.data?.detail || e?.message || "Failed to load game";
      setError(message);
      console.error("Error fetching game:", e);
    } finally {
      setLoading(false);
      resyncInFlight.current = false;

      // Process pending resync
      if (pendingResync.current) {
        pendingResync.current = false;
        setTimeout(() => fetchGameData(), 100);
      }
    }
  }, [gameId]);

  // Setup WebSocket connection
  const setupSocket = useCallback(async () => {
    try {
      const socket = await createSocket();
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("✅ Socket connected for game:", gameId);
        setSocketConnected(true);
        setReconnecting(false);
        // Resync data on reconnect
        fetchGameData(true);
      });

      socket.on("disconnect", (reason) => {
        console.log("❌ Socket disconnected:", reason);
        setSocketConnected(false);
        setReconnecting(true);
      });

      socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err.message);
        setError("Real-time connection failed");
      });

      // Listen for game updates
      socket.on("game_update", (payload: any) => {
        console.log("📡 Game update received:", payload.type);
        setLastUpdate(payload.type || "update");
        // Resync entire state for correctness
        fetchGameData();
      });

      // Join the game room
      socket.emit("join_game", { game_id: gameId }, (ack: any) => {
        if (ack?.error) {
          console.error("Failed to join game room:", ack.error);
        } else {
          console.log("✅ Joined game room");
        }
      });
    } catch (e: any) {
      console.error("Socket setup error:", e);
      setError("Failed to connect to real-time updates");
    }
  }, [gameId, fetchGameData]);

  // Initial load
  useEffect(() => {
    let mounted = true;

    (async () => {
      if (!mounted) return;

      // 1. Load initial data
      await fetchGameData(true);

      // 2. Setup socket
      await setupSocket();
    })();

    return () => {
      mounted = false;
      disconnectSocket();
    };
  }, [gameId, fetchGameData, setupSocket]);

  // Handle app foreground/background
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === "active") {
        // App came to foreground
        fetchGameData(true);

        // Reconnect socket if needed
        if (socketRef.current && !socketRef.current.connected) {
          setReconnecting(true);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [fetchGameData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGameData(true);
    setRefreshing(false);
  }, [fetchGameData]);

  const players = gameData?.players || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        {/* Connection Status */}
        <View style={styles.statusBar}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                socketConnected ? styles.statusConnected : styles.statusDisconnected,
              ]}
            />
            <Text style={styles.statusText}>
              {socketConnected
                ? "Real-time connected"
                : reconnecting
                ? "Reconnecting..."
                : "Disconnected"}
            </Text>
          </View>
          <Text style={styles.lastUpdateText}>Last: {lastUpdate}</Text>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {reconnecting && (
          <View style={styles.reconnectBanner}>
            <Text style={styles.reconnectText}>
              ⏳ Reconnecting to live updates...
            </Text>
          </View>
        )}

        {/* Game Info Card */}
        <View style={styles.card}>
          <Text style={styles.gameTitle}>{gameData?.title || "Game"}</Text>
          <View style={styles.gameStats}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Status</Text>
              <Text
                style={[
                  styles.statValue,
                  gameData?.status === "active"
                    ? styles.statusActive
                    : styles.statusEnded,
                ]}
              >
                {gameData?.status === "active" ? "🟢 Active" : "⚫ Ended"}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Buy-in</Text>
              <Text style={styles.statValue}>${gameData?.buy_in_amount || 0}</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Chips/Buy-in</Text>
              <Text style={styles.statValue}>{gameData?.chips_per_buy_in || 0}</Text>
            </View>
          </View>
        </View>

        {/* Players Section */}
        <Text style={styles.sectionTitle}>PLAYERS ({players.length})</Text>
        <View style={styles.card}>
          {players.length === 0 ? (
            <Text style={styles.emptyText}>No players in this game</Text>
          ) : (
            players.map((player: any, index: number) => (
              <View key={player.player_id || index}>
                <View style={styles.playerRow}>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>
                      {player.name || player.email || "Player"}
                    </Text>
                    <Text style={styles.playerRole}>
                      {player.role === "host" ? "👑 Host" : "Player"}
                    </Text>
                  </View>
                  <View style={styles.playerStats}>
                    <Text style={styles.chipsValue}>{player.chips || 0}</Text>
                    <Text style={styles.chipsLabel}>chips</Text>
                  </View>
                </View>
                <View style={styles.playerMeta}>
                  <Text style={styles.metaText}>
                    Buy-in: ${player.total_buy_in || 0}
                  </Text>
                  {player.cash_out > 0 && (
                    <Text style={styles.metaText}>
                      Cash-out: ${player.cash_out}
                    </Text>
                  )}
                </View>
                {index < players.length - 1 && <View style={styles.divider} />}
              </View>
            ))
          )}
        </View>

        {/* Version Info */}
        <View style={[styles.card, styles.infoCard]}>
          <Text style={styles.infoTitle}>📱 Mobile v0.2</Text>
          <Text style={styles.infoText}>✅ Real-time WebSocket updates</Text>
          <Text style={styles.infoText}>✅ SecureStore token storage</Text>
          <Text style={styles.infoText}>✅ Auto-reconnect on foreground</Text>
          <Text style={styles.infoText}>🚧 Buy-in/cash-out actions coming</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0F",
  },
  scrollContent: {
    padding: 16,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusConnected: {
    backgroundColor: "#22c55e",
  },
  statusDisconnected: {
    backgroundColor: "#ef4444",
  },
  statusText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
  },
  lastUpdateText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
  },
  card: {
    backgroundColor: "#141421",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  gameTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },
  gameStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  statusActive: {
    color: "#22c55e",
  },
  statusEnded: {
    color: "rgba(255,255,255,0.5)",
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 12,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  playerRole: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    marginTop: 2,
  },
  playerStats: {
    alignItems: "flex-end",
  },
  chipsValue: {
    color: "#22c55e",
    fontSize: 20,
    fontWeight: "700",
  },
  chipsLabel: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
  },
  playerMeta: {
    flexDirection: "row",
    gap: 16,
    paddingBottom: 8,
  },
  metaText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
  },
  reconnectBanner: {
    backgroundColor: "rgba(234,179,8,0.15)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  reconnectText: {
    color: "#fef08a",
    fontSize: 13,
  },
  infoCard: {
    marginTop: 8,
  },
  infoTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  infoText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    marginTop: 4,
  },
});
