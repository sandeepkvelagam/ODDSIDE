import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { AIChatFab } from "../components/AIChatFab";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type GroupItem = {
  group_id: string;
  name: string;
  member_count?: number;
  role?: string;
};

// Fun random group name generator
const GROUP_ADJECTIVES = ["Lucky", "Wild", "Golden", "Royal", "Midnight", "Epic", "Thunder", "Cosmic"];
const GROUP_NOUNS = ["Aces", "Kings", "Sharks", "Wolves", "Dragons", "Legends", "Champions", "Raiders"];

function generateRandomName() {
  const adj = GROUP_ADJECTIVES[Math.floor(Math.random() * GROUP_ADJECTIVES.length)];
  const noun = GROUP_NOUNS[Math.floor(Math.random() * GROUP_NOUNS.length)];
  return `${adj} ${noun}`;
}

export function GroupsScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<Nav>();
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Group Sheet state
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Join Group Sheet state (by invite - just shows notification guidance)
  const [showJoinSheet, setShowJoinSheet] = useState(false);

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

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    setCreating(true);
    setCreateError(null);
    try {
      const res = await api.post("/groups", {
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      });
      setShowCreateSheet(false);
      setNewGroupName("");
      setNewGroupDescription("");
      // Refresh groups list
      await load();
      // Navigate to the new group
      if (res.data?.group_id) {
        navigation.navigate("GroupHub", {
          groupId: res.data.group_id,
          groupName: res.data.name || newGroupName,
        });
      }
    } catch (e: any) {
      setCreateError(e?.response?.data?.detail || e?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const handleRandomName = () => {
    setNewGroupName(generateRandomName());
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]} testID="groups-screen">
      {/* Page Header */}
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderRow}>
          <View>
            <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>MY GROUPS</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textMuted }]}>
              Manage your poker circles
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.joinGroupBtn, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.7}
          >
            <Ionicons name="mail-open-outline" size={16} color={colors.orange} />
            <Text style={[styles.joinGroupBtnText, { color: colors.orange }]}>Invites</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error && (
        <View style={[styles.errorBanner, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Loading groups...</Text>
        </View>
      ) : groups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No Groups Yet</Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Create a group or accept an invite to start playing
          </Text>
          <TouchableOpacity
            style={[styles.emptyCreateButton, { backgroundColor: colors.orange }]}
            onPress={() => setShowCreateSheet(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.emptyCreateText}>Create Group</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.emptyCreateButton, { backgroundColor: colors.glassBg, borderWidth: 1, borderColor: colors.glassBorder, marginTop: 4 }]}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-open-outline" size={20} color={colors.orange} />
            <Text style={[styles.emptyCreateText, { color: colors.orange }]}>View Invites</Text>
          </TouchableOpacity>
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
              tintColor={colors.orange}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.groupCard,
                styles.glassCard,
                { backgroundColor: colors.glassCardBg, borderColor: colors.glassCardBorder }
              ]}
              onPress={() =>
                navigation.navigate("GroupHub", {
                  groupId: item.group_id,
                  groupName: item.name,
                })
              }
              activeOpacity={0.7}
              testID={`group-card-${item.group_id}`}
            >
              <View style={[styles.groupAvatar, { backgroundColor: "rgba(239,110,89,0.15)" }]}>
                <Text style={[styles.groupAvatarText, { color: colors.orange }]}>
                  {item.name?.[0]?.toUpperCase() || "G"}
                </Text>
              </View>
              <View style={styles.groupInfo}>
                <Text style={[styles.groupName, { color: colors.textPrimary }]}>{item.name}</Text>
                <View style={styles.groupMeta}>
                  <Text style={[styles.memberCount, { color: colors.textMuted }]}>
                    {item.member_count ?? 0} members
                  </Text>
                  <View style={[
                    styles.roleBadge,
                    { backgroundColor: item.role === "admin" ? "rgba(234,179,8,0.15)" : colors.glassBg }
                  ]}>
                    <Ionicons
                      name={item.role === "admin" ? "shield" : "person"}
                      size={10}
                      color={item.role === "admin" ? "#EAB308" : colors.textMuted}
                    />
                    <Text style={[
                      styles.roleText,
                      { color: item.role === "admin" ? "#EAB308" : colors.textMuted }
                    ]}>
                      {item.role === "admin" ? "Admin" : "Member"}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Floating Action Button */}
      {groups.length > 0 && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.orange }]}
          onPress={() => setShowCreateSheet(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Group Modal */}
      <Modal
        visible={showCreateSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateSheet(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCreateSheet(false)}
          />
          <View style={[styles.sheetContainer, { backgroundColor: colors.surface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>Create Group</Text>

            {createError && (
              <View style={styles.sheetError}>
                <Text style={styles.sheetErrorText}>{createError}</Text>
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.glassBorder }]}
                placeholder="Group Name"
                placeholderTextColor={colors.textMuted}
                value={newGroupName}
                onChangeText={setNewGroupName}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.randomButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
                onPress={handleRandomName}
                activeOpacity={0.7}
              >
                <Ionicons name="dice" size={20} color={colors.orange} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderColor: colors.glassBorder }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textMuted}
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              multiline
              numberOfLines={3}
            />

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: colors.glassBorder }]}
                onPress={() => setShowCreateSheet(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  { backgroundColor: colors.orange },
                  (!newGroupName.trim() || creating) && styles.buttonDisabled,
                ]}
                onPress={handleCreateGroup}
                disabled={!newGroupName.trim() || creating}
                activeOpacity={0.8}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.createText}>Create Group</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* AI Chat FAB */}
      <AIChatFab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageHeader: {
    paddingHorizontal: 28,
    paddingTop: 12,
    paddingBottom: 8,
  },
  pageHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  joinGroupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  joinGroupBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
    textTransform: "uppercase",
  },
  pageSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  listContent: {
    padding: 28,
    paddingTop: 14,
    paddingBottom: 100,
  },
  errorBanner: {
    margin: 28,
    padding: 14,
    borderRadius: 12,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 28,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 8,
  },
  emptyText: {
    fontSize: 15,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
  emptyCreateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
  },
  emptyCreateText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  groupCard: {
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    gap: 14,
  },
  glassCard: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  groupAvatarText: {
    fontSize: 20,
    fontWeight: "700",
  },
  groupInfo: {
    flex: 1,
    gap: 6,
  },
  groupName: {
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24,
  },
  groupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  memberCount: {
    fontSize: 14,
    lineHeight: 20,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
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
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 18,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
    marginBottom: 24,
  },
  randomButton: {
    width: 52,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
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
  createButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 52,
    justifyContent: "center",
  },
  createText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
