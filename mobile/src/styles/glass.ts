// Glass UI Design System - iOS-style
import { StyleSheet } from "react-native";

export const COLORS = {
  // Background
  background: "#141414",
  surface: "rgba(255,255,255,0.08)",
  surfaceHover: "rgba(255,255,255,0.12)",
  
  // Text
  textPrimary: "rgba(255,255,255,0.92)",
  textSecondary: "rgba(255,255,255,0.55)",
  textMuted: "rgba(255,255,255,0.35)",
  
  // Border
  border: "rgba(255,255,255,0.14)",
  borderLight: "rgba(255,255,255,0.08)",
  
  // Accent
  orange: "#D77A42",
  orangeLight: "rgba(215,122,66,0.15)",
};

export const BLUR_INTENSITY = 22;

export const glassStyles = StyleSheet.create({
  // Glass icon button (menu, info buttons)
  glassIconBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Small icon button
  glassIconBtnSmall: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  // Profile chip (rounded pill with avatar)
  profileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  
  avatarText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    fontSize: 14,
  },

  // Sheet/Modal styles
  sheet: {
    backgroundColor: "rgba(20,20,20,0.92)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  
  sheetHeader: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  
  sheetTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },

  // Card styles
  glassCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },

  // Row styles for settings
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  
  rowText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },
  
  rowRightText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  
  divider: {
    height: 1,
    backgroundColor: COLORS.borderLight,
    marginLeft: 16,
  },

  // FAB - Floating action button
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.orange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
});

// Hamburger bar dimensions
export const hamburgerStyles = StyleSheet.create({
  container: { 
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  bar: {
    height: 2,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.85)",
  },
  barTop: { width: 20 },
  barMid: { width: 14 },
  barBot: { width: 20 },
});
