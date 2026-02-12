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
  textPrimary: "#333333",      // Web: hsl(0, 0%, 20%)
  textSecondary: "#5c5c5c",
  textMuted: "#737373",        // Web: hsl(0, 0%, 45%)
  border: "rgba(0, 0, 0, 0.06)",
  orange: "#EF6E59",           // Web: hsl(14, 85%, 58%) - Kvitt primary
  popupBg: "#FFFFFF",
  danger: "#DC2626",           // Web: hsl(0, 84%, 55%)
  buttonBg: "#262626",         // Web: charcoal
  buttonDisabled: "#9a9a9a",
  success: "#16A34A",          // Web: hsl(142, 76%, 36%)
  // Dashboard & Drawer specific
  contentBg: "#F5F3EF",        // Match background
  navBg: "#EBE8E3",            // Slightly darker cream for nav
  profileBg: "#FFFFFF",
};

// Dark theme colors - aligned with web (frontend/src/index.css)
export const DARK_COLORS = {
  background: "#1a1a1a",       // Web: hsl(0, 0%, 10%)
  surface: "#212121",          // Web: hsl(0, 0%, 13%) - card
  inputBg: "#2a2a2a",
  glassBg: "rgba(255, 255, 255, 0.05)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  textPrimary: "#F2F2F2",      // Web: hsl(0, 0%, 95%)
  textSecondary: "#A6A6A6",    // Web: hsl(0, 0%, 65%)
  textMuted: "#666666",
  border: "rgba(255, 255, 255, 0.06)",
  orange: "#EF6E59",           // Web: same primary orange
  popupBg: "#212121",
  danger: "#DC2626",           // Web: hsl(0, 62%, 50%)
  buttonBg: "#ffffff",
  buttonDisabled: "#555555",
  success: "#16A34A",          // Web: success green
  // Dashboard & Drawer specific
  contentBg: "#1a1a1a",
  navBg: "#141414",            // Slightly darker for nav
  profileBg: "#2a2826",
};

const THEME_STORAGE_KEY = "@kvitt_theme_mode";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved theme preference
  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((savedMode) => {
      if (savedMode && ["light", "dark", "system"].includes(savedMode)) {
        setThemeModeState(savedMode as ThemeMode);
      }
      setIsLoaded(true);
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

  if (!isLoaded) {
    return null; // Or a loading spinner
  }

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
