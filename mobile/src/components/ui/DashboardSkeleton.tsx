import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { Skeleton } from "./SkeletonLoader";
import { COLORS, SPACING, RADIUS } from "../../styles/liquidGlass";

/**
 * DashboardSkeleton — Full-page shimmer skeleton matching DashboardScreenV2 layout.
 *
 * Sections:
 *  1. Welcome row
 *  2. Stats grid (3 columns)
 *  3. AI highlight card
 *  4. Performance card
 *  5. Live games section
 *  6. My Groups section
 *  7. Recent results section
 */
export function DashboardSkeleton() {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      scrollEnabled={false}
    >
      {/* ── 1. Welcome row ──────────────────────────────────────────────── */}
      <View style={styles.welcomeRow}>
        <View>
          <Skeleton width={180} height={18} borderRadius={9} style={{ marginBottom: 8 }} />
          <Skeleton width={130} height={12} borderRadius={6} />
        </View>
        <Skeleton width={28} height={28} borderRadius={14} />
      </View>

      {/* ── 2. Stats grid (3 columns) ───────────────────────────────────── */}
      <View style={styles.statsGrid}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.statCard}>
            <Skeleton width={60} height={10} borderRadius={5} style={{ marginBottom: 10 }} />
            <Skeleton width={50} height={22} borderRadius={6} style={{ marginBottom: 6 }} />
            <Skeleton width={44} height={9} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* ── 3. AI highlight card ────────────────────────────────────────── */}
      <View style={styles.fullCard}>
        <View style={styles.aiRow}>
          <Skeleton width={64} height={64} borderRadius={32} />
          <View style={styles.aiContent}>
            <Skeleton width={40} height={14} borderRadius={7} style={{ marginBottom: 8 }} />
            <Skeleton width={140} height={16} borderRadius={8} style={{ marginBottom: 8 }} />
            <Skeleton width={80} height={28} borderRadius={14} />
          </View>
        </View>
      </View>

      {/* ── 4. Performance card ─────────────────────────────────────────── */}
      <View style={styles.fullCard}>
        <View style={styles.perfHeader}>
          <Skeleton width={100} height={12} borderRadius={6} />
          <Skeleton width={60} height={10} borderRadius={5} />
        </View>
        <View style={styles.perfGrid}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.perfItem}>
              <Skeleton width={44} height={20} borderRadius={6} style={{ marginBottom: 6 }} />
              <Skeleton width={32} height={10} borderRadius={5} />
            </View>
          ))}
        </View>
      </View>

      {/* ── 5. Live games section ───────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Skeleton width={90} height={14} borderRadius={7} />
          <Skeleton width={50} height={12} borderRadius={6} />
        </View>
        <View style={styles.listCard}>
          {[0, 1].map((i) => (
            <View key={i} style={[styles.listRow, i === 0 && styles.listRowBorder]}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.listText}>
                <Skeleton width={150} height={13} borderRadius={6} style={{ marginBottom: 6 }} />
                <Skeleton width={80} height={10} borderRadius={5} />
              </View>
              <Skeleton width={16} height={16} borderRadius={4} />
            </View>
          ))}
        </View>
      </View>

      {/* ── 6. My Groups section ────────────────────────────────────────── */}
      <View style={styles.section}>
        <Skeleton width={100} height={14} borderRadius={7} style={{ marginBottom: SPACING.md }} />
        <View style={styles.groupsRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.groupItem}>
              <Skeleton width={52} height={52} borderRadius={26} />
              <Skeleton width={50} height={10} borderRadius={5} style={{ marginTop: 8 }} />
            </View>
          ))}
        </View>
      </View>

      {/* ── 7. Recent results section ───────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Skeleton width={120} height={14} borderRadius={7} />
          <Skeleton width={48} height={12} borderRadius={6} />
        </View>
        <View style={styles.listCard}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.listRow, i < 2 && styles.listRowBorder]}>
              <Skeleton width={44} height={44} borderRadius={22} />
              <View style={styles.listText}>
                <Skeleton width={140} height={13} borderRadius={6} style={{ marginBottom: 6 }} />
                <Skeleton width={90} height={10} borderRadius={5} />
              </View>
              <Skeleton width={52} height={22} borderRadius={11} />
            </View>
          ))}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: SPACING.container,
    paddingTop: SPACING.md,
  },

  // Welcome row
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.xl,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xl,
    padding: SPACING.md,
    paddingVertical: SPACING.lg,
  },

  // Full-width cards (AI, Performance)
  fullCard: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xxl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },

  // AI card row
  aiRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.lg,
  },
  aiContent: {
    flex: 1,
  },

  // Performance card
  perfHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.lg,
  },
  perfGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  perfItem: {
    alignItems: "center",
  },

  // Section containers
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },

  // List card (games, results)
  listCard: {
    backgroundColor: COLORS.glass.bg,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    borderRadius: RADIUS.xxl,
    overflow: "hidden",
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glass.border,
  },
  listText: {
    flex: 1,
  },

  // Groups horizontal row
  groupsRow: {
    flexDirection: "row",
    gap: SPACING.xl,
  },
  groupItem: {
    alignItems: "center",
  },
});
