import React, { useEffect, useState, useCallback, useRef } from "react";
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
  Animated,
} from "react-native";
import { GroupsSkeleton } from "../components/ui/GroupsSkeleton";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../api/client";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { getThemedColors } from "../styles/liquidGlass";
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
  const { isDark, colors } = useTheme();
  const { t } = useLanguage();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
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

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>([]);

  // Skeleton state
  const [skeletonVisible, setSkeletonVisible] = useState(true);
  const skeletonOpacity = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  // Entrance animations
  const entranceAnim = useState(new Animated.Value(0))[0];
  const headerEntrance = useState(new Animated.Value(0))[0];
  const listEntrance = useState(new Animated.Value(0))[0];

  const lc = getThemedColors(isDark, colors);

  // Admin badge color - amber that's readable on both themes
  const adminColor = isDark ? "#eab308" : "#b45309";
  const adminBgColor = isDark ? "rgba(234,179,8,0.15)" : "rgba(180,83,9,0.12)";

  useEffect(() => {
    // Staggered entrance animations
    Animated.stagger(100, [
      Animated.spring(headerEntrance, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.spring(listEntrance, { toValue: 1, useNativeDriver: true, tension: 50, friction: 8 }),
    ]).start();
  }, [headerEntrance, listEntrance]);

  // Load favorites from storage
  useEffect(() => {
    AsyncStorage.getItem("group_favorites").then((val) => {
      if (val) setFavorites(JSON.parse(val));
    }).catch(() => {});
  }, []);

  const toggleFavorite = useCallback(async (groupId: string) => {
    setFavorites((prev) => {
      const next = prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId];
      AsyncStorage.setItem("group_favorites", JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

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
      if (skeletonVisible) {
        const minWait = setTimeout(() => {
          Animated.parallel([
            Animated.timing(skeletonOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            Animated.timing(contentOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          ]).start(() => setSkeletonVisible(false));
        }, 400);
        return () => clearTimeout(minWait);
      }
    }
  }, [skeletonOpacity, contentOpacity, skeletonVisible]);

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
      await load();
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

  const renderGroupCard = ({ item }: { item: GroupItem }) => {
    const isFav = favorites.includes(item.group_id);
    return (
      <TouchableOpacity
        style={[styles.groupItem, { borderBottomColor: lc.liquidGlassBorder }]}
        onPress={() =>
          navigation.navigate("GroupHub", {
            groupId: item.group_id,
            groupName: item.name,
          })
        }
        activeOpacity={0.7}
        testID={`group-card-${item.group_id}`}
      >
        <View style={[styles.groupAvatar, { backgroundColor: lc.liquidGlowOrange }]}>
          <Text style={[styles.groupAvatarText, { color: lc.orange }]}>
            {item.name?.[0]?.toUpperCase() || "G"}
          </Text>
        </View>
        <View style={styles.groupInfo}>
          <View style={styles.groupNameRow}>
            <Text style={[styles.groupName, { color: lc.textPrimary }]}>{item.name}</Text>
            {item.role === "admin" ? (
              <View style={[styles.adminBadge, { backgroundColor: adminBgColor }]}>
                <Ionicons name="shield" size={10} color={adminColor} />
                <Text style={[styles.adminText, { color: adminColor }]}>Admin</Text>
              </View>
            ) : (
              <View style={[styles.adminBadge, { backgroundColor: "rgba(59,130,246,0.12)" }]}>
                <Ionicons name="person" size={10} color={lc.trustBlue} />
                <Text style={[styles.adminText, { color: lc.trustBlue }]}>Member</Text>
              </View>
            )}
          </View>
          <Text style={[styles.groupMeta, { color: lc.textMuted }]}>
            {item.member_count ?? 0} members
          </Text>
        </View>
        <TouchableOpacity
          style={styles.heartButton}
          onPress={(e) => { e.stopPropagation(); toggleFavorite(item.group_id); }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name={isFav ? "heart" : "heart-outline"} size={18} color={isFav ? lc.orange : lc.textMuted} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={16} color={lc.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: lc.jetDark, paddingTop: insets.top }]} testID="groups-screen">
      {/* Page Header with Back Button */}
      <View style={[styles.pageHeader, { borderBottomColor: lc.liquidGlassBorder }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={lc.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.pageTitle, { color: lc.textPrimary }]}>Groups</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ── Skeleton overlay ──────────────────────────────────────────── */}
      {skeletonVisible && (
        <Animated.View
          style={[StyleSheet.absoluteFill, { opacity: skeletonOpacity, backgroundColor: lc.jetDark, top: 60, zIndex: 10 }]}
          pointerEvents="none"
        >
          <GroupsSkeleton />
        </Animated.View>
      )}

      <Animated.View style={{ flex: 1, opacity: contentOpacity }}>

      {/* Header Section - Liquid Glass Card */}
      <Animated.View style={[styles.headerCard, {
        backgroundColor: lc.liquidGlassBg,
        borderColor: lc.liquidGlassBorder,
        opacity: headerEntrance,
        transform: [{
          translateY: headerEntrance.interpolate({
            inputRange: [0, 1],
            outputRange: [-20, 0],
          })
        }]
      }]}>
        <View style={[styles.headerInner, { backgroundColor: lc.liquidInnerBg }]}>
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="people" size={20} color={lc.orange} />
                <Text style={[styles.headerTitle, { color: lc.moonstone }]}>MY GROUPS</Text>
              </View>
              <Text style={[styles.headerSubtitle, { color: lc.textMuted }]}>
                Manage your poker circles
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.invitesButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
              onPress={() => navigation.navigate("PendingRequests")}
              activeOpacity={0.7}
            >
              <Ionicons name="mail-open-outline" size={16} color={lc.orange} />
              <Text style={[styles.invitesButtonText, { color: lc.orange }]}>Invites</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {error && (
        <View style={[styles.errorBanner, { borderColor: "rgba(239,68,68,0.3)" }]}>
          <Ionicons name="alert-circle" size={16} color={lc.danger} />
          <Text style={[styles.errorText, { color: lc.danger }]}>{error}</Text>
        </View>
      )}

      {/* Favorites Section - shown only when there are favorites */}
      {favorites.length > 0 && groups.filter(g => favorites.includes(g.group_id)).length > 0 && (
        <Animated.View style={[styles.listCard, styles.favoritesCard, {
          backgroundColor: lc.liquidGlassBg,
          borderColor: "rgba(238,108,41,0.3)",
          opacity: listEntrance,
          transform: [{
            translateY: listEntrance.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            })
          }]
        }]}>
          <View style={styles.listHeader}>
            <View style={styles.listHeaderLeft}>
              <Ionicons name="heart" size={16} color={lc.orange} />
              <Text style={[styles.listHeaderTitle, { color: lc.orange }]}>FAVORITES</Text>
            </View>
            <Text style={[styles.countBadge, { color: lc.textMuted }]}>
              {groups.filter(g => favorites.includes(g.group_id)).length}
            </Text>
          </View>
          <View style={[styles.listInner, { backgroundColor: lc.liquidInnerBg }]}>
            <FlatList
              data={groups.filter(g => favorites.includes(g.group_id))}
              keyExtractor={(g) => g.group_id}
              renderItem={renderGroupCard}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
            />
          </View>
        </Animated.View>
      )}

      {/* Groups List - Liquid Glass Card */}
      <Animated.View style={[styles.listCard, {
        backgroundColor: lc.liquidGlassBg,
        borderColor: lc.liquidGlassBorder,
        opacity: listEntrance,
        transform: [{
          translateY: listEntrance.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          })
        }]
      }]}>
        <View style={styles.listHeader}>
          <View style={styles.listHeaderLeft}>
            <Ionicons name="list" size={16} color={lc.trustBlue} />
            <Text style={[styles.listHeaderTitle, { color: lc.moonstone }]}>YOUR GROUPS</Text>
          </View>
          <Text style={[styles.countBadge, { color: lc.textMuted }]}>{groups.length}</Text>
        </View>

        {loading && groups.length === 0 ? (
          <View style={[styles.listInner, { backgroundColor: lc.liquidInnerBg }]}>
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color={lc.orange} />
              <Text style={[styles.emptyText, { color: lc.textMuted }]}>Loading groups...</Text>
            </View>
          </View>
        ) : groups.length === 0 ? (
          <View style={[styles.listInner, { backgroundColor: lc.liquidInnerBg }]}>
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={lc.textMuted} />
              <Text style={[styles.emptyTitle, { color: lc.textSecondary }]}>No Groups Yet</Text>
              <Text style={[styles.emptySubtext, { color: lc.textMuted }]}>
                Create a group or accept an invite to start playing
              </Text>
            </View>
          </View>
        ) : (
          <View style={[styles.listInner, { backgroundColor: lc.liquidInnerBg }]}>
            <FlatList
              data={groups}
              keyExtractor={(g) => g.group_id}
              renderItem={renderGroupCard}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
            />
          </View>
        )}

        {/* Quick Actions inside the card */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: lc.trustBlue }]}
            onPress={() => navigation.navigate("PendingRequests")}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={18} color="#fff" />
            <Text style={styles.quickActionText}>View Invites</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Bottom Action Buttons - Labeled FABs */}
      <View style={[styles.bottomActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* AI Chat Button - Labeled */}
        <TouchableOpacity
          style={[styles.labeledFab, { backgroundColor: lc.orangeDark }]}
          onPress={() => navigation.navigate("AIAssistant")}
          activeOpacity={0.8}
        >
          <View style={styles.fabIconContainer}>
            <Ionicons name="sparkles" size={22} color="#fff" />
          </View>
          <Text style={styles.fabLabel}>AI Chat</Text>
        </TouchableOpacity>

        {/* Create Group Button - Labeled */}
        <TouchableOpacity
          style={[styles.labeledFab, styles.primaryFab, { backgroundColor: lc.trustBlue }]}
          onPress={() => setShowCreateSheet(true)}
          activeOpacity={0.8}
        >
          <View style={styles.fabIconContainer}>
            <Ionicons name="add" size={24} color="#fff" />
          </View>
          <Text style={styles.fabLabel}>New Group</Text>
        </TouchableOpacity>
      </View>

      {/* Create Group Modal */}
      <Modal
        visible={showCreateSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateSheet(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowCreateSheet(false)}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          pointerEvents="box-none"
        >
          <View style={[styles.sheetContainer, { backgroundColor: lc.jetSurface }]}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: lc.textPrimary }]}>Create Group</Text>

            {createError && (
              <View style={[styles.sheetError, { backgroundColor: "rgba(239,68,68,0.12)" }]}>
                <Text style={[styles.sheetErrorText, { color: lc.danger }]}>{createError}</Text>
              </View>
            )}

            {/* Input Section - Liquid Glass Style */}
            <View style={[styles.inputSection, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}>
              <View style={[styles.inputInner, { backgroundColor: lc.liquidInnerBg }]}>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { backgroundColor: lc.liquidGlassBg, color: lc.textPrimary, borderColor: lc.liquidGlassBorder }]}
                    placeholder="Group Name"
                    placeholderTextColor={lc.textMuted}
                    value={newGroupName}
                    onChangeText={setNewGroupName}
                    autoFocus
                  />
                  <TouchableOpacity
                    style={[styles.randomButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
                    onPress={handleRandomName}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="dice" size={20} color={lc.orange} />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: lc.liquidGlassBg, color: lc.textPrimary, borderColor: lc.liquidGlassBorder }]}
                  placeholder="Description (optional)"
                  placeholderTextColor={lc.textMuted}
                  value={newGroupDescription}
                  onChangeText={setNewGroupDescription}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: lc.liquidGlassBg, borderColor: lc.liquidGlassBorder }]}
                onPress={() => setShowCreateSheet(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.cancelText, { color: lc.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.createButton,
                  { backgroundColor: lc.trustBlue },
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

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Page Header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  // Header Card - Liquid Glass
  headerCard: {
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 24,
    padding: 4,
    borderWidth: 1.5,
    shadowColor: "rgba(255, 255, 255, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  headerInner: {
    borderRadius: 20,
    padding: 18,
  },
  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 6,
    marginLeft: 30,
  },
  invitesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  invitesButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Error Banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 16,
    gap: 10,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
  },
  // List Card - Liquid Glass
  listCard: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 4,
    borderWidth: 1.5,
    shadowColor: "rgba(255, 255, 255, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
    marginBottom: 100,
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  listHeaderTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
  },
  countBadge: {
    fontSize: 12,
    fontWeight: "500",
  },
  listInner: {
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
  },
  // Group Item
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  groupAvatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  groupInfo: {
    flex: 1,
  },
  groupNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupName: {
    fontSize: 15,
    fontWeight: "600",
  },
  groupMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminText: {
    fontSize: 9,
    fontWeight: "600",
  },
  heartButton: {
    padding: 4,
    marginRight: 4,
  },
  favoritesCard: {
    marginBottom: 8,
  },
  // Quick Actions inside card
  quickActionsContainer: {
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 4,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
  },
  emptySubtext: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  // Bottom Actions - Labeled FABs
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "transparent",
  },
  labeledFab: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryFab: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  fabIconContainer: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  fabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    overflow: "hidden",
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
    marginBottom: 20,
    textAlign: "center",
  },
  sheetError: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  sheetErrorText: {
    fontSize: 14,
  },
  // Input Section - Liquid Glass Style
  inputSection: {
    borderRadius: 20,
    padding: 4,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  inputInner: {
    borderRadius: 16,
    padding: 16,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    lineHeight: 22,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
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
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
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
    borderRadius: 14,
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
