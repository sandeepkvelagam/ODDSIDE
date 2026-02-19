import React, { useState, useRef } from "react";
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextInputProps,
  TouchableOpacity,
  Animated,
} from "react-native";
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from "../../styles/liquidGlass";

interface GlassInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * GlassInput - Premium text input with glass styling
 * 
 * Features:
 * - Glass morphism background
 * - Focus state with orange border glow
 * - Optional label and error message
 * - Icon support (left/right)
 * 
 * Usage:
 * <GlassInput
 *   label="Email"
 *   placeholder="you@example.com"
 *   value={email}
 *   onChangeText={setEmail}
 * />
 */
export function GlassInput({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  ...props
}: GlassInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = (e: any) => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    props.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    props.onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.input.border, COLORS.input.focusBorder],
  });

  return (
    <View style={containerStyle}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Animated.View
        style={[
          styles.container,
          { borderColor },
          error && styles.errorBorder,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          {...props}
          style={[
            styles.input,
            leftIcon ? { paddingLeft: 0 } : undefined,
            rightIcon ? { paddingRight: 0 } : undefined,
            props.style,
          ]}
          placeholderTextColor={COLORS.input.placeholder}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {rightIcon && (
          <TouchableOpacity
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

/**
 * GlassSearchInput - Search input variant with built-in icon
 */
interface GlassSearchInputProps extends Omit<TextInputProps, "style"> {
  containerStyle?: StyleProp<ViewStyle>;
}

export function GlassSearchInput({
  containerStyle,
  ...props
}: GlassSearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.searchContainer, isFocused && styles.searchFocused, containerStyle]}>
      <View style={styles.searchIcon}>
        <Text style={{ color: COLORS.text.muted, fontSize: 16 }}>🔍</Text>
      </View>
      <TextInput
        {...props}
        style={styles.searchInput}
        placeholderTextColor={COLORS.input.placeholder}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  container: {
    backgroundColor: COLORS.input.bg,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  input: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.body,
    height: "100%",
  },
  leftIcon: {
    marginRight: SPACING.md,
  },
  rightIcon: {
    marginLeft: SPACING.md,
    padding: SPACING.xs,
  },
  errorBorder: {
    borderColor: COLORS.status.danger,
  },
  error: {
    color: COLORS.status.danger,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: SPACING.xs,
  },
  // Search variant
  searchContainer: {
    backgroundColor: COLORS.input.bg,
    borderWidth: 1,
    borderColor: COLORS.input.border,
    borderRadius: RADIUS.full,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
  },
  searchFocused: {
    borderColor: COLORS.input.focusBorder,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    height: "100%",
  },
});
