import React, { useEffect, useState, useCallback } from "react";
import { FlatList, RefreshControl, Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type GroupItem = {
  group_id: string;
  name: string;
  member_count?: number;
  role?: string;
};

export function GroupsScreen() {
  const navigation = useNavigation<Nav>();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get("/groups");
      const data = Array.isArray(res.data) ? res.data : [];
      setGroups(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Failed to load groups");
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
    <View style={styles.container} data-testid="groups-screen">
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Loading groups...</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={40} color="#444" />
          <Text style={styles.emptyTitle}>No Groups Yet</Text>
          <Text style={styles.emptySubtext}>
            Create a group on the web app to get started
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.group_id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#EF6E59"
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.groupCard}
              onPress={() =>
                navigation.navigate("GroupHub", {
                  groupId: item.group_id,
                  groupName: item.name,
                })
              }
              activeOpacity={0.7}
              data-testid={`group-card-${item.group_id}`}
            >
              <View style={styles.groupAvatar}>
                <Text style={styles.groupAvatarText}>
                  {item.name?.[0]?.toUpperCase() || "G"}
                </Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{item.name}</Text>
                <Text style={styles.memberCount}>
                  {item.member_count ?? 0} members
                  {item.role ? ` · ${item.role}` : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorBanner: {
    margin: 16,
    backgroundColor: "rgba(239,68,68,0.12)",
    padding: 12,
    borderRadius: 10,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    color: "#888",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
  },
  emptyText: {
    color: "#888",
    fontSize: 14,
  },
  emptySubtext: {
    color: "#555",
    fontSize: 13,
    marginTop: 8,
    textAlign: "center",
  },
  groupCard: {
    backgroundColor: "#141421",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(239,110,89,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  groupAvatarText: {
    color: "#EF6E59",
    fontSize: 18,
    fontWeight: "700",
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  memberCount: {
    color: "#777",
    fontSize: 13,
    marginTop: 3,
  },
});
