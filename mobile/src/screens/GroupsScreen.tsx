import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { listGroups } from "../api/groups";
import type { Group } from "../types";
import type { RootStackParamList } from "../navigation/RootNavigator";

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "Groups">;

export function GroupsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    setError(null);
    try {
      const data = await listGroups();
      setGroups(data);
    } catch (e: any) {
      const message = e?.response?.data?.detail || e?.message || "Failed to load groups";
      setError(message);
      console.error("Error fetching groups:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGroups();
    setRefreshing(false);
  }, [fetchGroups]);

  const handleSignOut = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await supabase.auth.signOut();
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: Group }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("GroupHub", {
          groupId: item._id || item.group_id,
          groupName: item.name,
        })
      }
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.memberCount}>
            {item.member_count ?? 0} members
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Your Groups</Text>
          <Text style={styles.headerSubtitle}>
            Select a group to view games and members
          </Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchGroups}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={groups}
        keyExtractor={(item) => item._id || item.group_id || String(Math.random())}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No Groups Yet</Text>
              <Text style={styles.emptySubtitle}>
                Create a group on the web app to get started
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    marginTop: 4,
  },
  signOutButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  signOutText: {
    color: "#ef4444",
    fontSize: 14,
    fontWeight: "500",
  },
  listContainer: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: "#141421",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
    padding: 16,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardInfo: {
    flex: 1,
  },
  groupName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
  memberCount: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    marginTop: 4,
  },
  arrow: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 24,
    marginLeft: 12,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.15)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
  },
  retryText: {
    color: "#3b82f6",
    fontSize: 13,
    marginTop: 4,
  },
});
