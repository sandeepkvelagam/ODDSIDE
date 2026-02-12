import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";

export function Card({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: object;
}) {
  const { colors } = useTheme();

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.glassBorder,
    },
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={cardStyle}>
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
});
