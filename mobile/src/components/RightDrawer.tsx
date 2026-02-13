import React, { ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useHaptics } from "../context/HapticsContext";

type Props = {
  children: ReactNode;
  title: string;
  rightAction?: ReactNode;
};

/**
 * RightDrawer - A full-screen layout component for sub-screens.
 * Used for Profile, Notifications, Privacy, etc. that slide in from the right.
 * The native stack navigator handles the slide animation.
 */
export function RightDrawer({ children, title, rightAction }: Props) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { triggerHaptic } = useHaptics();

  const handleClose = () => {
    triggerHaptic("light");
    navigation.goBack();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [
            styles.glassButton,
            { backgroundColor: colors.glassBg, borderColor: colors.glassBorder },
            pressed && styles.glassButtonPressed
          ]}
          onPress={handleClose}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>

        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>

        {rightAction || <View style={styles.headerSpacer} />}
      </View>

      {/* Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  glassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  glassButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.92 }],
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 44,
  },
});
