import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  FadeOutDown,
  Layout,
} from "react-native-reanimated";
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SPRINGS, ANIMATION } from "../../styles/liquidGlass";

interface GlassListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  rightText?: string;
  rightTextColor?: string;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  showChevron?: boolean;
  danger?: boolean;
  /** Pass list index to enable staggered enter/exit animations */
  animationIndex?: number;
}

/**
 * GlassListItem - Glass styled list row with press animation
 *
 * Uses react-native-reanimated for UI-thread press feedback
 * and optional entering/exiting layout animations.
 */
export function GlassListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  rightText,
  rightTextColor,
  onPress,
  disabled = false,
  style,
  showChevron = false,
  danger = false,
  animationIndex,
}: GlassListItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!onPress) return;
    scale.value = withSpring(ANIMATION.scale.cardPressed, SPRINGS.press);
  };

  const handlePressOut = () => {
    if (!onPress) return;
    scale.value = withSpring(ANIMATION.scale.normal, SPRINGS.snap);
  };

  const content = (
    <View style={styles.content}>
      {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
      <View style={styles.textContainer}>
        <Text style={[styles.title, danger && styles.dangerText]}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      <View style={styles.rightContainer}>
        {rightText && (
          <Text style={[styles.rightText, rightTextColor && { color: rightTextColor }]}>
            {rightText}
          </Text>
        )}
        {rightIcon}
        {showChevron && !rightIcon && (
          <Text style={styles.chevron}>›</Text>
        )}
      </View>
    </View>
  );

  // Layout animation props (only when animationIndex is provided)
  const enteringAnim = animationIndex !== undefined
    ? FadeInDown.delay(animationIndex * 40).springify().damping(SPRINGS.layout.damping)
    : undefined;
  const exitingAnim = animationIndex !== undefined
    ? FadeOutDown.duration(200)
    : undefined;
  const layoutAnim = animationIndex !== undefined
    ? Layout.springify().damping(SPRINGS.layout.damping)
    : undefined;

  if (!onPress) {
    return (
      <Animated.View
        style={[styles.container, style]}
        entering={enteringAnim}
        exiting={exitingAnim}
        layout={layoutAnim}
      >
        {content}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[animatedStyle, style]}
      entering={enteringAnim}
      exiting={exitingAnim}
      layout={layoutAnim}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        style={[styles.container, disabled && styles.disabled]}
      >
        {content}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * GlassListSection - Section wrapper for list items with optional title
 */
export function GlassListSection({
  title,
  children,
  style,
}: {
  title?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.section, style]}>
      {title && <Text style={styles.sectionTitle}>{title}</Text>}
      <View style={styles.sectionContent}>
        {children}
      </View>
    </View>
  );
}

/**
 * GlassListDivider - Visual separator between list items
 */
export function GlassListDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.glass.inner,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginVertical: SPACING.xs,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  leftIcon: {
    marginRight: SPACING.md,
    width: 24,
    alignItems: "center",
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  subtitle: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: 2,
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  rightText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
  },
  chevron: {
    color: COLORS.text.muted,
    fontSize: 20,
    fontWeight: "300",
  },
  dangerText: {
    color: COLORS.status.danger,
  },
  disabled: {
    opacity: 0.5,
  },
  // Section styles
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  sectionContent: {
    backgroundColor: COLORS.glass.bg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glass.border,
    overflow: "hidden",
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: COLORS.glass.border,
    marginHorizontal: SPACING.lg,
  },
});
