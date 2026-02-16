import React, { useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";

interface AnimatedButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  glowColor?: string;
  disabled?: boolean;
  activeOpacity?: number;
}

/**
 * AnimatedButton - Premium button with glow + bounce feedback
 *
 * Features:
 * - Scale down to 0.95 on press
 * - Bounce back with spring physics on release
 * - Glow overlay appears on press
 * - Configurable glow color
 */
export function AnimatedButton({
  onPress,
  children,
  style,
  glowColor = "rgba(255,255,255,0.15)",
  disabled = false,
  activeOpacity = 1,
}: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handlePressIn = () => {
    if (disabled) return;

    Animated.parallel([
      // Scale down
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      // Glow appear
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    if (disabled) return;

    Animated.parallel([
      // Bounce back with overshoot
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 3, // Lower friction = more bounce
        useNativeDriver: true,
      }),
      // Glow fade
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Extract borderRadius from style if it exists
  const flatStyle = StyleSheet.flatten(style) || {};
  const borderRadius = (flatStyle as ViewStyle).borderRadius || 14;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: scaleAnim }],
            opacity: disabled ? 0.5 : activeOpacity,
          },
        ]}
      >
        {/* Glow overlay */}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: glowColor,
              borderRadius: borderRadius,
              opacity: glowAnim,
            },
          ]}
          pointerEvents="none"
        />
        {children}
      </Animated.View>
    </Pressable>
  );
}
