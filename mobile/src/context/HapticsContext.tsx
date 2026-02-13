import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

type HapticType = "light" | "medium" | "heavy" | "selection" | "success" | "warning" | "error";

type HapticsContextType = {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  triggerHaptic: (type?: HapticType) => void;
};

const HAPTICS_STORAGE_KEY = "@kvitt_haptics_enabled";

const HapticsContext = createContext<HapticsContextType | undefined>(undefined);

export function HapticsProvider({ children }: { children: ReactNode }) {
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(HAPTICS_STORAGE_KEY).then((saved) => {
      if (saved !== null) {
        setHapticsEnabledState(saved === "true");
      }
    });
  }, []);

  const setHapticsEnabled = (enabled: boolean) => {
    setHapticsEnabledState(enabled);
    AsyncStorage.setItem(HAPTICS_STORAGE_KEY, enabled.toString());
  };

  const triggerHaptic = (type: HapticType = "light") => {
    if (!hapticsEnabled) return;

    switch (type) {
      case "light":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case "medium":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case "heavy":
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case "selection":
        Haptics.selectionAsync();
        break;
      case "success":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case "warning":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "error":
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
    }
  };

  return (
    <HapticsContext.Provider value={{ hapticsEnabled, setHapticsEnabled, triggerHaptic }}>
      {children}
    </HapticsContext.Provider>
  );
}

export function useHaptics() {
  const context = useContext(HapticsContext);
  if (!context) {
    throw new Error("useHaptics must be used within HapticsProvider");
  }
  return context;
}
