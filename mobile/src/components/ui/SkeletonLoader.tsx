import React, { useEffect } from "react";
import { View, StyleSheet, StyleProp, ViewStyle, DimensionValue } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, RADIUS, SPACING } from "../../styles/liquidGlass";

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Skeleton - Loading placeholder with shimmer animation
 *
 * Uses react-native-reanimated for UI-thread shimmer loop.
 */
export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = RADIUS.sm,
  style,
}: SkeletonProps) {
  const translateX = useSharedValue(-200);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(200, { duration: 1500, easing: Easing.linear }),
      -1, // infinite
      false,
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(255, 255, 255, 0.08)",
            "transparent",
          ]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

/**
 * SkeletonCard - Glass card skeleton
 */
export function SkeletonCard({
  height = 120,
  style,
}: {
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.skeletonCard, { height }, style]}>
      <Skeleton width="60%" height={16} borderRadius={8} style={{ marginBottom: 12 }} />
      <Skeleton width="100%" height={12} borderRadius={6} style={{ marginBottom: 8 }} />
      <Skeleton width="80%" height={12} borderRadius={6} />
    </View>
  );
}

/**
 * SkeletonListItem - List item skeleton
 */
export function SkeletonListItem({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.skeletonListItem, style]}>
      <Skeleton width={44} height={44} borderRadius={22} />
      <View style={styles.skeletonListItemContent}>
        <Skeleton width="60%" height={14} borderRadius={7} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={10} borderRadius={5} />
      </View>
    </View>
  );
}

/**
 * SkeletonStats - Stats section skeleton
 */
export function SkeletonStats({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.skeletonStats, style]}>
      <View style={styles.skeletonStatItem}>
        <Skeleton width={60} height={24} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width={80} height={12} borderRadius={6} />
      </View>
      <View style={styles.skeletonStatItem}>
        <Skeleton width={60} height={24} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width={80} height={12} borderRadius={6} />
      </View>
      <View style={styles.skeletonStatItem}>
        <Skeleton width={60} height={24} borderRadius={8} style={{ marginBottom: 8 }} />
        <Skeleton width={80} height={12} borderRadius={6} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: COLORS.glass.bg,
    overflow: "hidden",
  },
  shimmer: {
    ...StyleSheet.absoluteFillObject,
    width: 200,
  },
  skeletonCard: {
    backgroundColor: COLORS.glass.bg,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    padding: SPACING.cardPadding,
  },
  skeletonListItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.glass.inner,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  skeletonListItemContent: {
    flex: 1,
  },
  skeletonStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: COLORS.glass.bg,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    padding: SPACING.xl,
  },
  skeletonStatItem: {
    alignItems: "center",
  },
});
