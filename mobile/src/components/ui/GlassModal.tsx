import React, { useEffect, useCallback } from "react";
import {
  View,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS, SPRINGS, BLUR, ANIMATION } from "../../styles/liquidGlass";
import { GlassIconButton } from "./GlassButton";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: "small" | "medium" | "large" | "full";
  avoidKeyboard?: boolean;
}

/**
 * GlassModal - Premium modal with spring animations
 *
 * Uses react-native-reanimated for UI-thread animations.
 */
export function GlassModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  showCloseButton = true,
  size = "medium",
  avoidKeyboard = true,
}: GlassModalProps) {
  const scale = useSharedValue<number>(ANIMATION.scale.modalStart);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(ANIMATION.scale.normal, SPRINGS.bouncy);
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = ANIMATION.scale.modalStart;
      opacity.value = 0;
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    scale.value = withTiming(ANIMATION.scale.modalStart, { duration: 150 });
    opacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [onClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const getMaxHeight = () => {
    switch (size) {
      case "small":
        return SCREEN_HEIGHT * 0.4;
      case "medium":
        return SCREEN_HEIGHT * 0.6;
      case "large":
        return SCREEN_HEIGHT * 0.8;
      case "full":
        return SCREEN_HEIGHT * 0.9;
      default:
        return SCREEN_HEIGHT * 0.6;
    }
  };

  const Wrapper = avoidKeyboard ? KeyboardAvoidingView : View;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Blur backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <BlurView intensity={BLUR.modal.intensity.dark} style={StyleSheet.absoluteFill} tint="dark" />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Modal content */}
        <Wrapper
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.contentWrapper}
        >
          <Animated.View
            style={[
              styles.modal,
              { maxHeight: getMaxHeight() },
              contentStyle,
            ]}
          >
            {/* Header */}
            {(title || showCloseButton) && (
              <View style={styles.header}>
                <View style={styles.headerText}>
                  {title && <Text style={styles.title}>{title}</Text>}
                  {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                {showCloseButton && (
                  <GlassIconButton
                    icon={<Text style={{ color: COLORS.text.secondary, fontSize: 18 }}>✕</Text>}
                    onPress={handleClose}
                    size="small"
                    variant="ghost"
                  />
                )}
              </View>
            )}

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </Wrapper>
      </View>
    </Modal>
  );
}

/**
 * GlassBottomSheet - Bottom sheet variant of GlassModal
 */
interface GlassBottomSheetProps extends Omit<GlassModalProps, "size"> {
  height?: number | "auto";
}

export function GlassBottomSheet({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  height = "auto",
  avoidKeyboard = true,
}: GlassBottomSheetProps) {
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, SPRINGS.bouncy);
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = 300;
      opacity.value = 0;
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    translateY.value = withTiming(300, { duration: 200 });
    opacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [onClose]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const Wrapper = avoidKeyboard ? KeyboardAvoidingView : View;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <BlurView intensity={BLUR.bottomSheet.intensity.dark} style={StyleSheet.absoluteFill} tint="dark" />
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={handleClose}
          />
        </Animated.View>

        {/* Bottom sheet */}
        <Wrapper
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.bottomSheetWrapper}
        >
          <Animated.View
            style={[
              styles.bottomSheet,
              height !== "auto" && { height },
              sheetStyle,
            ]}
          >
            {/* Drag handle */}
            <View style={styles.dragHandle}>
              <View style={styles.dragHandleBar} />
            </View>

            {/* Header */}
            {(title || showCloseButton) && (
              <View style={styles.bottomSheetHeader}>
                {title && <Text style={styles.title}>{title}</Text>}
                {showCloseButton && (
                  <GlassIconButton
                    icon={<Text style={{ color: COLORS.text.secondary, fontSize: 16 }}>✕</Text>}
                    onPress={handleClose}
                    size="small"
                    variant="ghost"
                  />
                )}
              </View>
            )}

            {/* Content */}
            <ScrollView
              style={styles.bottomSheetContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>
          </Animated.View>
        </Wrapper>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.container,
  },
  modal: {
    width: "100%",
    backgroundColor: COLORS.jetDark,
    borderRadius: RADIUS.xxxl,
    borderWidth: 1.5,
    borderColor: COLORS.glass.border,
    overflow: "hidden",
    ...SHADOWS.floating,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  subtitle: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    marginTop: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  // Bottom sheet styles
  bottomSheetWrapper: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
  },
  bottomSheet: {
    width: "100%",
    backgroundColor: COLORS.jetDark,
    borderTopLeftRadius: RADIUS.xxxl,
    borderTopRightRadius: RADIUS.xxxl,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: COLORS.glass.border,
    paddingBottom: SPACING.xl,
    maxHeight: SCREEN_HEIGHT * 0.9,
    ...SHADOWS.floating,
  },
  dragHandle: {
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
  dragHandleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.glass.border,
    borderRadius: RADIUS.full,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
  },
  bottomSheetContent: {
    paddingHorizontal: SPACING.xl,
  },
});
