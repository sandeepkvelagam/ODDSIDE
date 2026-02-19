/**
 * QRCodeScanner — uses expo-camera to scan QR codes.
 * Calls onScan(data) when a QR code is detected.
 */
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../../styles/liquidGlass";

interface QRCodeScannerProps {
  onScan: (data: string) => void;
  onCancel: () => void;
}

const { width } = Dimensions.get("window");
const FRAME_SIZE = width * 0.65;

export function QRCodeScanner({ onScan, onCancel }: QRCodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Checking camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Ionicons name="camera-outline" size={48} color={COLORS.text.muted} />
        <Text style={styles.text}>Camera access required to scan QR codes</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.permBtn, { backgroundColor: "transparent", marginTop: 8 }]} onPress={onCancel}>
          <Text style={[styles.permBtnText, { color: COLORS.text.muted }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    // Extract wallet ID from kvitt://wallet/<id> or raw ID
    let walletId = data;
    if (data.startsWith("kvitt://wallet/")) {
      walletId = data.replace("kvitt://wallet/", "");
    }
    onScan(walletId);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top */}
        <View style={[styles.overlaySection, { flex: 1 }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.scanTitle}>Scan Wallet QR Code</Text>
          <Text style={styles.scanSubtitle}>Point camera at a Kvitt wallet QR code</Text>
        </View>

        {/* Middle row */}
        <View style={styles.middleRow}>
          <View style={[styles.overlaySection, { flex: 1 }]} />
          {/* Frame */}
          <View style={[styles.frame, { width: FRAME_SIZE, height: FRAME_SIZE }]}>
            {/* Corner brackets */}
            {[
              { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
              { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
              { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
              { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
            ].map((cornerStyle, idx) => (
              <View
                key={idx}
                style={[styles.corner, cornerStyle, { borderColor: COLORS.orange }]}
              />
            ))}
            {/* Scan line animation placeholder */}
            <View style={styles.scanLine} />
          </View>
          <View style={[styles.overlaySection, { flex: 1 }]} />
        </View>

        {/* Bottom */}
        <View style={[styles.overlaySection, { flex: 1, alignItems: "center", justifyContent: "center" }]}>
          {scanned && (
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={() => setScanned(false)}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <Text style={styles.rescanText}>Tap to Scan Again</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.jetDark,
    gap: SPACING.lg,
    padding: SPACING.container,
  },
  text: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.sizes.body,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 24,
  },
  permBtn: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
  },
  permBtnText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "column",
  },
  overlaySection: {
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: SPACING.container,
    paddingBottom: SPACING.lg,
  },
  cancelBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  scanTitle: {
    color: "#fff",
    fontSize: TYPOGRAPHY.sizes.heading3,
    fontWeight: TYPOGRAPHY.weights.bold,
    textAlign: "center",
    marginBottom: 4,
  },
  scanSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: TYPOGRAPHY.sizes.bodySmall,
    textAlign: "center",
  },
  middleRow: {
    flexDirection: "row",
  },
  frame: {
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
  },
  scanLine: {
    position: "absolute",
    top: "50%",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: COLORS.orange,
    opacity: 0.8,
  },
  rescanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
  },
  rescanText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.sizes.body,
    fontWeight: TYPOGRAPHY.weights.semiBold,
  },
});
