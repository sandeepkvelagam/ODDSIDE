import React, { useEffect, useMemo } from "react";
import {
  View,
  Modal,
  Pressable,
  StyleSheet,
  LayoutRectangle,
  Dimensions,
  Text,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInRight,
  runOnJS,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useHaptics } from "../../context/HapticsContext";
import { SPRINGS } from "../../styles/liquidGlass";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─── Types ───────────────────────────────────────────────────

export interface LiquidGlassPopupItem {
  icon: string;
  label: string;
  onPress: () => void;
  rightIcon?: string;
  destructive?: boolean;
  disabled?: boolean;
}

interface LiquidGlassPopupProps {
  visible: boolean;
  onClose: () => void;
  anchorLayout: LayoutRectangle | null;
  anchorSide?: "left" | "right";
  items?: LiquidGlassPopupItem[];
  header?: React.ReactNode;
  children?: React.ReactNode;
  width?: number;
}

// ─── Animation configs ───────────────────────────────────────

const CLOSE_DURATION = 180;
const STAGGER_DELAY = 50;
const STAGGER_START_DELAY = 80;

// ─── Component ───────────────────────────────────────────────

export function LiquidGlassPopup({
  visible,
  onClose,
  anchorLayout,
  anchorSide = "right",
  items,
  header,
  children,
  width = 260,
}: LiquidGlassPopupProps) {
  const { colors, isDark } = useTheme();
  const { triggerHaptic } = useHaptics();

  // Core animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const backdropOpacity = useSharedValue(0);

  // ─── Open animation ──────────────────────────────────────

  useEffect(() => {
    if (visible) {
      // Reset
      scale.value = 0;
      opacity.value = 0;
      translateY.value = 12;
      backdropOpacity.value = 0;

      triggerHaptic("light");

      // Container entrance
      scale.value = withSpring(1, SPRINGS.bouncy);
      opacity.value = withTiming(1, { duration: 180 });
      translateY.value = withSpring(0, { damping: 10, stiffness: 80 });
      backdropOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [visible]);

  // ─── Close animation ─────────────────────────────────────

  const animateClose = () => {
    triggerHaptic("light");

    scale.value = withTiming(0, { duration: CLOSE_DURATION });
    opacity.value = withTiming(0, { duration: 150 });
    translateY.value = withTiming(8, { duration: 150 });
    backdropOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  };

  // Animated styles
  const backdropAnimStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const popupAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  // ─── Positioning ──────────────────────────────────────────

  const popupPosition = useMemo(() => {
    if (!anchorLayout) return { top: 100, right: 20 };

    const pos: any = {
      top: anchorLayout.y + anchorLayout.height + 10,
    };

    if (anchorSide === "right") {
      pos.right = SCREEN_WIDTH - (anchorLayout.x + anchorLayout.width);
    } else {
      pos.left = anchorLayout.x;
    }

    // Clamp so popup stays on screen
    if (pos.top + 300 > SCREEN_HEIGHT) {
      pos.top = anchorLayout.y - 300 - 10;
    }

    return pos;
  }, [anchorLayout, anchorSide]);

  if (!visible) return null;

  // ─── Glass colors ─────────────────────────────────────────

  const glassBg = isDark ? "rgba(40, 43, 43, 0.82)" : "rgba(255, 255, 255, 0.88)";
  const glassBorder = isDark ? "rgba(255, 255, 255, 0.14)" : "rgba(0, 0, 0, 0.08)";
  const separatorColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  const itemPressedBg = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)";

  const itemCount = items?.length ?? React.Children.count(children) ?? 0;

  // ─── Render ───────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={styles.fullscreen}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropAnimStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={animateClose}>
            <BlurView intensity={isDark ? 18 : 12} tint={isDark ? "dark" : "light"} style={StyleSheet.absoluteFill}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: isDark ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.1)" }]} />
            </BlurView>
          </Pressable>
        </Animated.View>

        {/* Popup container */}
        <Animated.View
          style={[
            styles.popupOuter,
            {
              width,
              ...popupPosition,
            },
            popupAnimStyle,
          ]}
        >
          {/* Glass background */}
          <View style={[styles.glassContainer, { borderColor: glassBorder }]}>
            <BlurView
              intensity={isDark ? 80 : 60}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
            {/* Tinted overlay on top of blur */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: glassBg }]} />

            {/* Content */}
            <Pressable onPress={(e) => e.stopPropagation()}>
              {/* Optional header */}
              {header && <View style={styles.headerSection}>{header}</View>}

              {/* Items — each item uses reanimated entering for stagger */}
              {items
                ? items.map((item, index) => (
                    <Animated.View
                      key={index}
                      entering={FadeInRight.delay(STAGGER_START_DELAY + index * STAGGER_DELAY)
                        .springify()
                        .damping(SPRINGS.layout.damping)}
                    >
                      <LiquidGlassRow
                        item={item}
                        showSeparator={index < items.length - 1}
                        separatorColor={separatorColor}
                        pressedBg={itemPressedBg}
                        colors={colors}
                        onPress={() => {
                          triggerHaptic("light");
                          animateClose();
                          setTimeout(() => item.onPress(), CLOSE_DURATION);
                        }}
                      />
                    </Animated.View>
                  ))
                : React.Children.map(children, (child, index) => (
                    <Animated.View
                      key={index}
                      entering={FadeInRight.delay(STAGGER_START_DELAY + index * STAGGER_DELAY)
                        .springify()
                        .damping(SPRINGS.layout.damping)}
                    >
                      {child}
                    </Animated.View>
                  ))}
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Menu item row ──────────────────────────────────────────

interface LiquidGlassRowProps {
  item: LiquidGlassPopupItem;
  showSeparator: boolean;
  separatorColor: string;
  pressedBg: string;
  colors: any;
  onPress: () => void;
}

function LiquidGlassRow({
  item,
  showSeparator,
  separatorColor,
  pressedBg,
  colors,
  onPress,
}: LiquidGlassRowProps) {
  const textColor = item.destructive ? colors.danger : colors.textPrimary;
  const iconColor = item.destructive ? colors.danger : colors.textSecondary;

  return (
    <View>
      <Pressable
        style={({ pressed }) => [
          styles.menuRow,
          pressed && { backgroundColor: pressedBg },
          item.disabled && { opacity: 0.4 },
        ]}
        onPress={onPress}
        disabled={item.disabled}
      >
        <Ionicons name={item.icon as any} size={20} color={iconColor} />
        <Text
          style={[styles.menuLabel, { color: textColor }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {item.rightIcon && (
          <Ionicons name={item.rightIcon as any} size={16} color={colors.textMuted} />
        )}
      </Pressable>
      {showSeparator && <View style={[styles.separator, { backgroundColor: separatorColor }]} />}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
  },
  popupOuter: {
    position: "absolute",
    // Shadow for floating depth
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 24,
  },
  glassContainer: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  headerSection: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 18,
    gap: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 18,
  },
});
