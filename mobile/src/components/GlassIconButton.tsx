import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, BLUR_INTENSITY, glassStyles } from "../styles/glass";

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  size?: "default" | "small";
  onPress?: () => void;
  children?: React.ReactNode;
  testID?: string;
};

export function GlassIconButton({ 
  icon, 
  size = "default", 
  onPress, 
  children,
  testID 
}: Props) {
  const btnStyle = size === "small" ? glassStyles.glassIconBtnSmall : glassStyles.glassIconBtn;
  const iconSize = size === "small" ? 20 : 24;
  
  return (
    <TouchableOpacity 
      style={btnStyle} 
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <BlurView 
        intensity={BLUR_INTENSITY} 
        tint="dark" 
        style={StyleSheet.absoluteFill} 
      />
      {children ? children : (
        icon && <Ionicons name={icon} size={iconSize} color={COLORS.textPrimary} />
      )}
    </TouchableOpacity>
  );
}
