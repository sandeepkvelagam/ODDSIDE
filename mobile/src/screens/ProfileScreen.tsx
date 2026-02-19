import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ScrollView, Text, View, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { api } from "../api/client";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, ANIMATION } from "../styles/liquidGlass";
import { GlassInput, GlassButton, PageHeader } from "../components/ui";
import { BottomSheetScreen } from "../components/BottomSheetScreen";

type Balance = {
  user: { user_id: string; name: string };
  net_amount: number;
  direction: "owed_to_you" | "you_owe";
  display_amount: number;
};

export function ProfileScreen() {
  const navigation = useNavigation();
  const { user, refreshUser } = useAuth();
  const { colors } = useTheme();

  const [fullName, setFullName] = useState(user?.name || "");
  const [nickname, setNickname] = useState(user?.nickname || user?.name?.split(" ")[0] || "");
  const [isUpdating, setIsUpdating] = useState(false);
  const [balances, setBalances] = useState<{
    consolidated: Balance[];
    total_you_owe: number;
    total_owed_to_you: number;
    net_balance: number;
  } | null>(null);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, ...ANIMATION.spring.bouncy }),
    ]).start();
    fetchBalances();
  }, []);

  const fetchBalances = useCallback(async () => {
    try {
      const res = await api.get("/ledger/consolidated");
      setBalances(res.data);
    } catch {}
    finally { setBalancesLoading(false); }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBalances();
    setRefreshing(false);
  }, [fetchBalances]);

  const handleUpdate = async () => {
    if (!fullName.trim()) return;
    setIsUpdating(true);
    try {
      await api.put("/users/me", { name: fullName.trim(), nickname: nickname.trim() });
      await refreshUser?.();
      Alert.alert("Saved", "Profile updated successfully");
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to update profile");
    } finally { setIsUpdating(false); }
  };

  const handleOptimize = async () => {
    setOptimizing(true);
    try {
      const res = await api.post("/ledger/optimize");
      Alert.alert(
        res.data?.optimized > 0 ? "Optimized" : "Already Clean",
        res.data?.optimized > 0
          ? `Simplified ${res.data.optimized} debt entries`
          : "Your debts are already at their simplest form"
      );
      if (res.data?.optimized > 0) await fetchBalances();
    } catch (e: any) {
      Alert.alert("Error", e?.response?.data?.detail || "Failed to optimize");
    } finally { setOptimizing(false); }
  };

  const handleDelete = () => {
    Alert.alert("Delete Account", "This action cannot be undone. All your data will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          try { await api.delete("/users/me"); }
          catch (e: any) { Alert.alert("Error", e?.response?.data?.detail || "Failed"); }
        },
      },
    ]);
  };

  const changed = fullName !== (user?.name || "") || nickname !== (user?.nickname || user?.name?.split(" ")[0] || "");
  const netBal = balances?.net_balance ?? 0;

  return (
    <BottomSheetScreen>
      <View style={[styles.container, { backgroundColor: colors.contentBg }]}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <PageHeader
            title="Profile"
            subtitle={user?.email || ""}
            onClose={() => navigation.goBack()}
          />
        </Animated.View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />}
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* ── Net Balance Hero ── */}
            <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.heroLabel, { color: colors.textMuted }]}>NET BALANCE</Text>
              <Text style={[styles.heroValue, { color: netBal >= 0 ? COLORS.status.success : COLORS.status.danger }]}>
                {balancesLoading ? "..." : `${netBal >= 0 ? "+" : ""}$${Math.abs(netBal).toFixed(2)}`}
              </Text>
              <View style={styles.heroRow}>
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>You Owe</Text>
                  <Text style={[styles.heroStatValue, { color: COLORS.status.danger }]}>
                    ${(balances?.total_you_owe ?? 0).toFixed(2)}
                  </Text>
                </View>
                <View style={[styles.heroDivider, { backgroundColor: colors.border }]} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatLabel, { color: colors.textMuted }]}>Owed to You</Text>
                  <Text style={[styles.heroStatValue, { color: COLORS.status.success }]}>
                    ${(balances?.total_owed_to_you ?? 0).toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Balances ── */}
            {!balancesLoading && (balances?.consolidated?.length ?? 0) > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.moonstone }]}>OUTSTANDING BALANCES</Text>
                <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  {balances!.consolidated.map((item, i) => (
                    <View
                      key={item.user?.user_id || i}
                      style={[styles.row, i < balances!.consolidated.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    >
                      <View style={[styles.avatar, { backgroundColor: item.direction === "you_owe" ? COLORS.glass.glowRed : COLORS.glass.glowGreen }]}>
                        <Text style={[styles.avatarText, { color: colors.textPrimary }]}>
                          {item.user?.name?.[0]?.toUpperCase() || "?"}
                        </Text>
                      </View>
                      <View style={styles.rowInfo}>
                        <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{item.user?.name || "Unknown"}</Text>
                        <Text style={[styles.rowSub, { color: colors.textMuted }]}>
                          {item.direction === "you_owe" ? "You owe them" : "They owe you"}
                        </Text>
                      </View>
                      <Text style={[styles.rowAmount, { color: item.direction === "you_owe" ? COLORS.status.danger : COLORS.status.success }]}>
                        {item.direction === "you_owe" ? "-" : "+"}${item.display_amount.toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
                {(balances?.consolidated.length ?? 0) > 1 && (
                  <TouchableOpacity
                    style={[styles.outlineBtn, { borderColor: colors.glassBorder }]}
                    onPress={handleOptimize}
                    disabled={optimizing}
                    activeOpacity={0.75}
                  >
                    {optimizing
                      ? <ActivityIndicator size="small" color={COLORS.orange} />
                      : <><Ionicons name="git-merge-outline" size={18} color={COLORS.orange} /><Text style={styles.outlineBtnText}>Optimize Cross-Game Debts</Text></>
                    }
                  </TouchableOpacity>
                )}
              </>
            )}

            {!balancesLoading && (!balances || (balances.total_you_owe === 0 && balances.total_owed_to_you === 0)) && (
              <View style={[styles.emptyCard, { backgroundColor: COLORS.glass.glowGreen, borderColor: COLORS.status.success + "40" }]}>
                <Ionicons name="checkmark-circle" size={32} color={COLORS.status.success} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All settled up!</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>No pending balances</Text>
              </View>
            )}

            {/* ── Profile Details ── */}
            <Text style={[styles.sectionLabel, { color: colors.moonstone }]}>PROFILE DETAILS</Text>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <GlassInput
                label="Full Name"
                placeholder="Enter your full name"
                value={fullName}
                onChangeText={setFullName}
                containerStyle={{ marginBottom: 12 }}
              />
              <GlassInput
                label="Nickname"
                placeholder="Enter your nickname"
                value={nickname}
                onChangeText={setNickname}
                containerStyle={{ marginBottom: 16 }}
              />
              <GlassButton
                variant={changed ? "primary" : "ghost"}
                size="large"
                fullWidth
                onPress={handleUpdate}
                loading={isUpdating}
                disabled={!changed}
              >
                Save Changes
              </GlassButton>
            </View>

            {/* ── Danger Zone ── */}
            <Text style={[styles.sectionLabel, { color: COLORS.status.danger + "CC" }]}>DANGER ZONE</Text>
            <View style={[styles.card, { backgroundColor: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }]}>
              <TouchableOpacity style={styles.dangerRow} onPress={handleDelete} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={20} color={COLORS.status.danger} />
                <View style={styles.dangerText}>
                  <Text style={styles.dangerTitle}>Delete Account</Text>
                  <Text style={[styles.dangerSub, { color: colors.textMuted }]}>Permanently delete all data. Cannot be undone.</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.status.danger} />
              </TouchableOpacity>
            </View>

          </Animated.View>
          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </BottomSheetScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },

  heroCard: {
    borderRadius: 20, borderWidth: 1, padding: 20, marginBottom: 24, alignItems: "center",
  },
  heroLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 1, marginBottom: 6 },
  heroValue: { fontSize: 44, fontWeight: "700", letterSpacing: -1, marginBottom: 16 },
  heroRow: { flexDirection: "row", width: "100%", alignItems: "center" },
  heroStat: { flex: 1, alignItems: "center", gap: 4 },
  heroStatLabel: { fontSize: 12 },
  heroStatValue: { fontSize: 18, fontWeight: "700" },
  heroDivider: { width: 1, height: 36, marginHorizontal: 16 },

  sectionLabel: {
    fontSize: 11, fontWeight: "600", letterSpacing: 1,
    marginTop: 24, marginBottom: 10, textTransform: "uppercase",
  },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden", padding: 16, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "600" },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "500" },
  rowSub: { fontSize: 12, marginTop: 2 },
  rowAmount: { fontSize: 17, fontWeight: "700" },

  outlineBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 14, borderWidth: 1, marginTop: 10,
  },
  outlineBtnText: { color: COLORS.orange, fontSize: 14, fontWeight: "600" },

  emptyCard: {
    borderRadius: 20, borderWidth: 1, padding: 24,
    alignItems: "center", gap: 8, marginBottom: 4,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13 },

  dangerRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  dangerText: { flex: 1 },
  dangerTitle: { color: COLORS.status.danger, fontSize: 15, fontWeight: "600" },
  dangerSub: { fontSize: 12, marginTop: 2 },
});

export default ProfileScreen;
