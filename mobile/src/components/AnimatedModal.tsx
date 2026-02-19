import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Pressable,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface AnimatedModalProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  blurIntensity?: number;
  enableHaptics?: boolean;
}

// Spring configuration for bouncy entrance
const SPRING_CONFIG = {
  tension: 65,
  friction: 7,
  useNativeDriver: true,
};

/**
 * AnimatedModal - Premium modal with spring entrance, blur backdrop, and float effect
 *
 * Features:
 * - Spring entrance animation (scale 0.85 → 1 with overshoot)
 * - Blur background with expo-blur
 * - Deep shadow for floating effect
 * - Scale down + fade out on close
 * - Optional haptic feedback
 */
export function AnimatedModal({
  visible,
  onClose,
  children,
  blurIntensity = 50,
  enableHaptics = true,
}: AnimatedModalProps) {
  const [modalVisible, setModalVisible] = useState(visible);

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      animateIn();
    } else if (modalVisible) {
      // External close (prop changed to false) - animate out
      // Don't call onClose since parent already knows it's closing
      if (enableHaptics) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
      });
    }
  }, [visible]);

  const animateIn = () => {
    // Reset to starting position
    scaleAnim.setValue(0.85);
    opacityAnim.setValue(0);
    backdropOpacity.setValue(0);

    // Haptic feedback on open
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.parallel([
      // Backdrop fade in
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      // Content springs in with bounce
      Animated.spring(scaleAnim, {
        toValue: 1,
        ...SPRING_CONFIG,
      }),
      // Content fades in
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = (callback: () => void) => {
    // Haptic feedback on close
    if (enableHaptics) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.parallel([
      // Backdrop fades out
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      // Content scales down
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 200,
        useNativeDriver: true,
      }),
      // Content fades out
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      callback();
    });
  };

  const handleClose = () => {
    animateOut(() => onClose());
  };

  const handleBackdropPress = () => {
    handleClose();
  };

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
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress}>
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
        <Animated.View
          style={[
            styles.contentWrapper,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
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
