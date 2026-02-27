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
  dashedColor?: string;
  /** Background color of the inner content area */
  backgroundColor?: string;
}

/**
 * A container with a dashed border and an animated glowing segment
 * that flows around the perimeter like a snake.
 */
export function SnakeGlowBorder({
  children,
  borderRadius = 20,
  glowColor = "#EE6C29",
  dashedColor = "rgba(255, 255, 255, 0.12)",
  backgroundColor = "transparent",
}: SnakeGlowBorderProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const offset = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width === size.width && height === size.height) return;
    setSize({ width, height });

    // Calculate perimeter of rounded rectangle
    const r = Math.min(borderRadius, width / 2, height / 2);
    const straightH = Math.max(0, width - 2 * r);
    const straightV = Math.max(0, height - 2 * r);
    const perimeter = 2 * (straightH + straightV) + 2 * Math.PI * r;

    // Start the snake animation
    offset.value = 0;
    offset.value = withRepeat(
      withTiming(-perimeter, { duration: 3500, easing: Easing.linear }),
      -1,
      false
    );
  };

  const strokeW = 2;
  const glowStrokeW = 2.5;
  const inset = glowStrokeW / 2;
  const w = size.width;
  const h = size.height;
  const r = Math.min(borderRadius, w / 2, h / 2);
  const straightH = Math.max(0, w - 2 * r);
  const straightV = Math.max(0, h - 2 * r);
  const perimeter = 2 * (straightH + straightV) + 2 * Math.PI * r;
  const glowLength = 80;

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <View onLayout={onLayout} style={[styles.container, { borderRadius }]}>
      {/* Background fill */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor, borderRadius }]} />

      {/* Content */}
      <View style={styles.content}>{children}</View>

      {/* SVG overlay for borders - positioned above content visually but non-interactive */}
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
            width={w - glowStrokeW}
            height={h - glowStrokeW}
            rx={r}
            ry={r}
            stroke={dashedColor}
            strokeWidth={strokeW}
            strokeDasharray="8,6"
            fill="none"
          />

          {/* Animated glow segment */}
          {perimeter > 0 && (
            <AnimatedRect
              x={inset}
              y={inset}
              width={w - glowStrokeW}
              height={h - glowStrokeW}
              rx={r}
              ry={r}
              stroke={glowColor}
              strokeWidth={glowStrokeW}
              strokeDasharray={`${glowLength},${perimeter - glowLength}`}
              animatedProps={animatedProps}
              fill="none"
              strokeLinecap="round"
              opacity={0.7}
            />
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
    // Padding so content doesn't overlap the border stroke
    padding: 2,
  },
});
