import 'package:flutter/material.dart';
import '../constants/colors.dart';

class AppTheme {
  AppTheme._();

  // Border radius matching web app (0.625rem = 10px)
  static const double borderRadius = 10.0;
  static const BorderRadius cardBorderRadius = BorderRadius.all(Radius.circular(10));

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,

      // Color Scheme
      colorScheme: const ColorScheme.light(
        primary: KvittColors.primary,
        onPrimary: KvittColors.white,
        secondary: KvittColors.charcoal,
        onSecondary: KvittColors.white,
        tertiary: KvittColors.info,
        surface: KvittColors.surface,
        onSurface: KvittColors.charcoal,
        error: KvittColors.error,
        onError: KvittColors.white,
      ),

      // Typography
      fontFamily: 'Inter',
      textTheme: const TextTheme(
        // Display
        displayLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: KvittColors.charcoal,
          letterSpacing: -0.5,
        ),
        displayMedium: TextStyle(
          fontSize: 28,
          fontWeight: FontWeight.bold,
          color: KvittColors.charcoal,
          letterSpacing: -0.5,
        ),

        // Headlines
        headlineLarge: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: KvittColors.charcoal,
        ),
        headlineMedium: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: KvittColors.charcoal,
        ),
        headlineSmall: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: KvittColors.charcoal,
        ),

        // Titles
        titleLarge: TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: KvittColors.charcoal,
        ),
        titleMedium: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: KvittColors.charcoal,
        ),
        titleSmall: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: KvittColors.charcoal,
        ),

        // Body
        bodyLarge: TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.normal,
          color: KvittColors.charcoal,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          color: KvittColors.gray,
        ),
        bodySmall: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.normal,
          color: KvittColors.gray,
        ),

        // Labels
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: KvittColors.charcoal,
        ),
        labelMedium: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: KvittColors.gray,
        ),
        labelSmall: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          color: KvittColors.lightGray,
          letterSpacing: 0.5,
        ),
      ),

      // App Bar
      appBarTheme: const AppBarTheme(
        backgroundColor: KvittColors.white,
        foregroundColor: KvittColors.charcoal,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: 'Inter',
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: KvittColors.charcoal,
        ),
      ),

      // Elevated Button (Primary)
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: KvittColors.primary,
          foregroundColor: KvittColors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Outlined Button (Secondary)
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: KvittColors.charcoal,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(borderRadius),
          ),
          side: const BorderSide(color: KvittColors.lightGray),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Text Button (Ghost)
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: KvittColors.primary,
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      // Input Decoration
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: KvittColors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(borderRadius),
          borderSide: const BorderSide(color: KvittColors.lightGray),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(borderRadius),
          borderSide: BorderSide(color: KvittColors.lightGray.withOpacity(0.5)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(borderRadius),
          borderSide: const BorderSide(color: KvittColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(borderRadius),
          borderSide: const BorderSide(color: KvittColors.error),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(borderRadius),
          borderSide: const BorderSide(color: KvittColors.error, width: 2),
        ),
        hintStyle: const TextStyle(color: KvittColors.lightGray),
        labelStyle: const TextStyle(color: KvittColors.gray),
      ),

      // Card
      cardTheme: CardTheme(
        color: KvittColors.white,
        elevation: 2,
        shadowColor: KvittColors.black.withOpacity(0.05),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
        margin: EdgeInsets.zero,
      ),

      // Bottom Navigation
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: KvittColors.white,
        indicatorColor: KvittColors.primary.withOpacity(0.1),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const TextStyle(
              fontFamily: 'Inter',
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: KvittColors.primary,
            );
          }
          return const TextStyle(
            fontFamily: 'Inter',
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: KvittColors.gray,
          );
        }),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: KvittColors.primary, size: 24);
          }
          return const IconThemeData(color: KvittColors.gray, size: 24);
        }),
      ),

      // Dialog
      dialogTheme: DialogTheme(
        backgroundColor: KvittColors.white,
        elevation: 8,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius * 1.5),
        ),
        titleTextStyle: const TextStyle(
          fontFamily: 'Inter',
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: KvittColors.charcoal,
        ),
      ),

      // Bottom Sheet
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: KvittColors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),

      // Divider
      dividerTheme: DividerThemeData(
        color: KvittColors.lightGray.withOpacity(0.3),
        thickness: 1,
        space: 1,
      ),

      // Scaffold
      scaffoldBackgroundColor: KvittColors.background,

      // Snackbar
      snackBarTheme: SnackBarThemeData(
        backgroundColor: KvittColors.charcoal,
        contentTextStyle: const TextStyle(
          fontFamily: 'Inter',
          color: KvittColors.white,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,

      colorScheme: const ColorScheme.dark(
        primary: KvittColors.primary,
        onPrimary: KvittColors.white,
        secondary: KvittColors.cream,
        onSecondary: KvittColors.charcoal,
        surface: KvittColors.darkSurface,
        onSurface: KvittColors.cream,
        error: KvittColors.error,
        onError: KvittColors.white,
      ),

      fontFamily: 'Inter',
      scaffoldBackgroundColor: KvittColors.darkBackground,

      appBarTheme: const AppBarTheme(
        backgroundColor: KvittColors.darkSurface,
        foregroundColor: KvittColors.cream,
        elevation: 0,
        centerTitle: true,
      ),

      cardTheme: CardTheme(
        color: KvittColors.darkSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius),
        ),
      ),

      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: KvittColors.darkSurface,
        indicatorColor: KvittColors.primary.withOpacity(0.2),
      ),

      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: KvittColors.darkSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        ),
      ),

      dialogTheme: DialogTheme(
        backgroundColor: KvittColors.darkSurface,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(borderRadius * 1.5),
        ),
      ),
    );
  }
}
