import React from "react";
import { View, StyleSheet, type ViewStyle, type StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "../../styles/liquidGlass";

interface AIGlowBorderProps {
  children: React.ReactNode;
  backgroundColor?: string;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export function AIGlowBorder({
  children,
  backgroundColor = COLORS.jetDark,
  borderWidth = 2.5,
  style,
}: AIGlowBorderProps) {
  return (
    <LinearGradient
      colors={COLORS.ai.gradientColors as unknown as [string, string, ...string[]]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      <View style={[styles.inner, { backgroundColor, margin: borderWidth }]}>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    shadowColor: "#EE6C29",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  inner: {
    flex: 1,
    overflow: "hidden",
  },
});
