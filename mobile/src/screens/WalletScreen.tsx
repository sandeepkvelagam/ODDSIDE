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
  TextInput,
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

export function WalletScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [balances, setBalances] = useState<{
    consolidated: ConsolidatedBalance[];
    total_you_owe: number;
    total_owed_to_you: number;
    net_balance: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ConsolidatedBalance | null>(null);
  const [sendAmount, setSendAmount] = useState("");

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
      setLoading(false);
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

  const handleSettle = (item: ConsolidatedBalance) => {
    setSelectedUser(item);
    setSendAmount(item.display_amount.toFixed(2));
    setShowSendModal(true);
  };

  const handleConfirmSettle = async () => {
    if (!selectedUser) return;
    
    try {
      // Mark as settled - this would call your backend API
      Alert.alert(
        "Settlement Recorded",
        `You've marked $${sendAmount} as settled with ${selectedUser.user.name}. They'll receive a notification to confirm.`
      );
      setShowSendModal(false);
      setSelectedUser(null);
      setSendAmount("");
      await fetchBalances();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to settle");
    }
  };

  return (
    <BottomSheetScreen>
      <View style={styles.container}>
        {/* Header */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <GlassIconButton
            icon={<Ionicons name="close" size={22} color={COLORS.text.primary} />}
            onPress={() => navigation.goBack()}
            variant="ghost"
          />
          <Text style={styles.headerTitle}>Kvitt Wallet</Text>
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
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.orange} />
            </View>
          ) : (
            <>
              {/* Balance Overview Card */}
              <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                <GlassSurface glowVariant="orange" style={styles.balanceCard}>
                  <View style={styles.balanceHeader}>
                    <Text style={styles.balanceLabel}>NET BALANCE</Text>
                    <Text style={[
                      styles.balanceValue,
                      { color: (balances?.net_balance ?? 0) >= 0 ? COLORS.status.success : COLORS.status.danger }
                    ]}>
                      {(balances?.net_balance ?? 0) >= 0 ? "+" : ""}${Math.abs(balances?.net_balance ?? 0).toFixed(2)}
                    </Text>
                  </View>

                  {/* Quick Stats */}
                  <View style={styles.quickStats}>
                    <View style={styles.quickStatItem}>
                      <View style={[styles.quickStatIcon, { backgroundColor: COLORS.glass.glowRed }]}>
                        <Ionicons name="arrow-up" size={16} color={COLORS.status.danger} />
                      </View>
                      <View>
                        <Text style={styles.quickStatLabel}>You Owe</Text>
                        <Text style={[styles.quickStatValue, { color: COLORS.status.danger }]}>
                          ${(balances?.total_you_owe ?? 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.quickStatDivider} />

                    <View style={styles.quickStatItem}>
                      <View style={[styles.quickStatIcon, { backgroundColor: COLORS.glass.glowGreen }]}>
                        <Ionicons name="arrow-down" size={16} color={COLORS.status.success} />
                      </View>
                      <View>
                        <Text style={styles.quickStatLabel}>Owed to You</Text>
                        <Text style={[styles.quickStatValue, { color: COLORS.status.success }]}>
                          ${(balances?.total_owed_to_you ?? 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </GlassSurface>
              </Animated.View>

              {/* Settlement Actions */}
              <Animated.View style={{ opacity: fadeAnim }}>
                <View style={styles.actionsRow}>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: COLORS.trustBlue }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="qr-code" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Receive</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: COLORS.orange }]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="send" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>Send</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Individual Balances */}
              {balances && balances.consolidated.length > 0 && (
                <Animated.View style={{ opacity: fadeAnim }}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>PENDING SETTLEMENTS</Text>
                    {balances.consolidated.length > 1 && (
                      <TouchableOpacity
                        style={styles.optimizeButton}
                        onPress={handleOptimizeDebts}
                        disabled={optimizing}
                        activeOpacity={0.7}
                      >
                        {optimizing ? (
                          <ActivityIndicator size="small" color={COLORS.orange} />
                        ) : (
                          <>
                            <Ionicons name="git-merge-outline" size={14} color={COLORS.orange} />
                            <Text style={styles.optimizeText}>Simplify</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>

                  <GlassSurface style={styles.balancesList} noPadding>
                    {balances.consolidated.map((item, index) => (
                      <TouchableOpacity
                        key={item.user?.user_id || index}
                        style={[
                          styles.balanceItem,
                          index < balances.consolidated.length - 1 && styles.balanceItemBorder,
                        ]}
                        onPress={() => handleSettle(item)}
                        activeOpacity={0.7}
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
                        <View style={styles.balanceRight}>
                          <Text style={[
                            styles.balanceAmount,
                            { color: item.direction === "you_owe" ? COLORS.status.danger : COLORS.status.success }
                          ]}>
                            ${item.display_amount.toFixed(2)}
                          </Text>
                          <TouchableOpacity 
                            style={[
                              styles.settleButton,
                              { backgroundColor: item.direction === "you_owe" ? COLORS.orange : COLORS.trustBlue }
                            ]}
                            onPress={() => handleSettle(item)}
                          >
                            <Text style={styles.settleButtonText}>
                              {item.direction === "you_owe" ? "Pay" : "Request"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </GlassSurface>
                </Animated.View>
              )}

              {/* All Settled */}
              {balances && balances.consolidated.length === 0 && (
                <GlassSurface glowVariant="green" style={styles.allSettledCard}>
                  <Ionicons name="checkmark-circle" size={48} color={COLORS.status.success} />
                  <Text style={styles.allSettledTitle}>All Settled!</Text>
                  <Text style={styles.allSettledText}>
                    You have no pending balances with anyone.
                  </Text>
                </GlassSurface>
              )}

              {/* Info Card */}
              <Animated.View style={{ opacity: fadeAnim }}>
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.text.muted} />
                  <Text style={styles.infoText}>
                    Balances are automatically calculated from your game sessions. Settle up using Venmo, PayPal, or cash.
                  </Text>
                </View>
              </Animated.View>
            </>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </BottomSheetScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.jetDark,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.container,
    paddingVertical: SPACING.md,
    paddingTop: 16,
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
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  // Balance Card
  balanceCard: {
    marginBottom: SPACING.lg,
  },
  balanceHeader: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  balanceLabel: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  balanceValue: {
    fontSize: 42,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: -1,
  },
  quickStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  quickStatItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  quickStatLabel: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
  },
  quickStatValue: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  quickStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.glass.border,
    marginHorizontal: SPACING.md,
  },
  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  // Section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.moonstone,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    letterSpacing: 1,
  },
  optimizeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.glass.bg,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
  },
  optimizeText: {
    color: COLORS.orange,
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  // Balances List
  balancesList: {
    marginBottom: SPACING.lg,
  },
  balanceItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
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
  balanceRight: {
    alignItems: "flex-end",
    gap: SPACING.xs,
  },
  balanceAmount: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  settleButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
  },
  settleButtonText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  // All Settled
  allSettledCard: {
    alignItems: "center",
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  allSettledTitle: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  allSettledText: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    textAlign: "center",
  },
  // Info Card
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  infoText: {
    flex: 1,
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    lineHeight: 18,
  },
});

export default WalletScreen;
