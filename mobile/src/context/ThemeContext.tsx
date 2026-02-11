import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useColorScheme, Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

type ThemeMode = "light" | "dark" | "system";

type ThemeContextType = {
  themeMode: ThemeMode;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  colors: typeof LIGHT_COLORS;
};

// Light theme colors
export const LIGHT_COLORS = {
  background: "#e8e4de",
  surface: "#f7f5f2",
  inputBg: "#ffffff",
  glassBg: "rgba(0, 0, 0, 0.04)",
  glassBorder: "rgba(0, 0, 0, 0.08)",
  textPrimary: "#1a1a1a",
  textSecondary: "#5c5c5c",
  textMuted: "#8c8c8c",
  border: "rgba(0, 0, 0, 0.06)",
  orange: "#e8845c",
  popupBg: "#ffffff",
  danger: "#b91c1c",
  buttonBg: "#1a1a1a",
  buttonDisabled: "#9a9a9a",
  // Dashboard & Drawer specific
  contentBg: "#f7f5f2",
  navBg: "#ece7e1",
  profileBg: "#ffffff",
};

// Dark theme colors
export const DARK_COLORS = {
  background: "#0a0a0a",
  surface: "#1a1a1a",
  inputBg: "#2a2a2a",
  glassBg: "rgba(255, 255, 255, 0.05)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  textPrimary: "#ffffff",
  textSecondary: "#9a9a9a",
  textMuted: "#666666",
  border: "rgba(255, 255, 255, 0.06)",
  orange: "#e8845c",
  popupBg: "#2a2a2a",
  danger: "#ef4444",
  buttonBg: "#ffffff",
  buttonDisabled: "#555555",
  // Dashboard & Drawer specific
  contentBg: "#1a1a1a",
  navBg: "#0c0c0c",
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
