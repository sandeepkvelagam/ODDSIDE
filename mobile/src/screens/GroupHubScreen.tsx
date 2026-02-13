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
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type R = RouteProp<RootStackParamList, "GroupHub">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const BUY_IN_OPTIONS = [5, 10, 20, 50, 100];
const CHIPS_OPTIONS = [10, 20, 50, 100];

export function GroupHubScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
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

  const members = group?.members || [];
  const activeGames = games.filter((g) => g.status === "active");
  const pastGames = games.filter((g) => g.status !== "active");

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.orange} />
        }
      >
        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Leaderboard Section */}
        {leaderboard.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={18} color="#FFD700" />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Leaderboard</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
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
        <View style={[styles.sectionHeader, { marginTop: leaderboard.length > 0 ? 28 : 0 }]}>
          <Ionicons name="people" size={18} color={colors.orange} />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Members ({members.length})</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
          {members.length > 0 ? (
            members.map((m: any, idx: number) => (
              <View key={m?.user_id || idx}>
                <View style={styles.memberRow}>
                  <View style={[styles.memberAvatar, { backgroundColor: "rgba(59,130,246,0.15)" }]}>
                    <Text style={styles.memberAvatarText}>
                      {(m?.name || m?.email || "?")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={[styles.memberName, { color: colors.textPrimary }]}>
                      {m?.name || m?.email || "Member"}
                      {m?.user_id === user?.user_id && (
                        <Text style={{ color: colors.textMuted }}> (You)</Text>
                      )}
                    </Text>
                    {m?.role === "admin" && (
                      <View style={[styles.roleBadge, { backgroundColor: "rgba(239,110,89,0.15)" }]}>
                        <Ionicons name="shield" size={10} color={colors.orange} />
                        <Text style={[styles.roleText, { color: colors.orange }]}>Admin</Text>
                      </View>
                    )}
                  </View>
                </View>
                {idx < members.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))
          ) : (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No members data</Text>
          )}
        </View>

        {/* Active Games Section */}
        {activeGames.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 28 }]}>
              <View style={styles.liveDot} />
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Live Games ({activeGames.length})
              </Text>
            </View>
            {activeGames.map((g: any) => (
              <TouchableOpacity
                key={g.game_id || g._id}
                style={[styles.gameCard, styles.liveGameCard, { backgroundColor: colors.surface, borderColor: "rgba(34,197,94,0.3)" }]}
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
          <Ionicons name="game-controller" size={18} color="#3b82f6" />
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Past Games ({pastGames.length})
          </Text>
        </View>
        {pastGames.length === 0 ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}>
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No past games yet</Text>
          </View>
        ) : (
          pastGames.slice(0, 5).map((g: any) => (
            <TouchableOpacity
              key={g.game_id || g._id}
              style={[styles.gameCard, { backgroundColor: colors.surface, borderColor: colors.glassBorder }]}
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
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Start Game FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.orange }]}
        onPress={() => setShowStartGameSheet(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="play" size={24} color="#fff" />
      </TouchableOpacity>

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
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  card: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
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
  memberName: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
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
  divider: {
    height: 1,
    marginLeft: 54,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  gameCard: {
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    borderWidth: 1,
  },
  liveGameCard: {
    borderWidth: 1,
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
});
