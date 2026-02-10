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
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useDrawer } from "../context/DrawerContext";
import { AppDrawer } from "../components/AppDrawer";
import { GlassHamburger } from "../components/GlassHamburger";
import { GlassIconButton } from "../components/GlassIconButton";
import { ProfileChip } from "../components/ProfileChip";
import { FloatingActionButton } from "../components/FloatingActionButton";
import { COLORS, BLUR_INTENSITY } from "../styles/glass";
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]} data-testid="dashboard-screen">
      {/* Glass Header */}
      <View style={styles.header}>
        <GlassHamburger onPress={toggleDrawer} testID="hamburger-menu-button" />
        
        <View style={styles.headerCenter}>
          <Text style={styles.logoText}>Kvitt</Text>
          <Text style={styles.logoSubtext}>Ledger</Text>
        </View>
        
        <GlassIconButton 
          icon="notifications-outline" 
          onPress={() => {}}
          testID="notifications-button"
        >
          {notifications.length > 0 && <View style={styles.notifBadge} />}
        </GlassIconButton>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />
        }
      >
        {/* Profile Chip & FAB Row */}
        <View style={styles.profileRow}>
          <ProfileChip 
            name={user?.name || user?.email?.split("@")[0] || "Player"} 
            onPress={() => navigation.navigate("Settings")}
            testID="profile-chip"
          />
          <FloatingActionButton 
            onPress={() => navigation.navigate("Groups")} 
            testID="fab-new"
          />
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="alert-circle" size={16} color="#fca5a5" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Stats Cards - Glass Style */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
            <Text style={styles.statValue}>{stats?.total_games || 0}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={[styles.statCard, styles.statCardAccent]}>
            <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
            <Text style={styles.statValue}>
              ${stats?.net_profit ? Math.abs(stats.net_profit).toFixed(0) : "0"}
            </Text>
            <Text style={styles.statLabel}>
              {(stats?.net_profit || 0) >= 0 ? "Profit" : "Loss"}
            </Text>
          </View>
          <View style={styles.statCard}>
            <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
            <Text style={styles.statValue}>
              {stats?.win_rate ? `${stats.win_rate.toFixed(0)}%` : "0%"}
            </Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
        </View>

        {/* Recent Games - Glass Cards */}
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
            <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
            <Ionicons name="game-controller-outline" size={32} color="rgba(255,255,255,0.3)" />
            <Text style={styles.emptyText}>No games yet</Text>
            <Text style={styles.emptySubtext}>Join a group and start playing</Text>
          </View>
        ) : (
          recentGames.map((game: any) => (
            <TouchableOpacity
              key={game.game_id || game._id}
              style={styles.gameCard}
              onPress={() => navigation.navigate("GameNight", { gameId: game.game_id || game._id })}
              activeOpacity={0.7}
              data-testid={`game-card-${game.game_id || game._id}`}
            >
              <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.gameInfo}>
                <Text style={styles.gameTitle}>{game.title || game.group_name || "Game Night"}</Text>
                <Text style={styles.gameSubtext}>
                  {game.player_count || 0} players{game.total_pot ? ` · $${game.total_pot} pot` : ""}
                </Text>
              </View>
              <View style={[styles.statusBadge, game.status === "active" ? styles.statusActive : styles.statusEnded]}>
                <Text style={[styles.statusText, game.status === "active" ? styles.statusActiveText : styles.statusEndedText]}>
                  {game.status === "active" ? "Live" : "Ended"}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Quick Actions - Glass Style */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Quick Actions</Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Groups")} activeOpacity={0.7} data-testid="action-groups">
            <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[styles.actionIconBox, { backgroundColor: "rgba(215,122,66,0.15)" }]}>
              <Ionicons name="people" size={24} color={COLORS.orange} />
            </View>
            <Text style={styles.actionText}>My Groups</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("Settings")} activeOpacity={0.7} data-testid="action-settings">
            <BlurView intensity={BLUR_INTENSITY} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={[styles.actionIconBox, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
              <Ionicons name="settings" size={24} color="#3b82f6" />
            </View>
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
    backgroundColor: "#141414",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: {
    alignItems: "center",
  },
  logoText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  logoSubtext: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
    marginTop: -2,
  },
  notifBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: "#141414",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.08)",
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
    overflow: "hidden",
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
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  statCardAccent: {
    borderColor: "rgba(215,122,66,0.3)",
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "700",
    zIndex: 1,
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    zIndex: 1,
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
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  emptyText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    marginTop: 12,
    zIndex: 1,
  },
  emptySubtext: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
    zIndex: 1,
  },
  gameCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  gameInfo: {
    flex: 1,
    zIndex: 1,
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
    zIndex: 1,
  },
  statusActive: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  statusEnded: {
    backgroundColor: "rgba(255,255,255,0.06)",
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
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    zIndex: 1,
  },
  actionText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "500",
    zIndex: 1,
  },
});
