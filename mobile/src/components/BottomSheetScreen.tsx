import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../context/ThemeContext";
import { useHaptics } from "../context/HapticsContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const TOP_VISIBLE_HEIGHT = 24; // How much of the previous screen shows at top

interface BottomSheetScreenProps {
  children: React.ReactNode;
  noBorderRadius?: boolean;
}

/**
 * BottomSheetScreen - A screen wrapper that presents content as a bottom sheet
 *
 * Uses react-native-reanimated for UI-thread slide animations.
 */
export function BottomSheetScreen({ children, noBorderRadius }: BottomSheetScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHaptics();

  const slideY = useSharedValue(SCREEN_HEIGHT);
  const backdropOp = useSharedValue(0);

  useEffect(() => {
    slideY.value = withSpring(0, { damping: 20, stiffness: 120, mass: 0.8 });
    backdropOp.value = withTiming(1, { duration: 200 });
  }, []);

  const handleClose = () => {
    triggerHaptic("light");

    slideY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
    backdropOp.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(navigation.goBack)();
      }
    });
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOp.value,
    backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.15)",
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Semi-transparent backdrop */}
      <Animated.View style={[styles.fullBackdrop, backdropStyle]}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      {/* Main content with curved corners */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            backgroundColor: colors.contentBg,
            marginTop: TOP_VISIBLE_HEIGHT + insets.top,
            ...(noBorderRadius && {
              borderTopLeftRadius: 0,
              borderTopRightRadius: 0,
            }),
          },
          contentStyle,
        ]}
      >
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
  fullBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  backdropTouchable: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    zIndex: 1,
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
