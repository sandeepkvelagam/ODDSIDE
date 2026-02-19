import React, { useEffect, useRef } from "react";
import {
  View,
  Modal,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { COLORS, TYPOGRAPHY, RADIUS, SPACING, SHADOWS, ANIMATION } from "../../styles/liquidGlass";
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
 * Features:
 * - Blur backdrop
 * - Spring open/close animation (scale 0.85 → 1.0)
 * - Glass morphism styling
 * - Optional header with title/subtitle
 * 
 * Usage:
 * <GlassModal visible={showModal} onClose={() => setShowModal(false)} title="Settings">
 *   <View>...</View>
 * </GlassModal>
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
  const scaleAnim = useRef(new Animated.Value(ANIMATION.scale.modalStart)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animate in
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: ANIMATION.scale.normal,
          ...ANIMATION.spring.bouncy,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          ...ANIMATION.timing.normal,
        }),
      ]).start();
    } else {
      // Reset for next open
      scaleAnim.setValue(ANIMATION.scale.modalStart);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    // Animate out
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: ANIMATION.scale.modalStart,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

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
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <BlurView intensity={50} style={StyleSheet.absoluteFill} tint="dark" />
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
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }],
              },
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
  const translateYAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateYAnim, {
          toValue: 0,
          ...ANIMATION.spring.bouncy,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          ...ANIMATION.timing.normal,
        }),
      ]).start();
    } else {
      translateYAnim.setValue(300);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateYAnim, {
        toValue: 300,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
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
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
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
              { transform: [{ translateY: translateYAnim }] },
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
    justifyContent: "center",
    alignItems: "center",
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
  },
  bottomSheet: {
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
