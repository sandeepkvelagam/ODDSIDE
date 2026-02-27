import { useState, useEffect } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Hook that listens to the device's "Reduce Motion" accessibility setting.
 * Returns `true` when the user has enabled reduced motion.
 *
 * Usage:
 * ```ts
 * const reduceMotion = useReducedMotion();
 * if (!reduceMotion) { startAnimation(); }
 * ```
 */
export function useReducedMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
