import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { GlassSurface } from "../ui/GlassSurface";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SPRINGS, ANIMATION } from "../../styles/liquidGlass";
import { useTheme } from "../../context/ThemeContext";
import type { OptionSelectorPayload, OptionItem } from "./messageTypes";

interface OptionSelectorCardProps {
  payload: OptionSelectorPayload;
  isLatest: boolean;
  onSelect: (value: string) => void;
  selectedValue?: string;
}

function OptionRow({
  option,
  isInteractive,
  isSelected,
  isDimmed,
  onPress,
}: {
  option: OptionItem;
  isInteractive: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  onPress: () => void;
}) {
  const { colors: lc } = useTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(ANIMATION.scale.pressed, SPRINGS.press); }}
        onPressOut={() => { scale.value = withSpring(ANIMATION.scale.normal, SPRINGS.snap); }}
        disabled={!isInteractive}
        activeOpacity={0.8}
        style={[
          styles.optionRow,
          {
            backgroundColor: isSelected
              ? COLORS.glass.glowOrange
              : lc.glassBg,
            borderColor: isSelected ? COLORS.orange + "60" : lc.glassBorder,
            opacity: isDimmed ? 0.4 : 1,
          },
        ]}
      >
        {option.icon && (
          <Ionicons
            name={option.icon as any}
            size={20}
            color={isSelected ? COLORS.orange : lc.textSecondary}
            style={styles.optionIcon}
          />
        )}
        <View style={styles.optionText}>
          <Text
            style={[
              styles.optionLabel,
              { color: isSelected ? COLORS.orange : lc.textPrimary },
            ]}
          >
            {option.label}
          </Text>
          {option.description && (
            <Text style={[styles.optionDescription, { color: lc.textMuted }]}>
              {option.description}
            </Text>
          )}
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={20} color={COLORS.orange} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function OptionSelectorCard({
  payload,
  isLatest,
  onSelect,
  selectedValue,
}: OptionSelectorCardProps) {
  const { colors: lc } = useTheme();
  const isInteractive = isLatest && !selectedValue;

  return (
    <GlassSurface style={styles.card} blur={false}>
      <Text style={[styles.prompt, { color: lc.textPrimary }]}>
        {payload.prompt}
      </Text>
      <View style={styles.optionsList}>
        {payload.options.map((option) => (
          <OptionRow
            key={option.value}
            option={option}
            isInteractive={isInteractive}
            isSelected={selectedValue === option.value}
            isDimmed={!!selectedValue && selectedValue !== option.value}
            onPress={() => onSelect(option.value)}
          />
        ))}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
  },
  prompt: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
    marginBottom: SPACING.md,
  },
  optionsList: {
    gap: SPACING.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  optionIcon: {
    marginRight: SPACING.md,
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  optionDescription: {
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: 2,
  },
});
