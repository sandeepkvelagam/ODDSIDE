import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../styles/liquidGlass";

interface ActionItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  bgColor: string;
  iconColor?: string;
  borderColor?: string;
}

interface ThemeColors {
  textSecondary: string;
  glassBg: string;
  glassBorder: string;
}

interface WalletActionRowProps {
  onSend: () => void;
  onReceive: () => void;
  onDeposit: () => void;
  onMore: () => void;
  tc: ThemeColors;
}

export function WalletActionRow({ onSend, onReceive, onDeposit, onMore, tc }: WalletActionRowProps) {
  const actions: ActionItem[] = [
    {
      icon: "arrow-up-circle-outline",
      label: "Send",
      onPress: onSend,
      bgColor: COLORS.orange,
      iconColor: "#FFFFFF",
    },
    {
      icon: "arrow-down-circle-outline",
      label: "Receive",
      onPress: onReceive,
      bgColor: COLORS.trustBlue,
      iconColor: "#FFFFFF",
    },
    {
      icon: "card-outline",
      label: "Deposit",
      onPress: onDeposit,
      bgColor: "rgba(34, 197, 94, 0.15)",
      iconColor: COLORS.status.success,
      borderColor: `${COLORS.status.success}60`,
    },
    {
      icon: "ellipsis-horizontal",
      label: "More",
      onPress: onMore,
      bgColor: tc.glassBg,
      iconColor: tc.textSecondary,
      borderColor: tc.glassBorder,
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((action) => (
        <View key={action.label} style={styles.actionItem}>
          <TouchableOpacity
            style={[
              styles.circle,
              { backgroundColor: action.bgColor },
              action.borderColor && { borderWidth: 1.5, borderColor: action.borderColor },
            ]}
            onPress={action.onPress}
            activeOpacity={0.75}
          >
            <Ionicons
              name={action.icon}
              size={26}
              color={action.iconColor ?? "#FFFFFF"}
            />
          </TouchableOpacity>
          <Text style={[styles.label, { color: tc.textSecondary }]}>{action.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: SPACING.xxl,
  },
  actionItem: {
    alignItems: "center",
    gap: SPACING.sm,
  },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  label: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
