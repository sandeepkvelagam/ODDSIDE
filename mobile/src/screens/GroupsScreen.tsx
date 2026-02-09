import React, { useEffect, useState, useCallback } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Screen } from "../components/ui/Screen";
import { Card } from "../components/ui/Card";
import { listGroups } from "../api/groups";
import type { Group } from "../types";
import type { MainStackParamList } from "../navigation/MainStack";

type Nav = NativeStackNavigationProp<MainStackParamList, "Groups">;

export function GroupsScreen() {
  const navigation = useNavigation<Nav>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await listGroups();
      setGroups(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load groups");
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

  return (
    <Screen>
      <View className="py-4">
        <Text className="text-white text-2xl font-semibold">Groups</Text>
        <Text className="text-white/60 mt-1">Pick a group to open games and members.</Text>
      </View>

      {error ? (
        <View className="mb-3">
          <Text className="text-red-400">{error}</Text>
        </View>
      ) : null}

      {loading && groups.length === 0 ? (
        <View className="mt-10">
          <Text className="text-white/70">Loading…</Text>
        </View>
      ) : groups.length === 0 ? (
        <View className="mt-10">
          <Text className="text-white/70">No groups yet.</Text>
          <Text className="text-white/40 mt-2">Create one on web for now.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g._id}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ItemSeparatorComponent={() => <View className="h-3" />}
          renderItem={({ item }) => (
            <Card
              onPress={() =>
                navigation.navigate("GroupHub", { groupId: item._id, groupName: item.name })
              }
            >
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-white text-lg font-semibold">{item.name}</Text>
                  <Text className="text-white/50 mt-1">
                    {item.member_count ?? "—"} members
                  </Text>
                </View>
                <Text className="text-white/40">›</Text>
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}
