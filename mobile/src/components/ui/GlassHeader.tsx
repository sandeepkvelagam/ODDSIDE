import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { COLORS, TYPOGRAPHY, SPACING, BLUR, HEADER } from "../../styles/liquidGlass";
import { GlassIconButton } from "./GlassButton";

interface GlassHeaderProps {
  /** Shared scroll position value from useScrollGlass() */
  scrollY: SharedValue<number>;
  /** Header title */
  title?: string;
  /** Left element (e.g. hamburger button) */
  leftElement?: React.ReactNode;
  /** Right element (e.g. notification button) */
  rightElement?: React.ReactNode;
  /** Close button handler (renders ✕ button when provided) */
  onClose?: () => void;
}

/**
 * GlassHeader - Scroll-aware glass navigation header
 *
 * Transitions from transparent to blurred glass as the user scrolls.
 * Uses react-native-reanimated interpolation on the UI thread.
 *
 * Position this absolutely above an Animated.ScrollView that uses
 * the same scrollY value from useScrollGlass().
 */
export function GlassHeader({
  scrollY,
  title,
  leftElement,
  rightElement,
  onClose,
}: GlassHeaderProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();

  const headerHeight = HEADER.height + insets.top;

  // Animated background opacity (0 = transparent, 1 = full glass)
  const backgroundStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, HEADER.scrollRange],
      [0, 1],
      Extrapolation.CLAMP,
    );

    const bgColor = isDark
      ? `rgba(40, 43, 43, ${progress * 0.8})`
      : `rgba(255, 255, 255, ${progress * 0.8})`;

    return {
      backgroundColor: bgColor,
      borderBottomWidth: progress > 0.1 ? 1 : 0,
      borderBottomColor: isDark
        ? `rgba(255, 255, 255, ${progress * 0.12})`
        : `rgba(0, 0, 0, ${progress * 0.08})`,
    };
  });

  // Animated blur intensity
  const blurStyle = useAnimatedStyle(() => {
    const progress = interpolate(
      scrollY.value,
      [0, HEADER.scrollRange],
      [0, 1],
      Extrapolation.CLAMP,
    );
    return {
      opacity: progress,
    };
  });

  const maxIntensity = isDark
    ? BLUR.header.maxIntensity.dark
    : BLUR.header.maxIntensity.light;

  return (
    <Animated.View
      style={[
        styles.container,
        { height: headerHeight, paddingTop: insets.top },
        backgroundStyle,
      ]}
    >
      {/* Blur layer — fades in as user scrolls */}
      <Animated.View style={[StyleSheet.absoluteFill, blurStyle]} pointerEvents="none">
        <BlurView
          intensity={maxIntensity}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Header content */}
      <View style={styles.content}>
        <View style={styles.leftSlot}>
          {leftElement}
          {onClose && !leftElement && (
            <GlassIconButton
              icon={<Text style={{ color: COLORS.text.secondary, fontSize: 18 }}>✕</Text>}
              onPress={onClose}
              size="small"
              variant="ghost"
              accessibilityLabel="Close"
            />
          )}
        </View>

        {title && (
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        )}

        <View style={styles.rightSlot}>
          {rightElement}
        </View>
      </View>
    </Animated.View>
  );
}

/** Height of the GlassHeader (excluding safe area). Use for ScrollView contentContainerStyle paddingTop. */
export const GLASS_HEADER_HEIGHT = HEADER.height;

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.container,
    gap: SPACING.md,
  },
  leftSlot: {
    minWidth: 40,
    alignItems: "flex-start",
  },
  title: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
  },
  rightSlot: {
    minWidth: 40,
    alignItems: "flex-end",
  },
});
