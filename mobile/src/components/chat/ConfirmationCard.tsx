import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassSurface } from "../ui/GlassSurface";
import { GlassButton } from "../ui/GlassButton";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../styles/liquidGlass";
import { useTheme } from "../../context/ThemeContext";
import type { ConfirmationPayload } from "./messageTypes";

interface ConfirmationCardProps {
  payload: ConfirmationPayload;
  isLatest: boolean;
  onAction: (action: string) => void;
  actedAction?: string;
}

const VARIANT_CONFIG: Record<
  ConfirmationPayload["variant"],
  { glow: "green" | "blue" | "orange" | "red"; icon: string; iconColor: string }
> = {
  success: { glow: "green", icon: "checkmark-circle", iconColor: COLORS.status.success },
  info: { glow: "blue", icon: "information-circle", iconColor: COLORS.status.info },
  warning: { glow: "orange", icon: "warning", iconColor: COLORS.status.warning },
  error: { glow: "red", icon: "close-circle", iconColor: COLORS.status.danger },
};

const BUTTON_VARIANT_MAP: Record<string, "primary" | "secondary" | "ghost" | "destructive"> = {
  primary: "primary",
  secondary: "secondary",
  ghost: "ghost",
};

export function ConfirmationCard({
  payload,
  isLatest,
  onAction,
  actedAction,
}: ConfirmationCardProps) {
  const { colors: lc } = useTheme();
  const config = VARIANT_CONFIG[payload.variant] || VARIANT_CONFIG.info;
  const showActions = isLatest && !actedAction && payload.actions && payload.actions.length > 0;

  return (
    <GlassSurface style={styles.card} glowVariant={config.glow} blur={false}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name={config.icon as any} size={24} color={config.iconColor} />
        <Text style={[styles.title, { color: lc.textPrimary }]}>
          {payload.title}
        </Text>
      </View>

      {/* Message */}
      <Text style={[styles.message, { color: lc.textSecondary }]}>
        {payload.message}
      </Text>

      {/* Detail rows */}
      {payload.details && payload.details.length > 0 && (
        <View style={[styles.detailsContainer, { borderTopColor: lc.glassBorder }]}>
          {payload.details.map((row, i) => (
            <View key={i} style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: lc.textMuted }]}>
                {row.label}
              </Text>
              <Text style={[styles.detailValue, { color: lc.textPrimary }]}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action buttons */}
      {showActions && (
        <View style={styles.actionsContainer}>
          {payload.actions!.map((action, i) => (
            <GlassButton
              key={i}
              onPress={() => onAction(action.action)}
              variant={BUTTON_VARIANT_MAP[action.variant || "ghost"] || "ghost"}
              size="small"
            >
              {action.label}
            </GlassButton>
          ))}
        </View>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  message: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  detailsContainer: {
    borderTopWidth: 1,
    paddingTop: SPACING.md,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
  },
});
