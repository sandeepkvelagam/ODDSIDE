import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [stats, setStats] = useState<any>(null);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, gamesRes] = await Promise.all([
        api.get("/dashboard/stats").catch(() => ({ data: null })),
        api.get("/games/recent").catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setRecentGames(gamesRes.data?.games || gamesRes.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.title}>Dashboard</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="#3b82f6" />
            <Text style={styles.statValue}>{stats?.total_groups || 0}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="game-controller" size={24} color="#22c55e" />
            <Text style={styles.statValue}>{stats?.total_games || 0}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="trending-up" size={24} color="#f59e0b" />
            <Text style={styles.statValue}>${stats?.total_profit || 0}</Text>
            <Text style={styles.statLabel}>Profit</Text>
          </View>
        </View>

        {/* Recent Games */}
        <Text style={styles.sectionTitle}>RECENT GAMES</Text>
        {recentGames.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>No recent games</Text>
            <Text style={styles.emptySubtext}>Join or create a game to get started</Text>
          </View>
        ) : (
          recentGames.slice(0, 5).map((game: any) => (
            <TouchableOpacity
              key={game.game_id || game._id}
              style={styles.gameCard}
              onPress={() => navigation.navigate("GameNight", { gameId: game.game_id || game._id })}
            >
              <View style={styles.gameInfo}>
                <Text style={styles.gameTitle}>{game.title || "Game Night"}</Text>
                <Text style={styles.gameSubtext}>{game.group_name}</Text>
              </View>
              <View style={styles.gameStatus}>
                <View style={[
                  styles.statusBadge,
                  game.status === "active" ? styles.statusActive : styles.statusEnded
                ]}>
                  <Text style={styles.statusText}>
                    {game.status === "active" ? "Live" : "Ended"}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>QUICK ACTIONS</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.getParent()?.navigate("Groups")}
          >
            <Ionicons name="add-circle" size={32} color="#3b82f6" />
            <Text style={styles.actionText}>Join Game</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionCard}
            onPress={() => navigation.getParent()?.navigate("Groups")}
          >
            <Ionicons name="people-circle" size={32} color="#22c55e" />
            <Text style={styles.actionText}>My Groups</Text>
          </TouchableOpacity>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  greeting: {
    color: "#666",
    fontSize: 14,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 4,
  },
  content: {
    padding: 16,
    paddingTop: 0,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#141421",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 8,
  },
  statLabel: {
    color: "#666",
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#141421",
    borderRadius: 12,
    padding: 20,
  },
  gameCard: {
    backgroundColor: "#141421",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  gameSubtext: {
    color: "#666",
    fontSize: 13,
    marginTop: 4,
  },
  gameStatus: {
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: "rgba(34,197,94,0.2)",
  },
  statusEnded: {
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#141421",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontSize: 14,
    marginTop: 8,
  },
  emptyText: {
    color: "#666",
    fontSize: 14,
    textAlign: "center",
  },
  emptySubtext: {
    color: "#444",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.15)",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
  },
});
