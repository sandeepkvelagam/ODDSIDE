import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Pressable,
  View,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { SPRINGS, BLUR } from "../styles/liquidGlass";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  blurIntensity?: number;
  enableHaptics?: boolean;
}

/**
 * AnimatedModal - Premium modal with spring entrance, blur backdrop, and float effect
 *
 * Uses react-native-reanimated for UI-thread animations.
 */
export function AnimatedModal({
  visible,
  onClose,
  children,
  blurIntensity = BLUR.modal.intensity.dark,
  enableHaptics = true,
}: AnimatedModalProps) {
  const [modalVisible, setModalVisible] = useState(visible);

  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      animateIn();
    } else if (modalVisible) {
      if (enableHaptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      animateOutInternal(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const animateIn = () => {
    scale.value = 0.85;
    opacity.value = 0;
    backdropOpacity.value = 0;

    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    backdropOpacity.value = withTiming(1, { duration: 200 });
    scale.value = withSpring(1, SPRINGS.bouncy);
    opacity.value = withTiming(1, { duration: 200 });
  };

  const animateOutInternal = (callback: () => void) => {
    backdropOpacity.value = withTiming(0, { duration: 200 });
    scale.value = withTiming(0.85, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(callback)();
      }
    });
  };

  const handleClose = () => {
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    animateOutInternal(() => {
      setModalVisible(false);
      onClose();
    });
  };

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!modalVisible && !visible) {
    return null;
  }

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Blurred backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
            <BlurView
              intensity={blurIntensity}
              tint="dark"
              style={StyleSheet.absoluteFill}
            >
              <View style={styles.backdropOverlay} />
            </BlurView>
          </Pressable>
        </Animated.View>

        {/* Modal content with spring animation */}
        <Animated.View style={[styles.contentWrapper, contentAnimStyle]}>
          <View style={styles.contentContainer}>
            {children}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  contentWrapper: {
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
  },
  contentContainer: {
    // Deep shadow for floating effect
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 24,
  },
});
