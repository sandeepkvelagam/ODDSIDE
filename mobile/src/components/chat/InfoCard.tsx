import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassSurface } from "../ui/GlassSurface";
import { GlassButton } from "../ui/GlassButton";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../styles/liquidGlass";
import { useTheme } from "../../context/ThemeContext";
import type { InfoCardPayload } from "./messageTypes";

interface InfoCardProps {
  payload: InfoCardPayload;
  isLatest: boolean;
  onAction?: (action: string) => void;
}

export function InfoCard({ payload, isLatest, onAction }: InfoCardProps) {
  const { colors: lc } = useTheme();

  return (
    <GlassSurface style={styles.card} blur={false}>
      {/* Title row */}
      <View style={styles.titleRow}>
        {payload.icon && (
          <Ionicons name={payload.icon as any} size={20} color={COLORS.orange} />
        )}
        <Text style={[styles.title, { color: lc.textPrimary }]}>
          {payload.title}
        </Text>
      </View>

      {/* Body */}
      <Text style={[styles.body, { color: lc.textSecondary }]}>
        {payload.body}
      </Text>

      {/* Footer */}
      {payload.footer && (
        <Text style={[styles.footer, { color: lc.textMuted }]}>
          {payload.footer}
        </Text>
      )}

      {/* Actions */}
      {payload.actions && payload.actions.length > 0 && isLatest && (
        <View style={styles.actionsContainer}>
          {payload.actions.map((action, i) => (
            <GlassButton
              key={i}
              onPress={() => onAction?.(action.action)}
              variant="ghost"
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
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  body: {
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  footer: {
    fontSize: TYPOGRAPHY.sizes.caption,
    marginBottom: SPACING.md,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
    flexWrap: "wrap",
    marginTop: SPACING.sm,
  },
});
