/**
 * QRCodeDisplay — renders a wallet ID as a scannable QR code.
 * Uses react-native-qrcode-svg.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../styles/liquidGlass";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  label?: string;
}

export function QRCodeDisplay({ value, size = 180, label }: QRCodeDisplayProps) {
  return (
    <View style={styles.container}>
      <View style={styles.qrWrapper}>
        <QRCode
          value={value || "kvitt://wallet"}
          size={size}
          color={COLORS.jetDark}
          backgroundColor="#FFFFFF"
          ecl="H"
        />
      </View>
      {label && <Text style={styles.label}>{label}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: SPACING.md,
  },
  qrWrapper: {
    padding: SPACING.lg,
    backgroundColor: "#FFFFFF",
    borderRadius: RADIUS.xl,
  },
  label: {
    color: COLORS.text.muted,
    fontSize: TYPOGRAPHY.sizes.caption,
    fontWeight: TYPOGRAPHY.weights.medium,
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
