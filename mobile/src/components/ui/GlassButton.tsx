import React from "react";
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS, SPRINGS, ANIMATION } from "../../styles/liquidGlass";
import { useTheme } from "../../context/ThemeContext";

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
 * Uses react-native-reanimated for UI-thread animations.
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
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(ANIMATION.scale.pressed, SPRINGS.press);
  };

  const handlePressOut = () => {
    scale.value = withSpring(ANIMATION.scale.normal, SPRINGS.snap);
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
          backgroundColor: colors.glassBg,
          borderWidth: 1.5,
          borderColor: colors.glassBorder,
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
      return colors.textPrimary;
    }
    return "#FFFFFF";
  };

  const sizeStyle = getSizeStyle();
  const isDisabled = disabled || loading;

  return (
    <Animated.View
      style={[
        animatedStyle,
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
        accessibilityRole="button"
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
  accessibilityLabel?: string;
}

export function GlassIconButton({
  icon,
  onPress,
  variant = "ghost",
  size = "medium",
  disabled = false,
  style,
  testID,
  accessibilityLabel,
}: GlassIconButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(ANIMATION.scale.pressed, SPRINGS.press);
  };

  const handlePressOut = () => {
    scale.value = withSpring(ANIMATION.scale.normal, SPRINGS.snap);
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
          backgroundColor: colors.glassBg,
          borderWidth: 1.5,
          borderColor: colors.glassBorder,
        };
    }
  };

  const sizeValue = getSizeValue();

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        activeOpacity={0.9}
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
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
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});
