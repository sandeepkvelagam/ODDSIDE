import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type R = RouteProp<RootStackParamList, "GroupHub">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const BUY_IN_OPTIONS = [5, 10, 20, 50, 100];
const CHIPS_OPTIONS = [10, 20, 50, 100];

// Liquid Glass Design System Colors
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

export function GroupHubScreen() {
  const { isDark, colors } = useTheme();
  const { user } = useAuth();
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { groupId } = route.params;

  const [group, setGroup] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Start Game Sheet state
  const [showStartGameSheet, setShowStartGameSheet] = useState(false);
  const [gameTitle, setGameTitle] = useState("");
  const [buyInAmount, setBuyInAmount] = useState(20);
  const [chipsPerBuyIn, setChipsPerBuyIn] = useState(20);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Invite Members state
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [inviteMode, setInviteMode] = useState<"search" | "email">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);

  // Transfer Admin state
  const [showTransferSheet, setShowTransferSheet] = useState(false);
  const [selectedNewAdmin, setSelectedNewAdmin] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  // Member Actions state
  const [showMemberActions, setShowMemberActions] = useState<string | null>(null);
  const [removingMember, setRemovingMember] = useState(false);

  // Theme-aware colors
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

  // Admin badge color - readable on both themes
  const adminColor = isDark ? "#fbbf24" : "#b45309";
  const adminBgColor = isDark ? "rgba(234,179,8,0.15)" : "rgba(180,83,9,0.12)";

  const chipValue = buyInAmount / chipsPerBuyIn;
  const isAdmin = group?.members?.find((m: any) => m.user_id === user?.user_id)?.role === "admin";

  const load = useCallback(async () => {
    try {
      setError(null);
      const [groupRes, gamesRes, statsRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/games?group_id=${groupId}`),
        api.get(`/groups/${groupId}/stats`).catch(() => ({ data: { leaderboard: [] } })),
      ]);
      setGroup(groupRes.data);
      const g = Array.isArray(gamesRes.data) ? gamesRes.data : [];
      setGames(g);
      setLeaderboard(statsRes.data?.leaderboard || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load group");
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleStartGame = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const res = await api.post("/games", {
        group_id: groupId,
        title: gameTitle.trim() || undefined,
        buy_in_amount: buyInAmount,
        chips_per_buy_in: chipsPerBuyIn,
      });
      setShowStartGameSheet(false);
      setGameTitle("");
      // Navigate to the new game
      if (res.data?.game_id) {
        navigation.navigate("GameNight", { gameId: res.data.game_id });
      }
    } catch (e: any) {
      setStartError(e?.response?.data?.detail || e?.message || "Failed to start game");
    } finally {
      setStarting(false);
    }
  };

  // Search users for invite
  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/users/search?query=${encodeURIComponent(query)}`);
      setSearchResults(res.data || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Invite user by email
  const handleInvite = async (email: string) => {
    setInviting(email);
    try {
      await api.post(`/groups/${groupId}/invite`, { email });
      setSearchQuery("");
      setInviteEmail("");
      setSearchResults([]);
      // Refresh pending invites
      fetchPendingInvites();
    } catch {
      // Error handled silently
    } finally {
      setInviting(null);
    }
  };

  // Fetch pending invites
  const fetchPendingInvites = async () => {
    try {
      const res = await api.get(`/groups/${groupId}/invites`);
      setPendingInvites((res.data || []).filter((i: any) => i.status === "pending"));
    } catch {
      // Not admin or no invites
    }
  };

  // Transfer admin role
  const handleTransferAdmin = async () => {
    if (!selectedNewAdmin) return;
    setTransferring(true);
    try {
      await api.put(`/groups/${groupId}/transfer-admin`, { new_admin_id: selectedNewAdmin });
      setShowTransferSheet(false);
      setSelectedNewAdmin(null);
      await load();
    } catch {
      // Error handled silently
    } finally {
      setTransferring(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (userId: string) => {
    setRemovingMember(true);
    try {
      await api.delete(`/groups/${groupId}/members/${userId}`);
      setShowMemberActions(null);
      await load();
    } catch {
      // Error handled silently
    } finally {
      setRemovingMember(false);
    }
  };

  const members = group?.members || [];
  const activeGames = games.filter((g) => g.status === "active");
  const pastGames = games.filter((g) => g.status !== "active");

  return (
    <View style={[styles.wrapper, { backgroundColor: lc.jetDark, paddingTop: insets.top }]}>
      {/* Page Header with Back Button */}
      <View style={[styles.pageHeader, { borderBottomColor: lc.liquidGlassBorder }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={lc.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: lc.textPrimary }]} numberOfLines={1}>
          {group?.name || "Group"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={lc.orange} />
        }
      >
        {error && (
          <View style={[styles.errorBanner, { borderColor: "rgba(239,68,68,0.3)" }]}>
            <Ionicons name="alert-circle" size={16} color={lc.danger} />
            <Text style={[styles.errorText, { color: lc.danger }]}>{error}</Text>
          </View>
        )}

        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View style={styles.groupHeaderRow}>
            <Text style={[styles.groupTitle, { color: lc.textPrimary }]}>
              {group?.name || "Group"}
            </Text>
            <View style={[
              styles.headerBadge,
              { backgroundColor: isAdmin ? adminBgColor : lc.liquidGlassBg }
            ]}>
              <Ionicons
                name={isAdmin ? "shield" : "person"}
                size={12}
                color={isAdmin ? adminColor : lc.textMuted}
              />
              <Text style={[
                styles.headerBadgeText,
                { color: isAdmin ? adminColor : lc.textMuted }
              ]}>
                {isAdmin ? "ADMIN" : "Member"}
              </Text>
            </View>
          </View>
          <Text style={[styles.groupDescription, { color: lc.textMuted }]}>
            {group?.description || "No description"}
          </Text>
        </View>

        {/* Leaderboard Section */}
        {leaderboard.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={18} color="#FFD700" />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>LEADERBOARD</Text>
            </View>
            <View style={[styles.card, styles.glassCard, { backgroundColor: colors.glassCardBg, borderColor: colors.glassCardBorder }]}>
              {leaderboard.slice(0, 5).map((entry: any, idx: number) => {
                const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
                const medalColor = idx < 3 ? medalColors[idx] : null;
                const profit = entry.net_profit || 0;

                return (
                  <View key={entry.user_id || idx}>
                    <View style={styles.leaderboardRow}>
                      <View style={styles.leaderboardRank}>
                        {medalColor ? (
                          <Ionicons name="medal" size={20} color={medalColor} />
                        ) : (
                          <Text style={[styles.rankNumber, { color: colors.textMuted }]}>{idx + 1}</Text>
                        )}
                      </View>
                      <View style={styles.leaderboardInfo}>
                        <Text style={[styles.leaderboardName, { color: colors.textPrimary }]}>
                          {entry.name || entry.email || "Player"}
                        </Text>
                        <Text style={[styles.leaderboardGames, { color: colors.textMuted }]}>
                          {entry.games_played || 0} games
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.leaderboardProfit,
                          { color: profit >= 0 ? colors.success : colors.danger },
                        ]}
                      >
                        {profit >= 0 ? "+" : ""}${Math.abs(profit).toFixed(0)}
                      </Text>
                    </View>
                    {idx < Math.min(leaderboard.length, 5) - 1 && (
                      <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Members Section */}
        <View style={[styles.sectionHeader, styles.sectionHeaderWithAction, { marginTop: leaderboard.length > 0 ? 28 : 0 }]}>
          <View style={styles.sectionHeaderLeft}>
            <Ionicons name="people" size={18} color={colors.orange} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>MEMBERS ({members.length})</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity
              style={[styles.inviteButton, { borderColor: colors.glassCardBorder }]}
              onPress={() => {
                fetchPendingInvites();
                setShowInviteSheet(true);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="person-add" size={14} color={colors.orange} />
              <Text style={[styles.inviteButtonText, { color: colors.orange }]}>Invite</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={[styles.card, styles.glassCard, { backgroundColor: colors.glassCardBg, borderColor: colors.glassCardBorder }]}>
          {/* Admin Actions */}
          {isAdmin && members.length > 1 && (
            <TouchableOpacity
              style={[styles.adminAction, { borderColor: colors.border }]}
              onPress={() => setShowTransferSheet(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="swap-horizontal" size={14} color={colors.textSecondary} />
              <Text style={[styles.adminActionText, { color: colors.textSecondary }]}>Transfer Admin</Text>
            </TouchableOpacity>
          )}

          {members.length > 0 ? (
            members.map((m: any, idx: number) => {
              const memberName = m?.user?.name || m?.name || m?.user?.email || m?.email || "Unknown";
              const isCurrentUser = m?.user_id === user?.user_id;
              const isMemberAdmin = m?.role === "admin";

              return (
                <View key={m?.user_id || idx}>
                  <View style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                      <Text style={styles.memberAvatarText}>
                        {memberName[0].toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={[styles.memberName, { color: lc.textPrimary }]}>
                          {memberName}
                        </Text>
                        {isCurrentUser && (
                          <Text style={[styles.youLabel, { color: lc.textMuted }]}> (you)</Text>
                        )}
                      </View>
                      <View style={styles.memberBadgeRow}>
                        {isMemberAdmin ? (
                          <View style={[styles.roleBadge, { backgroundColor: adminBgColor }]}>
                            <Ionicons name="shield" size={10} color={adminColor} />
                            <Text style={[styles.roleText, { color: adminColor }]}>Admin</Text>
                          </View>
                        ) : (
                          <View style={[styles.roleBadge, { backgroundColor: lc.liquidGlassBg }]}>
                            <Ionicons name="person" size={10} color={lc.textMuted} />
                            <Text style={[styles.roleText, { color: lc.textMuted }]}>Member</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {/* Admin actions for non-admin members */}
                    {isAdmin && !isCurrentUser && !isMemberAdmin && (
                      <TouchableOpacity
                        style={styles.memberActionButton}
                        onPress={() => setShowMemberActions(m?.user_id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="ellipsis-horizontal" size={18} color={lc.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {idx < members.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  )}
                </View>
              );
            })
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No members data</Text>
          )}
        </View>

        {/* Live Games Section */}
        {activeGames.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 28 }]}>
              <View style={styles.liveDot} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                LIVE GAMES ({activeGames.length})
              </Text>
            </View>
            {activeGames.map((g: any) => (
              <TouchableOpacity
                key={g.game_id || g._id}
                style={[styles.gameCard, styles.glassCard, styles.liveGameCard, { backgroundColor: colors.glassCardBg, borderColor: "rgba(34,197,94,0.4)" }]}
                onPress={() => navigation.navigate("GameNight", { gameId: g.game_id || g._id })}
                activeOpacity={0.7}
              >
                <View style={styles.gameInfo}>
                  <Text style={[styles.gameName, { color: colors.textPrimary }]}>{g.title || "Game Night"}</Text>
                  <Text style={[styles.gameSubtext, { color: colors.textMuted }]}>
                    {g.player_count || 0} players
                    {g.total_pot ? ` · $${g.total_pot} pot` : ""}
                  </Text>
                </View>
                <View style={[styles.statusBadge, styles.statusActive]}>
                  <View style={styles.livePulse} />
                  <Text style={styles.statusActiveText}>Live</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* Past Games Section */}
        <View style={[styles.sectionHeader, { marginTop: 28 }]}>
          <Ionicons name="time" size={18} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            PAST GAMES ({pastGames.length})
          </Text>
        </View>
        {pastGames.length === 0 ? (
          <View style={[styles.card, styles.glassCard, { backgroundColor: colors.glassCardBg, borderColor: colors.glassCardBorder }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No past games yet</Text>
          </View>
        ) : (
          pastGames.slice(0, 5).map((g: any) => (
            <TouchableOpacity
              key={g.game_id || g._id}
              style={[styles.gameCard, styles.glassCard, { backgroundColor: colors.glassCardBg, borderColor: colors.glassCardBorder }]}
              onPress={() => navigation.navigate("GameNight", { gameId: g.game_id || g._id })}
              activeOpacity={0.7}
            >
              <View style={styles.gameInfo}>
                <Text style={[styles.gameName, { color: colors.textPrimary }]}>{g.title || "Game Night"}</Text>
                <Text style={[styles.gameSubtext, { color: colors.textMuted }]}>
                  {g.player_count || 0} players
                  {g.total_pot ? ` · $${g.total_pot} pot` : ""}
                </Text>
              </View>
              <View style={[styles.statusBadge, styles.statusEnded, { backgroundColor: colors.glassBg }]}>
                <Text style={[styles.statusEndedText, { color: colors.textMuted }]}>Ended</Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {/* Bottom spacing for FAB */}
        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Action Buttons - Labeled FABs */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* AI Chat Button - Labeled */}
        <TouchableOpacity
          style={[styles.labeledFab, { backgroundColor: lc.orangeDark }]}
          onPress={() => navigation.navigate("AIAssistant")}
          activeOpacity={0.8}
        >
          <View style={styles.fabIconContainer}>
            <Ionicons name="sparkles" size={22} color="#fff" />
          </View>
          <Text style={styles.fabLabel}>AI Chat</Text>
        </TouchableOpacity>

        {/* Start Game Button - Labeled */}
        <TouchableOpacity
          style={[styles.labeledFab, styles.primaryFab, { backgroundColor: lc.trustBlue }]}
          onPress={() => setShowStartGameSheet(true)}
          activeOpacity={0.8}
        >
          <View style={styles.fabIconContainer}>
            <Ionicons name="play" size={24} color="#fff" />
          </View>
          <Text style={styles.fabLabel}>Start Game</Text>
        </TouchableOpacity>
      </View>

      {/* Start Game Modal */}
      <Modal
        visible={showStartGameSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowStartGameSheet(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowStartGameSheet(false)}
          />
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Start Game</Text>

            {startError && (
              <View style={styles.sheetError}>
                <Text style={styles.sheetErrorText}>{startError}</Text>
              </View>
            )}

            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.glassBorder }]}
              placeholder="Game Title (optional)"
              placeholderTextColor={colors.textMuted}
              value={gameTitle}
              onChangeText={setGameTitle}
            />

            {/* Buy-in Selection */}
            <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>Buy-in Amount</Text>
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
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.textPrimary },
                      buyInAmount === amount && { color: colors.orange },
                    ]}
                  >
                    ${amount}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chips Selection */}
            <Text style={[styles.optionLabel, { color: colors.textSecondary }]}>Chips per Buy-in</Text>
            <View style={styles.optionRow}>
              {CHIPS_OPTIONS.map((chips) => (
                <TouchableOpacity
                  key={chips}
                  style={[
                    styles.optionButton,
                    { borderColor: colors.glassBorder },
                    chipsPerBuyIn === chips && { borderColor: colors.orange, backgroundColor: "rgba(239,110,89,0.15)" },
                  ]}
                  onPress={() => setChipsPerBuyIn(chips)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: colors.textPrimary },
                      chipsPerBuyIn === chips && { color: colors.orange },
                    ]}
                  >
                    {chips}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chip Value Preview */}
            <View style={[styles.previewCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
              <Text style={[styles.previewLabel, { color: colors.textMuted }]}>Each chip equals</Text>
              <Text style={[styles.previewValue, { color: colors.orange }]}>
                ${chipValue.toFixed(2)}
              </Text>
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.glassBorder }]}
                onPress={() => setShowStartGameSheet(false)}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: colors.orange }, starting && styles.buttonDisabled]}
                onPress={handleStartGame}
                disabled={starting}
              >
                {starting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="play" size={18} color="#fff" />
                    <Text style={styles.startText}>Start Game</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite Members Modal */}
      <Modal
        visible={showInviteSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowInviteSheet(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowInviteSheet(false)}
          />
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Invite Members</Text>

            {/* Mode Toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  { borderColor: colors.glassCardBorder },
                  inviteMode === "search" && { backgroundColor: colors.orange, borderColor: colors.orange }
                ]}
                onPress={() => setInviteMode("search")}
              >
                <Ionicons name="search" size={14} color={inviteMode === "search" ? "#fff" : colors.textMuted} />
                <Text style={[styles.modeButtonText, { color: inviteMode === "search" ? "#fff" : colors.textMuted }]}>
                  Search
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  { borderColor: colors.glassCardBorder },
                  inviteMode === "email" && { backgroundColor: colors.orange, borderColor: colors.orange }
                ]}
                onPress={() => setInviteMode("email")}
              >
                <Ionicons name="mail" size={14} color={inviteMode === "email" ? "#fff" : colors.textMuted} />
                <Text style={[styles.modeButtonText, { color: inviteMode === "email" ? "#fff" : colors.textMuted }]}>
                  Email
                </Text>
              </TouchableOpacity>
            </View>

            {inviteMode === "search" ? (
              <>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.glassCardBorder }]}
                  placeholder="Search by name or email..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={handleSearchUsers}
                />
                {searching && (
                  <ActivityIndicator size="small" color={colors.orange} style={{ marginVertical: 12 }} />
                )}
                {searchResults.length > 0 && (
                  <View style={styles.searchResults}>
                    {searchResults.map((u: any) => (
                      <View key={u.user_id} style={[styles.searchResultItem, { borderColor: colors.border }]}>
                        <View style={[styles.memberAvatar, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                          <Text style={styles.memberAvatarText}>{(u.name || u.email || "?")[0].toUpperCase()}</Text>
                        </View>
                        <View style={styles.searchResultInfo}>
                          <Text style={[styles.searchResultName, { color: colors.textPrimary }]}>{u.name}</Text>
                          <Text style={[styles.searchResultEmail, { color: colors.textMuted }]}>{u.email}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.inviteSendButton, { backgroundColor: colors.orange }]}
                          onPress={() => handleInvite(u.email)}
                          disabled={inviting === u.email}
                        >
                          {inviting === u.email ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.inviteSendText}>Invite</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </>
            ) : (
              <>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.glassCardBorder }]}
                  placeholder="friend@example.com"
                  placeholderTextColor={colors.textMuted}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <Text style={[styles.helperText, { color: colors.textMuted }]}>
                  If they're not registered, the invite will be waiting when they sign up!
                </Text>
                <TouchableOpacity
                  style={[styles.fullButton, { backgroundColor: colors.orange }, inviting && styles.buttonDisabled]}
                  onPress={() => handleInvite(inviteEmail)}
                  disabled={!inviteEmail.trim() || !!inviting}
                >
                  {inviting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.fullButtonText}>Send Invite</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
              <View style={[styles.pendingSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.pendingTitle, { color: colors.textSecondary }]}>
                  Pending Invites ({pendingInvites.length})
                </Text>
                {pendingInvites.map((inv: any) => (
                  <View key={inv.invite_id} style={[styles.pendingItem, { backgroundColor: colors.glassBg }]}>
                    <Text style={[styles.pendingEmail, { color: colors.textMuted }]}>{inv.invited_email}</Text>
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Pending</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Transfer Admin Modal */}
      <Modal
        visible={showTransferSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTransferSheet(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowTransferSheet(false)}
          />
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Transfer Admin</Text>
            <Text style={[styles.helperText, { color: colors.textMuted, marginBottom: 18 }]}>
              Select a member to become the new admin
            </Text>

            {members.filter((m: any) => m.role !== "admin").map((m: any) => {
              const memberName = m?.user?.name || m?.name || m?.user?.email || m?.email || "Unknown";
              const isSelected = selectedNewAdmin === m.user_id;
              return (
                <TouchableOpacity
                  key={m.user_id}
                  style={[
                    styles.transferMemberItem,
                    { borderColor: isSelected ? colors.orange : colors.border },
                    isSelected && { backgroundColor: "rgba(239,110,89,0.1)" }
                  ]}
                  onPress={() => setSelectedNewAdmin(m.user_id)}
                >
                  <View style={[styles.memberAvatar, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                    <Text style={styles.memberAvatarText}>{memberName[0].toUpperCase()}</Text>
                  </View>
                  <Text style={[styles.transferMemberName, { color: colors.textPrimary }]}>{memberName}</Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={22} color={colors.orange} />}
                </TouchableOpacity>
              );
            })}

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.glassCardBorder }]}
                onPress={() => { setShowTransferSheet(false); setSelectedNewAdmin(null); }}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: colors.orange }, (!selectedNewAdmin || transferring) && styles.buttonDisabled]}
                onPress={handleTransferAdmin}
                disabled={!selectedNewAdmin || transferring}
              >
                {transferring ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.startText}>Transfer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Member Actions Modal */}
      <Modal
        visible={!!showMemberActions}
        animationType="fade"
        transparent
        onRequestClose={() => setShowMemberActions(null)}
      >
        <View style={styles.actionModalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowMemberActions(null)}
          />
          <View style={[styles.actionSheetContainer, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.actionItem, { borderBottomColor: colors.border }]}
              onPress={() => showMemberActions && handleRemoveMember(showMemberActions)}
              disabled={removingMember}
            >
              {removingMember ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <Ionicons name="person-remove" size={20} color={colors.danger} />
                  <Text style={[styles.actionItemText, { color: colors.danger }]}>Remove Member</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => setShowMemberActions(null)}
            >
              <Text style={[styles.actionItemText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  // Group Header
  groupHeader: {
    marginBottom: 28,
  },
  groupHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  groupTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  headerBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  groupDescription: {
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 14,
    borderRadius: 12,
    marginBottom: 18,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionHeaderWithAction: {
    justifyContent: "space-between",
  },
  sectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  inviteButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  adminAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    marginBottom: 10,
    borderBottomWidth: 1,
  },
  adminActionText: {
    fontSize: 13,
    fontWeight: "500",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  card: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
  },
  glassCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  leaderboardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 14,
  },
  leaderboardRank: {
    width: 28,
    alignItems: "center",
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "600",
  },
  leaderboardInfo: {
    flex: 1,
    gap: 2,
  },
  leaderboardName: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  leaderboardGames: {
    fontSize: 12,
  },
  leaderboardProfit: {
    fontSize: 16,
    fontWeight: "700",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    gap: 14,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  memberAvatarText: {
    color: "#3b82f6",
    fontSize: 16,
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberName: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  youLabel: {
    fontSize: 14,
    fontWeight: "400",
  },
  memberBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  memberActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    marginLeft: 54,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  gameCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1.5,
  },
  liveGameCard: {
    borderWidth: 2,
  },
  gameInfo: {
    flex: 1,
    gap: 4,
  },
  gameName: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  gameSubtext: {
    fontSize: 13,
    lineHeight: 18,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    marginLeft: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusActive: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  statusEnded: {},
  livePulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
  },
  statusActiveText: {
    color: "#22c55e",
    fontSize: 13,
    fontWeight: "600",
  },
  statusEndedText: {
    fontSize: 13,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 28,
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
  sheetError: {
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 18,
  },
  sheetErrorText: {
    color: "#fca5a5",
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
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
    marginBottom: 28,
  },
  previewLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  sheetActions: {
    flexDirection: "row",
    gap: 14,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  startButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 52,
  },
  startText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  // Invite Modal styles
  modeToggle: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  modeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchResults: {
    maxHeight: 200,
    marginTop: 8,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
  },
  searchResultInfo: {
    flex: 1,
    gap: 2,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: "500",
  },
  searchResultEmail: {
    fontSize: 12,
  },
  inviteSendButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
  },
  inviteSendText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  helperText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  fullButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  fullButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  pendingSection: {
    marginTop: 18,
    paddingTop: 18,
    borderTopWidth: 1,
  },
  pendingTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  pendingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  pendingEmail: {
    fontSize: 13,
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: "rgba(234,179,8,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingBadgeText: {
    color: "#EAB308",
    fontSize: 11,
    fontWeight: "600",
  },
  // Transfer Admin Modal styles
  transferMemberItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    gap: 12,
  },
  transferMemberName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  // Member Actions Modal styles
  actionModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  actionSheetContainer: {
    width: "80%",
    borderRadius: 16,
    overflow: "hidden",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 18,
    borderBottomWidth: 1,
  },
  actionItemText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
