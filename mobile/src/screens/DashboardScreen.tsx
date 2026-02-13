import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Pressable,
  Animated,
  Modal,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useDrawer } from "../context/DrawerContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { AppDrawer } from "../components/AppDrawer";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const { isDark, colors } = useTheme();
  const { t } = useLanguage();

  const navigation = useNavigation<NavigationProp>();
  const { user, signOut } = useAuth();
  const { toggleDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Animated pulse for live indicator
  const pulseAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // Pulse animation for live games
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, gamesRes, notifRes, groupsRes] = await Promise.all([
        api.get("/stats/me").catch(() => ({ data: null })),
        api.get("/games").catch(() => ({ data: [] })),
        api.get("/notifications").catch(() => ({ data: [] })),
        api.get("/groups").catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      const games = Array.isArray(gamesRes.data) ? gamesRes.data : [];
      setActiveGames(games.filter((g: any) => g.status === "active" || g.status === "scheduled"));
      setRecentGames(games.slice(0, 5));
      const notifs = Array.isArray(notifRes.data) ? notifRes.data : [];
      setNotifications(notifs.filter((n: any) => !n.read));
      setGroups(Array.isArray(groupsRes.data) ? groupsRes.data : []);
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
    { icon: "home-outline" as const, label: t.nav.dashboard, onPress: () => {} },
    { icon: "chatbubble-outline" as const, label: "Chats", onPress: () => navigation.navigate("Groups") },
    { icon: "people-outline" as const, label: t.nav.groups, onPress: () => navigation.navigate("Groups") },
    { icon: "game-controller-outline" as const, label: "Games", onPress: () => navigation.navigate("Groups") },
  ];

  const recentDrawerItems = recentGames.map((game) => ({
    id: game.game_id || game._id || String(Math.random()),
    title: game.title || game.group_name || "Game Night",
    subtitle: game.status === "active" ? "Live" : "Ended",
    onPress: () => navigation.navigate("GameNight", { gameId: game.game_id || game._id }),
  }));

  const userName = user?.name || user?.email?.split("@")[0] || "Player";
  const userInitial = userName[0]?.toUpperCase() || "?";

  // Calculate performance stats
  const netProfit = stats?.net_profit || 0;
  const totalGames = stats?.total_games || 0;
  const winRate = stats?.win_rate || 0;
  const wins = totalGames > 0 ? Math.round((winRate / 100) * totalGames) : 0;
  const losses = totalGames - wins;
  const avgProfit = totalGames > 0 ? netProfit / totalGames : 0;
  const bestWin = stats?.best_win || stats?.biggest_win || 0;
  const worstLoss = stats?.worst_loss || stats?.biggest_loss || 0;
  const totalBuyIns = stats?.total_buy_ins || 0;
  const roiPercent = totalBuyIns > 0 ? (netProfit / totalBuyIns) * 100 : 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "Recent";
    const date = new Date(dateStr);
    return date.toLocaleDateString();
  };

  return (
    <AppDrawer
      menuItems={menuItems}
      recentItems={recentDrawerItems}
      userName={user?.name || user?.email || "Player"}
      userEmail={user?.email}
      onProfilePress={() => navigation.navigate("Settings")}
      onNewPress={() => navigation.navigate("AIAssistant")}
    >
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.contentBg }]}>
        {/* Header Bar */}
        <View style={styles.header}>
          {/* Hamburger Button - Glass style */}
          <Pressable
            style={({ pressed }) => [
              styles.glassButton,
              { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
              pressed && styles.glassButtonPressed
            ]}
            onPress={toggleDrawer}
          >
            <View style={styles.hamburgerLines}>
              <View style={[styles.hamburgerLine, { backgroundColor: colors.textSecondary }]} />
              <View style={[styles.hamburgerLine, { backgroundColor: colors.textSecondary }]} />
              <View style={[styles.hamburgerLine, { backgroundColor: colors.textSecondary }]} />
            </View>
          </Pressable>

          {/* Center - Logo with tagline */}
          <View style={styles.headerCenter}>
            <Text style={[styles.logoText, styles.logoBold, { color: colors.textPrimary }]}>Kvitt</Text>
            <Text style={[styles.logoSubtext, { color: colors.orange }]}>your side, settled</Text>
          </View>

          {/* Notification Button - Glass style */}
          <Pressable
            style={({ pressed }) => [
              styles.glassButton,
              { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
              pressed && styles.glassButtonPressed
            ]}
            onPress={() => navigation.navigate("Settings")}
          >
            <Ionicons
              name="notifications-outline"
              size={22}
              color={colors.textSecondary}
            />
            {notifications.length > 0 && <View style={[styles.notifDot, { backgroundColor: colors.orange }]} />}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.orange}
            />
          }
        >
          {/* Welcome Section with Help Button */}
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeTextContainer}>
              <Text style={[styles.welcomeTitle, { color: colors.textPrimary }]}>
                Welcome back, {userName.split(' ')[0]}
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>
                Here's your poker overview
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.helpButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
              onPress={() => setShowHelpModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>Help</Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={16} color="#fca5a5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Stats Cards with Icons */}
          <View style={styles.statsRow}>
            {/* Net Profit Card */}
            <View style={[styles.statCard, styles.statCardAccent, { backgroundColor: colors.glassBg }]}>
              <View style={styles.statIconRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Net Profit</Text>
                <Ionicons
                  name={netProfit >= 0 ? "trending-up" : "trending-down"}
                  size={16}
                  color={netProfit >= 0 ? colors.success : colors.danger}
                />
              </View>
              <Text style={[styles.statValue, { color: netProfit >= 0 ? colors.success : colors.danger }]}>
                {netProfit >= 0 ? '+' : ''}${Math.abs(netProfit).toFixed(0)}
              </Text>
              <Text style={[styles.statSubtext, { color: colors.textMuted }]}>
                {totalGames} games
              </Text>
            </View>

            {/* Win Rate Card */}
            <View style={[styles.statCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
              <View style={styles.statIconRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Win Rate</Text>
                <Ionicons name="analytics-outline" size={16} color={colors.textMuted} />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {winRate.toFixed(0)}%
              </Text>
              <Text style={[styles.statSubtext, { color: colors.textMuted }]}>
                Best: +${bestWin.toFixed(0)}
              </Text>
            </View>

            {/* Total Games Card */}
            <View style={[styles.statCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
              <View style={styles.statIconRow}>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Games</Text>
                <Ionicons name="game-controller-outline" size={16} color={colors.textMuted} />
              </View>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalGames}</Text>
              <Text style={[styles.statSubtext, { color: colors.textMuted }]}>
                {wins}W / {losses}L
              </Text>
            </View>
          </View>

          {/* Performance Card */}
          {totalGames > 0 && (
            <View style={[styles.performanceCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
              <View style={styles.performanceHeader}>
                <View style={styles.performanceHeaderLeft}>
                  <Ionicons name="bar-chart-outline" size={16} color={colors.orange} />
                  <Text style={[styles.performanceTitle, { color: colors.textSecondary }]}>PERFORMANCE</Text>
                </View>
                <Text style={[styles.gamesCount, { color: colors.textMuted }]}>{totalGames} games</Text>
              </View>
              <View style={styles.performanceGrid}>
                <View style={[styles.performanceItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Text style={styles.perfValue}>
                    <Text style={{ color: colors.success }}>{wins}</Text>
                    <Text style={{ color: colors.textMuted }}>/</Text>
                    <Text style={{ color: colors.danger }}>{losses}</Text>
                  </Text>
                  <Text style={[styles.perfLabel, { color: colors.textMuted }]}>W/L</Text>
                </View>
                <View style={[styles.performanceItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Text style={[styles.perfValue, { color: avgProfit >= 0 ? colors.success : colors.danger }]}>
                    {avgProfit >= 0 ? '+' : ''}${Math.abs(avgProfit).toFixed(0)}
                  </Text>
                  <Text style={[styles.perfLabel, { color: colors.textMuted }]}>Avg</Text>
                </View>
                <View style={[styles.performanceItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Text style={[styles.perfValue, { color: colors.success }]}>
                    +${bestWin.toFixed(0)}
                  </Text>
                  <Text style={[styles.perfLabel, { color: colors.textMuted }]}>Best</Text>
                </View>
                <View style={[styles.performanceItem, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                  <Text style={[styles.perfValue, { color: colors.danger }]}>
                    -${Math.abs(worstLoss).toFixed(0)}
                  </Text>
                  <Text style={[styles.perfLabel, { color: colors.textMuted }]}>Worst</Text>
                </View>
              </View>
              {/* ROI Progress Bar */}
              <View style={styles.roiRow}>
                <Text style={[styles.roiLabel, { color: colors.textMuted }]}>ROI:</Text>
                <View style={[styles.roiBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                  <View
                    style={[
                      styles.roiProgress,
                      {
                        backgroundColor: roiPercent >= 0 ? colors.success : colors.danger,
                        width: `${Math.min(Math.abs(roiPercent), 100)}%`
                      }
                    ]}
                  />
                </View>
                <Text style={[styles.roiValue, { color: roiPercent >= 0 ? colors.success : colors.danger }]}>
                  {roiPercent >= 0 ? '+' : ''}{roiPercent.toFixed(0)}%
                </Text>
              </View>
            </View>
          )}

          {/* Live Games Section */}
          <View style={[styles.sectionCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>LIVE GAMES</Text>
              <Animated.View style={{ opacity: pulseAnim }}>
                <Ionicons name="play" size={16} color={colors.orange} />
              </Animated.View>
            </View>
            {activeGames.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary, paddingVertical: 16 }]}>
                No active games right now
              </Text>
            ) : (
              <View style={styles.itemsContainer}>
                {activeGames.slice(0, 3).map((game) => (
                  <TouchableOpacity
                    key={game.game_id || game._id}
                    style={[
                      styles.itemCard,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                    ]}
                    onPress={() => navigation.navigate("GameNight", { gameId: game.game_id || game._id })}
                    activeOpacity={0.7}
                  >
                    <Animated.View style={[styles.liveIndicator, { opacity: pulseAnim }]} />
                    <View style={styles.liveGameInfo}>
                      <Text style={[styles.liveGameTitle, { color: colors.textPrimary }]}>
                        {game.title || game.group_name || "Game Night"}
                      </Text>
                      <Text style={[styles.liveGameMeta, { color: colors.textMuted }]}>
                        {game.player_count || 0} players{game.total_pot ? ` · $${game.total_pot} pot` : ''}
                      </Text>
                    </View>
                    <View style={styles.liveBadge}>
                      <Text style={styles.liveBadgeText}>
                        {game.status === 'active' ? 'LIVE' : 'SCHEDULED'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[styles.viewAllButton, { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}
              onPress={() => navigation.navigate("Groups")}
              activeOpacity={0.7}
            >
              <Text style={[styles.viewAllText, { color: colors.orange }]}>View All Games</Text>
            </TouchableOpacity>
          </View>

          {/* My Groups Section */}
          <View style={[styles.sectionCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>MY GROUPS</Text>
              <Ionicons name="people" size={16} color={colors.textMuted} />
            </View>
            {groups.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary, paddingVertical: 16 }]}>
                No groups yet. Create one!
              </Text>
            ) : (
              <View style={styles.itemsContainer}>
                {groups.slice(0, 3).map((group) => (
                  <TouchableOpacity
                    key={group.group_id || group._id}
                    style={[
                      styles.itemCard,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                    ]}
                    onPress={() => navigation.navigate("Groups")}
                    activeOpacity={0.7}
                  >
                    <View style={styles.groupInfo}>
                      <View style={styles.groupNameRow}>
                        <Text style={[styles.groupName, { color: colors.textPrimary }]}>{group.name}</Text>
                        {group.user_role === 'admin' && (
                          <View style={styles.adminBadge}>
                            <Ionicons name="star" size={10} color="#eab308" />
                            <Text style={styles.adminText}>Admin</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.groupMeta, { color: colors.textMuted }]}>
                        {group.member_count || 0} members
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <TouchableOpacity
              style={[styles.manageButton, { backgroundColor: colors.orange }]}
              onPress={() => navigation.navigate("Groups")}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.manageButtonText}>Manage Groups</Text>
            </TouchableOpacity>
          </View>

          {/* Recent Results Section */}
          {recentGames.length > 0 && (
            <View style={[styles.sectionCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>RECENT RESULTS</Text>
                <TouchableOpacity onPress={() => navigation.navigate("Groups")}>
                  <Text style={[styles.seeAll, { color: colors.orange }]}>See all</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.itemsContainer}>
                {recentGames.map((game, index) => {
                  const gameResult = game.net_result || game.result || 0;
                  return (
                    <TouchableOpacity
                      key={game.game_id || game._id || index}
                      style={[
                        styles.itemCard,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                      ]}
                      onPress={() => navigation.navigate("GameNight", { gameId: game.game_id || game._id })}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.recentGameTitle, { color: colors.textPrimary }]}>
                          {game.title || game.group_name || "Game Night"}
                        </Text>
                        <Text style={[styles.recentGameDate, { color: colors.textMuted }]}>
                          {formatDate(game.ended_at || game.date)}
                        </Text>
                      </View>
                      <Text style={[styles.recentResult, { color: gameResult >= 0 ? colors.success : colors.danger }]}>
                        {gameResult >= 0 ? '+' : ''}{gameResult.toFixed(0)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Quick Actions */}
          <Text style={[styles.quickActionsTitle, { color: colors.textSecondary }]}>
            Quick Actions
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
              onPress={() => navigation.navigate("Groups")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconBox,
                  { backgroundColor: "rgba(232,132,92,0.15)" },
                ]}
              >
                <Ionicons name="people" size={24} color={colors.orange} />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>My Groups</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
              onPress={() => navigation.navigate("AIAssistant")}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.actionIconBox,
                  { backgroundColor: "rgba(139,92,246,0.15)" },
                ]}
              >
                <Ionicons name="chatbubbles" size={24} color="#8b5cf6" />
              </View>
              <Text style={[styles.actionText, { color: colors.textPrimary }]}>AI Chat</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom spacing for FAB */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Help Modal */}
        <Modal
          visible={showHelpModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHelpModal(false)}
        >
          <Pressable
            style={styles.helpModalOverlay}
            onPress={() => setShowHelpModal(false)}
          >
            <Pressable style={[styles.helpModalContent, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
              <View style={styles.helpModalHeader}>
                <Text style={[styles.helpModalTitle, { color: colors.textPrimary }]}>Getting Started</Text>
                <TouchableOpacity onPress={() => setShowHelpModal(false)}>
                  <Ionicons name="close" size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.helpTipsList}>
                <View style={styles.helpTip}>
                  <View style={[styles.helpTipIcon, { backgroundColor: "rgba(232,132,92,0.15)" }]}>
                    <Ionicons name="people" size={20} color={colors.orange} />
                  </View>
                  <View style={styles.helpTipText}>
                    <Text style={[styles.helpTipTitle, { color: colors.textPrimary }]}>Create a Group</Text>
                    <Text style={[styles.helpTipDesc, { color: colors.textSecondary }]}>Start by creating a poker group and inviting friends</Text>
                  </View>
                </View>

                <View style={styles.helpTip}>
                  <View style={[styles.helpTipIcon, { backgroundColor: "rgba(34,197,94,0.15)" }]}>
                    <Ionicons name="game-controller" size={20} color="#22c55e" />
                  </View>
                  <View style={styles.helpTipText}>
                    <Text style={[styles.helpTipTitle, { color: colors.textPrimary }]}>Start a Game Night</Text>
                    <Text style={[styles.helpTipDesc, { color: colors.textSecondary }]}>Track buy-ins, rebuys, and cash-outs in real-time</Text>
                  </View>
                </View>

                <View style={styles.helpTip}>
                  <View style={[styles.helpTipIcon, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                    <Ionicons name="wallet" size={20} color="#3b82f6" />
                  </View>
                  <View style={styles.helpTipText}>
                    <Text style={[styles.helpTipTitle, { color: colors.textPrimary }]}>Auto Settlement</Text>
                    <Text style={[styles.helpTipDesc, { color: colors.textSecondary }]}>We calculate who owes whom automatically</Text>
                  </View>
                </View>

                <View style={styles.helpTip}>
                  <View style={[styles.helpTipIcon, { backgroundColor: "rgba(139,92,246,0.15)" }]}>
                    <Ionicons name="chatbubbles" size={20} color="#8b5cf6" />
                  </View>
                  <View style={styles.helpTipText}>
                    <Text style={[styles.helpTipTitle, { color: colors.textPrimary }]}>AI Assistant</Text>
                    <Text style={[styles.helpTipDesc, { color: colors.textSecondary }]}>Ask questions about your stats and game history</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.helpModalButton, { backgroundColor: colors.orange }]}
                onPress={() => setShowHelpModal(false)}
              >
                <Text style={styles.helpModalButtonText}>Got it!</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </AppDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glassButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.95 }],
  },
  hamburgerLines: {
    gap: 5,
    alignItems: "center",
  },
  hamburgerLine: {
    width: 18,
    height: 1.5,
    borderRadius: 1,
  },
  headerCenter: {
    alignItems: "center",
  },
  logoText: {
    fontSize: 22,
    fontWeight: "500",
  },
  logoBold: {
    fontWeight: "800",
  },
  logoSubtext: {
    fontSize: 11,
    marginTop: 0,
    fontWeight: "500",
  },
  notifDot: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  // Welcome Section
  welcomeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  welcomeTextContainer: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  welcomeSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  welcomeBrand: {
    fontWeight: "800",
    color: "#EF6E59",
  },
  helpButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  helpText: {
    fontSize: 12,
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
  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  statCardAccent: {
    borderColor: "rgba(232,132,92,0.3)",
  },
  statIconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statSubtext: {
    fontSize: 10,
    marginTop: 4,
  },
  // Performance Card
  performanceCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  performanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  performanceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  performanceTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  gamesCount: {
    fontSize: 11,
  },
  performanceGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  performanceItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
  },
  perfValue: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  perfLabel: {
    fontSize: 9,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // ROI Row
  roiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  roiLabel: {
    fontSize: 11,
  },
  roiBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  roiProgress: {
    height: "100%",
    borderRadius: 3,
  },
  roiValue: {
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "monospace",
    minWidth: 45,
    textAlign: "right",
  },
  // Section Card (Live Games, Groups, Recent)
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
  },
  // Items container and card for section items
  itemsContainer: {
    gap: 8,
    marginTop: 8,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
  },
  // Live Games
  liveGameItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
    marginRight: 12,
  },
  liveGameInfo: {
    flex: 1,
  },
  liveGameTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  liveGameMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  liveBadge: {
    backgroundColor: "rgba(34,197,94,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#22c55e",
  },
  viewAllButton: {
    paddingTop: 12,
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Groups
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupName: {
    fontSize: 14,
    fontWeight: "600",
  },
  groupMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(234,179,8,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  adminText: {
    fontSize: 9,
    fontWeight: "600",
    color: "#eab308",
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
  },
  manageButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  // Recent Results
  recentResultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  recentGameTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  recentGameDate: {
    fontSize: 11,
    marginTop: 2,
  },
  recentResult: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  // Quick Actions
  quickActionsTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
  },
  actionCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
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
    fontSize: 13,
    fontWeight: "500",
  },
  // Help Modal
  helpModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  helpModalContent: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 24,
  },
  helpModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  helpModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  helpTipsList: {
    gap: 16,
  },
  helpTip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  helpTipIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  helpTipText: {
    flex: 1,
  },
  helpTipTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  helpTipDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  helpModalButton: {
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  helpModalButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
