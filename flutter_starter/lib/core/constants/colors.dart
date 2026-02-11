import 'package:flutter/material.dart';

/// Kvitt Design System Colors
/// Matching the React web app design tokens from tailwind.config.js
class KvittColors {
  KvittColors._();

  // Primary - Kvitt Orange
  static const Color primary = Color(0xFFEF6E59);
  static const Color primaryLight = Color(0xFFF5A99B);
  static const Color primaryDark = Color(0xFFD94D35);

  // Neutrals
  static const Color charcoal = Color(0xFF262626);
  static const Color darkGray = Color(0xFF404040);
  static const Color gray = Color(0xFF737373);
  static const Color lightGray = Color(0xFFA3A3A3);
  static const Color cream = Color(0xFFF5F3EF);
  static const Color white = Color(0xFFFFFFFF);
  static const Color black = Color(0xFF000000);

  // Semantic Colors
  static const Color success = Color(0xFF22C55E);
  static const Color successLight = Color(0xFFDCFCE7);
  static const Color warning = Color(0xFFF59E0B);
  static const Color warningLight = Color(0xFFFEF3C7);
  static const Color error = Color(0xFFEF4444);
  static const Color errorLight = Color(0xFFFEE2E2);
  static const Color info = Color(0xFF3B82F6);
  static const Color infoLight = Color(0xFFDBEAFE);

  // Game-specific
  static const Color profit = Color(0xFF22C55E);
  static const Color loss = Color(0xFFEF4444);
  static const Color neutral = Color(0xFF737373);

  // Backgrounds
  static const Color background = cream;
  static const Color surface = white;
  static const Color surfaceVariant = Color(0xFFF9FAFB);

  // Dark mode
  static const Color darkBackground = Color(0xFF0F0F0F);
  static const Color darkSurface = Color(0xFF1A1A1A);
  static const Color darkSurfaceVariant = Color(0xFF262626);

  // Gradients (for premium/special UI)
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, Color(0xFFF59E0B)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient darkGradient = LinearGradient(
    colors: [charcoal, Color(0xFF1A1A1A)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );
}
