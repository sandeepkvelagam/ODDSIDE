import React, { useEffect, useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { getGroup } from "../api/groups";
import { listGroupGames } from "../api/games";
import type { Game } from "../types";
import type { RootStackParamList } from "../navigation/RootNavigator";

type RouteProps = RouteProp<RootStackParamList, "GroupHub">;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, "GroupHub">;

export function GroupHubScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavigationProp>();
  const { groupId } = route.params;

  const [group, setGroup] = useState<any>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const [groupData, gamesData] = await Promise.all([
        getGroup(groupId),
        listGroupGames(groupId),
      ]);
      setGroup(groupData);
      setGames(gamesData);
    } catch (e: any) {
      const message = e?.response?.data?.detail || e?.message || "Failed to load group";
      setError(message);
      console.error("Error fetching group data:", e);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const members = group?.members || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            MEMBERS ({members.length})
          </Text>
          <View style={styles.card}>
            {members.length === 0 ? (
              <Text style={styles.emptyText}>No members found</Text>
            ) : (
              members.map((member: any, index: number) => (
                <View key={member.user_id || index}>
                  <View style={styles.memberRow}>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>
                        {member.name || member.email || "Member"}
                      </Text>
                      <Text style={styles.memberRole}>
                        {member.role === "admin" ? "👑 Admin" : "Member"}
                      </Text>
                    </View>
                  </View>
                  {index < members.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </View>
        </View>

        {/* Games Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            GAMES ({games.length})
          </Text>
          {games.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.emptyText}>No games yet</Text>
              <Text style={styles.emptySubtext}>
                Start a new game from the web app
              </Text>
            </View>
          ) : (
            games.map((game) => (
              <TouchableOpacity
                key={game._id || game.game_id}
                style={[styles.card, styles.gameCard]}
                onPress={() =>
                  navigation.navigate("GameNight", {
                    gameId: game._id || game.game_id,
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.gameRow}>
                  <View style={styles.gameInfo}>
                    <Text style={styles.gameTitle}>
                      {game.title || "Game Night"}
                    </Text>
                    <View style={styles.gameMetaRow}>
                      <View
                        style={[
                          styles.statusBadge,
                          game.status === "active"
                            ? styles.statusActive
                            : styles.statusEnded,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {game.status === "active" ? "🟢 Active" : "⚫ Ended"}
                        </Text>
                      </View>
                      <Text style={styles.buyInText}>
                        ${game.buy_in_amount || 0} buy-in
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0B0F",
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#141421",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
  },
  gameCard: {
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
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
    color: "rgba(255,255,255,0.4)",
    fontSize: 13,
    marginTop: 2,
  },
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gameInfo: {
    flex: 1,
  },
  gameTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  gameMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: "rgba(34,197,94,0.15)",
  },
  statusEnded: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  statusText: {
    fontSize: 12,
    color: "#fff",
  },
  buyInText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
  },
  arrow: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 24,
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
  },
  emptySubtext: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 13,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
  },
});
