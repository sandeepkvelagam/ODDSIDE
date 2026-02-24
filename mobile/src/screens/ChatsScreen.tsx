import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type GameItem = {
  game_id: string;
  title?: string;
  group_name?: string;
  status: string;
  ended_at?: string;
  date?: string;
  player_count?: number;
  created_at?: string;
};

// Liquid Glass Design System Colors (matching other screens)
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

export function ChatsScreen() {
  const { isDark, colors } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const [games, setGames] = useState<GameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entrance animations
  const headerEntrance = useState(new Animated.Value(0))[0];
  const listEntrance = useState(new Animated.Value(0))[0];

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

  useEffect(() => {
    Animated.stagger(100, [
      Animated.spring(headerEntrance, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(listEntrance, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
    ]).start();
  }, [headerEntrance, listEntrance]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/games");
      const all = Array.isArray(res.data) ? res.data : [];
      // Show active and ended games — these are the ones with thread activity
      setGames(all.filter((g: any) => g.status !== "scheduled"));
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load chats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const formatDate = (game: GameItem) => {
    if (game.status === "active") return "Live now";
    const d = game.ended_at || game.date || game.created_at;
    if (!d) return "";
    return new Date(d).toLocaleDateString();
  };

  const renderItem = ({ item }: { item: GameItem }) => (
    <TouchableOpacity
      style={[styles.gameItem, { borderBottomColor: lc.liquidGlassBorder }]}
      onPress={() => navigation.navigate("GameNight", { gameId: item.game_id })}
      activeOpacity={0.7}
    >
      <View style={[
        styles.avatar,
        { backgroundColor: item.status === "active" ? "rgba(34,197,94,0.15)" : lc.liquidGlowBlue },
      ]}>
        {item.status === "active" ? (
          <View style={[styles.liveDot, { backgroundColor: lc.success }]} />
        ) : (
          <Ionicons name="chatbubbles-outline" size={22} color={lc.moonstone} />
        )}
      </View>

      <View style={styles.gameInfo}>
        <Text style={[styles.gameTitle, { color: lc.textPrimary }]} numberOfLines={1}>
          {item.title || item.group_name || "Game Night"}
        </Text>
        <Text style={[styles.gameMeta, { color: lc.textMuted }]}>
          {item.status === "active" ? "Active" : "Ended"} · {formatDate(item)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={16} color={lc.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: lc.jetDark, paddingTop: insets.top }]}>
      {/* Page Header */}
      <Animated.View
        style={[
          styles.pageHeader,
          { borderBottomColor: lc.liquidGlassBorder, opacity: headerEntrance },
        ]}
      >
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={lc.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: lc.textPrimary }]}>{t.nav.chats}</Text>
        <View style={{ width: 40 }} />
      </Animated.View>

      {/* List */}
      <Animated.View style={[styles.listWrapper, { opacity: listEntrance }]}>
        <FlatList
          data={games}
          renderItem={renderItem}
          keyExtractor={(item) => item.game_id}
          contentContainerStyle={[
            styles.listContent,
            games.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={lc.orange}
            />
          }
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={56} color={lc.textMuted} />
                <Text style={[styles.emptyTitle, { color: lc.textSecondary }]}>No chats yet</Text>
                <Text style={[styles.emptySubtitle, { color: lc.textMuted }]}>
                  Game chats appear here once games have been played
                </Text>
              </View>
            )
          }
        />
      </Animated.View>

      {/* Error banner */}
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: lc.danger }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  gameItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  liveDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
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
    marginTop: 3,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 20,
  },
  errorBanner: {
    margin: 16,
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    color: "#fff",
    fontSize: 13,
    textAlign: "center",
  },
});
