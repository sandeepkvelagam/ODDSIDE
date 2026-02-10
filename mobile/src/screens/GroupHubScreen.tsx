import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/ui/Screen";
import { Card } from "../components/ui/Card";
import { getGroup } from "../api/groups";
import { listGroupGames } from "../api/games";
import type { Game } from "../types";
import type { MainStackParamList } from "../navigation/MainStack";

type R = RouteProp<MainStackParamList, "GroupHub">;
type Nav = NativeStackNavigationProp<MainStackParamList, "GroupHub">;

export function GroupHubScreen() {
  const route = useRoute<R>();
  const navigation = useNavigation<Nav>();
  const { groupId } = route.params;

  const [group, setGroup] = useState<any>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const g = await getGroup(groupId);
        setGroup(g);
        const gs = await listGroupGames(groupId);
        setGames(gs);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load group");
      }
    })();
  }, [groupId]);

  const members = group?.members ?? group?.data?.members ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={styles.header}>
          <Text style={styles.title}>{group?.name ?? "Group"}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <Text style={styles.sectionTitle}>Members</Text>
        <Card>
          {Array.isArray(members) && members.length > 0 ? (
            members.slice(0, 10).map((m: any, idx: number) => (
              <View key={m?._id ?? m?.id ?? idx} style={styles.memberItem}>
                <Text style={styles.memberName}>{m?.name ?? m?.email ?? "Member"}</Text>
                {idx < Math.min(members.length, 10) - 1 ? (
                  <View style={styles.divider} />
                ) : null}
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No members data found.</Text>
          )}
        </Card>

        <View style={{ height: 20 }} />

        <Text style={styles.sectionTitle}>Games</Text>
        {games.length === 0 ? (
          <Card>
            <Text style={styles.emptyText}>No games yet.</Text>
          </Card>
        ) : (
          <View style={{ gap: 12 }}>
            {games.map((g) => (
              <Card key={g._id} onPress={() => navigation.navigate("GameNight", { gameId: g._id })}>
                <View style={styles.gameRow}>
                  <View>
                    <Text style={styles.gameName}>Game</Text>
                    <Text style={styles.gameStatus}>Status: {g.status}</Text>
                  </View>
                  <Text style={styles.arrow}>›</Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingVertical: 16,
  },
  title: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "600",
  },
  errorText: {
    color: "#f87171",
    marginTop: 8,
  },
  sectionTitle: {
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  memberItem: {
    paddingVertical: 8,
  },
  memberName: {
    color: "#fff",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: 8,
  },
  emptyText: {
    color: "rgba(255,255,255,0.5)",
  },
  gameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gameName: {
    color: "#fff",
    fontWeight: "600",
  },
  gameStatus: {
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
  },
  arrow: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 20,
  },
});
