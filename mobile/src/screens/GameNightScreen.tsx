import React, { useEffect, useRef, useState, useCallback } from "react";
import { Text, View, ScrollView, AppState, AppStateStatus } from "react-native";
import { RouteProp, useRoute } from "@react-navigation/native";
import { Screen } from "../components/ui/Screen";
import { Card } from "../components/ui/Card";
import { getGame } from "../api/games";
import type { MainStackParamList } from "../navigation/MainStack";
import type { Socket } from "socket.io-client";
import { createSocket } from "../lib/socket";

type R = RouteProp<MainStackParamList, "GameNight">;

export function GameNightScreen() {
  const route = useRoute<R>();
  const { gameId } = route.params;

  const socketRef = useRef<Socket | null>(null);
  const [snapshot, setSnapshot] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [lastEvent, setLastEvent] = useState<string>("None");
  const [error, setError] = useState<string | null>(null);

  // Resync state: in-flight lock + throttle + last-write wins
  const resyncInFlight = useRef(false);
  const pendingResync = useRef(false);
  const lastReqId = useRef(0);
  const lastResyncAt = useRef(0);

  // Resync game state from REST API (throttled + deduped)
  const resyncGameState = useCallback(async () => {
    const now = Date.now();

    // In-flight lock
    if (resyncInFlight.current) {
      pendingResync.current = true;
      return;
    }

    // Throttle: max once per 750ms
    if (now - lastResyncAt.current < 750) {
      pendingResync.current = true;
      return;
    }

    resyncInFlight.current = true;
    lastResyncAt.current = now;
    const reqId = ++lastReqId.current;

    try {
      const data = await getGame(gameId);
      // Last-write wins: only apply if this is still the latest request
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

      // Process pending resync if any
      if (pendingResync.current) {
        pendingResync.current = false;
        setTimeout(() => resyncGameState(), 0);
      }
    }
  }, [gameId]);

  // Setup socket connection
  const setupSocket = useCallback(async () => {
    try {
      const s = await createSocket();
      socketRef.current = s;

      s.on("connect", async () => {
        setConnected(true);
        setReconnecting(false);
        // Resync state after reconnection to ensure correctness
        await resyncGameState();
      });

      s.on("disconnect", () => {
        setConnected(false);
        setReconnecting(true);
      });

      s.on("game_update", (payload: any) => {
        setLastEvent(`game_update: ${payload.type ?? "unknown"}`);
        // v1: re-sync entire snapshot for correctness
        // v2 will use reducer for optimistic updates
        resyncGameState();
      });

      s.emit("join_game", { game_id: gameId }, (ack: any) => {
        if (ack?.error) {
          setError(`join_game failed: ${ack.error}`);
        } else {
          setLastEvent(`join_game: ${ack?.status ?? "ok"}`);
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

      // 1. Load initial snapshot
      await resyncGameState();

      // 2. Setup socket connection
      await setupSocket();
    })();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [gameId, resyncGameState, setupSocket]);

  // Handle app background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // App came to foreground - resync state (throttled)
        resyncGameState();

        // Reconnect socket if disconnected
        if (socketRef.current && !socketRef.current.connected) {
          setReconnecting(true);
          // Socket.IO client will auto-reconnect
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [resyncGameState]);

  const players = snapshot?.players ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="py-4">
          <Text className="text-white text-2xl font-semibold">Game</Text>
          <Text className="text-white/50 mt-1">
            Socket: {connected ? "✅ Connected" : reconnecting ? "⏳ Reconnecting..." : "❌ Disconnected"} • Last: {lastEvent}
          </Text>
          {error ? <Text className="text-red-400 mt-2">{error}</Text> : null}
        </View>

        {reconnecting && (
          <View className="mb-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
            <Text className="text-yellow-200 text-sm">Reconnecting...</Text>
          </View>
        )}

        <Card>
          <Text className="text-white/70">Players</Text>
          <View className="mt-3">
            {players.length === 0 ? (
              <Text className="text-white/50">No players found.</Text>
            ) : (
              players.map((p: any, idx: number) => (
                <View key={p?._id ?? p?.id ?? idx} className="py-2">
                  <Text className="text-white">{p?.name ?? p?.email ?? "Player"}</Text>
                  <Text className="text-white/50 text-sm">
                    Chips: {p?.chips ?? 0} • Buy-in: ${p?.total_buy_in ?? 0}
                  </Text>
                  {idx < players.length - 1 ? <View className="h-px bg-white/10 mt-2" /> : null}
                </View>
              ))
            )}
          </View>
        </Card>

        <View className="h-4" />

        <Card>
          <Text className="text-white/70">Read-only v1</Text>
          <Text className="text-white/50 mt-2">
            Hardened: Reconnect + resync on foreground ✅
          </Text>
          <Text className="text-white/50 mt-1">
            Next: buy-in/cash-out actions + role checks
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
