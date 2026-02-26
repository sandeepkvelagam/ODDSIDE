import React from "react";
import { View, StyleSheet } from "react-native";
import { Skeleton } from "./SkeletonLoader";
import { COLORS, SPACING, RADIUS } from "../../styles/liquidGlass";

/**
 * ChatsSkeleton — Shimmer skeleton matching ChatsScreen layout.
 *
 * Sections:
 *  1. Game/chat list rows (5)
 */
export function ChatsSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.listCard}>
        {[0, 1, 2, 3, 4].map((i) => (
          <View key={i} style={[styles.row, i < 4 && styles.rowBorder]}>
            {/* Avatar circle */}
            <Skeleton width={44} height={44} borderRadius={22} />

            {/* Title + meta */}
            <View style={styles.rowText}>
              <Skeleton width={160} height={14} borderRadius={7} style={{ marginBottom: 6 }} />
              <Skeleton width={100} height={10} borderRadius={5} />
            </View>

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
});
