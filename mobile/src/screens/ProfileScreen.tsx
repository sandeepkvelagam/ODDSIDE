import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { GlassSurface, GlassButton, GlassIconButton, GlassInput } from "../components/ui";
import { BottomSheetScreen } from "../components/BottomSheetScreen";

type ConsolidatedBalance = {
  user: { user_id: string; name: string; picture?: string };
  net_amount: number;
  direction: "owed_to_you" | "you_owe";
  display_amount: number;
};

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();

  const [fullName, setFullName] = useState(user?.name || "");
  const [nickname, setNickname] = useState(user?.nickname || user?.name?.split(" ")[0] || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Consolidated balances state
  const [balances, setBalances] = useState<{
    consolidated: ConsolidatedBalance[];
    total_you_owe: number;
    total_owed_to_you: number;
    net_balance: number;
  } | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        ...ANIMATION.spring.bouncy,
      }),
    ]).start();
  }, []);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await api.get("/ledger/consolidated");
      setBalances(res.data);
    } catch (e) {
      console.error("Failed to fetch balances:", e);
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBalances();
    setRefreshing(false);
  }, [fetchBalances]);

  const handleOptimizeDebts = async () => {
    setOptimizing(true);
    try {
      const res = await api.post("/ledger/optimize");
      if (res.data?.optimized > 0) {
        Alert.alert(
          "Debts Optimized",
          `Consolidated ${res.data.optimized} entries. Your balances have been simplified.`
        );
        await fetchBalances();
      } else {
        Alert.alert("Already Optimized", "Your debts are already at their simplest form.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to optimize debts");
    } finally {
      setOptimizing(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await api.put("/users/me", {
        name: fullName.trim(),
        nickname: nickname.trim(),
      });

      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert("Success", "Profile updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.detail || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/users/me");
              Alert.alert("Account Deleted", "Your account has been deleted.");
            } catch (error: any) {
              Alert.alert("Error", error?.response?.data?.detail || "Failed to delete account");
            }
          },
        },
      ]
    );
  };

  const profileChanged = fullName !== (user?.name || "") || nickname !== (user?.nickname || user?.name?.split(" ")[0] || "");

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <GlassIconButton
            icon={<Ionicons name="chevron-back" size={22} color={COLORS.text.primary} />}
            onPress={() => navigation.goBack()}
            variant="ghost"
          />
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 48 }} />
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />
          }
        >
          {/* Wallet Balance Section - Screenshot #1 Inspired */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            <GlassSurface glowVariant="orange" style={styles.walletCard}>
              <View style={styles.walletHeader}>
                <View style={styles.walletHeaderLeft}>
                  <Text style={styles.walletLabel}>NET BALANCE</Text>
                  <Text style={[
                    styles.walletValue,
                    { color: (balances?.net_balance ?? 0) >= 0 ? COLORS.status.success : COLORS.status.danger }
                  ]}>
                    {balancesLoading ? "..." : (
                      `${(balances?.net_balance ?? 0) >= 0 ? "+" : ""}$${Math.abs(balances?.net_balance ?? 0).toFixed(2)}`
                    )}
                  </Text>
                </View>
                <View style={styles.walletAvatars}>
                  {/* Avatar stack like in Screenshot #1 */}
                  {(balances?.consolidated || []).slice(0, 3).map((item, idx) => (
                    <View
                      key={item.user?.user_id || idx}
                      style={[
                        styles.avatarStackItem,
                        { marginLeft: idx > 0 ? -12 : 0, zIndex: 3 - idx }
                      ]}
                    >
                      <Text style={styles.avatarStackText}>
                        {item.user?.name?.[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                  ))}
                  {(balances?.consolidated?.length ?? 0) > 3 && (
                    <View style={[styles.avatarStackItem, styles.avatarMore, { marginLeft: -12 }]}>
                      <Text style={styles.avatarMoreText}>
                        +{(balances?.consolidated?.length ?? 0) - 3}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Balance Summary Row */}
              <View style={styles.balanceSummaryRow}>
                <View style={styles.balanceSummaryItem}>
                  <Ionicons name="arrow-down" size={16} color={COLORS.status.danger} />
                  <Text style={styles.balanceSummaryLabel}>You Owe</Text>
                  <Text style={[styles.balanceSummaryValue, { color: COLORS.status.danger }]}>
                    ${(balances?.total_you_owe ?? 0).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.balanceDivider} />
                <View style={styles.balanceSummaryItem}>
                  <Ionicons name="arrow-up" size={16} color={COLORS.status.success} />
                  <Text style={styles.balanceSummaryLabel}>Owed to You</Text>
                  <Text style={[styles.balanceSummaryValue, { color: COLORS.status.success }]}>
                    ${(balances?.total_owed_to_you ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Action Buttons - Screenshot #1 Receive/Send style */}
              <View style={styles.walletActions}>
                <TouchableOpacity style={[styles.walletActionBtn, { backgroundColor: COLORS.trustBlue }]} activeOpacity={0.8}>
                  <Ionicons name="arrow-down" size={20} color="#fff" />
                  <Text style={styles.walletActionText}>Receive</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.walletActionBtn, { backgroundColor: COLORS.orange }]} activeOpacity={0.8}>
                  <Ionicons name="arrow-up" size={20} color="#fff" />
                  <Text style={styles.walletActionText}>Send</Text>
                </TouchableOpacity>
              </View>
            </GlassSurface>
          </Animated.View>

          {/* Individual Balances */}
          {!balancesLoading && balances && balances.consolidated.length > 0 && (
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.sectionTitle}>INDIVIDUAL BALANCES</Text>
              <GlassSurface style={styles.balancesList}>
                {balances.consolidated.map((item, index) => (
                  <View
                    key={item.user?.user_id || index}
                    style={[
                      styles.balanceItem,
                      index < balances.consolidated.length - 1 && styles.balanceItemBorder,
                    ]}
                  >
                    <View style={[
                      styles.balanceAvatar,
                      { backgroundColor: item.direction === "you_owe" ? COLORS.glass.glowRed : COLORS.glass.glowGreen }
                    ]}>
                      <Text style={styles.balanceAvatarText}>
                        {item.user?.name?.[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View style={styles.balanceInfo}>
                      <Text style={styles.balanceName}>{item.user?.name || "Unknown"}</Text>
                      <Text style={styles.balanceDirection}>
                        {item.direction === "you_owe" ? "You owe them" : "They owe you"}
                      </Text>
                    </View>
                    <Text style={[
                      styles.balanceAmount,
                      { color: item.direction === "you_owe" ? COLORS.status.danger : COLORS.status.success }
                    ]}>
                      {item.direction === "you_owe" ? "-" : "+"}${item.display_amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </GlassSurface>

              {/* Optimize Button */}
              {balances.consolidated.length > 1 && (
                <TouchableOpacity
                  style={styles.optimizeButton}
                  onPress={handleOptimizeDebts}
                  disabled={optimizing}
                  activeOpacity={0.8}
                >
                  {optimizing ? (
                    <ActivityIndicator size="small" color={COLORS.orange} />
                  ) : (
                    <>
                      <Ionicons name="git-merge-outline" size={18} color={COLORS.orange} />
                      <Text style={styles.optimizeButtonText}>Optimize Cross-Game Debts</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </Animated.View>
          )}

          {/* No Balances State */}
          {!balancesLoading && (!balances || (balances.total_you_owe === 0 && balances.total_owed_to_you === 0)) && (
            <GlassSurface glowVariant="green" style={styles.noBalancesCard}>
              <Ionicons name="checkmark-circle" size={40} color={COLORS.status.success} />
              <Text style={styles.noBalancesText}>You're all settled up!</Text>
              <Text style={styles.noBalancesSubtext}>No pending balances with anyone</Text>
            </GlassSurface>
          )}

          {/* Profile Section */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.sectionTitle}>PROFILE DETAILS</Text>
            <GlassSurface>
              <GlassInput
                label="Full Name"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
                containerStyle={styles.inputContainer}
              />

              <GlassInput
                label="Nickname"
                placeholder="Enter your nickname"
                value={nickname}
                onChangeText={setNickname}
                containerStyle={styles.inputContainer}
              />

              <GlassButton
                variant={profileChanged ? "primary" : "ghost"}
                size="large"
                fullWidth
                onPress={handleUpdateProfile}
                loading={isUpdatingProfile}
                disabled={!profileChanged}
                style={styles.updateButton}
              >
                Update Profile
              </GlassButton>
            </GlassSurface>
          </Animated.View>

          {/* Danger Zone */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.sectionTitle}>DANGER ZONE</Text>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={20} color={COLORS.status.danger} />
              <Text style={styles.deleteText}>Delete account</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.jetDark,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.container,
    paddingBottom: SPACING.xxl,
  },
  // Wallet Card - Screenshot #1 Style
  walletCard: {
    marginBottom: SPACING.xl,
  },
  walletHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.lg,
  },
  walletHeaderLeft: {},
  walletLabel: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  walletValue: {
    fontSize: 36,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: -1,
  },
  walletAvatars: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarStackItem: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 2,
    borderColor: COLORS.jetDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarStackText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  avatarMore: {
    backgroundColor: COLORS.glass.inner,
  },
  avatarMoreText: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  balanceSummaryRow: {
    flexDirection: "row",
    marginBottom: SPACING.lg,
  },
  balanceSummaryItem: {
    flex: 1,
    alignItems: "center",
    gap: SPACING.xs,
  },
  balanceSummaryLabel: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
  },
  balanceSummaryValue: {
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: COLORS.glass.border,
    marginHorizontal: SPACING.md,
  },
  walletActions: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  walletActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  walletActionText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  // Section
  sectionTitle: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    letterSpacing: 1,
    marginBottom: SPACING.md,
    marginTop: SPACING.lg,
  },
  // Balances List
  balancesList: {
    marginBottom: SPACING.md,
  },
  balanceItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  balanceItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  balanceAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceAvatarText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceName: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  balanceDirection: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: 2,
  },
  balanceAmount: {
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  optimizeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  optimizeButtonText: {
    color: COLORS.orange,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  // No Balances
  noBalancesCard: {
    alignItems: "center",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  noBalancesText: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  noBalancesSubtext: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
  },
  // Profile Form
  inputContainer: {
    marginBottom: SPACING.md,
  },
  updateButton: {
    marginTop: SPACING.sm,
  },
  // Delete
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  deleteText: {
    color: COLORS.status.danger,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});

export default ProfileScreen;
