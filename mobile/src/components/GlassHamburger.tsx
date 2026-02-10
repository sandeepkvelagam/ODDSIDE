import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { COLORS, BLUR_INTENSITY, glassStyles, hamburgerStyles } from "../styles/glass";

type Props = {
  onPress?: () => void;
  testID?: string;
};

export function GlassHamburger({ onPress, testID }: Props) {
  return (
    <TouchableOpacity 
      style={glassStyles.glassIconBtn} 
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <BlurView 
        intensity={BLUR_INTENSITY} 
        tint="dark" 
        style={StyleSheet.absoluteFill} 
      />
      <View style={hamburgerStyles.container}>
        <View style={[hamburgerStyles.bar, hamburgerStyles.barTop]} />
        <View style={[hamburgerStyles.bar, hamburgerStyles.barMid]} />
        <View style={[hamburgerStyles.bar, hamburgerStyles.barBot]} />
      </View>
    </TouchableOpacity>
  );
}
