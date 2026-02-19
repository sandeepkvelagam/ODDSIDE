import React from "react";
import { View, ViewStyle, StyleProp, StyleSheet } from "react-native";
import { COLORS, RADIUS, SPACING, SHADOWS, getGlowColor } from "../../styles/liquidGlass";

interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  glowVariant?: "orange" | "blue" | "green" | "red";
  noPadding?: boolean;
  noInner?: boolean;
}

/**
 * GlassSurface - Premium glass morphism card component
 * 
 * Features:
 * - Double-layer glass effect (outer + inner)
 * - Optional colored glow variants
 * - Subtle shadow for depth
 * 
 * Usage:
 * <GlassSurface glowVariant="orange">
 *   <Text>Content</Text>
 * </GlassSurface>
 */
export function GlassSurface({
  children,
  style,
  innerStyle,
  glowVariant,
  noPadding = false,
  noInner = false,
}: GlassSurfaceProps) {
  const innerBgColor = glowVariant ? getGlowColor(glowVariant) : COLORS.glass.inner;

  if (noInner) {
    return (
      <View style={[styles.outer, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.outer, style]}>
      <View
        style={[
          styles.inner,
          { backgroundColor: innerBgColor },
          noPadding && { padding: 0 },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

/**
 * GlassSurfaceFlat - Single layer glass surface (no inner)
 * For simpler use cases like list items
 */
export function GlassSurfaceFlat({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.flat, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    backgroundColor: COLORS.glass.bg,
    borderColor: COLORS.glass.border,
    borderWidth: 1.5,
    borderRadius: RADIUS.xxl,
    padding: SPACING.innerPadding,
    ...SHADOWS.glassCard,
  },
  inner: {
    backgroundColor: COLORS.glass.inner,
    borderRadius: RADIUS.xl,
    padding: SPACING.cardPadding,
  },
  flat: {
    backgroundColor: COLORS.glass.bg,
    borderColor: COLORS.glass.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
});
