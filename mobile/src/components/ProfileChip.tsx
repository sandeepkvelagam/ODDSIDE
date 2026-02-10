import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { COLORS, BLUR_INTENSITY, glassStyles } from "../styles/glass";

type Props = {
  name: string;
  onPress?: () => void;
  testID?: string;
};

export function ProfileChip({ name, onPress, testID }: Props) {
  const initial = name?.[0]?.toUpperCase() || "?";
  
  return (
    <TouchableOpacity 
      style={glassStyles.profileChip} 
      onPress={onPress}
      activeOpacity={0.7}
      data-testid={testID}
    >
      <BlurView 
        intensity={BLUR_INTENSITY} 
        tint="dark" 
        style={StyleSheet.absoluteFill} 
      />
      <View style={glassStyles.avatar}>
        <Text style={glassStyles.avatarText}>{initial}</Text>
      </View>
      <Text style={styles.nameText}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  nameText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
});
