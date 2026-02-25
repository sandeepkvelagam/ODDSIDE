import React, { useEffect, useRef } from "react";
import { TouchableOpacity, StyleSheet, View, Animated } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import type { RootStackParamList } from "../navigation/RootNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function MiniOrb() {
  return (
    <LinearGradient
      colors={["#FF6EA8", "#7848FF", "#281A5A"]}
      start={{ x: 0.3, y: 0.3 }}
      end={{ x: 0.7, y: 0.9 }}
      style={styles.orbGradient}
    >
      {/* Specular highlight */}
      <View style={styles.orbHighlight} />
      {/* Eyes */}
      <View style={styles.orbEyeLeft} />
      <View style={styles.orbEyeRight} />
    </LinearGradient>
  );
}

export function AIChatFab() {
  const navigation = useNavigation<Nav>();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={() => navigation.navigate("AIAssistant")}
      activeOpacity={0.8}
    >
      {/* Glow ring */}
      <Animated.View
        style={[
          styles.glowRing,
          {
            opacity: pulseAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.7],
            }),
            transform: [
              {
                scale: pulseAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.15],
                }),
              },
            ],
          },
        ]}
      />
      <MiniOrb />
      {/* Green online dot */}
      <View style={styles.onlineDot} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 28,
    left: 28,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#7848FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 10,
  },
  glowRing: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(168, 85, 247, 0.5)",
  },
  orbGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  orbHighlight: {
    position: "absolute",
    top: 5,
    left: 7,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.25)",
    transform: [{ rotate: "-30deg" }, { scaleX: 0.8 }],
  },
  orbEyeLeft: {
    position: "absolute",
    top: 17,
    left: 15,
    width: 4,
    height: 4,
    backgroundColor: "#fff",
    transform: [{ rotate: "45deg" }],
  },
  orbEyeRight: {
    position: "absolute",
    top: 17,
    left: 25,
    width: 4,
    height: 4,
    backgroundColor: "#fff",
    transform: [{ rotate: "45deg" }],
  },
  onlineDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#34D399",
    borderWidth: 2,
    borderColor: "#1a1a2e",
  },
});
