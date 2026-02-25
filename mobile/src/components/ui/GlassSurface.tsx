import React from "react";
import { View, ViewStyle, StyleProp, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { COLORS, RADIUS, SPACING, SHADOWS, BLUR, getGlowColor } from "../../styles/liquidGlass";
import { useTheme } from "../../context/ThemeContext";

interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
  glowVariant?: "orange" | "blue" | "green" | "red";
  noPadding?: boolean;
  noInner?: boolean;
  /** Enable real blur translucency (default: true). Set false for performance in long lists. */
  blur?: boolean;
  /** Override blur intensity (uses theme-aware defaults) */
  blurIntensity?: number;
  /** Optional color wash over the glass surface */
  tintColor?: string;
}

/**
 * GlassSurface - Premium glass morphism card component
 *
 * When blur=true (default), renders a real translucent glass surface using
 * BlurView from expo-blur. Falls back to flat rgba on Android if needed.
 */
export function GlassSurface({
  children,
  style,
  innerStyle,
  glowVariant,
  noPadding = false,
  noInner = false,
  blur = true,
  blurIntensity,
  tintColor,
}: GlassSurfaceProps) {
  const { isDark } = useTheme();
  const innerBgColor = glowVariant ? getGlowColor(glowVariant) : COLORS.glass.inner;

  // Determine blur config
  const shouldBlur = blur && (Platform.OS === "ios" || Platform.OS === "android");
  const intensity = blurIntensity ??
    (Platform.OS === "android"
      ? BLUR.surface.intensity.android
      : isDark
        ? BLUR.surface.intensity.dark
        : BLUR.surface.intensity.light);
  const blurTint = isDark ? BLUR.surface.tint.dark : BLUR.surface.tint.light;
  const overlayColor = tintColor ?? (isDark ? BLUR.surface.overlay.dark : BLUR.surface.overlay.light);

  if (noInner) {
    return (
      <View style={[styles.outer, shouldBlur && styles.blurOuter, style]}>
        {shouldBlur && (
          <>
            <BlurView intensity={intensity} tint={blurTint} style={StyleSheet.absoluteFill} />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
          </>
        )}
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.outer, shouldBlur && styles.blurOuter, style]}>
      {shouldBlur && (
        <>
          <BlurView intensity={intensity} tint={blurTint} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
        </>
      )}
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
  blur = false,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  blur?: boolean;
}) {
  const { isDark } = useTheme();

  const shouldBlur = blur && (Platform.OS === "ios" || Platform.OS === "android");
  const intensity = Platform.OS === "android"
    ? BLUR.surface.intensity.android
    : isDark
      ? BLUR.surface.intensity.dark
      : BLUR.surface.intensity.light;
  const blurTint = isDark ? BLUR.surface.tint.dark : BLUR.surface.tint.light;
  const overlayColor = isDark ? BLUR.surface.overlay.dark : BLUR.surface.overlay.light;

  return (
    <View style={[styles.flat, shouldBlur && { overflow: "hidden" }, style]}>
      {shouldBlur && (
        <>
          <BlurView intensity={intensity} tint={blurTint} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
        </>
      )}
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
  blurOuter: {
    overflow: "hidden",
    // When using BlurView, make bg transparent so blur shows through
    backgroundColor: "transparent",
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
