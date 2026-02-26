import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "./SkeletonLoader";
import { COLORS, SPACING, RADIUS } from "../../styles/liquidGlass";

/**
 * GroupsSkeleton — Shimmer skeleton matching GroupsScreen layout.
 *
 * Sections:
 *  1. Search bar
 *  2. Group list rows (5)
 */
export function GroupsSkeleton() {
  return (
    <View style={styles.container}>
      {/* ── 1. Search / filter bar ──────────────────────────────────────── */}
      <Skeleton width="100%" height={44} borderRadius={RADIUS.lg} style={styles.searchBar} />

      {/* ── 2. Group list rows ──────────────────────────────────────────── */}
      <View style={styles.listCard}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.row, i < 4 && styles.rowBorder]}>
            {/* Avatar */}
            <Skeleton width={44} height={44} borderRadius={22} />

            {/* Name + meta */}
            <View style={styles.rowText}>
              <Skeleton width={140} height={14} borderRadius={7} style={{ marginBottom: 6 }} />
              <Skeleton width={80} height={10} borderRadius={5} />
            </View>

            {/* Role badge */}
            <Skeleton width={56} height={20} borderRadius={10} />

            {/* Heart icon */}
            <Skeleton width={20} height={20} borderRadius={10} style={styles.heartSkeleton} />

            {/* Chevron */}
            <Skeleton width={14} height={14} borderRadius={4} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: SPACING.container,
    paddingTop: SPACING.md,
  },

  searchBar: {
    marginBottom: SPACING.lg,
  },

  listCard: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xxl,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  rowText: {
    flex: 1,
  },
  heartSkeleton: {
    marginLeft: SPACING.sm,
  },
});
