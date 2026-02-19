import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";

type ThemeContextType = {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof LIGHT_COLORS;
};

// Light theme colors - aligned with web (frontend/src/index.css)
export const LIGHT_COLORS = {
  background: "#F5F3EF",      // Web: hsl(40, 20%, 97%) - cream
  surface: "#FFFFFF",          // Web: card white
  inputBg: "#FFFFFF",
  glassBg: "rgba(0, 0, 0, 0.04)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
  // Enhanced liquid glass card styles
  glassCardBg: "rgba(255, 255, 255, 0.75)",
  glassCardBorder: "rgba(255, 255, 255, 0.6)",
  liquidGlassBg: "rgba(0, 0, 0, 0.04)",
  liquidGlassInner: "rgba(0, 0, 0, 0.02)",
  liquidGlowOrange: "rgba(238, 108, 41, 0.15)",
  liquidGlowBlue: "rgba(59, 130, 246, 0.15)",
  textPrimary: "#333333",      // Web: hsl(0, 0%, 20%)
  textSecondary: "#5c5c5c",
  textMuted: "#737373",        // Web: hsl(0, 0%, 45%)
  border: "rgba(0, 0, 0, 0.06)",
  orange: "#EE6C29",           // Kvitt primary orange
  orangeDark: "#C45A22",       // Darkened orange for buttons
  trustBlue: "#3B82F6",        // Trust blue accent
  moonstone: "#7AA6B3",        // Subtle accent for labels
  popupBg: "#FFFFFF",
  danger: "#EF4444",           // Status danger
  buttonBg: "#262626",         // Web: charcoal
  buttonDisabled: "#9a9a9a",
  success: "#22C55E",          // Status success
  warning: "#F59E0B",          // Status warning
  // Dashboard & Drawer specific
  contentBg: "#F5F3EF",        // Match background
  navBg: "#EBE8E3",            // Slightly darker cream for nav
  profileBg: "#FFFFFF",
  jetDark: "#F5F3EF",          // Light version
  jetSurface: "#FFFFFF",
};

// Dark theme colors - aligned with web (frontend/src/index.css) and Liquid Glass design system
export const DARK_COLORS = {
  background: "#1a1a1a",       // Web: hsl(0, 0%, 10%)
  surface: "#212121",          // Web: hsl(0, 0%, 13%) - card
  inputBg: "#2a2a2a",
  glassBg: "rgba(255, 255, 255, 0.06)",
  glassBorder: "rgba(255, 255, 255, 0.12)",
  // Enhanced liquid glass card styles
  glassCardBg: "rgba(255, 255, 255, 0.06)",
  glassCardBorder: "rgba(255, 255, 255, 0.12)",
  liquidGlassBg: "rgba(255, 255, 255, 0.06)",
  liquidGlassInner: "rgba(255, 255, 255, 0.03)",
  liquidGlowOrange: "rgba(238, 108, 41, 0.15)",
  liquidGlowBlue: "rgba(59, 130, 246, 0.15)",
  textPrimary: "#F5F5F5",      // Brighter for better contrast
  textSecondary: "#B8B8B8",    // Lighter secondary
  textMuted: "#7A7A7A",
  border: "rgba(255, 255, 255, 0.08)",
  orange: "#EE6C29",           // Kvitt primary orange
  orangeDark: "#C45A22",       // Darkened orange for buttons
  trustBlue: "#3B82F6",        // Trust blue accent
  moonstone: "#7AA6B3",        // Subtle accent for labels
  popupBg: "#282B2B",
  danger: "#EF4444",           // Status danger
  buttonBg: "#ffffff",
  buttonDisabled: "#555555",
  success: "#22C55E",          // Status success
  warning: "#F59E0B",          // Status warning
  // Dashboard & Drawer specific
  contentBg: "#1a1a1a",
  navBg: "#141414",            // Slightly darker for nav
  profileBg: "#2a2826",
  jetDark: "#282B2B",          // Primary background
  jetSurface: "#323535",       // Card/surface background
};

// Spacing constants - consistent breathing room across the app
export const SPACING = {
  padding: 28,           // Container padding
  gap: 18,               // Gap between elements
  lineHeight: 1.6,       // Text line height multiplier
  breathingRoom: 28,     // Vertical breathing room between sections
  cardPadding: 24,       // Card internal padding
  sectionGap: 28,        // Gap between major sections
  elementGap: 18,        // Gap between elements within sections
  touchTarget: 44,       // Minimum touch target size
};

const THEME_STORAGE_KEY = "@kvitt_theme_mode";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");

  // Load saved theme preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedMode) => {
      if (savedMode && ["light", "dark", "system"].includes(savedMode)) {
        setThemeModeState(savedMode as ThemeMode);
      }
    });
  }, []);

  // Save theme preference when changed
  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  };

  // Determine if dark mode based on theme mode and system preference
  const isDark = themeMode === "system"
    ? systemColorScheme === "dark"
    : themeMode === "dark";

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  // Don't return null - always render with default system theme
  return (
    <ThemeContext.Provider value={{ themeMode, isDark, setThemeMode, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
