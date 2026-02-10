import React from "react";
import { TouchableOpacity, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useDrawer } from "../context/DrawerContext";

export function HamburgerButton() {
  const { toggleDrawer } = useDrawer();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={toggleDrawer}
      activeOpacity={0.8}
    >
      <View style={styles.button}>
        <Ionicons name="menu" size={22} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 16,
    zIndex: 100,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(40,40,45,0.95)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
