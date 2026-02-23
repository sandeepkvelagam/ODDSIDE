import React, { useRef } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Text,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useHaptics } from "../../context/HapticsContext";
import { COLORS, SPACING, TYPOGRAPHY, ANIMATION } from "../../styles/liquidGlass";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: "small" | "medium" | "large";
  disabled?: boolean;
  readonly?: boolean;
  showLabel?: boolean;
}

const LABELS = ["", "Terrible", "Bad", "Okay", "Good", "Amazing"];

/**
 * StarRating - Interactive star rating input with haptic feedback
 *
 * Features:
 * - Spring press animation per star
 * - Haptic feedback on selection
 * - Optional text label for each rating
 * - Read-only mode for display
 *
 * Usage:
 * <StarRating rating={rating} onRatingChange={setRating} size="large" showLabel />
 */
export function StarRating({
  rating,
  onRatingChange,
  size = "medium",
  disabled = false,
  readonly = false,
  showLabel = false,
}: StarRatingProps) {
  const { colors } = useTheme();
  const { triggerHaptic } = useHaptics();
  const scaleAnims = useRef([1, 2, 3, 4, 5].map(() => new Animated.Value(1))).current;

  const starSize = size === "small" ? 24 : size === "large" ? 44 : 32;
  const gap = size === "small" ? 4 : size === "large" ? 12 : 8;

  const handlePress = (star: number) => {
    if (readonly || disabled) return;

    // Bounce animation
    Animated.sequence([
      Animated.spring(scaleAnims[star - 1], {
        toValue: 1.3,
        ...ANIMATION.spring.press,
      }),
      Animated.spring(scaleAnims[star - 1], {
        toValue: 1,
        ...ANIMATION.spring.snap,
      }),
    ]).start();

    triggerHaptic("light");
    onRatingChange?.(star);
  };

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { gap }]}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => handlePress(star)}
            disabled={readonly || disabled}
            activeOpacity={0.7}
            style={styles.starTouch}
          >
            <Animated.View style={{ transform: [{ scale: scaleAnims[star - 1] }] }}>
              <Ionicons
                name={star <= rating ? "star" : "star-outline"}
                size={starSize}
                color={star <= rating ? COLORS.orange : colors.textMuted}
              />
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
      {showLabel && rating > 0 && (
        <Text style={[styles.label, { color: COLORS.orange }]}>
          {LABELS[rating]}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  container: {
    flexDirection: "row",
    justifyContent: "center",
  },
  starTouch: {
    padding: 4,
  },
  label: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginTop: SPACING.sm,
  },
});
