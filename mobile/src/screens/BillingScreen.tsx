import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { RightDrawer } from "../components/RightDrawer";

export function BillingScreen() {
  const { colors } = useTheme();

  const titleWithBadge = (
    <View style={styles.headerTitleRow}>
      <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Billing</Text>
      <View style={[styles.comingSoonBadge, { backgroundColor: colors.orange }]}>
        <Text style={styles.comingSoonText}>Coming Soon</Text>
      </View>
    </View>
  );

  return (
    <RightDrawer title="Billing">
      <View style={styles.content}>
        {/* Coming Soon Badge */}
        <View style={[styles.comingSoonHeader, { backgroundColor: colors.orange + "15" }]}>
          <Ionicons name="time-outline" size={20} color={colors.orange} />
          <Text style={[styles.comingSoonHeaderText, { color: colors.orange }]}>Coming Soon</Text>
        </View>

        {/* Account Plan Box */}
        <View style={[styles.planBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Text style={[styles.planLabel, { color: colors.textSecondary }]}>Account plan</Text>
          <Text style={[styles.planValue, { color: colors.textPrimary }]}>Free</Text>
        </View>

        {/* Menu Items */}
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: colors.border }]}
          activeOpacity={0.7}
          disabled
        >
          <Ionicons name="cash-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.menuLabel, { color: colors.textMuted }]}>Manage subscription</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: "transparent" }]}
          activeOpacity={0.7}
          disabled
        >
          <Ionicons name="refresh-outline" size={22} color={colors.textMuted} />
          <Text style={[styles.menuLabel, { color: colors.textMuted }]}>Restore purchases</Text>
        </TouchableOpacity>
      </View>
    </RightDrawer>
  );
}

const styles = StyleSheet.create({
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  comingSoonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  comingSoonText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  comingSoonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  comingSoonHeaderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  planBox: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  planLabel: {
    fontSize: 13,
    marginBottom: 2,
  },
  planValue: {
    fontSize: 17,
    fontWeight: "600",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderBottomWidth: 1,
    gap: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
  },
});
