import {
  useSharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";
import type { SharedValue } from "react-native-reanimated";

interface UseScrollGlassReturn {
  /** Pass this to GlassHeader's scrollY prop */
  scrollY: SharedValue<number>;
  /** Attach this to Animated.ScrollView's onScroll prop */
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
}

/**
 * useScrollGlass - Reusable hook for scroll-aware glass effects
 *
 * Usage:
 * ```tsx
 * const { scrollY, scrollHandler } = useScrollGlass();
 * return (
 *   <>
 *     <GlassHeader scrollY={scrollY} title="Dashboard" />
 *     <Animated.ScrollView onScroll={scrollHandler} scrollEventThrottle={16}>
 *       ...
 *     </Animated.ScrollView>
 *   </>
 * );
 * ```
 */
export function useScrollGlass(): UseScrollGlassReturn {
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });
  return { scrollY, scrollHandler };
}
