/**
 * Kvitt Mobile - Liquid Glass Design System
 * 
 * This file contains all design tokens for the Liquid Glass styling system.
 * Import these values to ensure visual consistency across all screens.
 */

// ===========================================
// COLOR PALETTE
// ===========================================

export const COLORS = {
  // Base Colors
  jetDark: "#282B2B",
  jetSurface: "#323535",
  charcoal: "#1a1a1a",
  deepBlack: "#0a0a0a",

  // Brand Colors
  orange: "#EE6C29",
  orangeDark: "#C45A22",
  trustBlue: "#3B82F6",
  moonstone: "#7AA6B3",

  // Glass Effects
  glass: {
    bg: "rgba(255, 255, 255, 0.06)",
    border: "rgba(255, 255, 255, 0.12)",
    inner: "rgba(255, 255, 255, 0.03)",
    glowOrange: "rgba(238, 108, 41, 0.15)",
    glowBlue: "rgba(59, 130, 246, 0.15)",
    glowGreen: "rgba(34, 197, 94, 0.15)",
    glowRed: "rgba(239, 68, 68, 0.15)",
    glowWarning: "rgba(245, 158, 11, 0.15)",
  },

  // Text Colors
  text: {
    primary: "#F5F5F5",
    secondary: "#B8B8B8",
    muted: "#7A7A7A",
    inverse: "#1a1a1a",
  },

  // Status Colors
  status: {
    success: "#22C55E",
    danger: "#EF4444",
    warning: "#F59E0B",
    info: "#3B82F6",
  },

  // Input Colors
  input: {
    bg: "rgba(255, 255, 255, 0.05)",
    border: "rgba(255, 255, 255, 0.1)",
    focusBorder: "#EE6C29",
    placeholder: "#666666",
  },
} as const;

// ===========================================
// TYPOGRAPHY
// ===========================================

export const TYPOGRAPHY = {
  // Font Sizes
  sizes: {
    heading1: 28,
    heading2: 24,
    heading3: 18,
    body: 16,
    bodySmall: 14,
    caption: 12,
    micro: 10,
  },

  // Font Weights
  weights: {
    regular: "400" as const,
    medium: "500" as const,
    semiBold: "600" as const,
    bold: "700" as const,
    extraBold: "800" as const,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    extraWide: 1,
  },

  // Line Heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.6,
  },
} as const;

// ===========================================
// SPACING (8pt Base)
// ===========================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  
  // Semantic spacing
  container: 20,      // Screen padding
  cardPadding: 18,    // Card internal padding
  innerPadding: 4,    // Glass card inner padding
  gap: 14,            // Between cards
  sectionGap: 16,     // Between sections
} as const;

// ===========================================
// BORDER RADIUS
// ===========================================

export const RADIUS = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  full: 9999,
} as const;

// ===========================================
// SHADOWS
// ===========================================

export const SHADOWS = {
  // Glass Card Shadow
  glassCard: {
    shadowColor: "rgba(255, 255, 255, 0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },

  // Floating Element Shadow (modals)
  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 24,
  },

  // Button Shadow
  button: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },

  // Subtle Shadow
  subtle: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
} as const;

// ===========================================
// ANIMATION CONFIGS
// ===========================================

export const ANIMATION = {
  // Spring Configurations
  spring: {
    // Bouncy entrance (modals, menus)
    bouncy: {
      tension: 65,
      friction: 7,
      useNativeDriver: true,
    },
    // Responsive press feedback
    press: {
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    },
    // Quick bounce back
    snap: {
      tension: 200,
      friction: 3,
      useNativeDriver: true,
    },
  },

  // Timing Configurations
  timing: {
    fast: { duration: 100, useNativeDriver: true },
    normal: { duration: 200, useNativeDriver: true },
    slow: { duration: 300, useNativeDriver: true },
  },

  // Scale Values
  scale: {
    pressed: 0.95,
    cardPressed: 0.98,
    modalStart: 0.85,
    normal: 1,
  },
} as const;

// ===========================================
// COMPONENT STYLES
// ===========================================

export const COMPONENT_STYLES = {
  // Glass Surface (Card/Panel)
  glassSurface: {
    outer: {
      backgroundColor: COLORS.glass.bg,
      borderColor: COLORS.glass.border,
      borderWidth: 1.5,
      borderRadius: RADIUS.xxl,
      padding: SPACING.innerPadding,
      ...SHADOWS.glassCard,
    },
    inner: {
      backgroundColor: COLORS.glass.inner,
      borderRadius: RADIUS.xl,
      padding: SPACING.cardPadding,
    },
  },

  // Glass Button
  glassButton: {
    base: {
      borderRadius: RADIUS.lg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexDirection: "row" as const,
      gap: SPACING.sm,
    },
    sizes: {
      large: {
        height: 56,
        paddingHorizontal: SPACING.cardPadding,
        fontSize: TYPOGRAPHY.sizes.body,
      },
      medium: {
        height: 48,
        paddingHorizontal: SPACING.lg,
        fontSize: TYPOGRAPHY.sizes.bodySmall,
      },
      small: {
        height: 40,
        paddingHorizontal: SPACING.md,
        fontSize: TYPOGRAPHY.sizes.caption,
      },
      icon: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.lg,
      },
      iconSmall: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.full,
      },
    },
    variants: {
      primary: {
        backgroundColor: COLORS.orange,
      },
      primaryDark: {
        backgroundColor: COLORS.orangeDark,
      },
      secondary: {
        backgroundColor: COLORS.trustBlue,
      },
      ghost: {
        backgroundColor: COLORS.glass.bg,
        borderWidth: 1.5,
        borderColor: COLORS.glass.border,
      },
      destructive: {
        backgroundColor: COLORS.status.danger,
      },
    },
  },

  // Glass Input
  glassInput: {
    container: {
      backgroundColor: COLORS.input.bg,
      borderColor: COLORS.input.border,
      borderWidth: 1,
      borderRadius: RADIUS.lg,
      height: 52,
      paddingHorizontal: SPACING.lg,
    },
    text: {
      color: COLORS.text.primary,
      fontSize: TYPOGRAPHY.sizes.body,
    },
    placeholder: {
      color: COLORS.input.placeholder,
    },
    focused: {
      borderColor: COLORS.input.focusBorder,
    },
  },

  // Glass Header
  glassHeader: {
    container: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      paddingHorizontal: SPACING.container,
      paddingVertical: SPACING.lg,
    },
  },

  // Glass List Item
  glassListItem: {
    container: {
      backgroundColor: COLORS.glass.inner,
      borderRadius: RADIUS.md,
      padding: SPACING.lg,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: SPACING.md,
    },
  },

  // Liquid Glass Popup (context menus, info popups)
  liquidGlassPopup: {
    container: {
      borderRadius: RADIUS.lg,
      borderWidth: 1.5,
      borderColor: COLORS.glass.border,
      overflow: "hidden" as const,
    },
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingVertical: 13,
      paddingHorizontal: SPACING.cardPadding,
      gap: SPACING.md,
    },
    blurIntensity: {
      dark: 80,
      light: 60,
    },
    backdrop: {
      dark: "rgba(0,0,0,0.25)",
      light: "rgba(0,0,0,0.1)",
    },
    glass: {
      dark: "rgba(40, 43, 43, 0.82)",
      light: "rgba(255, 255, 255, 0.88)",
    },
    shadow: {
      ...SHADOWS.floating,
    },
    stagger: {
      delay: 50,
      startDelay: 80,
    },
  },
} as const;

// ===========================================
// KVITT LOGO SVG PATH
// ===========================================

export const KVITT_LOGO = {
  viewBox: "0 0 40 40",
  background: {
    x: 2,
    y: 2,
    width: 36,
    height: 36,
    rx: 8,
    fill: "#262626",
  },
  kPath: {
    d: "M12 10V30M12 20L24 10M12 20L24 30",
    stroke: "#EF6E59",
    strokeWidth: 4,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  },
} as const;

// ===========================================
// BLUR CONFIG (for GlassSurface, GlassHeader)
// ===========================================

export const BLUR = {
  surface: {
    intensity: { dark: 20, light: 15, android: 10 },
    tint: { dark: "dark" as const, light: "light" as const },
    overlay: {
      dark: "rgba(40, 43, 43, 0.65)",
      light: "rgba(255, 255, 255, 0.55)",
    },
  },
  header: {
    maxIntensity: { dark: 25, light: 20 },
    scrollRange: 80, // px of scroll before header is fully glass
  },
  modal: {
    intensity: { dark: 50, light: 40 },
  },
  bottomSheet: {
    intensity: { dark: 30, light: 25 },
  },
} as const;

// ===========================================
// TINT PRESETS (for content-aware glass tinting)
// ===========================================

export const TINTS = {
  warmOrange: "rgba(238, 108, 41, 0.06)",
  coolBlue: "rgba(59, 130, 246, 0.06)",
  successGreen: "rgba(34, 197, 94, 0.06)",
  dangerRed: "rgba(239, 68, 68, 0.06)",
  neutral: "rgba(255, 255, 255, 0.03)",
} as const;

// ===========================================
// REANIMATED SPRING CONFIGS
// ===========================================

export const SPRINGS = {
  /** Bouncy entrance (modals, menus) */
  bouncy: { damping: 12, stiffness: 120, mass: 0.8 },
  /** Responsive press feedback */
  press: { damping: 8, stiffness: 200, mass: 0.5 },
  /** Quick bounce back */
  snap: { damping: 5, stiffness: 400, mass: 0.3 },
  /** Smooth layout transitions */
  layout: { damping: 14, stiffness: 150, mass: 0.6 },
} as const;

// ===========================================
// HEADER CONSTANTS
// ===========================================

export const HEADER = {
  height: 56,
  scrollRange: 80,
} as const;

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get a glass glow color based on variant
 */
export const getGlowColor = (variant: 'orange' | 'blue' | 'green' | 'red'): string => {
  const glowMap = {
    orange: COLORS.glass.glowOrange,
    blue: COLORS.glass.glowBlue,
    green: COLORS.glass.glowGreen,
    red: COLORS.glass.glowRed,
  };
  return glowMap[variant];
};

/**
 * Create a text style object
 */
export const createTextStyle = (
  size: keyof typeof TYPOGRAPHY.sizes,
  weight: keyof typeof TYPOGRAPHY.weights = 'regular',
  color: string = COLORS.text.primary
) => ({
  fontSize: TYPOGRAPHY.sizes[size],
  fontWeight: TYPOGRAPHY.weights[weight],
  color,
});

/**
 * Create glass surface style with optional glow
 */
export const createGlassSurfaceStyle = (glowVariant?: 'orange' | 'blue' | 'green' | 'red') => ({
  outer: {
    ...COMPONENT_STYLES.glassSurface.outer,
  },
  inner: {
    ...COMPONENT_STYLES.glassSurface.inner,
    ...(glowVariant && { backgroundColor: getGlowColor(glowVariant) }),
  },
});

/**
 * Theme-aware liquid colors.
 * Replaces the per-screen `const LIQUID_COLORS = {...}` + `const lc = isDark ? ...` pattern.
 *
 * Usage in screens:
 * ```ts
 * import { getThemedColors } from "../../styles/liquidGlass";
 * const { isDark, colors } = useTheme();
 * const lc = getThemedColors(isDark, colors);
 * ```
 */
export const getThemedColors = (isDark: boolean, themeColors: Record<string, string>) => {
  if (isDark) {
    return {
      jetDark: COLORS.jetDark,
      jetSurface: COLORS.jetSurface,
      orange: COLORS.orange,
      orangeDark: COLORS.orangeDark,
      trustBlue: COLORS.trustBlue,
      moonstone: COLORS.moonstone,
      liquidGlassBg: COLORS.glass.bg,
      liquidGlassBorder: COLORS.glass.border,
      liquidInnerBg: COLORS.glass.inner,
      liquidGlowOrange: COLORS.glass.glowOrange,
      liquidGlowBlue: COLORS.glass.glowBlue,
      glassBg: "rgba(255, 255, 255, 0.08)",
      glassBorder: COLORS.glass.border,
      textPrimary: COLORS.text.primary,
      textSecondary: COLORS.text.secondary,
      textMuted: COLORS.text.muted,
      success: COLORS.status.success,
      danger: COLORS.status.danger,
      warning: COLORS.status.warning,
    };
  }
  return {
    jetDark: themeColors.background ?? "#F5F3EF",
    jetSurface: themeColors.surface ?? "#FFFFFF",
    orange: COLORS.orange,
    orangeDark: COLORS.orangeDark,
    trustBlue: COLORS.trustBlue,
    moonstone: COLORS.moonstone,
    liquidGlassBg: "rgba(0, 0, 0, 0.04)",
    liquidGlassBorder: "rgba(0, 0, 0, 0.10)",
    liquidInnerBg: "rgba(0, 0, 0, 0.03)",
    liquidGlowOrange: COLORS.glass.glowOrange,
    liquidGlowBlue: COLORS.glass.glowBlue,
    glassBg: "rgba(0, 0, 0, 0.04)",
    glassBorder: "rgba(0, 0, 0, 0.10)",
    textPrimary: themeColors.textPrimary ?? "#1a1a1a",
    textSecondary: themeColors.textSecondary ?? "#666666",
    textMuted: themeColors.textMuted ?? "#999999",
    success: COLORS.status.success,
    danger: COLORS.status.danger,
    warning: COLORS.status.warning,
  };
};
