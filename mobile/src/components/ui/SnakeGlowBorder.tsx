import React, { useState } from "react";
import { View, StyleSheet, type LayoutChangeEvent } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import Svg, { Rect } from "react-native-svg";

const AnimatedRect = Animated.createAnimatedComponent(Rect);

interface SnakeGlowBorderProps {
  children: React.ReactNode;
  borderRadius?: number;
  glowColor?: string;
  /** Multi-color glow: [head, mid, tail] — e.g. ["#EE6C29", "#FF6EA8", "#7848FF"] */
  glowColors?: [string, string, string];
  dashedColor?: string;
  /** Background color of the inner content area */
  backgroundColor?: string;
}

/**
 * A container with a dashed border and an animated glowing segment
 * that flows around the perimeter like a snake with a gradient fade tail.
 * Supports multi-color glow via glowColors prop.
 */
export function SnakeGlowBorder({
  children,
  borderRadius = 20,
  glowColor = "#EE6C29",
  glowColors,
  dashedColor = "rgba(255, 255, 255, 0.12)",
  backgroundColor = "transparent",
}: SnakeGlowBorderProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const offset = useSharedValue(0);

  // Resolve per-layer colors
  const headColor = glowColors?.[0] ?? glowColor;
  const midColor = glowColors?.[1] ?? glowColor;
  const tailColor = glowColors?.[2] ?? glowColor;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width === size.width && height === size.height) return;
    setSize({ width, height });

    const r = Math.min(borderRadius, width / 2, height / 2);
    const straightH = Math.max(0, width - 2 * r);
    const straightV = Math.max(0, height - 2 * r);
    const perimeter = 2 * (straightH + straightV) + 2 * Math.PI * r;

    offset.value = 0;
    offset.value = withRepeat(
      withTiming(-perimeter, { duration: 3500, easing: Easing.linear }),
      -1,
      false
    );
  };

  const strokeW = 2;
  const maxGlowStroke = 3.5;
  const inset = maxGlowStroke / 2;
  const w = size.width;
  const h = size.height;
  const r = Math.min(borderRadius, w / 2, h / 2);
  const straightH = Math.max(0, w - 2 * r);
  const straightV = Math.max(0, h - 2 * r);
  const perimeter = 2 * (straightH + straightV) + 2 * Math.PI * r;

  // Longer trail segments for a more dramatic glow
  const headLen = 40;
  const midLen = 80;
  const tailLen = 140;

  const headAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));
  const midAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value + headLen,
  }));
  const tailAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value + midLen,
  }));

  const baseRectProps = {
    x: inset,
    y: inset,
    width: w - maxGlowStroke,
    height: h - maxGlowStroke,
    rx: r,
    ry: r,
    fill: "none" as const,
    strokeLinecap: "round" as const,
  };

  return (
    <View onLayout={onLayout} style={[styles.container, { borderRadius }]}>
      {/* Background fill */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor, borderRadius }]} />

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* SVG overlay */}
      {w > 0 && h > 0 && (
        <Svg
          width={w}
          height={h}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {/* Dashed border */}
          <Rect
            x={inset}
            y={inset}
            width={w - maxGlowStroke}
            height={h - maxGlowStroke}
            rx={r}
            ry={r}
            stroke={dashedColor}
            strokeWidth={strokeW}
            strokeDasharray="8,6"
            fill="none"
          />

          {/* Animated glow — 3 layers with different colors for gradient trail */}
          {perimeter > 0 && (
            <>
              {/* Layer 3: Tail — faint purple trailing glow */}
              <AnimatedRect
                {...baseRectProps}
                stroke={tailColor}
                strokeWidth={2.5}
                strokeDasharray={`${tailLen},${perimeter - tailLen}`}
                animatedProps={tailAnimatedProps}
                opacity={0.3}
              />
              {/* Layer 2: Mid — medium pink glow */}
              <AnimatedRect
                {...baseRectProps}
                stroke={midColor}
                strokeWidth={3}
                strokeDasharray={`${midLen},${perimeter - midLen}`}
                animatedProps={midAnimatedProps}
                opacity={0.6}
              />
              {/* Layer 1: Head — bright orange leading edge */}
              <AnimatedRect
                {...baseRectProps}
                stroke={headColor}
                strokeWidth={maxGlowStroke}
                strokeDasharray={`${headLen},${perimeter - headLen}`}
                animatedProps={headAnimatedProps}
                opacity={1.0}
              />
            </>
          )}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  content: {
    padding: 2,
  },
});
