/**
 * PageHeader — Consistent header used across all bottom-sheet sub-pages.
 * Matches SettingsScreen style: close button (circle), centered title, optional right element.
 */
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { TYPOGRAPHY, RADIUS } from "../../styles/liquidGlass";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  rightElement?: React.ReactNode;
}

export function PageHeader({ title, subtitle, onClose, rightElement }: PageHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.header}>
      <Pressable
        style={({ pressed }) => [
          styles.closeBtn,
          { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
          pressed && { opacity: 0.7, transform: [{ scale: 0.92 }] },
        ]}
        onPress={onClose}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
      </Pressable>

      <View style={styles.centerBlock}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>

      <View style={styles.right}>{rightElement ?? <View style={{ width: 44 }} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 16,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  centerBlock: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    width: 44,
    alignItems: "flex-end",
  },
});
