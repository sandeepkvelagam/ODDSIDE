import React, { useRef } from "react";
import {
  TouchableOpacity,
  Animated,
  Text,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS, ANIMATION } from "../../styles/liquidGlass";

type ButtonVariant = "primary" | "primaryDark" | "secondary" | "ghost" | "destructive";
type ButtonSize = "large" | "medium" | "small";

interface GlassButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * GlassButton - Premium button with spring press animation
 * 
 * Features:
 * - Multiple variants (primary, secondary, ghost, destructive)
 * - Spring-based press animation (scale 0.95 → 1.0)
 * - Loading state with spinner
 * - Icon support (left/right)
 * 
 * Usage:
 * <GlassButton variant="primary" onPress={handlePress}>
 *   Sign In
 * </GlassButton>
 */
export function GlassButton({
  children,
  onPress,
  variant = "primary",
  size = "medium",
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  testID,
}: GlassButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: ANIMATION.scale.pressed,
      ...ANIMATION.spring.press,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: ANIMATION.scale.normal,
      ...ANIMATION.spring.snap,
    }).start();
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "primary":
        return { backgroundColor: COLORS.orange };
      case "primaryDark":
        return { backgroundColor: COLORS.orangeDark };
      case "secondary":
        return { backgroundColor: COLORS.trustBlue };
      case "ghost":
        return {
          backgroundColor: COLORS.glass.bg,
          borderWidth: 1.5,
          borderColor: COLORS.glass.border,
        };
      case "destructive":
        return { backgroundColor: COLORS.status.danger };
      default:
        return { backgroundColor: COLORS.orange };
    }
  };

  const getSizeStyle = (): ViewStyle & { fontSize: number } => {
    switch (size) {
      case "large":
        return { height: 56, paddingHorizontal: SPACING.cardPadding, fontSize: TYPOGRAPHY.sizes.body };
      case "medium":
        return { height: 48, paddingHorizontal: SPACING.lg, fontSize: TYPOGRAPHY.sizes.bodySmall };
      case "small":
        return { height: 40, paddingHorizontal: SPACING.md, fontSize: TYPOGRAPHY.sizes.caption };
      default:
        return { height: 48, paddingHorizontal: SPACING.lg, fontSize: TYPOGRAPHY.sizes.bodySmall };
    }
  };

  const getTextColor = (): string => {
    if (variant === "ghost") {
      return COLORS.text.primary;
    }
    return "#FFFFFF";
  };

  const sizeStyle = getSizeStyle();
  const isDisabled = disabled || loading;

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }] },
        fullWidth && { width: "100%" },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
        testID={testID}
        style={[
          styles.base,
          getVariantStyle(),
          { height: sizeStyle.height, paddingHorizontal: sizeStyle.paddingHorizontal },
          fullWidth && { width: "100%" },
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={getTextColor()} />
        ) : (
          <>
            {leftIcon && <View style={styles.iconLeft}>{leftIcon}</View>}
            {typeof children === "string" ? (
              <Text
                style={[
                  styles.text,
                  { fontSize: sizeStyle.fontSize, color: getTextColor() },
                  textStyle,
                ]}
              >
                {children}
              </Text>
            ) : (
              children
            )}
            {rightIcon && <View style={styles.iconRight}>{rightIcon}</View>}
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/**
 * GlassIconButton - Circular icon button with glass styling
 */
interface GlassIconButtonProps {
  icon: React.ReactNode;
  onPress: () => void;
  variant?: "ghost" | "primary" | "secondary";
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function GlassIconButton({
  icon,
  onPress,
  variant = "ghost",
  size = "medium",
  disabled = false,
  style,
  testID,
}: GlassIconButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: ANIMATION.scale.pressed,
      ...ANIMATION.spring.press,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: ANIMATION.scale.normal,
      ...ANIMATION.spring.snap,
    }).start();
  };

  const getSizeValue = (): number => {
    switch (size) {
      case "small":
        return 40;
      case "medium":
        return 48;
      case "large":
        return 56;
      default:
        return 48;
    }
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "primary":
        return { backgroundColor: COLORS.orange };
      case "secondary":
        return { backgroundColor: COLORS.trustBlue };
      case "ghost":
      default:
        return {
          backgroundColor: COLORS.glass.bg,
          borderWidth: 1.5,
          borderColor: COLORS.glass.border,
        };
    }
  };

  const sizeValue = getSizeValue();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        testID={testID}
        style={[
          styles.iconButton,
          getVariantStyle(),
          { width: sizeValue, height: sizeValue },
          disabled && styles.disabled,
          style,
        ]}
      >
        {icon}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    ...SHADOWS.button,
  },
  text: {
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  iconLeft: {
    marginRight: SPACING.sm,
  },
  iconRight: {
    marginLeft: SPACING.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  iconButton: {
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
});
