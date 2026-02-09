import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { listGroups } from "../api/groups";

type Nav = NativeStackNavigationProp<any, any>;

export default function AuthLoadingScreen() {
  const navigation = useNavigation<Nav>();
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Logo zoom animation
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 1500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    // Preload data
    const loadData = async () => {
      const startTime = Date.now();

      try {
        // Preload groups list
        await listGroups();
      } catch (error) {
        console.error("Preload error:", error);
        // Continue anyway - errors will show in Groups screen
      }

      // Ensure minimum 2s display time
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 2000 - elapsed);

      setTimeout(() => {
        navigation.replace("Main");
      }, remaining);
    };

    loadData();
  }, [navigation, scaleAnim, opacityAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Text style={styles.logo}>K</Text>
      </Animated.View>
      <Animated.Text style={[styles.subtitle, { opacity: opacityAnim }]}>
        Game Ledger
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0B0F",
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#3b82f6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logo: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#fff",
  },
  subtitle: {
    fontSize: 18,
    color: "#999",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
