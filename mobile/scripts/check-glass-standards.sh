#!/bin/bash
# Glass Standards Checker
# Run from /app/mobile: bash scripts/check-glass-standards.sh
# Returns non-zero exit code if violations found (suitable for CI).

set -e

ERRORS=0
WARNINGS=0
SRC="src"

echo "=== Liquid Glass Standards Check ==="
echo ""

# 1. No local LIQUID_COLORS definitions outside liquidGlass.ts
echo "--- Check 1: No local LIQUID_COLORS definitions ---"
VIOLATIONS=$(grep -rn "const LIQUID_COLORS" "$SRC" --include="*.tsx" --include="*.ts" | grep -v "liquidGlass.ts" || true)
if [ -n "$VIOLATIONS" ]; then
  echo "FAIL: Local LIQUID_COLORS found (import from liquidGlass.ts instead):"
  echo "$VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo "PASS"
fi
echo ""

# 2. No import { Animated } from "react-native" in components/ui/
echo "--- Check 2: No RN Animated in Glass components ---"
VIOLATIONS=$(grep -rn 'import.*{.*Animated.*}.*from.*"react-native"' "$SRC/components/ui/" --include="*.tsx" --include="*.ts" || true)
if [ -n "$VIOLATIONS" ]; then
  echo "FAIL: Legacy Animated API used in Glass components (use react-native-reanimated):"
  echo "$VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo "PASS"
fi
echo ""

# 3. No RN Animated in shared components (AnimatedModal, BottomSheetScreen)
echo "--- Check 3: No RN Animated in shared components ---"
VIOLATIONS=$(grep -rn 'import.*{.*Animated.*}.*from.*"react-native"' "$SRC/components/AnimatedModal.tsx" "$SRC/components/BottomSheetScreen.tsx" 2>/dev/null || true)
if [ -n "$VIOLATIONS" ]; then
  echo "FAIL: Legacy Animated API in shared components:"
  echo "$VIOLATIONS"
  ERRORS=$((ERRORS + 1))
else
  echo "PASS"
fi
echo ""

# 4. Warn on RN Animated in screen files (migration in progress)
echo "--- Check 4: RN Animated in screens (warnings) ---"
VIOLATIONS=$(grep -rn 'import.*{.*Animated.*}.*from.*"react-native"' "$SRC/screens/" --include="*.tsx" || true)
if [ -n "$VIOLATIONS" ]; then
  COUNT=$(echo "$VIOLATIONS" | wc -l | xargs)
  echo "WARN: $COUNT screen files still use legacy Animated API:"
  echo "$VIOLATIONS"
  WARNINGS=$((WARNINGS + COUNT))
else
  echo "PASS"
fi
echo ""

# 5. Warn on hardcoded glass rgba patterns in screen files
echo "--- Check 5: Hardcoded glass rgba in screens (warnings) ---"
VIOLATIONS=$(grep -rn 'rgba(255, 255, 255, 0\.0[36])' "$SRC/screens/" --include="*.tsx" || true)
if [ -n "$VIOLATIONS" ]; then
  COUNT=$(echo "$VIOLATIONS" | wc -l | xargs)
  echo "WARN: $COUNT hardcoded glass rgba values (use COLORS.glass.* tokens):"
  echo "$VIOLATIONS"
  WARNINGS=$((WARNINGS + COUNT))
else
  echo "PASS"
fi
echo ""

# Summary
echo "=== Summary ==="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "FAILED: Fix $ERRORS error(s) before committing."
  exit 1
fi

if [ "$WARNINGS" -gt 0 ]; then
  echo ""
  echo "PASSED with $WARNINGS warning(s). Resolve during migration sweep."
fi

echo ""
echo "All standards checks passed."
exit 0
