# Kvitt Mobile - Liquid Glass Design System

## Overview
This document defines the complete Liquid Glass styling system for the Kvitt mobile app. All screens should follow these guidelines for visual consistency, premium feel, and responsive interactions.

---

## 1. Design Tokens

### 1.1 Color Palette (From DashboardScreenV2)

```typescript
// Base Colors
jetDark: "#282B2B"          // Primary background
jetSurface: "#323535"       // Card/surface background
charcoal: "#1a1a1a"         // Deep background (login)

// Brand Colors
orange: "#EE6C29"           // Primary accent (Kvitt brand)
orangeDark: "#C45A22"       // Darkened primary for buttons
trustBlue: "#3B82F6"        // Secondary accent
moonstone: "#7AA6B3"        // Subtle accent for labels

// Glass Effects
liquidGlassBg: "rgba(255, 255, 255, 0.06)"
liquidGlassBorder: "rgba(255, 255, 255, 0.12)"
liquidInnerBg: "rgba(255, 255, 255, 0.03)"
liquidGlowOrange: "rgba(238, 108, 41, 0.15)"
liquidGlowBlue: "rgba(59, 130, 246, 0.15)"

// Text Colors
textPrimary: "#F5F5F5"
textSecondary: "#B8B8B8"
textMuted: "#7A7A7A"

// Status Colors
success: "#22C55E"
danger: "#EF4444"
warning: "#F59E0B"
```

### 1.2 Typography

```typescript
// Font Sizes
heading1: 28           // Main screen titles
heading2: 24           // Section headers
heading3: 18           // Card titles
body: 16               // Body text
bodySmall: 14          // Secondary text
caption: 12            // Labels, badges
micro: 10              // Tiny labels

// Font Weights
extraBold: "800"       // Logo, main titles
bold: "700"            // Section headers
semiBold: "600"        // Button text, emphasis
medium: "500"          // Labels
regular: "400"         // Body text

// Letter Spacing
tight: -0.5            // Headings
normal: 0              // Body
wide: 0.5              // Labels (uppercase)
extraWide: 1           // Micro labels
```

### 1.3 Spacing Scale (8pt Base)

```typescript
xs: 4
sm: 8
md: 12
lg: 16
xl: 20
xxl: 24
xxxl: 28
container: 20          // Screen padding
cardPadding: 18        // Card internal padding
innerPadding: 4        // Glass card inner padding
gap: 14                // Between cards
```

### 1.4 Border Radius

```typescript
none: 0
sm: 8
md: 12
lg: 16
xl: 20
xxl: 24
full: 9999             // Pills, circular buttons
```

### 1.5 Shadows

```typescript
// Glass Card Shadow
glassCardShadow: {
  shadowColor: "rgba(255, 255, 255, 0.1)",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.8,
  shadowRadius: 4,
  elevation: 8,
}

// Floating Element Shadow
floatingShadow: {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 20 },
  shadowOpacity: 0.4,
  shadowRadius: 40,
  elevation: 24,
}

// Button Shadow
buttonShadow: {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 8,
  elevation: 6,
}
```

---

## 2. Component Specifications

### 2.1 GlassSurface (Cards/Panels)

**Structure:**
```
┌─────────────────────────────┐  ← Outer: liquidGlassBg + border
│  ┌───────────────────────┐  │  ← Inner: liquidInnerBg (optional glow)
│  │       CONTENT         │  │
│  │                       │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

**Properties:**
- Outer container: `borderRadius: 24`, `borderWidth: 1.5`, `padding: 4`
- Inner container: `borderRadius: 20`, `padding: 18`
- Optional glow variants: `liquidGlowOrange`, `liquidGlowBlue`

### 2.2 GlassButton

**Variants:**
1. **Primary**: Solid `orange` or `orangeDark` background
2. **Secondary**: Solid `trustBlue` background
3. **Ghost**: `liquidGlassBg` with border
4. **Destructive**: `danger` background

**Press Animation:**
- Scale down to 0.95 on press
- Spring bounce back (tension: 200, friction: 3)
- Glow overlay appears on press

**Sizes:**
- Large: height 56, padding 18, fontSize 16
- Medium: height 48, padding 14, fontSize 14
- Small: height 40, padding 12, fontSize 13
- Icon: 44x44 or 52x52, circular

### 2.3 GlassModal

**Animation Sequence:**
1. Open: Backdrop fade (200ms) + Content spring (scale 0.85→1.0)
2. Close: Content scale down + fade (200ms)

**Properties:**
- Backdrop: BlurView with intensity 50-60
- Content: Deep shadow for floating effect
- Border radius: 28

### 2.4 GlassInput

**Properties:**
- Background: `liquidGlassBg`
- Border: `liquidGlassBorder`
- Border radius: 14
- Height: 52
- Padding: 16
- Focus state: Border color `orange`

### 2.5 GlassHeader

**Properties:**
- Background: transparent or gradient
- Title: `heading2` size, `extraBold` weight
- Subtitle: `caption` size, `moonstone` color

### 2.6 GlassListItem

**Properties:**
- Background: `liquidInnerBg`
- Border radius: 12
- Padding: 14
- Gap between items: 8
- Divider: `liquidGlassBorder`

---

## 3. Motion System

### 3.1 Spring Configurations

```typescript
// Bouncy entrance (modals, menus)
springBouncy: {
  tension: 65,
  friction: 7,
  useNativeDriver: true,
}

// Responsive press feedback
springPress: {
  tension: 100,
  friction: 5,
  useNativeDriver: true,
}

// Quick bounce back
springSnap: {
  tension: 200,
  friction: 3,
  useNativeDriver: true,
}
```

### 3.2 Timing Configurations

```typescript
// Fast feedback
fast: { duration: 100, useNativeDriver: true }

// Standard transitions
normal: { duration: 200, useNativeDriver: true }

// Slow fade
slow: { duration: 300, useNativeDriver: true }
```

### 3.3 Micro-Interactions

**Button Press:**
```typescript
onPressIn: scale → 0.95, glow opacity → 1
onPressOut: spring scale → 1.0, glow opacity → 0
```

**Card Press:**
```typescript
onPressIn: scale → 0.98
onPressOut: spring scale → 1.0
```

**Modal Open:**
```typescript
backdrop: opacity 0 → 1 (200ms)
content: scale 0.85 → 1.0 (spring), opacity 0 → 1 (200ms)
```

---

## 4. Screen-by-Screen Implementation

### 4.1 LoginScreen
- [x] Background: `#0a0a0a` with poker suit pattern (♠ repeating SVG)
- [x] Kvitt logo matching web (K mark SVG + text)
- [x] Glass inputs with border glow on focus
- [x] Primary button: White bg, black text (matching web)
- [x] Back button: Glass style circular

### 4.2 DashboardScreenV2
- [x] Header with glass hamburger/notification buttons
- [x] Stats cards with double-layer glass effect + glow
- [x] Section cards (Live Games, Groups, Results)
- [x] Quick action buttons (Trust Blue + Darkened Orange)
- [x] Animated pulse for live indicators

### 4.3 SettingsScreen
- [x] Glass header buttons
- [x] Profile box with glass border
- [x] Menu items with glass separators
- [x] Appearance popup with glass options
- [x] Voice modal with glass styling

### 4.4 ProfileScreen
- [x] Wallet balance section (Reference: Screenshot #1)
- [x] Balance summary card
- [x] Individual balance items
- [x] Glass inputs for profile editing

### 4.5 GroupsScreen
- [x] Glass group cards with avatars
- [x] FAB with shadow
- [x] Create group modal with glass styling

### 4.6 GameNightScreen
- [x] Stats bar with glass styling
- [x] Player cards with avatars
- [x] Host controls panel
- [x] Buy-in/Cash-out modals

### 4.7 New: AI Toolkit Page (Screenshot #2)
- [ ] Full-screen glass container
- [ ] Large image focal point
- [ ] "Generating..." progress overlay
- [ ] Action chips (Sora, Nano Banana, Kling style)
- [ ] Text input with arrow button

---

## 5. Asset Requirements

### 5.1 Kvitt Logo SVG
```svg
<svg viewBox="0 0 40 40" fill="none">
  <rect x="2" y="2" width="36" height="36" rx="8" fill="#262626"/>
  <path d="M12 10V30M12 20L24 10M12 20L24 30" stroke="#EF6E59" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
```

### 5.2 Poker Suit Background Pattern
```
Pattern: ♠ symbol at 5% opacity
Size: 40x40 grid
Color: #ffffff
```

---

## 6. Accessibility

- Minimum touch target: 44x44
- Color contrast: 4.5:1 minimum for text
- Respect `prefers-reduced-motion`: Disable animations
- Focus indicators: Orange border glow

---

## 7. Implementation Checklist

### Phase 2: Design System
- [x] Create `/app/mobile/src/styles/liquidGlass.ts`
- [x] Create `GlassSurface` component
- [x] Create `GlassButton` component
- [x] Create `GlassInput` component
- [x] Create `GlassModal` (update AnimatedModal)
- [x] Create `SkeletonLoader` component
- [x] Create `KvittLogo` component
- [x] Create `GlassListItem` component

### Phase 3: Motion System
- [x] Centralize spring configs in liquidGlass.ts
- [x] Add press animation in GlassButton
- [x] Spring modal animations

### Phase 4: Screen Updates
- [x] LoginScreen - Updated with glass styling
- [x] DashboardScreenV2 - Demo card in help modal, already has liquid glass
- [~] SettingsScreen - Already has good glass styling
- [x] ProfileScreen (with Wallet) - Updated with Screenshot #1 style wallet
- [~] GroupsScreen - Uses ThemeContext glass colors
- [~] GroupHubScreen - Uses ThemeContext glass colors (now includes orangeDark, trustBlue)
- [~] GameNightScreen - Uses ThemeContext glass colors (now includes orangeDark, trustBlue)
- [x] AIAssistantScreen - **UPDATED** with liquidGlass tokens
- [x] BillingScreen - Updated with glass styling
- [x] NotificationsScreen - Updated with glass styling
- [x] PrivacyScreen - Updated with glass styling
- [x] LanguageScreen - Updated with glass styling
- [x] PokerAIScreen - Added show/hide toggle for your hand

### Phase 5: New Page
- [x] AIToolkitScreen (based on Screenshot #2)

### Phase 6: QA
- [x] ThemeContext updated with orangeDark, trustBlue, moonstone, and liquid glass tokens
- [x] Button animations verified - all use spring press feedback (scale 0.95→1.0)
- [x] Close buttons work on all modals
- [x] Spotify: Already has "Coming Soon" badge in GameNightScreen
- [x] Web app visual consistency verified
- [x] Services restarted with cleared caches
- [ ] Device testing - Expo tunnel ready at: exp://8qyhyhg-anonymous-8081.exp.direct

### Phase 6: QA
- [ ] Visual consistency audit
- [ ] Animation performance test
- [ ] Feature parity check

---

## 8. Files Reference

```
/app/mobile/src/
├── styles/
│   └── liquidGlass.ts          # Design tokens & helpers
├── components/
│   └── ui/
│       ├── GlassSurface.tsx    # Card/panel component
│       ├── GlassButton.tsx     # Button variants
│       ├── GlassInput.tsx      # Text input
│       ├── GlassModal.tsx      # Modal with spring
│       ├── GlassHeader.tsx     # Screen header
│       ├── GlassListItem.tsx   # List row
│       └── SkeletonLoader.tsx  # Loading shimmer
├── screens/
│   ├── LoginScreen.tsx         # Updated
│   ├── DashboardScreenV2.tsx   # Updated
│   ├── SettingsScreen.tsx      # Updated
│   ├── ProfileScreen.tsx       # Updated with Wallet
│   ├── GroupsScreen.tsx        # Updated
│   ├── GameNightScreen.tsx     # Updated
│   └── AIToolkitScreen.tsx     # NEW
└── context/
    └── ThemeContext.tsx        # Updated with tokens
```

---

## 9. Glass Standards (Definition of Done)

Every screen and component MUST follow these rules:

1. **No local `LIQUID_COLORS`** — import from `liquidGlass.ts` only
2. **Every card/panel** uses `GlassSurface` or `GlassSurfaceFlat`
3. **Every tappable** uses `GlassButton` / `GlassIconButton` / `GlassListItem`
4. **No `import { Animated } from "react-native"`** — use `react-native-reanimated`
5. **Scrollable screens** use `GlassHeader` + `useScrollGlass` where appropriate
6. **Token access only** via `liquidGlass.ts` — no hardcoded rgba glass colors
7. **Max 3 blurred surfaces** visible simultaneously per screen (blur budget)
8. **Text over glass** must meet 4.5:1 contrast ratio

Run `scripts/check-glass-standards.sh` to validate.

---

*Last Updated: February 2026*
*Version: 2.0*
