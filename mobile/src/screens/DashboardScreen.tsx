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
import { useAuth } from "../context/AuthContext";
import { useDrawer } from "../context/DrawerContext";
import { AppDrawer } from "../components/AppDrawer";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuth();
  const { toggleDrawer } = useDrawer();
  const [stats, setStats] = useState<any>(null);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, gamesRes, notifRes] = await Promise.all([
        api.get("/stats/me").catch(() => ({ data: null })),
        api.get("/games").catch(() => ({ data: [] })),
        api.get("/notifications").catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      const games = Array.isArray(gamesRes.data) ? gamesRes.data : [];
      setRecentGames(games.slice(0, 5));
      const notifs = Array.isArray(notifRes.data) ? notifRes.data : [];
      setNotifications(notifs.filter((n: any) => !n.read));
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

  const menuItems = [
    {
      icon: "home" as const,
      label: "Dashboard",
      onPress: () => {},
    },
    {
      icon: "people" as const,
      label: "Groups",
      onPress: () => navigation.navigate("Groups"),
    },
    {
      icon: "notifications-outline" as const,
      label: "Notifications",
      onPress: () => {},
      badge: notifications.length,
    },
    {
      icon: "settings-outline" as const,
      label: "Settings",
      onPress: () => navigation.navigate("Settings"),
    },
    {
      icon: "log-out-outline" as const,
      label: "Sign Out",
      onPress: signOut,
    },
  ];

  const recentDrawerItems = recentGames.map((game) => ({
    id: game.game_id || game._id || String(Math.random()),
    title: game.title || game.group_name || "Game Night",
    subtitle: game.status === "active" ? "Live" : "Ended",
    onPress: () =>
      navigation.navigate("GameNight", {
        gameId: game.game_id || game._id,
      }),
  }));

  return (
    <SafeAreaView style={styles.container} edges={["top"]} data-testid="dashboard-screen">
      {/* Header with hamburger */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={toggleDrawer}
          style={styles.hamburger}
          data-testid="hamburger-menu-button"
        >
          <Ionicons name="menu" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.logoText}>Kvitt</Text>
        </View>
        <View style={styles.headerRight}>
          {notifications.length > 0 && (
            <View style={styles.notifDot} />
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EF6E59"
          />
        }
      >
        {/* Greeting */}
        <Text style={styles.greeting}>
          Welcome{user?.name ? `, ${user.name}` : ""}
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#fca5a5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.total_games || 0}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <Text style={styles.statValue}>
              ${stats?.net_profit ? Math.abs(stats.net_profit).toFixed(0) : "0"}
            </Text>
            <Text style={styles.statLabel}>
              {(stats?.net_profit || 0) >= 0 ? "Profit" : "Loss"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {stats?.win_rate ? `${stats.win_rate.toFixed(0)}%` : "0%"}
            </Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>

        {/* Recent Games */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Games</Text>
          {recentGames.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate("Groups")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentGames.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="game-controller-outline" size={32} color="#444" />
            <Text style={styles.emptyText}>No games yet</Text>
            <Text style={styles.emptySubtext}>
              Join a group and start playing
            </Text>
          </View>
        ) : (
          recentGames.map((game: any) => (
            <TouchableOpacity
              key={game.game_id || game._id}
              style={styles.gameCard}
              onPress={() =>
                navigation.navigate("GameNight", {
                  gameId: game.game_id || game._id,
                })
              }
              data-testid={`game-card-${game.game_id || game._id}`}
            >
              <View style={styles.gameInfo}>
                <Text style={styles.gameTitle}>
                  {game.title || game.group_name || "Game Night"}
                </Text>
                <Text style={styles.gameSubtext}>
                  {game.player_count || 0} players
                  {game.total_pot ? ` · $${game.total_pot} pot` : ""}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  game.status === "active"
                    ? styles.statusActive
                    : styles.statusEnded,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    game.status === "active"
                      ? styles.statusActiveText
                      : styles.statusEndedText,
                  ]}
                >
                  {game.status === "active" ? "Live" : "Ended"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
          Quick Actions
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Groups")}
            data-testid="action-groups"
          >
            <Ionicons name="people" size={28} color="#EF6E59" />
            <Text style={styles.actionText}>My Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate("Settings")}
            data-testid="action-settings"
          >
            <Ionicons name="settings" size={28} color="#3b82f6" />
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Drawer overlay */}
      <AppDrawer
        menuItems={menuItems}
        recentItems={recentDrawerItems}
        userName={user?.name || user?.email || "Player"}
        userEmail={user?.email}
        onProfilePress={() => navigation.navigate("Settings")}
        onNewPress={() => navigation.navigate("Groups")}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  hamburger: {
    padding: 4,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  logoText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerRight: {
    width: 34,
    alignItems: "center",
  },
  notifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF6E59",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  greeting: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#141421",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  statCardAccent: {
    borderColor: "rgba(239,110,89,0.2)",
  },
  statValue: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    color: "#777",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#999",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  seeAll: {
    color: "#EF6E59",
    fontSize: 13,
    fontWeight: "500",
  },
  emptyCard: {
    backgroundColor: "#141421",
    borderRadius: 14,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  emptyText: {
    color: "#777",
    fontSize: 15,
    marginTop: 12,
  },
  emptySubtext: {
    color: "#555",
    fontSize: 12,
    marginTop: 4,
  },
  gameCard: {
    backgroundColor: "#141421",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  gameSubtext: {
    color: "#777",
    fontSize: 12,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 12,
  },
  statusActive: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  statusEnded: {
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusActiveText: {
    color: "#22c55e",
  },
  statusEndedText: {
    color: "#777",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#141421",
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  actionText: {
    color: "#ccc",
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
  },
});
