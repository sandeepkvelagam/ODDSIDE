import React, { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
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
        <View className="py-4">
          <Text className="text-white text-2xl font-semibold">{group?.name ?? "Group"}</Text>
          {error ? <Text className="text-red-400 mt-2">{error}</Text> : null}
        </View>

        <Text className="text-white/70 mb-2">Members</Text>
        <Card>
          {Array.isArray(members) && members.length > 0 ? (
            members.slice(0, 10).map((m: any, idx: number) => (
              <View key={m?._id ?? m?.id ?? idx} className="py-2">
                <Text className="text-white">{m?.name ?? m?.email ?? "Member"}</Text>
                {idx < Math.min(members.length, 10) - 1 ? (
                  <View className="h-px bg-white/10 mt-2" />
                ) : null}
              </View>
            ))
          ) : (
            <Text className="text-white/50">No members data found.</Text>
          )}
        </Card>

        <View className="h-5" />

        <Text className="text-white/70 mb-2">Games</Text>
        {games.length === 0 ? (
          <Card>
            <Text className="text-white/50">No games yet.</Text>
          </Card>
        ) : (
          <View className="gap-3">
            {games.map((g) => (
              <Card key={g._id} onPress={() => navigation.navigate("GameNight", { gameId: g._id })}>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-white font-semibold">Game</Text>
                    <Text className="text-white/50 mt-1">Status: {g.status}</Text>
                  </View>
                  <Text className="text-white/40">›</Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}
