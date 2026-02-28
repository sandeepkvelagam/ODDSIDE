import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Path } from "react-native-svg";
import { COLORS, TYPOGRAPHY, SPACING } from "../../styles/liquidGlass";

interface KvittLogoProps {
  size?: "small" | "default" | "large";
  showText?: boolean;
  showTagline?: boolean;
}

/**
 * KvittLogo - Official Kvitt branding component
 * Matches the web app Logo component exactly
 */
export function KvittLogo({
  size = "default",
  showText = true,
  showTagline = false,
}: KvittLogoProps) {
  const sizes = {
    small: { icon: 24, text: 18, tagline: 10, gap: 4 },
    default: { icon: 28, text: 22, tagline: 11, gap: 6 },
    large: { icon: 40, text: 28, tagline: 12, gap: 8 },
  };

  const { icon, text, tagline, gap } = sizes[size];

  return (
    <View style={[styles.container, { gap }]}>
      {/* Kvitt Logo Mark */}
      <Svg width={icon} height={icon} viewBox="0 0 40 40">
        {/* Rounded square background */}
        <Rect
          x="2"
          y="2"
          width="36"
          height="36"
          rx="8"
          fill="#262626"
        />
        {/* K letter stylized */}
        <Path
          d="M12 10V30M12 20L24 10M12 20L24 30"
          stroke="#EF6E59"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>

      {/* Text */}
      {showText && (
        <View>
          <Text style={[styles.logoText, { fontSize: text }]}>Kvitt</Text>
          {showTagline && (
            <Text style={[styles.tagline, { fontSize: tagline }]}>
              Play <Text style={styles.taglineAccent}>smarter.</Text>
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoText: {
    color: COLORS.text.primary,
    fontWeight: TYPOGRAPHY.weights.extraBold,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  tagline: {
    color: COLORS.text.muted,
    marginTop: 2,
  },
  taglineAccent: {
    color: COLORS.orange,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});
