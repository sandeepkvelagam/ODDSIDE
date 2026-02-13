import React, { useState, useEffect, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";
import { RightDrawer } from "../components/RightDrawer";

type ConsolidatedBalance = {
  user: { user_id: string; name: string; picture?: string };
  net_amount: number;
  direction: "owed_to_you" | "you_owe";
  display_amount: number;
};

export function ProfileScreen() {
  const { user, refreshUser } = useAuth();
  const { isDark, colors } = useTheme();

  const [fullName, setFullName] = useState(user?.name || "");
  const [nickname, setNickname] = useState(user?.nickname || user?.name?.split(" ")[0] || "");
  const [preferences, setPreferences] = useState(user?.preferences || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPreferences, setIsUpdatingPreferences] = useState(false);

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
          `Consolidated ${res.data.optimized} entries into fewer transactions. Your balances have been simplified.`
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

  const handleSavePreferences = async () => {
    setIsUpdatingPreferences(true);
    try {
      await api.put("/users/me", {
        preferences: preferences.trim(),
      });

      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert("Success", "Preferences saved successfully");
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.detail || "Failed to save preferences");
    } finally {
      setIsUpdatingPreferences(false);
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
  const preferencesChanged = preferences !== (user?.preferences || "");

  return (
    <RightDrawer title="Profile">
      <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.orange} />
          }
        >
          {/* Full Name */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary }]}
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            placeholderTextColor={colors.textMuted}
          />

          {/* Nickname */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Nickname</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary }]}
            value={nickname}
            onChangeText={setNickname}
            placeholder="Enter your nickname"
            placeholderTextColor={colors.textMuted}
          />

          {/* Update Profile Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: profileChanged ? colors.buttonBg : colors.buttonDisabled }
            ]}
            onPress={handleUpdateProfile}
            disabled={!profileChanged || isUpdatingProfile}
            activeOpacity={0.8}
          >
            {isUpdatingProfile ? (
              <ActivityIndicator color={isDark ? "#1a1a1a" : "#ffffff"} />
            ) : (
              <Text style={[styles.buttonText, { color: isDark ? "#1a1a1a" : "#ffffff" }]}>Update Profile</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Personal Preferences */}
          <Text style={[styles.label, { color: colors.textSecondary }]}>Personal Preferences</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.textPrimary }]}
            value={preferences}
            onChangeText={setPreferences}
            placeholder="When learning new concepts, I find analogies particularly helpful."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Your preferences will apply to all conversations, within Anthropic's guidelines.
          </Text>

          {/* Save Preferences Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: preferencesChanged ? colors.buttonBg : colors.buttonDisabled }
            ]}
            onPress={handleSavePreferences}
            disabled={!preferencesChanged || isUpdatingPreferences}
            activeOpacity={0.8}
          >
            {isUpdatingPreferences ? (
              <ActivityIndicator color={isDark ? "#1a1a1a" : "#ffffff"} />
            ) : (
              <Text style={[styles.buttonText, { color: isDark ? "#1a1a1a" : "#ffffff" }]}>Save Preferences</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Consolidated Balances Section */}
          <View style={styles.balancesSection}>
            <View style={styles.balancesSectionHeader}>
              <View style={styles.balancesTitleRow}>
                <Ionicons name="wallet-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.balancesSectionTitle, { color: colors.textPrimary }]}>
                  Balances
                </Text>
              </View>
              <Text style={[styles.balancesSubtitle, { color: colors.textMuted }]}>
                Consolidated across all games
              </Text>
            </View>

            {balancesLoading ? (
              <ActivityIndicator color={colors.orange} style={{ marginVertical: 20 }} />
            ) : balances && (balances.total_you_owe > 0 || balances.total_owed_to_you > 0) ? (
              <>
                {/* Summary Row */}
                <View style={[styles.balancesSummary, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
                  <View style={styles.balanceSummaryItem}>
                    <Text style={[styles.balanceSummaryValue, { color: colors.danger }]}>
                      ${balances.total_you_owe.toFixed(2)}
                    </Text>
                    <Text style={[styles.balanceSummaryLabel, { color: colors.textMuted }]}>
                      You Owe
                    </Text>
                  </View>
                  <View style={[styles.balanceSummaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.balanceSummaryItem}>
                    <Text style={[styles.balanceSummaryValue, { color: colors.success }]}>
                      ${balances.total_owed_to_you.toFixed(2)}
                    </Text>
                    <Text style={[styles.balanceSummaryLabel, { color: colors.textMuted }]}>
                      Owed to You
                    </Text>
                  </View>
                  <View style={[styles.balanceSummaryDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.balanceSummaryItem}>
                    <Text style={[
                      styles.balanceSummaryValue,
                      { color: balances.net_balance >= 0 ? colors.success : colors.danger }
                    ]}>
                      {balances.net_balance >= 0 ? "+" : ""}${balances.net_balance.toFixed(2)}
                    </Text>
                    <Text style={[styles.balanceSummaryLabel, { color: colors.textMuted }]}>
                      Net
                    </Text>
                  </View>
                </View>

                {/* Individual Balances */}
                {balances.consolidated.map((item, index) => (
                  <View
                    key={item.user?.user_id || index}
                    style={[styles.balanceItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  >
                    <View style={[styles.balanceAvatar, { backgroundColor: colors.glassBg }]}>
                      <Text style={[styles.balanceAvatarText, { color: colors.textPrimary }]}>
                        {item.user?.name?.[0]?.toUpperCase() || "?"}
                      </Text>
                    </View>
                    <View style={styles.balanceInfo}>
                      <Text style={[styles.balanceName, { color: colors.textPrimary }]}>
                        {item.user?.name || "Unknown"}
                      </Text>
                      <Text style={[styles.balanceDirection, { color: colors.textMuted }]}>
                        {item.direction === "you_owe" ? "You owe them" : "They owe you"}
                      </Text>
                    </View>
                    <Text style={[
                      styles.balanceAmount,
                      { color: item.direction === "you_owe" ? colors.danger : colors.success }
                    ]}>
                      {item.direction === "you_owe" ? "-" : "+"}${item.display_amount.toFixed(2)}
                    </Text>
                  </View>
                ))}

                {/* Optimize Debts Button - only show if there are balances to optimize */}
                {balances.consolidated.length > 1 && (
                  <TouchableOpacity
                    style={[styles.optimizeButton, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}
                    onPress={handleOptimizeDebts}
                    disabled={optimizing}
                  >
                    {optimizing ? (
                      <ActivityIndicator size="small" color={colors.orange} />
                    ) : (
                      <>
                        <Ionicons name="git-merge-outline" size={18} color={colors.orange} />
                        <Text style={[styles.optimizeButtonText, { color: colors.orange }]}>
                          Optimize Cross-Game Debts
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={[styles.noBalancesCard, { backgroundColor: colors.glassBg, borderColor: colors.glassBorder }]}>
                <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                <Text style={[styles.noBalancesText, { color: colors.textSecondary }]}>
                  You're all settled up!
                </Text>
                <Text style={[styles.noBalancesSubtext, { color: colors.textMuted }]}>
                  No pending balances with anyone
                </Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Delete Account */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={[styles.deleteText, { color: colors.danger }]}>Delete account</Text>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
    </RightDrawer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainCard: {
    flex: 1,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    overflow: "hidden",
    marginTop: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 44,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 6,
    marginTop: 0,
  },
  input: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  textArea: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
    minHeight: 100,
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  button: {
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 4,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "500",
  },
  // Balances styles
  balancesSection: {
    marginBottom: 8,
  },
  balancesSectionHeader: {
    marginBottom: 16,
  },
  balancesTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  balancesSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  balancesSubtitle: {
    fontSize: 13,
    marginLeft: 30,
  },
  balancesSummary: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  balanceSummaryItem: {
    flex: 1,
    alignItems: "center",
  },
  balanceSummaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  balanceSummaryLabel: {
    fontSize: 11,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceSummaryDivider: {
    width: 1,
    marginHorizontal: 8,
  },
  balanceItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 12,
  },
  balanceAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  balanceAvatarText: {
    fontSize: 16,
    fontWeight: "600",
  },
  balanceInfo: {
    flex: 1,
  },
  balanceName: {
    fontSize: 15,
    fontWeight: "600",
  },
  balanceDirection: {
    fontSize: 12,
    marginTop: 2,
  },
  balanceAmount: {
    fontSize: 17,
    fontWeight: "700",
  },
  noBalancesCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    gap: 8,
  },
  noBalancesText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
  },
  noBalancesSubtext: {
    fontSize: 13,
  },
  optimizeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  optimizeButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
