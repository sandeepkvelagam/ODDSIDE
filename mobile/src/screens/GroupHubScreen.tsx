import React, { useEffect, useState, useCallback } from "react";
import { ScrollView, Text, View, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type R = RouteProp<RootStackParamList, "GroupHub">;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function GroupHubScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const { groupId } = route.params;

  const [group, setGroup] = useState<any>(null);
  const [games, setGames] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [groupRes, gamesRes] = await Promise.all([
        api.get(`/groups/${groupId}`),
        api.get(`/games?group_id=${groupId}`),
      ]);
      setGroup(groupRes.data);
      const g = Array.isArray(gamesRes.data) ? gamesRes.data : [];
      setGames(g);
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

  const members = group?.members || [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#EF6E59" />
      }
    >
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Members Section */}
      <View style={styles.sectionHeader}>
        <Ionicons name="people" size={18} color="#EF6E59" />
        <Text style={styles.sectionTitle}>Members ({members.length})</Text>
      </View>
      <View style={styles.card}>
        {members.length > 0 ? (
          members.map((m: any, idx: number) => (
            <View key={m?.user_id || idx}>
              <View style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {(m?.name || m?.email || "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{m?.name || m?.email || "Member"}</Text>
                  {m?.role && (
                    <Text style={styles.memberRole}>{m.role}</Text>
                  )}
                </View>
              </View>
              {idx < members.length - 1 && <View style={styles.divider} />}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No members data</Text>
        )}
      </View>

      {/* Games Section */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <Ionicons name="game-controller" size={18} color="#3b82f6" />
        <Text style={styles.sectionTitle}>Games ({games.length})</Text>
      </View>
      {games.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No games in this group yet</Text>
        </View>
      ) : (
        games.map((g: any) => (
          <TouchableOpacity
            key={g.game_id || g._id}
            style={styles.gameCard}
            onPress={() => navigation.navigate("GameNight", { gameId: g.game_id || g._id })}
            activeOpacity={0.7}
          >
            <View style={styles.gameInfo}>
              <Text style={styles.gameName}>{g.title || "Game Night"}</Text>
              <Text style={styles.gameSubtext}>
                {g.player_count || 0} players
                {g.total_pot ? ` · $${g.total_pot} pot` : ""}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              g.status === "active" ? styles.statusActive : styles.statusEnded,
            ]}>
              <Text style={[
                styles.statusText,
                g.status === "active" ? styles.statusActiveText : styles.statusEndedText,
              ]}>
                {g.status === "active" ? "Live" : "Ended"}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#999",
    fontSize: 14,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#141421",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(59,130,246,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberAvatarText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  memberRole: {
    color: "#EF6E59",
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginLeft: 48,
  },
  emptyText: {
    color: "#666",
    fontSize: 14,
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
  gameName: {
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
});
