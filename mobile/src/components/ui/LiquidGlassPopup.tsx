import React, { useEffect, useRef, useMemo } from "react";
import {
  View,
  Modal,
  Animated,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  LayoutRectangle,
  Dimensions,
  Text,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useHaptics } from "../../context/HapticsContext";

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

const SPRING_OPEN = { tension: 65, friction: 8, useNativeDriver: true };
const SPRING_FLOAT = { tension: 80, friction: 10, useNativeDriver: true };
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
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  // Per-item stagger values
  const itemCount = items?.length ?? React.Children.count(children) ?? 0;
  const itemAnims = useRef<Animated.Value[]>([]).current;
  const itemSlides = useRef<Animated.Value[]>([]).current;

  // Ensure we have enough animated values for each item
  while (itemAnims.length < itemCount) {
    itemAnims.push(new Animated.Value(0));
    itemSlides.push(new Animated.Value(15));
  }

  // ─── Open animation ──────────────────────────────────────

  const animateOpen = () => {
    // Reset
    scale.setValue(0);
    opacity.setValue(0);
    translateY.setValue(12);
    backdropOpacity.setValue(0);
    itemAnims.forEach((a) => a.setValue(0));
    itemSlides.forEach((a) => a.setValue(15));

    triggerHaptic("light");

    // Container entrance
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, ...SPRING_OPEN }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, ...SPRING_FLOAT }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Staggered item entrance
    const staggerAnims = itemAnims.slice(0, itemCount).map((anim, i) =>
      Animated.parallel([
        Animated.timing(anim, {
          toValue: 1,
          duration: 200,
          delay: STAGGER_START_DELAY + i * STAGGER_DELAY,
          useNativeDriver: true,
        }),
        Animated.timing(itemSlides[i], {
          toValue: 0,
          duration: 200,
          delay: STAGGER_START_DELAY + i * STAGGER_DELAY,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.parallel(staggerAnims).start();
  };

  // ─── Close animation ─────────────────────────────────────

  const animateClose = () => {
    triggerHaptic("light");

    Animated.parallel([
      Animated.timing(scale, { toValue: 0, duration: CLOSE_DURATION, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 8, duration: 150, useNativeDriver: true }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  useEffect(() => {
    if (visible) {
      animateOpen();
    }
  }, [visible]);

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

  // ─── Render ───────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={animateClose}>
      <View style={styles.fullscreen}>
        {/* Backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOpacity }]}>
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
              opacity,
              transform: [{ scale }, { translateY }],
            },
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

              {/* Items */}
              {items
                ? items.map((item, index) => (
                    <LiquidGlassRow
                      key={index}
                      item={item}
                      index={index}
                      itemOpacity={itemAnims[index]}
                      itemSlide={itemSlides[index]}
                      showSeparator={index < items.length - 1}
                      separatorColor={separatorColor}
                      pressedBg={itemPressedBg}
                      colors={colors}
                      onPress={() => {
                        triggerHaptic("light");
                        animateClose();
                        // Delay the action slightly so close animation is visible
                        setTimeout(() => item.onPress(), CLOSE_DURATION);
                      }}
                    />
                  ))
                : React.Children.map(children, (child, index) => (
                    <Animated.View
                      key={index}
                      style={{
                        opacity: itemAnims[index] || 1,
                        transform: [{ translateX: itemSlides[index] || 0 }],
                      }}
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
  index: number;
  itemOpacity: Animated.Value;
  itemSlide: Animated.Value;
  showSeparator: boolean;
  separatorColor: string;
  pressedBg: string;
  colors: any;
  onPress: () => void;
}

function LiquidGlassRow({
  item,
  itemOpacity,
  itemSlide,
  showSeparator,
  separatorColor,
  pressedBg,
  colors,
  onPress,
}: LiquidGlassRowProps) {
  const textColor = item.destructive ? colors.danger : colors.textPrimary;
  const iconColor = item.destructive ? colors.danger : colors.textSecondary;

  return (
    <Animated.View
      style={{
        opacity: itemOpacity,
        transform: [{ translateX: itemSlide }],
      }}
    >
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
    </Animated.View>
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
