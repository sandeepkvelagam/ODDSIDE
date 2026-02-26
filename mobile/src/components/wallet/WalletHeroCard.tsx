import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Clipboard,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../styles/liquidGlass";

interface WalletHeroCardProps {
  balance_cents: number;
  wallet_id: string | null;
  currency?: string;
  daily_transfer_limit_cents?: number;
  daily_transferred_cents?: number;
  has_pin?: boolean;
}

export function WalletHeroCard({
  balance_cents,
  wallet_id,
  currency = "USD",
  daily_transfer_limit_cents,
  daily_transferred_cents = 0,
}: WalletHeroCardProps) {
  const [balanceVisible, setBalanceVisible] = useState(true);

  const formatBalance = (cents: number) => {
    const dollars = cents / 100;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(dollars);
  };

  const handleCopyWalletId = () => {
    if (wallet_id) {
      Clipboard.setString(wallet_id);
      Alert.alert("Copied!", "Wallet ID copied to clipboard");
    }
  };

  const limitPercent =
    daily_transfer_limit_cents && daily_transfer_limit_cents > 0
      ? Math.min(daily_transferred_cents / daily_transfer_limit_cents, 1)
      : null;

  return (
    <View style={styles.wrapper}>
      <LinearGradient
        colors={["#F07230", "#EE6C29", "#C45A22"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Gloss highlight overlay */}
        <View style={styles.glossOverlay} />

        {/* Top row: label + eye toggle */}
        <View style={styles.topRow}>
          <View style={styles.balanceLabelRow}>
            <Ionicons name="wallet-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.balanceLabel}>Available balance</Text>
          </View>
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setBalanceVisible((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={balanceVisible ? "eye-outline" : "eye-off-outline"}
              size={20}
              color="rgba(255,255,255,0.85)"
            />
          </TouchableOpacity>
        </View>

        {/* Balance */}
        <Text style={styles.balanceValue}>
          {balanceVisible ? formatBalance(balance_cents) : "••••••••"}
        </Text>

        {/* Wallet ID row */}
        <TouchableOpacity style={styles.walletIdRow} onPress={handleCopyWalletId} activeOpacity={0.7}>
          <Ionicons name="card-outline" size={13} color="rgba(255,255,255,0.65)" />
          <Text style={styles.walletIdText} numberOfLines={1}>
            {wallet_id || "—"}
          </Text>
          <View style={styles.copyBadge}>
            <Ionicons name="copy-outline" size={12} color="rgba(255,255,255,0.9)" />
          </View>
        </TouchableOpacity>

        {/* Daily limit bar */}
        {limitPercent !== null && (
          <View style={styles.limitSection}>
            <View style={styles.limitLabelRow}>
              <Text style={styles.limitLabel}>Daily limit</Text>
              <Text style={styles.limitLabel}>
                {formatBalance(daily_transferred_cents)} / {formatBalance(daily_transfer_limit_cents!)}
              </Text>
            </View>
            <View style={styles.limitTrack}>
              <View style={[styles.limitFill, { width: `${Math.round(limitPercent * 100)}%` }]} />
            </View>
          </View>
        )}

        {/* Card chip decoration */}
        <View style={styles.chipDecoration}>
          <View style={styles.chipCircle1} />
          <View style={styles.chipCircle2} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: RADIUS.xxxl,
    marginBottom: SPACING.xl,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
  card: {
    borderRadius: RADIUS.xxxl,
    padding: SPACING.xxl,
    minHeight: 180,
    overflow: "hidden",
  },
  glossOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: RADIUS.xxxl,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: 0,
    left: 0,
    right: 0,
    height: "45%",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  balanceLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  balanceLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
    letterSpacing: 0.5,
  },
  eyeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: RADIUS.full,
  },
  balanceValue: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: TYPOGRAPHY.weights.extraBold,
    letterSpacing: -1,
    marginBottom: SPACING.md,
  },
  walletIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.18)",
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    alignSelf: "flex-start",
    marginBottom: SPACING.md,
  },
  walletIdText: {
    color: "rgba(255,255,255,0.90)",
    fontSize: TYPOGRAPHY.sizes.caption,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    letterSpacing: 0.5,
    maxWidth: 180,
  },
  copyBadge: {
    marginLeft: 2,
  },
  limitSection: {
    marginTop: SPACING.xs,
  },
  limitLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  limitLabel: {
    color: "rgba(255,255,255,0.65)",
    fontSize: TYPOGRAPHY.sizes.micro,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  limitTrack: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: RADIUS.full,
    overflow: "hidden",
  },
  limitFill: {
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.85)",
    borderRadius: RADIUS.full,
  },
  chipDecoration: {
    position: "absolute",
    right: SPACING.xxl,
    bottom: SPACING.xxl,
    flexDirection: "row",
    gap: -8,
  },
  chipCircle1: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  chipCircle2: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginLeft: -10,
  },
});
