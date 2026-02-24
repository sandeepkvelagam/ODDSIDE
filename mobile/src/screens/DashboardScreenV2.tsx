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
} from "react-native";
import { AnimatedModal } from "../components/AnimatedModal";
import { AnimatedButton } from "../components/AnimatedButton";
import { OnboardingAgent, hasCompletedOnboarding } from "../components/OnboardingAgent";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useDrawer } from "../context/DrawerContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { AppDrawer } from "../components/AppDrawer";
import { AIChatFab } from "../components/AIChatFab";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Liquid Glass Design System Colors
const LIQUID_COLORS = {
  // Backgrounds
  jetDark: "#282B2B",
  jetSurface: "#323535",

  // Brand
  orange: "#EE6C29",
  orangeDark: "#C45A22",
  trustBlue: "#3B82F6",
  moonstone: "#7AA6B3",

  // Glass effects
  liquidGlassBg: "rgba(255, 255, 255, 0.06)",
  liquidGlassBorder: "rgba(255, 255, 255, 0.12)",
  liquidInnerBg: "rgba(255, 255, 255, 0.03)",
  liquidGlowOrange: "rgba(238, 108, 41, 0.15)",
  liquidGlowBlue: "rgba(59, 130, 246, 0.15)",
  glassBg: "rgba(255, 255, 255, 0.08)",
  glassBorder: "rgba(255, 255, 255, 0.12)",

  // Text
  textPrimary: "#F5F5F5",
  textSecondary: "#B8B8B8",
  textMuted: "#7A7A7A",

  // Status
  success: "#22C55E",
  danger: "#EF4444",
};

export function DashboardScreenV2() {
  const { isDark, colors } = useTheme();
  const { t } = useLanguage();

  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { toggleDrawer } = useDrawer();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<any>(null);
  const [balances, setBalances] = useState<any>({ net_balance: 0, total_you_owe: 0, total_owed_to_you: 0 });
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [activeGames, setActiveGames] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnboardingAgent, setShowOnboardingAgent] = useState(false);
  const [showStatModal, setShowStatModal] = useState<'profit' | 'winrate' | null>(null);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false);

  // Animated pulse for live indicator
  const pulseAnim = useState(new Animated.Value(1))[0];
  const glowAnim = useState(new Animated.Value(0.5))[0];

  // Entrance animations for staggered fade-in
  const entranceAnim = useState(new Animated.Value(0))[0];
  const statsEntrance = useState(new Animated.Value(0))[0];
  const perfEntrance = useState(new Animated.Value(0))[0];
  const sectionsEntrance = useState(new Animated.Value(0))[0];

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

    // Glow animation for cards
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    glow.start();

    // Staggered entrance animations
    Animated.stagger(100, [
      Animated.spring(entranceAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(statsEntrance, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(perfEntrance, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(sectionsEntrance, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
    ]).start();

    return () => {
      pulse.stop();
      glow.stop();
    };
  }, [pulseAnim, glowAnim, entranceAnim, statsEntrance, perfEntrance, sectionsEntrance]);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const [statsRes, gamesRes, notifRes, groupsRes, balancesRes] = await Promise.all([
        api.get("/stats/me").catch(() => ({ data: null })),
        api.get("/games").catch(() => ({ data: [] })),
        api.get("/notifications").catch(() => ({ data: [] })),
        api.get("/groups").catch(() => ({ data: [] })),
        api.get("/ledger/consolidated").catch(() => ({ data: { net_balance: 0, total_you_owe: 0, total_owed_to_you: 0 } })),
      ]);
      setStats(statsRes.data);
      setBalances(balancesRes.data);
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

  // Auto-show onboarding agent for first-time users
  useEffect(() => {
    hasCompletedOnboarding().then((done) => {
      if (!done) {
        // Small delay to let dashboard load first
        const t = setTimeout(() => setShowOnboardingAgent(true), 800);
        return () => clearTimeout(t);
      }
    });
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  }, [fetchDashboard]);

  const menuItems = [
    { icon: "home-outline" as const, label: t.nav.dashboard, onPress: () => {} },
    { icon: "chatbubbles-outline" as const, label: t.nav.chats, onPress: () => navigation.navigate("Chats") },
    { icon: "people-outline" as const, label: t.nav.groups, onPress: () => navigation.navigate("Groups") },
    { icon: "game-controller-outline" as const, label: t.nav.games, onPress: () => navigation.navigate("Groups") },
    { icon: "wallet-outline" as const, label: t.nav.wallet, onPress: () => navigation.navigate("Wallet") },
    {
      icon: "notifications-outline" as const,
      label: t.nav.notifications,
      onPress: () => setShowNotificationsPanel(true),
      badge: notifications.length > 0 ? notifications.length : undefined,
    },
    { icon: "flash-outline" as const, label: t.nav.automations, onPress: () => navigation.navigate("Automations") },
  ];

  const recentDrawerItems = recentGames.map((game) => ({
    id: game.game_id || game._id || String(Math.random()),
    title: game.title || game.group_name || "Game Night",
    subtitle: game.status === "active" ? "Live" : "Ended",
    onPress: () => navigation.navigate("GameNight", { gameId: game.game_id || game._id }),
  }));

  const userName = user?.name || user?.email?.split("@")[0] || "Player";

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

  const formatNotifTime = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const h = diff / 3600000;
    if (h < 1) return "Just now";
    if (h < 24) return `${Math.floor(h)}h ago`;
    if (h < 48) return "Yesterday";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getNotifIcon = (type: string): { icon: string; color: string } => {
    const map: Record<string, { icon: string; color: string }> = {
      game_started: { icon: "play-circle", color: LIQUID_COLORS.success },
      game_ended: { icon: "stop-circle", color: LIQUID_COLORS.textMuted },
      settlement_generated: { icon: "calculator", color: "#F59E0B" },
      invite_accepted: { icon: "person-add", color: LIQUID_COLORS.success },
      wallet_received: { icon: "wallet", color: LIQUID_COLORS.success },
      group_invite: { icon: "people", color: LIQUID_COLORS.orange },
    };
    return map[type] || { icon: "notifications", color: LIQUID_COLORS.moonstone };
  };

  const handleNotificationPress = async (notif: any) => {
    // Mark as read and remove from unread list
    try {
      await api.put(`/notifications/${notif.notification_id}/read`);
      setNotifications(prev => prev.filter(n => n.notification_id !== notif.notification_id));
    } catch {}

    setShowNotificationsPanel(false);

    // Navigate based on notification type
    if (notif.type === "game_started" || notif.type === "game_ended") {
      if (notif.data?.game_id) {
        navigation.navigate("GameNight", { gameId: notif.data.game_id });
      }
    } else if (notif.type === "settlement_generated") {
      if (notif.data?.game_id) {
        navigation.navigate("GameNight", { gameId: notif.data.game_id });
      }
    } else if (notif.type === "group_invite" || notif.type === "invite_accepted") {
      if (notif.data?.group_id) {
        navigation.navigate("GroupHub", { groupId: notif.data.group_id });
      }
    } else if (notif.type === "wallet_received") {
      navigation.navigate("Wallet");
    }
  };

  // Use liquid glass colors for dark mode, fall back to theme colors for light
  const lc = isDark ? LIQUID_COLORS : {
    ...LIQUID_COLORS,
    jetDark: colors.background,
    jetSurface: colors.surface,
    liquidGlassBg: "rgba(0, 0, 0, 0.04)",
    liquidGlassBorder: "rgba(0, 0, 0, 0.08)",
    liquidInnerBg: "rgba(0, 0, 0, 0.02)",
    textPrimary: colors.textPrimary,
    textSecondary: colors.textSecondary,
    textMuted: colors.textMuted,
  };

  return (
    <AppDrawer
      menuItems={menuItems}
      recentItems={recentDrawerItems}
      userName={user?.name || user?.email || "Player"}
      userEmail={user?.email}
      onProfilePress={() => navigation.navigate("Settings")}
      onNewPress={() => navigation.navigate("AIAssistant")}
      onAllGamesPress={() => navigation.navigate("Groups")}
    >
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: lc.jetDark }]}>
        {/* Header Bar */}
        <View style={styles.header}>
          {/* Hamburger Button - Glass style with orange glow */}
          <Pressable
            style={({ pressed }) => [
              styles.glassButton,
              { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder },
              pressed && [styles.glassButtonPressed, { shadowColor: lc.orange }]
            ]}
            onPress={toggleDrawer}
          >
            <View style={styles.hamburgerLines}>
              <View style={[styles.hamburgerLine, { backgroundColor: lc.textSecondary }]} />
              <View style={[styles.hamburgerLine, { backgroundColor: lc.textSecondary }]} />
              <View style={[styles.hamburgerLine, { backgroundColor: lc.textSecondary }]} />
            </View>
          </Pressable>

          {/* Center - Logo with orange tagline */}
          <View style={styles.headerCenter}>
            <Text style={[styles.logoText, { color: lc.textPrimary }]}>Kvitt</Text>
            <Text style={[styles.logoSubtext, { color: lc.orange }]}>your side, settled</Text>
          </View>

          {/* Notification Button - Glass style */}
          <Pressable
            style={({ pressed }) => [
              styles.glassButton,
              { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder },
              pressed && styles.glassButtonPressed
            ]}
            onPress={() => setShowNotificationsPanel(true)}
          >
            <Ionicons name="notifications-outline" size={22} color={lc.textSecondary} />
            {notifications.length > 0 && <View style={[styles.notifDot, { backgroundColor: lc.orange }]} />}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={lc.orange} />
          }
        >
          {/* Welcome Section */}
          <View style={styles.welcomeRow}>
            <View style={styles.welcomeTextContainer}>
              <Text style={[styles.welcomeTitle, { color: lc.textPrimary }]}>
                Welcome back, {userName.split(' ')[0]}
              </Text>
              <Text style={[styles.welcomeSubtitle, { color: lc.moonstone }]}>
                Here's your poker overview
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.helpButtonSmall, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
              onPress={() => setShowOnboardingAgent(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="help-circle-outline" size={14} color={lc.moonstone} />
            </TouchableOpacity>
          </View>

          {error && (
            <View style={[styles.errorBanner, { borderColor: "rgba(239,68,68,0.3)" }]}>
              <Ionicons name="alert-circle" size={16} color={lc.danger} />
              <Text style={[styles.errorText, { color: lc.danger }]}>{error}</Text>
            </View>
          )}

          {/* Stats Cards - 3 Column Grid like Web */}
          <Animated.View style={[styles.statsRowThree, {
            opacity: statsEntrance,
            transform: [{
              translateY: statsEntrance.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }]}>
            {/* Net Profit Card - Orange Glow */}
            <TouchableOpacity
              style={[styles.liquidCardThird, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
              activeOpacity={0.8}
              onPress={() => setShowStatModal('profit')}
            >
              <View style={[styles.liquidInnerSmall, { backgroundColor: lc.liquidGlowOrange }]}>
                <View style={styles.statIconRowSmall}>
                  <Text style={[styles.statLabelSmall, { color: lc.moonstone }]}>NET PROFIT</Text>
                  <Ionicons
                    name={netProfit >= 0 ? "trending-up" : "trending-down"}
                    size={12}
                    color={netProfit >= 0 ? lc.success : lc.danger}
                  />
                </View>
                <Text style={[styles.statValueSmall, { color: netProfit >= 0 ? lc.success : lc.danger }]}>
                  {netProfit >= 0 ? '+' : ''}${Math.abs(netProfit).toFixed(0)}
                </Text>
                <Text style={[styles.statSubtextSmall, { color: lc.textMuted }]}>
                  {totalGames} games
                </Text>
              </View>
            </TouchableOpacity>

            {/* Win Rate Card - Blue Glow */}
            <TouchableOpacity
              style={[styles.liquidCardThird, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
              activeOpacity={0.8}
              onPress={() => setShowStatModal('winrate')}
            >
              <View style={[styles.liquidInnerSmall, { backgroundColor: lc.liquidGlowBlue }]}>
                <View style={styles.statIconRowSmall}>
                  <Text style={[styles.statLabelSmall, { color: lc.moonstone }]}>WIN RATE</Text>
                  <Ionicons name="analytics-outline" size={12} color={lc.trustBlue} />
                </View>
                <Text style={[styles.statValueSmall, { color: lc.trustBlue }]}>
                  {winRate.toFixed(0)}%
                </Text>
                <Text style={[styles.statSubtextSmall, { color: lc.textMuted }]}>
                  {wins}W / {losses}L
                </Text>
              </View>
            </TouchableOpacity>

            {/* Balance Card - Green/Red Glow */}
            <TouchableOpacity
              style={[styles.liquidCardThird, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
              activeOpacity={0.8}
              onPress={() => setShowBalanceModal(true)}
            >
              <View style={[styles.liquidInnerSmall, { backgroundColor: balances.net_balance >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)" }]}>
                <View style={styles.statIconRowSmall}>
                  <Text style={[styles.statLabelSmall, { color: lc.moonstone }]}>BALANCE</Text>
                  <Ionicons name="wallet-outline" size={12} color={balances.net_balance >= 0 ? lc.success : lc.danger} />
                </View>
                <Text style={[styles.statValueSmall, { color: balances.net_balance >= 0 ? lc.success : lc.danger }]}>
                  {balances.net_balance >= 0 ? '+' : ''}${Math.abs(balances.net_balance || 0).toFixed(0)}
                </Text>
                <Text style={[styles.statSubtextSmall, { color: lc.textMuted }]}>
                  ${(balances.total_you_owe || 0).toFixed(0)} owed
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Performance Card - Full Width Liquid Glass */}
          {totalGames > 0 && (
            <Animated.View style={[styles.liquidCardFull, {
              backgroundColor: lc.liquidGlassBg,
              borderColor: lc.liquidGlassBorder,
              opacity: perfEntrance,
              transform: [{
                translateY: perfEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })
              }]
            }]}>
              <View style={[styles.liquidInnerFull, { backgroundColor: lc.liquidInnerBg }]}>
                <View style={styles.performanceHeader}>
                  <View style={styles.performanceHeaderLeft}>
                    <Ionicons name="bar-chart-outline" size={16} color={lc.orange} />
                    <Text style={[styles.performanceTitle, { color: lc.moonstone }]}>PERFORMANCE</Text>
                  </View>
                  <Text style={[styles.gamesCount, { color: lc.textMuted }]}>{totalGames} games</Text>
                </View>

                <View style={styles.performanceGrid}>
                  <View style={[styles.perfItem, { backgroundColor: lc.liquidGlassBg }]}>
                    <Text style={[styles.perfValue, { color: avgProfit >= 0 ? lc.success : lc.danger }]}>
                      {avgProfit >= 0 ? '+' : ''}${Math.abs(avgProfit).toFixed(0)}
                    </Text>
                    <Text style={[styles.perfLabel, { color: lc.textMuted }]}>AVG</Text>
                  </View>
                  <View style={[styles.perfItem, { backgroundColor: lc.liquidGlassBg }]}>
                    <Text style={[styles.perfValue, { color: lc.success }]}>
                      +${bestWin.toFixed(0)}
                    </Text>
                    <Text style={[styles.perfLabel, { color: lc.textMuted }]}>BEST</Text>
                  </View>
                  <View style={[styles.perfItem, { backgroundColor: lc.liquidGlassBg }]}>
                    <Text style={[styles.perfValue, { color: lc.danger }]}>
                      -${Math.abs(worstLoss).toFixed(0)}
                    </Text>
                    <Text style={[styles.perfLabel, { color: lc.textMuted }]}>WORST</Text>
                  </View>
                  <View style={[styles.perfItem, { backgroundColor: lc.liquidGlassBg }]}>
                    <Text style={[styles.perfValue, { color: roiPercent >= 0 ? lc.success : lc.danger }]}>
                      {roiPercent >= 0 ? '+' : ''}{roiPercent.toFixed(0)}%
                    </Text>
                    <Text style={[styles.perfLabel, { color: lc.textMuted }]}>ROI</Text>
                  </View>
                </View>

                {/* ROI Progress Bar - like web app */}
                <View style={styles.roiBarContainer}>
                  <Text style={[styles.roiBarLabel, { color: lc.textMuted }]}>ROI:</Text>
                  <View style={[styles.roiBarTrack, { backgroundColor: lc.liquidGlassBg }]}>
                    <View
                      style={[
                        styles.roiBarFill,
                        {
                          width: `${Math.min(Math.max(roiPercent, 0), 100)}%`,
                          backgroundColor: lc.orange
                        }
                      ]}
                    />
                  </View>
                  <Text style={[styles.roiBarValue, { color: roiPercent >= 0 ? lc.success : lc.danger }]}>
                    {roiPercent.toFixed(0)}%
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Live Games Section - Liquid Glass */}
          <Animated.View style={[styles.liquidCardFull, {
            backgroundColor: lc.liquidGlassBg,
            borderColor: lc.liquidGlassBorder,
            opacity: sectionsEntrance,
            transform: [{
              translateY: sectionsEntrance.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Animated.View style={{ opacity: pulseAnim }}>
                  <View style={[styles.liveDot, { backgroundColor: lc.success }]} />
                </Animated.View>
                <Text style={[styles.sectionTitle, { color: lc.moonstone }]}>LIVE GAMES</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={lc.textMuted} />
            </View>

            {activeGames.length === 0 ? (
              <View style={[styles.liquidInnerFull, { backgroundColor: lc.liquidInnerBg }]}>
                <Text style={[styles.emptyText, { color: lc.textSecondary }]}>
                  No active games right now
                </Text>
              </View>
            ) : (
              <View style={[styles.liquidInnerFull, { backgroundColor: lc.liquidInnerBg }]}>
                {activeGames.slice(0, 3).map((game, idx) => (
                  <TouchableOpacity
                    key={game.game_id || game._id}
                    style={[
                      styles.gameItem,
                      idx < activeGames.length - 1 && { borderBottomWidth: 1, borderBottomColor: lc.liquidGlassBorder }
                    ]}
                    onPress={() => navigation.navigate("GameNight", { gameId: game.game_id || game._id })}
                    activeOpacity={0.7}
                  >
                    <Animated.View style={[styles.liveIndicator, { opacity: pulseAnim, backgroundColor: lc.success }]} />
                    <View style={styles.gameInfo}>
                      <Text style={[styles.gameTitle, { color: lc.textPrimary }]}>
                        {game.title || game.group_name || "Game Night"}
                      </Text>
                      <Text style={[styles.gameMeta, { color: lc.textMuted }]}>
                        {game.player_count || 0} players{game.total_pot ? ` · $${game.total_pot} pot` : ''}
                      </Text>
                    </View>
                    {/* Trust Blue Join Button */}
                    <TouchableOpacity
                      style={[styles.joinButton, { backgroundColor: lc.trustBlue }]}
                      onPress={() => navigation.navigate("GameNight", { gameId: game.game_id || game._id })}
                    >
                      <Text style={styles.joinButtonText}>Join</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </Animated.View>

          {/* My Groups Section */}
          <Animated.View style={[styles.liquidCardFull, {
            backgroundColor: lc.liquidGlassBg,
            borderColor: lc.liquidGlassBorder,
            opacity: sectionsEntrance,
            transform: [{
              translateY: sectionsEntrance.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderLeft}>
                <Ionicons name="people" size={16} color={lc.orange} />
                <Text style={[styles.sectionTitle, { color: lc.moonstone }]}>MY GROUPS</Text>
              </View>
              <Text style={[styles.countBadge, { color: lc.textMuted }]}>{groups.length}</Text>
            </View>

            {groups.length === 0 ? (
              <View style={[styles.liquidInnerFull, { backgroundColor: lc.liquidInnerBg }]}>
                <Text style={[styles.emptyText, { color: lc.textSecondary }]}>
                  No groups yet. Create one!
                </Text>
              </View>
            ) : (
              <View style={[styles.liquidInnerFull, { backgroundColor: lc.liquidInnerBg }]}>
                {groups.slice(0, 3).map((group, idx) => (
                  <TouchableOpacity
                    key={group.group_id || group._id}
                    style={[
                      styles.groupItem,
                      idx < groups.length - 1 && { borderBottomWidth: 1, borderBottomColor: lc.liquidGlassBorder }
                    ]}
                    onPress={() => navigation.navigate("GroupHub", { groupId: group.group_id, groupName: group.name })}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.groupAvatar, { backgroundColor: lc.liquidGlowOrange }]}>
                      <Text style={[styles.groupAvatarText, { color: lc.orange }]}>
                        {group.name?.[0]?.toUpperCase() || "G"}
                      </Text>
                    </View>
                    <View style={styles.groupInfo}>
                      <View style={styles.groupNameRow}>
                        <Text style={[styles.groupName, { color: lc.textPrimary }]}>{group.name}</Text>
                        {group.user_role === 'admin' && (
                          <View style={[styles.adminBadge, { backgroundColor: "rgba(234,179,8,0.15)" }]}>
                            <Ionicons name="shield" size={10} color="#eab308" />
                            <Text style={styles.adminText}>Admin</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.groupMeta, { color: lc.textMuted }]}>
                        {group.member_count || 0} members
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={lc.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Darkened Brand Button */}
            <TouchableOpacity
              style={[styles.manageButton, { backgroundColor: lc.orangeDark }]}
              onPress={() => navigation.navigate("Groups")}
              activeOpacity={0.8}
            >
              <Ionicons name="apps" size={18} color="#fff" />
              <Text style={styles.manageButtonText}>Manage Groups</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Recent Results Section */}
          {recentGames.length > 0 && (
            <Animated.View style={[styles.liquidCardFull, {
              backgroundColor: lc.liquidGlassBg,
              borderColor: lc.liquidGlassBorder,
              opacity: sectionsEntrance,
              transform: [{
                translateY: sectionsEntrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                })
              }]
            }]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Ionicons name="time" size={16} color={lc.trustBlue} />
                  <Text style={[styles.sectionTitle, { color: lc.moonstone }]}>RECENT RESULTS</Text>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate("Groups")} activeOpacity={0.6}>
                  <Text style={[styles.seeAll, { color: lc.orange }]}>See all</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.liquidInnerFull, { backgroundColor: lc.liquidInnerBg }]}>
                {recentGames.map((game, index) => {
                  const gameResult = game.net_result || game.result || 0;
                  return (
                    <TouchableOpacity
                      key={game.game_id || game._id || index}
                      style={[
                        styles.resultItem,
                        index < recentGames.length - 1 && { borderBottomWidth: 1, borderBottomColor: lc.liquidGlassBorder }
                      ]}
                      onPress={() => navigation.navigate("GameNight", { gameId: game.game_id || game._id })}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.resultTitle, { color: lc.textPrimary }]}>
                          {game.title || game.group_name || "Game Night"}
                        </Text>
                        <Text style={[styles.resultDate, { color: lc.textMuted }]}>
                          {formatDate(game.ended_at || game.date)}
                        </Text>
                      </View>
                      <Text style={[styles.resultValue, { color: gameResult >= 0 ? lc.success : lc.danger }]}>
                        {gameResult >= 0 ? '+' : ''}${Math.abs(gameResult).toFixed(0)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* Quick Actions with Trust Blue + Darkened Brand */}
          <Animated.View style={{
            opacity: sectionsEntrance,
            transform: [{
              translateY: sectionsEntrance.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }}>
            <Text style={[styles.quickActionsTitle, { color: lc.moonstone }]}>Quick Actions</Text>
          </Animated.View>
          <Animated.View style={[styles.actionsRow, {
            opacity: sectionsEntrance,
            transform: [{
              translateY: sectionsEntrance.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              })
            }]
          }]}>
            {/* Trust Blue - Start Game */}
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: lc.trustBlue }]}
              onPress={() => navigation.navigate("Groups")}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={28} color="#fff" />
              <Text style={styles.actionTextWhite}>Start Game</Text>
            </TouchableOpacity>

            {/* Darkened Brand - AI Chat */}
            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: lc.orangeDark }]}
              onPress={() => navigation.navigate("AIAssistant")}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={28} color="#fff" />
              <Text style={styles.actionTextWhite}>AI Chat</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Bottom spacing */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Onboarding Agent - Conversational guide */}
        <OnboardingAgent
          visible={showOnboardingAgent}
          userName={userName}
          onComplete={() => setShowOnboardingAgent(false)}
          onNavigate={(screen: string) => navigation.navigate(screen as any)}
        />

        {/* Stat Details Modal - Enhanced with Gradient Hero */}
        <AnimatedModal
          visible={showStatModal !== null}
          onClose={() => setShowStatModal(null)}
          blurIntensity={60}
        >
          <View style={[styles.helpModalContent, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.helpModalHeader}>
              <Text style={[styles.helpModalTitle, { color: lc.textPrimary }]}>
                {showStatModal === 'profit' ? 'Net Profit Details' : 'Win Rate Details'}
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: lc.glassBg }]}
                onPress={() => setShowStatModal(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={lc.textMuted} />
              </TouchableOpacity>
            </View>

            {showStatModal === 'profit' ? (
              <>
                {/* Gradient Hero Card */}
                <LinearGradient
                  colors={netProfit >= 0 ? ['#166534', '#22C55E', '#4ADE80'] : ['#991B1B', '#EF4444', '#F87171']}
                  style={styles.statHeroCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons
                    name={netProfit >= 0 ? "trending-up" : "trending-down"}
                    size={32}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={styles.statHeroValue}>
                    {netProfit >= 0 ? '+' : ''}${Math.abs(netProfit).toFixed(2)}
                  </Text>
                  <Text style={styles.statHeroLabel}>Total Profit/Loss</Text>
                </LinearGradient>

                {/* Stat Pills Grid */}
                <View style={styles.statPillsGrid}>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillValue}>{totalGames}</Text>
                    <Text style={styles.statPillLabel}>Games</Text>
                  </View>
                  <View style={styles.statPill}>
                    <Text style={[styles.statPillValue, { color: avgProfit >= 0 ? lc.success : lc.danger }]}>
                      ${Math.abs(avgProfit).toFixed(0)}
                    </Text>
                    <Text style={styles.statPillLabel}>Avg</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                    <Text style={[styles.statPillValue, { color: lc.success }]}>+${bestWin.toFixed(0)}</Text>
                    <Text style={styles.statPillLabel}>Best</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                    <Text style={[styles.statPillValue, { color: lc.danger }]}>-${Math.abs(worstLoss).toFixed(0)}</Text>
                    <Text style={styles.statPillLabel}>Worst</Text>
                  </View>
                </View>

                {/* Additional Stats */}
                <View style={styles.statDetailSection}>
                  <View style={[styles.statDetailRow, { borderBottomColor: lc.liquidGlassBorder }]}>
                    <Text style={[styles.statDetailLabel, { color: lc.textSecondary }]}>Total Buy-ins</Text>
                    <Text style={[styles.statDetailValue, { color: lc.textPrimary }]}>${totalBuyIns.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.statDetailRow, { borderBottomColor: 'transparent' }]}>
                    <Text style={[styles.statDetailLabel, { color: lc.textSecondary }]}>ROI</Text>
                    <Text style={[styles.statDetailValue, { color: roiPercent >= 0 ? lc.success : lc.danger }]}>
                      {roiPercent >= 0 ? '+' : ''}{roiPercent.toFixed(1)}%
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Blue Gradient Hero for Win Rate */}
                <LinearGradient
                  colors={['#1E40AF', '#3B82F6', '#60A5FA']}
                  style={styles.statHeroCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="analytics" size={32} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.statHeroValue}>{winRate.toFixed(1)}%</Text>
                  <Text style={styles.statHeroLabel}>Win Rate</Text>
                </LinearGradient>

                {/* W/L Stat Pills */}
                <View style={styles.statPillsGrid}>
                  <View style={styles.statPill}>
                    <Text style={styles.statPillValue}>{totalGames}</Text>
                    <Text style={styles.statPillLabel}>Games</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                    <Text style={[styles.statPillValue, { color: lc.success }]}>{wins}</Text>
                    <Text style={styles.statPillLabel}>Wins</Text>
                  </View>
                  <View style={[styles.statPill, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                    <Text style={[styles.statPillValue, { color: lc.danger }]}>{losses}</Text>
                    <Text style={styles.statPillLabel}>Losses</Text>
                  </View>
                </View>

                {/* Additional Stats */}
                <View style={styles.statDetailSection}>
                  <View style={[styles.statDetailRow, { borderBottomColor: lc.liquidGlassBorder }]}>
                    <Text style={[styles.statDetailLabel, { color: lc.textSecondary }]}>Best Win</Text>
                    <Text style={[styles.statDetailValue, { color: lc.success }]}>+${bestWin.toFixed(2)}</Text>
                  </View>
                  <View style={[styles.statDetailRow, { borderBottomColor: 'transparent' }]}>
                    <Text style={[styles.statDetailLabel, { color: lc.textSecondary }]}>Worst Loss</Text>
                    <Text style={[styles.statDetailValue, { color: lc.danger }]}>-${Math.abs(worstLoss).toFixed(2)}</Text>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.helpModalButton, { backgroundColor: lc.trustBlue }]}
              onPress={() => setShowStatModal(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.helpModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </AnimatedModal>

        {/* Balance Details Modal */}
        <AnimatedModal
          visible={showBalanceModal}
          onClose={() => setShowBalanceModal(false)}
          blurIntensity={60}
        >
          <View style={[styles.helpModalContent, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.helpModalHeader}>
              <Text style={[styles.helpModalTitle, { color: lc.textPrimary }]}>Balance Details</Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: lc.glassBg }]}
                onPress={() => setShowBalanceModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={lc.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Gradient Hero */}
            <LinearGradient
              colors={balances.net_balance >= 0 ? ['#166534', '#22C55E', '#4ADE80'] : ['#991B1B', '#EF4444', '#F87171']}
              style={styles.statHeroCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="wallet" size={32} color="rgba(255,255,255,0.9)" />
              <Text style={styles.statHeroValue}>
                {balances.net_balance >= 0 ? '+' : ''}${Math.abs(balances.net_balance || 0).toFixed(2)}
              </Text>
              <Text style={styles.statHeroLabel}>Net Balance</Text>
            </LinearGradient>

            {/* Stat Pills */}
            <View style={styles.statPillsGrid}>
              <View style={[styles.statPill, { backgroundColor: 'rgba(239,68,68,0.12)' }]}>
                <Text style={[styles.statPillValue, { color: lc.danger }]}>
                  ${(balances.total_you_owe || 0).toFixed(0)}
                </Text>
                <Text style={styles.statPillLabel}>You Owe</Text>
              </View>
              <View style={[styles.statPill, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                <Text style={[styles.statPillValue, { color: lc.success }]}>
                  ${(balances.total_owed_to_you || 0).toFixed(0)}
                </Text>
                <Text style={styles.statPillLabel}>Owed to You</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.helpModalButton, { backgroundColor: lc.trustBlue }]}
              onPress={() => {
                setShowBalanceModal(false);
                navigation.navigate("Wallet");
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.helpModalButtonText}>Open Wallet</Text>
            </TouchableOpacity>
          </View>
        </AnimatedModal>

        {/* Notifications Panel */}
        <AnimatedModal
          visible={showNotificationsPanel}
          onClose={() => setShowNotificationsPanel(false)}
          blurIntensity={60}
        >
          <View style={[styles.notificationsPanel, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.helpModalHeader}>
              <Text style={[styles.helpModalTitle, { color: lc.textPrimary }]}>Notifications</Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: lc.glassBg }]}
                onPress={() => setShowNotificationsPanel(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={22} color={lc.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.notificationsScroll} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.emptyNotifications}>
                  <Ionicons name="notifications-outline" size={48} color={lc.textMuted} />
                  <Text style={[styles.emptyNotifTitle, { color: lc.textSecondary }]}>All Caught Up</Text>
                  <Text style={[styles.emptyNotifSub, { color: lc.textMuted }]}>No new notifications</Text>
                </View>
              ) : (
                <View style={styles.notificationsList}>
                  {notifications.slice(0, 10).map((notif: any, idx: number) => {
                    const { icon, color } = getNotifIcon(notif.type);
                    return (
                      <TouchableOpacity
                        key={notif.notification_id || idx}
                        style={[
                          styles.notificationItem,
                          { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder },
                        ]}
                        onPress={() => handleNotificationPress(notif)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.notifIconWrap, { backgroundColor: color + "20" }]}>
                          <Ionicons name={icon as any} size={20} color={color} />
                        </View>
                        <View style={styles.notifContent}>
                          <Text style={[styles.notifTitle, { color: lc.textPrimary }]} numberOfLines={1}>
                            {notif.title}
                          </Text>
                          <Text style={[styles.notifMessage, { color: lc.textSecondary }]} numberOfLines={2}>
                            {notif.message}
                          </Text>
                          <Text style={[styles.notifTime, { color: lc.textMuted }]}>
                            {formatNotifTime(notif.created_at)}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={lc.textMuted} />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.notifSettingsButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
              onPress={() => {
                setShowNotificationsPanel(false);
                navigation.navigate("Notifications");
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={18} color={lc.textSecondary} />
              <Text style={[styles.notifSettingsText, { color: lc.textSecondary }]}>Notification Settings</Text>
            </TouchableOpacity>
          </View>
        </AnimatedModal>

        {/* AI Chat FAB */}
        <AIChatFab />
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
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  glassButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  glassButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  hamburgerLines: {
    gap: 5,
    alignItems: "center",
  },
  hamburgerLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  headerCenter: {
    alignItems: "center",
  },
  logoText: {
    fontSize: 24,
    fontWeight: "800",
  },
  logoSubtext: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  notifDot: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  // Welcome
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
    fontSize: 24,
    fontWeight: "700",
  },
  welcomeSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  helpButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  helpButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: 14,
    borderRadius: 16,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  // Liquid Glass Cards - 3 Column
  statsRowThree: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  liquidCardThird: {
    flex: 1,
    borderRadius: 18,
    padding: 3,
    borderWidth: 1.5,
    shadowColor: "rgba(255, 255, 255, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  liquidInnerSmall: {
    borderRadius: 15,
    padding: 12,
  },
  statIconRowSmall: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  statLabelSmall: {
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  statValueSmall: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statSubtextSmall: {
    fontSize: 9,
  },
  // Liquid Glass Cards - 2 Column (legacy)
  statsRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 16,
  },
  liquidCard: {
    flex: 1,
    borderRadius: 24,
    padding: 4,
    borderWidth: 1.5,
    // Shadow for depth
    shadowColor: "rgba(255, 255, 255, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  liquidInner: {
    borderRadius: 20,
    padding: 18,
  },
  liquidCardFull: {
    borderRadius: 24,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1.5,
    shadowColor: "rgba(255, 255, 255, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  liquidInnerFull: {
    borderRadius: 20,
    padding: 16,
  },
  // Stats
  statIconRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  statSubtext: {
    fontSize: 11,
    marginTop: 4,
  },
  // Performance
  performanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  performanceHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  performanceTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  gamesCount: {
    fontSize: 11,
  },
  performanceGrid: {
    flexDirection: "row",
    gap: 10,
  },
  perfItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 14,
  },
  perfValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  perfLabel: {
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  // ROI Progress Bar
  roiBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  roiBarLabel: {
    fontSize: 12,
    fontWeight: "500",
    width: 30,
  },
  roiBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 8,
  },
  roiBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  roiBarValue: {
    fontSize: 12,
    fontWeight: "600",
    width: 35,
    textAlign: "right",
  },
  // Section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
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
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 20,
  },
  // Game items
  gameItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  gameMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  joinButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  // Groups
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  groupAvatarText: {
    fontSize: 18,
    fontWeight: "700",
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
    fontSize: 15,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
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
    paddingVertical: 14,
    borderRadius: 14,
    marginHorizontal: 4,
    marginBottom: 4,
    marginTop: 8,
    gap: 8,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Results
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  resultDate: {
    fontSize: 11,
    marginTop: 2,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  seeAll: {
    fontSize: 12,
    fontWeight: "600",
  },
  // Quick Actions
  quickActionsTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 14,
    marginTop: 8,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 14,
  },
  actionCard: {
    flex: 1,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  actionTextWhite: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Help Modal
  helpModalContent: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  // Notifications Panel - proper sizing
  notificationsPanel: {
    borderRadius: 28,
    padding: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.12)",
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  notificationsScroll: {
    maxHeight: 450,
  },
  helpModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  helpModalTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  // Demo Card
  demoCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  demoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  demoLogo: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  demoLogoText: {
    fontSize: 14,
    fontWeight: "700",
  },
  demoLogoTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  demoTagline: {
    fontSize: 22,
    fontWeight: "700",
  },
  helpTipsList: {
    gap: 12,
  },
  helpTipCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  helpTipIconLarge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  helpTipContent: {
    flex: 1,
    marginLeft: 16,
    marginRight: 12,
  },
  helpTipTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  helpTipDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  helpModalButton: {
    marginTop: 28,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  helpModalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Stat Details Modal - Enhanced
  statDetailsList: {
    gap: 4,
  },
  statDetailSection: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 4,
    marginTop: 8,
  },
  statDetailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  statDetailLabel: {
    fontSize: 15,
  },
  statDetailValue: {
    fontSize: 17,
    fontWeight: "700",
    fontFamily: "monospace",
  },
  // Gradient Hero Card
  statHeroCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  statHeroValue: {
    fontSize: 42,
    fontWeight: "800",
    color: "#fff",
    marginTop: 12,
    letterSpacing: -1,
  },
  statHeroLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  // Stat Pills Grid
  statPillsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  statPillValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F5F5F5",
  },
  statPillLabel: {
    fontSize: 11,
    color: "#7A7A7A",
    marginTop: 4,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  // Notifications Panel
  emptyNotifications: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyNotifTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 8,
  },
  emptyNotifSub: {
    fontSize: 14,
  },
  notificationsList: {
    gap: 10,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  notifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  notifMessage: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
  },
  notifSettingsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 16,
  },
  notifSettingsText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
