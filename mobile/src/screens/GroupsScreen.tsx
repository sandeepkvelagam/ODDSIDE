import React, { useEffect, useState, useCallback } from "react";
import { FlatList, RefreshControl, Text, View, StyleSheet } from "react-native";
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
      <View style={styles.header}>
        <Text style={styles.title}>Groups</Text>
        <Text style={styles.subtitle}>Pick a group to open games and members.</Text>
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {loading && groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading…</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No groups yet.</Text>
          <Text style={styles.emptySubtext}>Create one on web for now.</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g._id}
          contentContainerStyle={{ paddingBottom: 24 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }) => (
            <Card
              onPress={() =>
                navigation.navigate("GroupHub", { groupId: item._id, groupName: item.name })
              }
            >
              <View style={styles.cardContent}>
                <View>
                  <Text style={styles.groupName}>{item.name}</Text>
                  <Text style={styles.memberCount}>
                    {item.member_count ?? "—"} members
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </View>
            </Card>
          )}
        />
      )}
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
  subtitle: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 4,
  },
  errorContainer: {
    marginBottom: 12,
  },
  errorText: {
    color: "#f87171",
  },
  emptyContainer: {
    marginTop: 40,
  },
  emptyText: {
    color: "rgba(255,255,255,0.7)",
  },
  emptySubtext: {
    color: "rgba(255,255,255,0.4)",
    marginTop: 8,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  groupName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  memberCount: {
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
  },
  arrow: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 20,
  },
});
