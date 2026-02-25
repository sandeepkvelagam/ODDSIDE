import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { listGroups } from "../api/groups";
import { COLORS } from "../styles/liquidGlass";

type Nav = NativeStackNavigationProp<any, any>;

export default function AuthLoadingScreen() {
  const navigation = useNavigation<Nav>();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    // Logo zoom animation
    scale.value = withTiming(1.2, {
      duration: 1500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
    opacity.value = withTiming(1, { duration: 800 });

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
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Text style={styles.logo}>K</Text>
      </Animated.View>
      <Animated.Text style={[styles.subtitle, textStyle]}>
        Game Ledger
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepBlack,
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.trustBlue,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logo: {
    fontSize: 72,
    fontWeight: "bold",
    color: COLORS.text.primary,
  },
  subtitle: {
    fontSize: 18,
    color: COLORS.text.muted,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
