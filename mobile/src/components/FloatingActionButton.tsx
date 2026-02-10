import React from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, glassStyles } from "../styles/glass";

type Props = {
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
};

export function FloatingActionButton({ onPress, icon = "add", testID }: Props) {
  return (
    <TouchableOpacity 
      style={glassStyles.fab} 
      onPress={onPress}
      activeOpacity={0.8}
      testID={testID}
    >
      <View style={styles.innerSheen}>
        <Ionicons name={icon} size={28} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  innerSheen: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
});
