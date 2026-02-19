import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useTheme } from "../context/ThemeContext";
import { useHaptics } from "../context/HapticsContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TOP_VISIBLE_HEIGHT = 24; // How much of the previous screen shows at top

interface BottomSheetScreenProps {
  children: React.ReactNode;
}

/**
 * BottomSheetScreen - A screen wrapper that presents content as a bottom sheet
 * 
 * Features:
 * - Curved top corners (borderRadius: 28)
 * - Transparent top area showing previous screen
 * - Spring slide-up animation
 * - Blur backdrop at top
 */
export function BottomSheetScreen({ children }: BottomSheetScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHaptics();
  
  // Animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide up animation
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleClose = () => {
    triggerHaptic("light");
    
    // Slide down animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      navigation.goBack();
    });
  };

  return (
    <View style={styles.container}>
      {/* Transparent backdrop at top - tap to close */}
      <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={[styles.topTouchArea, { height: TOP_VISIBLE_HEIGHT + insets.top }]}
          activeOpacity={1}
          onPress={handleClose}
        >
          {/* Theme-aware semi-transparent overlay */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.15)" }]} />
        </TouchableOpacity>
      </Animated.View>

      {/* Main content with curved corners */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            backgroundColor: isDark ? colors.jetDark : colors.contentBg,
            marginTop: TOP_VISIBLE_HEIGHT + insets.top,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Content */}
        <View style={[styles.content, { paddingBottom: insets.bottom }]}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  topTouchArea: {
    width: "100%",
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    // Shadow for depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  content: {
    flex: 1,
  },
});
