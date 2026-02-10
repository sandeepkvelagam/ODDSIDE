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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useDrawer } from "../context/DrawerContext";
import { AppDrawer } from "../components/AppDrawer";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Claude-style warm dark theme colors
const COLORS = {
  navBg: "#1a1816",
  contentBg: "#252320",
  textPrimary: "#ffffff",
  textSecondary: "#9a9a9a",
  textMuted: "#666666",
  border: "rgba(255, 255, 255, 0.06)",
  glassBg: "rgba(255, 255, 255, 0.05)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  orange: "#e8845c",
};

export function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuth();
  const { toggleDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
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
    { icon: "home" as const, label: "Dashboard", onPress: () => {} },
    { icon: "people" as const, label: "Groups", onPress: () => navigation.navigate("Groups") },
    { icon: "notifications-outline" as const, label: "Notifications", onPress: () => {}, badge: notifications.length },
    { icon: "settings-outline" as const, label: "Settings", onPress: () => navigation.navigate("Settings") },
    { icon: "log-out-outline" as const, label: "Sign Out", onPress: signOut },
  ];

  const recentDrawerItems = recentGames.map((game) => ({
    id: game.game_id || game._id || String(Math.random()),
    title: game.title || game.group_name || "Game Night",
    subtitle: game.status === "active" ? "Live" : "Ended",
    onPress: () => navigation.navigate("GameNight", { gameId: game.game_id || game._id }),
  }));

  const userName = user?.name || user?.email?.split("@")[0] || "Player";
  const userInitial = userName[0]?.toUpperCase() || "?";

  return (
    <AppDrawer
      menuItems={menuItems}
      recentItems={recentDrawerItems}
      userName={user?.name || user?.email || "Player"}
      userEmail={user?.email}
      onProfilePress={() => navigation.navigate("Settings")}
      onNewPress={() => navigation.navigate("AIAssistant")}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header Bar */}
        <View style={styles.header}>
          {/* Hamburger Button - Glass style */}
          <TouchableOpacity
            style={styles.glassButton}
            onPress={toggleDrawer}
            activeOpacity={0.7}
          >
            <View style={styles.hamburgerLines}>
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
              <View style={styles.hamburgerLine} />
            </View>
          </TouchableOpacity>

          {/* Center - Logo */}
          <View style={styles.headerCenter}>
            <Text style={styles.logoText}>Kvitt</Text>
            <Text style={styles.logoSubtext}>Ledger</Text>
          </View>

          {/* Notification Button - Glass style */}
          <TouchableOpacity style={styles.glassButton} activeOpacity={0.7}>
            <Ionicons
              name="notifications-outline"
              size={22}
              color={COLORS.textSecondary}
            />
            {notifications.length > 0 && <View style={styles.notifDot} />}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.orange}
            />
          }
        >
          {/* Profile Chip Row */}
          <View style={styles.profileRow}>
            <TouchableOpacity
              style={styles.profileChip}
              onPress={() => navigation.navigate("Settings")}
              activeOpacity={0.7}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{userInitial}</Text>
              </View>
              <Text style={styles.profileName}>{userName}</Text>
            </TouchableOpacity>
          </View>

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
              <Ionicons
                name="game-controller-outline"
                size={32}
                color={COLORS.textMuted}
              />
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
                activeOpacity={0.7}
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
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconBox,
                  { backgroundColor: "rgba(232,132,92,0.15)" },
                ]}
              >
                <Ionicons name="people" size={24} color={COLORS.orange} />
              </View>
              <Text style={styles.actionText}>My Groups</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("Settings")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconBox,
                  { backgroundColor: "rgba(59,130,246,0.15)" },
                ]}
              >
                <Ionicons name="settings" size={24} color="#3b82f6" />
              </View>
              <Text style={styles.actionText}>Settings</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom spacing for FAB */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    </AppDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.contentBg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  glassButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  hamburgerLines: {
    gap: 5,
    alignItems: "center",
  },
  hamburgerLine: {
    width: 18,
    height: 1.5,
    borderRadius: 1,
    backgroundColor: COLORS.textSecondary,
  },
  headerCenter: {
    alignItems: "center",
  },
  logoText: {
    fontSize: 18,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  logoSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: -1,
  },
  notifDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.orange,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  profileRow: {
    marginBottom: 24,
  },
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.glassBg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignSelf: "flex-start",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  profileName: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
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
    backgroundColor: COLORS.glassBg,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  statCardAccent: {
    borderColor: "rgba(232,132,92,0.3)",
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    color: COLORS.textSecondary,
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
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  seeAll: {
    color: COLORS.orange,
    fontSize: 13,
    fontWeight: "500",
  },
  emptyCard: {
    backgroundColor: COLORS.glassBg,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: 12,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  gameCard: {
    backgroundColor: COLORS.glassBg,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  gameSubtext: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 12,
  },
  statusActive: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  statusEnded: {
    backgroundColor: COLORS.glassBg,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusActiveText: {
    color: "#22c55e",
  },
  statusEndedText: {
    color: COLORS.textSecondary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.glassBg,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "500",
  },
});
