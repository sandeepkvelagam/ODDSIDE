import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "../ui/SkeletonLoader";
import { COLORS, SPACING, RADIUS } from "../../styles/liquidGlass";

/**
 * WalletSkeleton — Full-page shimmer skeleton matching the redesigned WalletScreen layout.
 *
 * Layout mirrors:
 *  1. Profile row (avatar + greeting lines + bell)
 *  2. Hero card (tall orange-tinted block)
 *  3. Action row (4 circles)
 *  4. Analytics card
 *  5. Transaction list header + filter pills + rows
 */
export function WalletSkeleton() {
  return (
    <View style={styles.container}>
      {/* ── 1. Profile row ─────────────────────────────────────────────── */}
      <View style={styles.profileRow}>
        <Skeleton width={48} height={48} borderRadius={24} />
        <View style={styles.profileText}>
          <Skeleton width={130} height={14} borderRadius={7} style={{ marginBottom: 6 }} />
          <Skeleton width={90} height={10} borderRadius={5} />
        </View>
        <Skeleton width={36} height={36} borderRadius={18} />
      </View>

      {/* ── 2. Hero card ───────────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        <Skeleton width="100%" height={180} borderRadius={RADIUS.xxxl} style={styles.heroSkeleton} />
      </View>

      {/* ── 3. Action row (4 circles) ──────────────────────────────────── */}
      <View style={styles.actionRow}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={styles.actionItem}>
            <Skeleton width={60} height={60} borderRadius={30} />
            <Skeleton width={40} height={10} borderRadius={5} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* ── 4. Analytics card ──────────────────────────────────────────── */}
      <View style={styles.analyticsSection}>
        <View style={styles.sectionHeaderRow}>
          <Skeleton width={110} height={16} borderRadius={8} />
          <Skeleton width={80} height={26} borderRadius={13} />
        </View>
        <View style={styles.analyticsCard}>
          {/* Two chart placeholders */}
          <View style={styles.chartsRow}>
            <View style={styles.chartColSkeleton}>
              <Skeleton width={110} height={110} borderRadius={55} />
              <Skeleton width={70} height={11} borderRadius={5} style={{ marginTop: 10 }} />
              <Skeleton width={90} height={9} borderRadius={4} style={{ marginTop: 6 }} />
              <Skeleton width={80} height={9} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
            <View style={styles.chartColSkeleton}>
              <Skeleton width={110} height={110} borderRadius={55} />
              <Skeleton width={70} height={11} borderRadius={5} style={{ marginTop: 10 }} />
              <Skeleton width={90} height={9} borderRadius={4} style={{ marginTop: 6 }} />
              <Skeleton width={80} height={9} borderRadius={4} style={{ marginTop: 4 }} />
            </View>
          </View>
        </View>
      </View>

      {/* ── 5. Transactions ────────────────────────────────────────────── */}
      <View style={styles.txSection}>
        {/* Header */}
        <View style={styles.sectionHeaderRow}>
          <Skeleton width={160} height={16} borderRadius={8} />
          <Skeleton width={70} height={26} borderRadius={13} />
        </View>

        {/* Filter pills */}
        <View style={styles.pillsRow}>
          {[48, 72, 52, 56].map((w, i) => (
            <Skeleton key={i} width={w} height={30} borderRadius={15} />
          ))}
        </View>

        {/* Transaction rows */}
        <View style={styles.txList}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.txRow, i < 3 && styles.txRowBorder]}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.txTextBlock}>
                <Skeleton width={160} height={13} borderRadius={6} style={{ marginBottom: 6 }} />
                <Skeleton width={90} height={10} borderRadius={5} />
              </View>
              <Skeleton width={52} height={13} borderRadius={6} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.container,
  },

  // Profile row
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  profileText: {
    flex: 1,
  },

  // Hero card
  heroCard: {
    marginBottom: SPACING.xxl,
  },
  heroSkeleton: {
    // Slight orange tint makes it feel intentional
    backgroundColor: `${COLORS.orange}22`,
  },

  // Action row
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: SPACING.xxl,
  },
  actionItem: {
    alignItems: "center",
  },

  // Analytics
  analyticsSection: {
    marginBottom: SPACING.xxl,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  analyticsCard: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
  },
  chartsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: SPACING.lg,
  },
  chartColSkeleton: {
    alignItems: "center",
    flex: 1,
  },

  // Transactions
  txSection: {
    marginBottom: SPACING.xxl,
  },
  pillsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  txList: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xxl,
    overflow: "hidden",
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  txTextBlock: {
    flex: 1,
  },
});
