# Kvitt Flutter Migration Guide

> Complete step-by-step guide to migrate from React Native to Flutter while keeping the React web app.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Prerequisites & Environment Setup](#2-prerequisites--environment-setup)
3. [Project Structure](#3-project-structure)
4. [Step-by-Step Implementation](#4-step-by-step-implementation)
5. [Converting React Pages to Flutter](#5-converting-react-pages-to-flutter)
6. [API Integration](#6-api-integration)
7. [WebSocket Integration](#7-websocket-integration)
8. [Design System](#8-design-system)
9. [State Management with Riverpod](#9-state-management-with-riverpod)
10. [Hosting & Deployment](#10-hosting--deployment)
11. [Testing](#11-testing)
12. [Timeline & Milestones](#12-timeline--milestones)

---

## 1. Executive Summary

### What You're Building
- **Flutter mobile apps** for iOS and Android
- **Keep React web app** (it works, good SEO)
- **Share the FastAPI backend** (100% reusable)

### Current Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        CURRENT STATE                         │
├─────────────────────────────────────────────────────────────┤
│  React Web App          │  React Native (BROKEN)            │
│  ✅ 13 pages            │  ❌ Missing ThemeContext          │
│  ✅ 30+ UI components   │  ❌ No state management           │
│  ✅ 12,000 LOC          │  ❌ Read-only stubs               │
│  ✅ Full features       │  ❌ ~2,000 LOC incomplete         │
├─────────────────────────────────────────────────────────────┤
│                    FastAPI Backend                           │
│  ✅ 71+ REST endpoints  │  ✅ Socket.IO WebSocket           │
│  ✅ MongoDB + Supabase  │  ✅ Stripe payments               │
└─────────────────────────────────────────────────────────────┘
```

### Target Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                        TARGET STATE                          │
├─────────────────────────────────────────────────────────────┤
│  React Web App          │  Flutter Mobile App               │
│  (unchanged)            │  iOS + Android from 1 codebase    │
│  ✅ Keep as-is          │  ✅ Full feature parity           │
├─────────────────────────────────────────────────────────────┤
│                    FastAPI Backend                           │
│              (unchanged - 100% reusable)                     │
└─────────────────────────────────────────────────────────────┘
```

### Timeline Summary
| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Setup | 1 week | Project scaffold, packages, theme |
| Auth | 1 week | Login, signup, session management |
| Core Features | 4 weeks | Groups, GameNight, Settlement |
| Polish | 2 weeks | Dashboard, profile, testing |
| **Total MVP** | **8 weeks** | Usable poker game app |

---

## 2. Prerequisites & Environment Setup

### 2.1 Install Flutter

#### macOS
```bash
# Install via Homebrew (recommended)
brew install --cask flutter

# Or download manually from https://docs.flutter.dev/get-started/install/macos

# Verify installation
flutter doctor
```

#### Windows
```powershell
# Download from https://docs.flutter.dev/get-started/install/windows
# Extract to C:\flutter
# Add C:\flutter\bin to PATH

# Verify
flutter doctor
```

#### Linux
```bash
# Download from https://docs.flutter.dev/get-started/install/linux
sudo snap install flutter --classic

# Verify
flutter doctor
```

### 2.2 IDE Setup

#### VS Code (Recommended for beginners)
```bash
# Install extensions
code --install-extension Dart-Code.dart-code
code --install-extension Dart-Code.flutter
```

#### Android Studio
1. Download from https://developer.android.com/studio
2. Install Flutter and Dart plugins via Preferences > Plugins

### 2.3 Platform-Specific Setup

#### Android
```bash
# Install Android Studio (includes SDK)
# Accept licenses
flutter doctor --android-licenses
```

#### iOS (macOS only)
```bash
# Install Xcode from App Store
xcode-select --install
sudo xcodebuild -runFirstLaunch

# Install CocoaPods
sudo gem install cocoapods
```

### 2.4 Verify Everything
```bash
flutter doctor -v

# Should show:
# [✓] Flutter
# [✓] Android toolchain
# [✓] Xcode (macOS only)
# [✓] VS Code or Android Studio
```

---

## 3. Project Structure

### 3.1 Create New Flutter Project

```bash
# Create in a NEW directory (separate from your React app)
cd ~/projects  # or wherever you keep projects
flutter create kvitt_mobile --org com.kvitt --platforms android,ios

cd kvitt_mobile
```

### 3.2 Recommended Folder Structure

```
kvitt_mobile/
├── android/                    # Android-specific code
├── ios/                        # iOS-specific code
├── lib/                        # All Dart code goes here
│   ├── main.dart              # Entry point
│   ├── app.dart               # App configuration
│   │
│   ├── core/                  # Shared utilities
│   │   ├── constants/
│   │   │   ├── colors.dart    # Kvitt color palette
│   │   │   ├── typography.dart
│   │   │   └── api_endpoints.dart
│   │   ├── theme/
│   │   │   └── app_theme.dart
│   │   └── utils/
│   │       ├── formatters.dart
│   │       └── validators.dart
│   │
│   ├── data/                  # Data layer
│   │   ├── models/            # Dart classes matching API responses
│   │   │   ├── user.dart
│   │   │   ├── group.dart
│   │   │   ├── game.dart
│   │   │   ├── player.dart
│   │   │   ├── transaction.dart
│   │   │   └── settlement.dart
│   │   ├── repositories/      # Business logic + API calls
│   │   │   ├── auth_repository.dart
│   │   │   ├── groups_repository.dart
│   │   │   ├── games_repository.dart
│   │   │   └── payments_repository.dart
│   │   └── datasources/       # Raw HTTP/WebSocket clients
│   │       ├── api_client.dart
│   │       └── socket_client.dart
│   │
│   ├── features/              # Feature modules (main screens)
│   │   ├── auth/
│   │   │   ├── screens/
│   │   │   │   ├── login_screen.dart
│   │   │   │   └── signup_screen.dart
│   │   │   ├── widgets/
│   │   │   │   └── auth_form.dart
│   │   │   └── providers/
│   │   │       └── auth_provider.dart
│   │   │
│   │   ├── groups/
│   │   │   ├── screens/
│   │   │   │   ├── groups_list_screen.dart
│   │   │   │   ├── group_hub_screen.dart
│   │   │   │   └── create_group_screen.dart
│   │   │   ├── widgets/
│   │   │   │   ├── group_card.dart
│   │   │   │   └── member_list.dart
│   │   │   └── providers/
│   │   │       └── groups_provider.dart
│   │   │
│   │   ├── games/
│   │   │   ├── screens/
│   │   │   │   ├── game_night_screen.dart  # Most complex
│   │   │   │   └── settlement_screen.dart
│   │   │   ├── widgets/
│   │   │   │   ├── player_card.dart
│   │   │   │   ├── buy_in_dialog.dart
│   │   │   │   ├── cash_out_dialog.dart
│   │   │   │   ├── game_thread.dart
│   │   │   │   └── chip_counter.dart
│   │   │   └── providers/
│   │   │       ├── game_provider.dart
│   │   │       └── game_socket_provider.dart
│   │   │
│   │   ├── dashboard/
│   │   │   ├── screens/
│   │   │   │   └── dashboard_screen.dart
│   │   │   └── widgets/
│   │   │       ├── stats_card.dart
│   │   │       └── recent_games.dart
│   │   │
│   │   └── profile/
│   │       ├── screens/
│   │       │   ├── profile_screen.dart
│   │       │   └── settings_screen.dart
│   │       └── widgets/
│   │           └── badge_display.dart
│   │
│   └── shared/                # Reusable widgets
│       └── widgets/
│           ├── kvitt_button.dart
│           ├── kvitt_card.dart
│           ├── kvitt_dialog.dart
│           ├── kvitt_input.dart
│           ├── kvitt_avatar.dart
│           ├── loading_indicator.dart
│           └── error_view.dart
│
├── assets/                    # Static assets
│   ├── images/
│   │   └── logo.png
│   └── fonts/
│       ├── Inter-Regular.ttf
│       └── Inter-Bold.ttf
│
├── test/                      # Tests
│   ├── unit/
│   ├── widget/
│   └── integration/
│
├── pubspec.yaml              # Dependencies (like package.json)
└── .env                      # Environment variables
```

### 3.3 Install Dependencies

Edit `pubspec.yaml`:

```yaml
name: kvitt_mobile
description: Kvitt Poker Game Management
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter

  # State Management
  flutter_riverpod: ^2.5.1
  riverpod_annotation: ^2.3.5

  # Navigation
  go_router: ^14.2.7

  # Network
  dio: ^5.7.0
  socket_io_client: ^2.0.3+1

  # Authentication
  supabase_flutter: ^2.7.0
  flutter_secure_storage: ^9.2.2

  # UI
  flutter_svg: ^2.0.10+1
  cached_network_image: ^3.4.1
  shimmer: ^3.0.0

  # Utilities
  intl: ^0.19.0
  freezed_annotation: ^2.4.4
  json_annotation: ^4.9.0
  equatable: ^2.0.5

  # Payments (for premium)
  flutter_stripe: ^11.1.0

  # Storage
  shared_preferences: ^2.3.2
  hive_flutter: ^1.1.0

  # Icons
  lucide_icons: ^0.257.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^4.0.0
  build_runner: ^2.4.12
  freezed: ^2.5.7
  json_serializable: ^6.8.0
  riverpod_generator: ^2.4.3
  mocktail: ^1.0.4

flutter:
  uses-material-design: true

  assets:
    - assets/images/

  fonts:
    - family: Inter
      fonts:
        - asset: assets/fonts/Inter-Regular.ttf
        - asset: assets/fonts/Inter-Bold.ttf
          weight: 700
```

Install packages:
```bash
flutter pub get
```

---

## 4. Step-by-Step Implementation

### Phase 1: Foundation (Week 1)

#### Step 1.1: Environment Configuration

Create `lib/core/constants/env.dart`:
```dart
class Env {
  // Replace with your actual URLs
  static const String apiBaseUrl = 'https://your-backend.railway.app/api';
  static const String socketUrl = 'https://your-backend.railway.app';

  // Supabase config
  static const String supabaseUrl = 'https://your-project.supabase.co';
  static const String supabaseAnonKey = 'your-anon-key';
}
```

#### Step 1.2: Color System

Create `lib/core/constants/colors.dart`:
```dart
import 'package:flutter/material.dart';

/// Kvitt Design System Colors
/// Matching the React web app design tokens
class KvittColors {
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

  // Semantic
  static const Color success = Color(0xFF22C55E);
  static const Color warning = Color(0xFFF59E0B);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF3B82F6);

  // Game-specific
  static const Color profit = Color(0xFF22C55E);
  static const Color loss = Color(0xFFEF4444);
  static const Color neutral = Color(0xFF737373);

  // Background
  static const Color background = cream;
  static const Color surface = white;
  static const Color darkBackground = charcoal;
  static const Color darkSurface = Color(0xFF1A1A1A);
}
```

#### Step 1.3: Theme Configuration

Create `lib/core/theme/app_theme.dart`:
```dart
import 'package:flutter/material.dart';
import '../constants/colors.dart';

class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,

      // Colors
      colorScheme: ColorScheme.light(
        primary: KvittColors.primary,
        secondary: KvittColors.charcoal,
        surface: KvittColors.surface,
        background: KvittColors.background,
        error: KvittColors.error,
        onPrimary: KvittColors.white,
        onSecondary: KvittColors.white,
        onSurface: KvittColors.charcoal,
        onBackground: KvittColors.charcoal,
      ),

      // Typography
      fontFamily: 'Inter',
      textTheme: const TextTheme(
        displayLarge: TextStyle(
          fontSize: 32,
          fontWeight: FontWeight.bold,
          color: KvittColors.charcoal,
        ),
        headlineMedium: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.w600,
          color: KvittColors.charcoal,
        ),
        titleLarge: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: KvittColors.charcoal,
        ),
        bodyLarge: TextStyle(
          fontSize: 16,
          color: KvittColors.charcoal,
        ),
        bodyMedium: TextStyle(
          fontSize: 14,
          color: KvittColors.gray,
        ),
        labelLarge: TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          color: KvittColors.charcoal,
        ),
      ),

      // Component themes
      appBarTheme: const AppBarTheme(
        backgroundColor: KvittColors.white,
        foregroundColor: KvittColors.charcoal,
        elevation: 0,
        centerTitle: true,
      ),

      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: KvittColors.primary,
          foregroundColor: KvittColors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10), // 0.625rem = 10px
          ),
          textStyle: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),

      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: KvittColors.charcoal,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          side: const BorderSide(color: KvittColors.lightGray),
        ),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: KvittColors.white,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: KvittColors.lightGray),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: KvittColors.lightGray),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: KvittColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: KvittColors.error),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),

      cardTheme: CardTheme(
        color: KvittColors.white,
        elevation: 2,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
        ),
      ),

      scaffoldBackgroundColor: KvittColors.background,
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,

      colorScheme: ColorScheme.dark(
        primary: KvittColors.primary,
        secondary: KvittColors.cream,
        surface: KvittColors.darkSurface,
        background: KvittColors.darkBackground,
        error: KvittColors.error,
        onPrimary: KvittColors.white,
        onSecondary: KvittColors.charcoal,
        onSurface: KvittColors.cream,
        onBackground: KvittColors.cream,
      ),

      fontFamily: 'Inter',
      scaffoldBackgroundColor: KvittColors.darkBackground,
    );
  }
}
```

#### Step 1.4: Main App Entry Point

Create `lib/main.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'core/constants/env.dart';
import 'app.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Supabase
  await Supabase.initialize(
    url: Env.supabaseUrl,
    anonKey: Env.supabaseAnonKey,
  );

  runApp(
    const ProviderScope(
      child: KvittApp(),
    ),
  );
}
```

Create `lib/app.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme/app_theme.dart';
import 'core/router/app_router.dart';

class KvittApp extends ConsumerWidget {
  const KvittApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);

    return MaterialApp.router(
      title: 'Kvitt',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.darkTheme,
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
```

#### Step 1.5: Navigation Setup

Create `lib/core/router/app_router.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/signup_screen.dart';
import '../../features/dashboard/screens/dashboard_screen.dart';
import '../../features/groups/screens/groups_list_screen.dart';
import '../../features/groups/screens/group_hub_screen.dart';
import '../../features/games/screens/game_night_screen.dart';
import '../../features/games/screens/settlement_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/auth/providers/auth_provider.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authStateProvider);

  return GoRouter(
    initialLocation: '/login',
    redirect: (context, state) {
      final isAuthenticated = authState.valueOrNull != null;
      final isAuthRoute = state.matchedLocation == '/login' ||
                          state.matchedLocation == '/signup';

      if (!isAuthenticated && !isAuthRoute) {
        return '/login';
      }
      if (isAuthenticated && isAuthRoute) {
        return '/dashboard';
      }
      return null;
    },
    routes: [
      // Auth routes
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/signup',
        builder: (context, state) => const SignupScreen(),
      ),

      // Main app routes (with bottom nav shell)
      ShellRoute(
        builder: (context, state, child) => MainShell(child: child),
        routes: [
          GoRoute(
            path: '/dashboard',
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: '/groups',
            builder: (context, state) => const GroupsListScreen(),
            routes: [
              GoRoute(
                path: ':groupId',
                builder: (context, state) => GroupHubScreen(
                  groupId: state.pathParameters['groupId']!,
                ),
              ),
            ],
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),

      // Game routes (full screen, no bottom nav)
      GoRoute(
        path: '/games/:gameId',
        builder: (context, state) => GameNightScreen(
          gameId: state.pathParameters['gameId']!,
        ),
      ),
      GoRoute(
        path: '/games/:gameId/settlement',
        builder: (context, state) => SettlementScreen(
          gameId: state.pathParameters['gameId']!,
        ),
      ),
    ],
  );
});

/// Main shell with bottom navigation
class MainShell extends StatelessWidget {
  final Widget child;

  const MainShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: _calculateSelectedIndex(context),
        onDestinationSelected: (index) => _onItemTapped(index, context),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.group_outlined),
            selectedIcon: Icon(Icons.group),
            label: 'Groups',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outlined),
            selectedIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }

  int _calculateSelectedIndex(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    if (location.startsWith('/dashboard')) return 0;
    if (location.startsWith('/groups')) return 1;
    if (location.startsWith('/profile')) return 2;
    return 0;
  }

  void _onItemTapped(int index, BuildContext context) {
    switch (index) {
      case 0:
        context.go('/dashboard');
        break;
      case 1:
        context.go('/groups');
        break;
      case 2:
        context.go('/profile');
        break;
    }
  }
}
```

---

## 5. Converting React Pages to Flutter

### Page-by-Page Conversion Map

| React Page | Flutter Screen | Priority | Complexity |
|------------|----------------|----------|------------|
| `Login.jsx` | `login_screen.dart` | P0 | Low |
| `Signup.jsx` | `signup_screen.dart` | P0 | Low |
| `Dashboard.jsx` | `dashboard_screen.dart` | P1 | Medium |
| `Groups.jsx` | `groups_list_screen.dart` | P0 | Low |
| `GroupHub.jsx` | `group_hub_screen.dart` | P0 | Medium |
| `GameNight.jsx` | `game_night_screen.dart` | P0 | **High** |
| `Settlement.jsx` | `settlement_screen.dart` | P0 | Medium |
| `Profile.jsx` | `profile_screen.dart` | P2 | Low |
| `Premium.jsx` | `premium_screen.dart` | P2 | Medium |
| `GameHistory.jsx` | `game_history_screen.dart` | P2 | Low |
| `Landing.jsx` | *Skip - web only* | - | - |
| `Terms.jsx` | *Skip - web only* | - | - |
| `Privacy.jsx` | *Skip - web only* | - | - |

### 5.1 Login Screen

**React (Login.jsx pattern):**
```jsx
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const { signIn } = useAuth();

const handleSubmit = async (e) => {
  e.preventDefault();
  await signIn(email, password);
  navigate('/dashboard');
};
```

**Flutter equivalent (`lib/features/auth/screens/login_screen.dart`):**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/constants/colors.dart';
import '../../../shared/widgets/kvitt_button.dart';
import '../../../shared/widgets/kvitt_input.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await ref.read(authRepositoryProvider).signIn(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      if (mounted) {
        context.go('/dashboard');
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 60),

                // Logo
                Center(
                  child: Text(
                    'Kvitt',
                    style: Theme.of(context).textTheme.displayLarge?.copyWith(
                      color: KvittColors.primary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Center(
                  child: Text(
                    'Track your poker games',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ),

                const SizedBox(height: 60),

                // Error message
                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: KvittColors.error.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      _error!,
                      style: const TextStyle(color: KvittColors.error),
                    ),
                  ),

                // Email field
                KvittInput(
                  controller: _emailController,
                  label: 'Email',
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Email is required';
                    }
                    if (!value.contains('@')) {
                      return 'Enter a valid email';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // Password field
                KvittInput(
                  controller: _passwordController,
                  label: 'Password',
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Password is required';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),

                // Login button
                KvittButton(
                  onPressed: _isLoading ? null : _handleLogin,
                  isLoading: _isLoading,
                  child: const Text('Sign In'),
                ),
                const SizedBox(height: 16),

                // Sign up link
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Don't have an account? ",
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    GestureDetector(
                      onTap: () => context.go('/signup'),
                      child: Text(
                        'Sign up',
                        style: TextStyle(
                          color: KvittColors.primary,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

### 5.2 Groups List Screen

**Flutter (`lib/features/groups/screens/groups_list_screen.dart`):**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/colors.dart';
import '../providers/groups_provider.dart';
import '../widgets/group_card.dart';

class GroupsListScreen extends ConsumerWidget {
  const GroupsListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final groupsAsync = ref.watch(groupsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Groups'),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.plus),
            onPressed: () => _showCreateGroupDialog(context, ref),
          ),
        ],
      ),
      body: groupsAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(LucideIcons.alertCircle, size: 48, color: KvittColors.error),
              const SizedBox(height: 16),
              Text('Error loading groups: $error'),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => ref.invalidate(groupsProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
        data: (groups) {
          if (groups.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(LucideIcons.users, size: 64, color: KvittColors.lightGray),
                  const SizedBox(height: 16),
                  Text(
                    'No groups yet',
                    style: Theme.of(context).textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 8),
                  const Text('Create a group to get started'),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => _showCreateGroupDialog(context, ref),
                    icon: const Icon(LucideIcons.plus),
                    label: const Text('Create Group'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(groupsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: groups.length,
              itemBuilder: (context, index) {
                final group = groups[index];
                return GroupCard(
                  group: group,
                  onTap: () => context.go('/groups/${group.groupId}'),
                );
              },
            ),
          );
        },
      ),
    );
  }

  void _showCreateGroupDialog(BuildContext context, WidgetRef ref) {
    final nameController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Create Group'),
        content: TextField(
          controller: nameController,
          decoration: const InputDecoration(
            labelText: 'Group Name',
            hintText: 'e.g., Friday Night Poker',
          ),
          autofocus: true,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty) return;

              await ref.read(groupsProvider.notifier).createGroup(
                name: nameController.text.trim(),
              );
              if (context.mounted) {
                Navigator.pop(context);
              }
            },
            child: const Text('Create'),
          ),
        ],
      ),
    );
  }
}
```

### 5.3 Game Night Screen (Most Complex)

This is the most complex screen. Here's the structure:

**Flutter (`lib/features/games/screens/game_night_screen.dart`):**
```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../../core/constants/colors.dart';
import '../providers/game_provider.dart';
import '../providers/game_socket_provider.dart';
import '../widgets/player_card.dart';
import '../widgets/buy_in_dialog.dart';
import '../widgets/cash_out_dialog.dart';
import '../widgets/game_thread.dart';

class GameNightScreen extends ConsumerStatefulWidget {
  final String gameId;

  const GameNightScreen({super.key, required this.gameId});

  @override
  ConsumerState<GameNightScreen> createState() => _GameNightScreenState();
}

class _GameNightScreenState extends ConsumerState<GameNightScreen> {
  @override
  void initState() {
    super.initState();
    // Connect to WebSocket for real-time updates
    ref.read(gameSocketProvider(widget.gameId).notifier).connect();
  }

  @override
  Widget build(BuildContext context) {
    final gameAsync = ref.watch(gameProvider(widget.gameId));
    final socketState = ref.watch(gameSocketProvider(widget.gameId));

    // Listen for socket events and refresh game data
    ref.listen(gameSocketProvider(widget.gameId), (previous, next) {
      if (next.lastEvent != null) {
        ref.invalidate(gameProvider(widget.gameId));
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: gameAsync.when(
          data: (game) => Text(game.title ?? 'Game Night'),
          loading: () => const Text('Loading...'),
          error: (_, __) => const Text('Game Night'),
        ),
        leading: IconButton(
          icon: const Icon(LucideIcons.arrowLeft),
          onPressed: () => context.pop(),
        ),
        actions: [
          // Connection indicator
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Icon(
              socketState.isConnected ? LucideIcons.wifi : LucideIcons.wifiOff,
              color: socketState.isConnected ? KvittColors.success : KvittColors.error,
              size: 20,
            ),
          ),
          PopupMenuButton<String>(
            onSelected: (value) => _handleMenuAction(value, ref),
            itemBuilder: (context) => [
              const PopupMenuItem(value: 'add_player', child: Text('Add Player')),
              const PopupMenuItem(value: 'end_game', child: Text('End Game')),
              const PopupMenuItem(value: 'cancel', child: Text('Cancel Game')),
            ],
          ),
        ],
      ),
      body: gameAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(child: Text('Error: $error')),
        data: (game) {
          final players = game.players;
          final isActive = game.status == 'active';

          return Column(
            children: [
              // Game stats header
              Container(
                padding: const EdgeInsets.all(16),
                color: KvittColors.charcoal,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceAround,
                  children: [
                    _StatItem(
                      label: 'Pot',
                      value: '\$${game.totalPot.toStringAsFixed(0)}',
                    ),
                    _StatItem(
                      label: 'Players',
                      value: '${players.length}',
                    ),
                    _StatItem(
                      label: 'Buy-in',
                      value: '\$${game.buyInAmount.toStringAsFixed(0)}',
                    ),
                  ],
                ),
              ),

              // Players list
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: players.length,
                  itemBuilder: (context, index) {
                    final player = players[index];
                    return PlayerCard(
                      player: player,
                      isActive: isActive,
                      onBuyIn: () => _showBuyInDialog(context, ref, player),
                      onCashOut: () => _showCashOutDialog(context, ref, player),
                    );
                  },
                ),
              ),

              // Game thread / activity log
              if (game.thread.isNotEmpty)
                Container(
                  height: 120,
                  decoration: BoxDecoration(
                    color: KvittColors.white,
                    border: Border(
                      top: BorderSide(color: KvittColors.lightGray.withOpacity(0.3)),
                    ),
                  ),
                  child: GameThread(events: game.thread),
                ),

              // Action buttons
              if (isActive)
                SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Row(
                      children: [
                        Expanded(
                          child: OutlinedButton.icon(
                            onPressed: () => _showAddPlayerDialog(context, ref),
                            icon: const Icon(LucideIcons.userPlus),
                            label: const Text('Add Player'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: () => _endGame(ref),
                            icon: const Icon(LucideIcons.flag),
                            label: const Text('End Game'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }

  void _showBuyInDialog(BuildContext context, WidgetRef ref, Player player) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => BuyInDialog(
        player: player,
        gameId: widget.gameId,
        onConfirm: (amount, chips) async {
          await ref.read(gameProvider(widget.gameId).notifier).buyIn(
            playerId: player.playerId,
            amount: amount,
            chips: chips,
          );
        },
      ),
    );
  }

  void _showCashOutDialog(BuildContext context, WidgetRef ref, Player player) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => CashOutDialog(
        player: player,
        gameId: widget.gameId,
        onConfirm: (chips) async {
          await ref.read(gameProvider(widget.gameId).notifier).cashOut(
            playerId: player.playerId,
            chipsReturned: chips,
          );
        },
      ),
    );
  }

  void _showAddPlayerDialog(BuildContext context, WidgetRef ref) {
    // Show dialog to add existing group member
  }

  Future<void> _endGame(WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('End Game?'),
        content: const Text(
          'Make sure all players have cashed out before ending the game.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('End Game'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ref.read(gameProvider(widget.gameId).notifier).endGame();
      if (mounted) {
        context.go('/games/${widget.gameId}/settlement');
      }
    }
  }

  void _handleMenuAction(String action, WidgetRef ref) {
    switch (action) {
      case 'add_player':
        _showAddPlayerDialog(context, ref);
        break;
      case 'end_game':
        _endGame(ref);
        break;
      case 'cancel':
        // Show cancel confirmation
        break;
    }
  }
}

class _StatItem extends StatelessWidget {
  final String label;
  final String value;

  const _StatItem({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: const TextStyle(
            color: KvittColors.white,
            fontSize: 24,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label,
          style: TextStyle(
            color: KvittColors.white.withOpacity(0.7),
            fontSize: 12,
          ),
        ),
      ],
    );
  }
}
```

---

## 6. API Integration

### 6.1 API Client Setup

Create `lib/data/datasources/api_client.dart`:
```dart
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/constants/env.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient();
});

class ApiClient {
  late final Dio _dio;

  ApiClient() {
    _dio = Dio(BaseOptions(
      baseUrl: Env.apiBaseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
      },
    ));

    // Add auth interceptor
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final session = Supabase.instance.client.auth.currentSession;
        if (session != null) {
          options.headers['Authorization'] = 'Bearer ${session.accessToken}';
        }
        handler.next(options);
      },
      onError: (error, handler) {
        // Handle 401 - redirect to login
        if (error.response?.statusCode == 401) {
          Supabase.instance.client.auth.signOut();
        }
        handler.next(error);
      },
    ));
  }

  // GET request
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    T Function(dynamic)? parser,
  }) async {
    final response = await _dio.get(path, queryParameters: queryParameters);
    if (parser != null) {
      return parser(response.data);
    }
    return response.data as T;
  }

  // POST request
  Future<T> post<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    final response = await _dio.post(path, data: data);
    if (parser != null) {
      return parser(response.data);
    }
    return response.data as T;
  }

  // PUT request
  Future<T> put<T>(
    String path, {
    dynamic data,
    T Function(dynamic)? parser,
  }) async {
    final response = await _dio.put(path, data: data);
    if (parser != null) {
      return parser(response.data);
    }
    return response.data as T;
  }

  // DELETE request
  Future<T> delete<T>(
    String path, {
    T Function(dynamic)? parser,
  }) async {
    final response = await _dio.delete(path);
    if (parser != null) {
      return parser(response.data);
    }
    return response.data as T;
  }
}
```

### 6.2 Data Models

Create `lib/data/models/group.dart`:
```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'group.freezed.dart';
part 'group.g.dart';

@freezed
class Group with _$Group {
  const factory Group({
    @JsonKey(name: 'group_id') required String groupId,
    required String name,
    String? description,
    @JsonKey(name: 'created_by') required String createdBy,
    @JsonKey(name: 'created_at') required DateTime createdAt,
    @JsonKey(name: 'default_buy_in') @Default(20.0) double defaultBuyIn,
    @JsonKey(name: 'chips_per_buy_in') @Default(20) int chipsPerBuyIn,
    @Default('USD') String currency,
    @JsonKey(name: 'max_players') @Default(20) int maxPlayers,
    @Default([]) List<GroupMember> members,
  }) = _Group;

  factory Group.fromJson(Map<String, dynamic> json) => _$GroupFromJson(json);
}

@freezed
class GroupMember with _$GroupMember {
  const factory GroupMember({
    @JsonKey(name: 'member_id') required String memberId,
    @JsonKey(name: 'group_id') required String groupId,
    @JsonKey(name: 'user_id') required String userId,
    @Default('member') String role,
    @JsonKey(name: 'joined_at') required DateTime joinedAt,
    String? nickname,
    // User details (populated from backend)
    String? name,
    String? email,
    String? picture,
  }) = _GroupMember;

  factory GroupMember.fromJson(Map<String, dynamic> json) =>
      _$GroupMemberFromJson(json);
}
```

Create `lib/data/models/game.dart`:
```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'game.freezed.dart';
part 'game.g.dart';

@freezed
class Game with _$Game {
  const factory Game({
    @JsonKey(name: 'game_id') required String gameId,
    @JsonKey(name: 'group_id') required String groupId,
    @JsonKey(name: 'host_id') required String hostId,
    String? title,
    String? location,
    @JsonKey(name: 'scheduled_at') DateTime? scheduledAt,
    @JsonKey(name: 'started_at') DateTime? startedAt,
    @JsonKey(name: 'ended_at') DateTime? endedAt,
    @Default('scheduled') String status,
    @JsonKey(name: 'created_at') required DateTime createdAt,
    @JsonKey(name: 'buy_in_amount') @Default(20.0) double buyInAmount,
    @JsonKey(name: 'chip_value') @Default(1.0) double chipValue,
    @JsonKey(name: 'chips_per_buy_in') @Default(20) int chipsPerBuyIn,
    @Default([]) List<Player> players,
    @Default([]) List<GameEvent> thread,
  }) = _Game;

  factory Game.fromJson(Map<String, dynamic> json) => _$GameFromJson(json);
}

extension GameExtensions on Game {
  double get totalPot => players.fold(0.0, (sum, p) => sum + p.totalBuyIn);

  int get totalChipsDistributed =>
      players.fold(0, (sum, p) => sum + p.totalChips);

  int get totalChipsReturned =>
      players.fold(0, (sum, p) => sum + (p.chipsReturned ?? 0));
}

@freezed
class Player with _$Player {
  const factory Player({
    @JsonKey(name: 'player_id') required String playerId,
    @JsonKey(name: 'game_id') required String gameId,
    @JsonKey(name: 'user_id') required String oderId,
    @JsonKey(name: 'total_buy_in') @Default(0.0) double totalBuyIn,
    @JsonKey(name: 'total_chips') @Default(0) int totalChips,
    @JsonKey(name: 'chips_returned') int? chipsReturned,
    @JsonKey(name: 'cash_out') double? cashOut,
    @JsonKey(name: 'net_result') double? netResult,
    @JsonKey(name: 'joined_at') required DateTime joinedAt,
    // User details
    String? name,
    String? email,
    String? picture,
  }) = _Player;

  factory Player.fromJson(Map<String, dynamic> json) => _$PlayerFromJson(json);
}

@freezed
class GameEvent with _$GameEvent {
  const factory GameEvent({
    required String type,
    required String message,
    required DateTime timestamp,
    @JsonKey(name: 'user_id') String? userId,
    String? userName,
    double? amount,
    int? chips,
  }) = _GameEvent;

  factory GameEvent.fromJson(Map<String, dynamic> json) =>
      _$GameEventFromJson(json);
}
```

### 6.3 Repository Pattern

Create `lib/data/repositories/groups_repository.dart`:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../datasources/api_client.dart';
import '../models/group.dart';

final groupsRepositoryProvider = Provider<GroupsRepository>((ref) {
  return GroupsRepository(ref.watch(apiClientProvider));
});

class GroupsRepository {
  final ApiClient _api;

  GroupsRepository(this._api);

  /// Get all groups for current user
  Future<List<Group>> getMyGroups() async {
    final data = await _api.get<List<dynamic>>('/groups/me');
    return data.map((json) => Group.fromJson(json)).toList();
  }

  /// Get single group with members
  Future<Group> getGroup(String groupId) async {
    final data = await _api.get<Map<String, dynamic>>('/groups/$groupId');
    return Group.fromJson(data);
  }

  /// Create new group
  Future<Group> createGroup({
    required String name,
    String? description,
    double defaultBuyIn = 20.0,
    int chipsPerBuyIn = 20,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/groups',
      data: {
        'name': name,
        'description': description,
        'default_buy_in': defaultBuyIn,
        'chips_per_buy_in': chipsPerBuyIn,
      },
    );
    return Group.fromJson(data);
  }

  /// Invite member to group
  Future<void> inviteMember({
    required String groupId,
    required String email,
  }) async {
    await _api.post('/groups/$groupId/invite', data: {'email': email});
  }

  /// Get group games
  Future<List<Game>> getGroupGames(String groupId) async {
    final data = await _api.get<List<dynamic>>('/groups/$groupId/games');
    return data.map((json) => Game.fromJson(json)).toList();
  }
}
```

Create `lib/data/repositories/games_repository.dart`:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../datasources/api_client.dart';
import '../models/game.dart';

final gamesRepositoryProvider = Provider<GamesRepository>((ref) {
  return GamesRepository(ref.watch(apiClientProvider));
});

class GamesRepository {
  final ApiClient _api;

  GamesRepository(this._api);

  /// Get game with players
  Future<Game> getGame(String gameId) async {
    final data = await _api.get<Map<String, dynamic>>('/games/$gameId');
    return Game.fromJson(data);
  }

  /// Create new game
  Future<Game> createGame({
    required String groupId,
    String? title,
    double? buyInAmount,
  }) async {
    final data = await _api.post<Map<String, dynamic>>(
      '/games',
      data: {
        'group_id': groupId,
        'title': title,
        'buy_in_amount': buyInAmount,
      },
    );
    return Game.fromJson(data);
  }

  /// Start game
  Future<Game> startGame(String gameId) async {
    final data = await _api.post<Map<String, dynamic>>('/games/$gameId/start');
    return Game.fromJson(data);
  }

  /// End game
  Future<Game> endGame(String gameId) async {
    final data = await _api.post<Map<String, dynamic>>('/games/$gameId/end');
    return Game.fromJson(data);
  }

  /// Buy in
  Future<void> buyIn({
    required String gameId,
    required String playerId,
    required double amount,
    required int chips,
  }) async {
    await _api.post('/games/$gameId/buy-in', data: {
      'player_id': playerId,
      'amount': amount,
      'chips': chips,
    });
  }

  /// Cash out
  Future<void> cashOut({
    required String gameId,
    required String playerId,
    required int chipsReturned,
  }) async {
    await _api.post('/games/$gameId/cash-out', data: {
      'player_id': playerId,
      'chips_returned': chipsReturned,
    });
  }

  /// Get settlement
  Future<Map<String, dynamic>> getSettlement(String gameId) async {
    return await _api.get<Map<String, dynamic>>('/games/$gameId/settlement');
  }
}
```

---

## 7. WebSocket Integration

### 7.1 Socket Client

Create `lib/data/datasources/socket_client.dart`:
```dart
import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../core/constants/env.dart';

class GameSocketClient {
  io.Socket? _socket;
  final String gameId;

  final _eventController = StreamController<GameSocketEvent>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();

  Stream<GameSocketEvent> get events => _eventController.stream;
  Stream<bool> get connectionState => _connectionController.stream;

  bool get isConnected => _socket?.connected ?? false;

  GameSocketClient(this.gameId);

  Future<void> connect() async {
    if (_socket != null) return;

    // Get auth token
    final session = Supabase.instance.client.auth.currentSession;
    final authPayload = session != null
        ? {'token': session.accessToken}
        : {'user_id': Supabase.instance.client.auth.currentUser?.id};

    _socket = io.io(
      Env.socketUrl,
      io.OptionBuilder()
          .setTransports(['websocket', 'polling'])
          .setAuth(authPayload)
          .enableReconnection()
          .setReconnectionAttempts(5)
          .setReconnectionDelay(1000)
          .build(),
    );

    _socket!.onConnect((_) {
      print('Socket connected');
      _connectionController.add(true);
      _socket!.emit('join_game', {'game_id': gameId});
    });

    _socket!.onDisconnect((_) {
      print('Socket disconnected');
      _connectionController.add(false);
    });

    _socket!.onConnectError((error) {
      print('Socket connection error: $error');
      _connectionController.add(false);
    });

    // Listen for game updates
    _socket!.on('game_update', (data) {
      print('Game update: $data');
      _eventController.add(GameSocketEvent.fromJson(data));
    });

    // Listen for notifications
    _socket!.on('notification', (data) {
      print('Notification: $data');
      _eventController.add(GameSocketEvent(
        type: 'notification',
        data: data,
      ));
    });

    _socket!.connect();
  }

  void disconnect() {
    if (_socket != null) {
      _socket!.emit('leave_game', {'game_id': gameId});
      _socket!.disconnect();
      _socket!.dispose();
      _socket = null;
    }
  }

  void dispose() {
    disconnect();
    _eventController.close();
    _connectionController.close();
  }
}

class GameSocketEvent {
  final String type;
  final dynamic data;

  GameSocketEvent({required this.type, this.data});

  factory GameSocketEvent.fromJson(Map<String, dynamic> json) {
    return GameSocketEvent(
      type: json['type'] ?? 'unknown',
      data: json,
    );
  }
}
```

### 7.2 Socket Provider

Create `lib/features/games/providers/game_socket_provider.dart`:
```dart
import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/datasources/socket_client.dart';

class GameSocketState {
  final bool isConnected;
  final GameSocketEvent? lastEvent;

  GameSocketState({
    this.isConnected = false,
    this.lastEvent,
  });

  GameSocketState copyWith({
    bool? isConnected,
    GameSocketEvent? lastEvent,
  }) {
    return GameSocketState(
      isConnected: isConnected ?? this.isConnected,
      lastEvent: lastEvent ?? this.lastEvent,
    );
  }
}

class GameSocketNotifier extends StateNotifier<GameSocketState> {
  final String gameId;
  GameSocketClient? _client;
  StreamSubscription? _eventSub;
  StreamSubscription? _connectionSub;

  GameSocketNotifier(this.gameId) : super(GameSocketState());

  void connect() {
    _client = GameSocketClient(gameId);

    _connectionSub = _client!.connectionState.listen((connected) {
      state = state.copyWith(isConnected: connected);
    });

    _eventSub = _client!.events.listen((event) {
      state = state.copyWith(lastEvent: event);
    });

    _client!.connect();
  }

  @override
  void dispose() {
    _eventSub?.cancel();
    _connectionSub?.cancel();
    _client?.dispose();
    super.dispose();
  }
}

final gameSocketProvider = StateNotifierProvider.family<
    GameSocketNotifier, GameSocketState, String>((ref, gameId) {
  final notifier = GameSocketNotifier(gameId);
  ref.onDispose(() => notifier.dispose());
  return notifier;
});
```

---

## 8. Design System

### 8.1 Shared Widgets

Create `lib/shared/widgets/kvitt_button.dart`:
```dart
import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';

enum KvittButtonVariant { primary, secondary, outline, ghost }

class KvittButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final KvittButtonVariant variant;
  final bool isLoading;
  final bool isFullWidth;
  final IconData? icon;

  const KvittButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.variant = KvittButtonVariant.primary,
    this.isLoading = false,
    this.isFullWidth = true,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    final button = switch (variant) {
      KvittButtonVariant.primary => ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: KvittColors.primary,
            foregroundColor: KvittColors.white,
            minimumSize: isFullWidth ? const Size.fromHeight(52) : null,
          ),
          child: _buildChild(),
        ),
      KvittButtonVariant.secondary => ElevatedButton(
          onPressed: isLoading ? null : onPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: KvittColors.charcoal,
            foregroundColor: KvittColors.white,
            minimumSize: isFullWidth ? const Size.fromHeight(52) : null,
          ),
          child: _buildChild(),
        ),
      KvittButtonVariant.outline => OutlinedButton(
          onPressed: isLoading ? null : onPressed,
          style: OutlinedButton.styleFrom(
            minimumSize: isFullWidth ? const Size.fromHeight(52) : null,
          ),
          child: _buildChild(),
        ),
      KvittButtonVariant.ghost => TextButton(
          onPressed: isLoading ? null : onPressed,
          child: _buildChild(),
        ),
    };

    return button;
  }

  Widget _buildChild() {
    if (isLoading) {
      return const SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          color: KvittColors.white,
        ),
      );
    }

    if (icon != null) {
      return Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 8),
          child,
        ],
      );
    }

    return child;
  }
}
```

Create `lib/shared/widgets/kvitt_input.dart`:
```dart
import 'package:flutter/material.dart';

class KvittInput extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String? hint;
  final bool obscureText;
  final TextInputType keyboardType;
  final String? Function(String?)? validator;
  final int maxLines;
  final Widget? suffix;

  const KvittInput({
    super.key,
    required this.controller,
    required this.label,
    this.hint,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.validator,
    this.maxLines = 1,
    this.suffix,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          obscureText: obscureText,
          keyboardType: keyboardType,
          validator: validator,
          maxLines: maxLines,
          decoration: InputDecoration(
            hintText: hint,
            suffixIcon: suffix,
          ),
        ),
      ],
    );
  }
}
```

Create `lib/shared/widgets/kvitt_card.dart`:
```dart
import 'package:flutter/material.dart';
import '../../core/constants/colors.dart';

class KvittCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets? padding;
  final Color? color;

  const KvittCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding ?? const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color ?? KvittColors.white,
        borderRadius: BorderRadius.circular(10),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: child,
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: card,
      );
    }

    return card;
  }
}
```

---

## 9. State Management with Riverpod

### 9.1 Auth Provider

Create `lib/features/auth/providers/auth_provider.dart`:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../data/datasources/api_client.dart';

// Auth state stream
final authStateProvider = StreamProvider<User?>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange.map((event) {
    return event.session?.user;
  });
});

// Current user
final currentUserProvider = Provider<User?>((ref) {
  return ref.watch(authStateProvider).valueOrNull;
});

// Auth repository
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(apiClientProvider));
});

class AuthRepository {
  final ApiClient _api;

  AuthRepository(this._api);

  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    final response = await Supabase.instance.client.auth.signInWithPassword(
      email: email,
      password: password,
    );

    if (response.session != null) {
      await _syncUserToBackend(response.session!);
    }
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await Supabase.instance.client.auth.signUp(
      email: email,
      password: password,
      data: {'name': name},
    );

    if (response.user != null) {
      // Sync to backend
      await _api.post('/auth/sync-user', data: {
        'supabase_id': response.user!.id,
        'email': email,
        'name': name,
      });
    }
  }

  Future<void> signOut() async {
    await Supabase.instance.client.auth.signOut();
  }

  Future<void> resetPassword(String email) async {
    await Supabase.instance.client.auth.resetPasswordForEmail(email);
  }

  Future<void> _syncUserToBackend(Session session) async {
    await _api.post('/auth/sync-user', data: {
      'supabase_id': session.user.id,
      'email': session.user.email,
      'name': session.user.userMetadata?['name'] ??
              session.user.email?.split('@')[0],
    });
  }
}
```

### 9.2 Groups Provider

Create `lib/features/groups/providers/groups_provider.dart`:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/group.dart';
import '../../../data/repositories/groups_repository.dart';

final groupsProvider =
    AsyncNotifierProvider<GroupsNotifier, List<Group>>(() => GroupsNotifier());

class GroupsNotifier extends AsyncNotifier<List<Group>> {
  @override
  Future<List<Group>> build() async {
    return ref.watch(groupsRepositoryProvider).getMyGroups();
  }

  Future<void> createGroup({
    required String name,
    String? description,
  }) async {
    state = const AsyncLoading();

    try {
      final repo = ref.read(groupsRepositoryProvider);
      await repo.createGroup(name: name, description: description);
      state = AsyncData(await repo.getMyGroups());
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = AsyncData(
      await ref.read(groupsRepositoryProvider).getMyGroups(),
    );
  }
}

// Single group provider
final groupProvider = FutureProvider.family<Group, String>((ref, groupId) {
  return ref.watch(groupsRepositoryProvider).getGroup(groupId);
});
```

### 9.3 Game Provider

Create `lib/features/games/providers/game_provider.dart`:
```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../data/models/game.dart';
import '../../../data/repositories/games_repository.dart';

final gameProvider = AsyncNotifierProvider.family<GameNotifier, Game, String>(
  () => GameNotifier(),
);

class GameNotifier extends FamilyAsyncNotifier<Game, String> {
  @override
  Future<Game> build(String gameId) async {
    return ref.watch(gamesRepositoryProvider).getGame(gameId);
  }

  Future<void> startGame() async {
    final repo = ref.read(gamesRepositoryProvider);
    state = AsyncData(await repo.startGame(arg));
  }

  Future<void> endGame() async {
    final repo = ref.read(gamesRepositoryProvider);
    state = AsyncData(await repo.endGame(arg));
  }

  Future<void> buyIn({
    required String playerId,
    required double amount,
    required int chips,
  }) async {
    final repo = ref.read(gamesRepositoryProvider);
    await repo.buyIn(
      gameId: arg,
      playerId: playerId,
      amount: amount,
      chips: chips,
    );
    // Refresh game state
    state = AsyncData(await repo.getGame(arg));
  }

  Future<void> cashOut({
    required String playerId,
    required int chipsReturned,
  }) async {
    final repo = ref.read(gamesRepositoryProvider);
    await repo.cashOut(
      gameId: arg,
      playerId: playerId,
      chipsReturned: chipsReturned,
    );
    // Refresh game state
    state = AsyncData(await repo.getGame(arg));
  }

  Future<void> refresh() async {
    state = AsyncData(
      await ref.read(gamesRepositoryProvider).getGame(arg),
    );
  }
}
```

---

## 10. Hosting & Deployment

### 10.1 Backend Hosting Comparison

| Factor | Railway | AWS (ECS/Fargate) |
|--------|---------|-------------------|
| **Ease of Setup** | Very easy (Git push) | Complex (IAM, VPC, ECS config) |
| **Cost** | ~$5-20/month starter | ~$30-100/month minimum |
| **Scaling** | Auto-scale included | Manual config or auto-scale |
| **Database** | One-click MongoDB | DocumentDB or self-managed |
| **WebSocket** | Works out of box | ALB required, config needed |
| **Maintenance** | Zero | High (patches, monitoring) |
| **Best For** | MVP, startups | Enterprise, compliance needs |

### 10.2 Recommended: Railway

**For your use case (MVP, fast shipping), Railway is better.**

#### Deploy Backend to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# In your backend directory
cd /app/backend

# Initialize project
railway init

# Add environment variables
railway variables set MONGO_URL="mongodb+srv://..."
railway variables set SUPABASE_URL="https://..."
railway variables set SUPABASE_JWT_SECRET="..."
railway variables set STRIPE_SECRET_KEY="..."

# Deploy
railway up
```

Railway will:
- Detect Python + FastAPI
- Install dependencies from `requirements.txt`
- Run with Uvicorn
- Provide a URL like `https://kvitt-backend.up.railway.app`

#### MongoDB on Railway
```bash
# Add MongoDB service
railway add --plugin mongodb

# Get connection string
railway variables
# Copy MONGO_URL
```

### 10.3 Supabase Setup

1. Go to https://supabase.com
2. Create new project
3. Get your credentials from Settings > API:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (for backend)

4. Enable Email Auth in Authentication > Providers

### 10.4 Flutter App Deployment

#### Android (Play Store)

```bash
# Generate signing key
keytool -genkey -v -keystore ~/kvitt-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias kvitt

# Create android/key.properties
storePassword=<password>
keyPassword=<password>
keyAlias=kvitt
storeFile=/path/to/kvitt-release-key.jks

# Build release APK
flutter build apk --release

# Build app bundle for Play Store
flutter build appbundle --release
```

#### iOS (App Store)

```bash
# Open Xcode
open ios/Runner.xcworkspace

# In Xcode:
# 1. Set Bundle Identifier (com.kvitt.app)
# 2. Configure signing with your Apple Developer account
# 3. Archive and upload to App Store Connect

# Or via command line
flutter build ios --release
```

---

## 11. Testing

### 11.1 Unit Tests

Create `test/unit/repositories/groups_repository_test.dart`:
```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:kvitt_mobile/data/datasources/api_client.dart';
import 'package:kvitt_mobile/data/repositories/groups_repository.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  late MockApiClient mockApi;
  late GroupsRepository repository;

  setUp(() {
    mockApi = MockApiClient();
    repository = GroupsRepository(mockApi);
  });

  group('getMyGroups', () {
    test('returns list of groups on success', () async {
      when(() => mockApi.get<List<dynamic>>(any()))
          .thenAnswer((_) async => [
                {
                  'group_id': 'grp_123',
                  'name': 'Test Group',
                  'created_by': 'user_1',
                  'created_at': DateTime.now().toIso8601String(),
                },
              ]);

      final groups = await repository.getMyGroups();

      expect(groups.length, 1);
      expect(groups.first.name, 'Test Group');
    });
  });
}
```

### 11.2 Widget Tests

Create `test/widget/login_screen_test.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:kvitt_mobile/features/auth/screens/login_screen.dart';

void main() {
  testWidgets('LoginScreen shows email and password fields', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
  });

  testWidgets('Shows error when submitting empty form', (tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    await tester.tap(find.text('Sign In'));
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
  });
}
```

### 11.3 Run Tests

```bash
# Run all tests
flutter test

# Run with coverage
flutter test --coverage

# Run specific test
flutter test test/unit/repositories/groups_repository_test.dart
```

---

## 12. Timeline & Milestones

### Week 1: Foundation
- [x] Install Flutter & IDE setup
- [ ] Create project structure
- [ ] Configure theme & colors
- [ ] Set up navigation (go_router)
- [ ] Add dependencies (pubspec.yaml)
- [ ] Configure Supabase

### Week 2: Authentication
- [ ] Login screen
- [ ] Signup screen
- [ ] Auth provider (Riverpod)
- [ ] Secure token storage
- [ ] Session persistence

### Week 3-4: Core Features
- [ ] Groups list screen
- [ ] Create group dialog
- [ ] Group hub screen
- [ ] Member management

### Week 5-6: Game Night (Complex)
- [ ] Game night screen
- [ ] Player cards
- [ ] Buy-in dialog
- [ ] Cash-out dialog
- [ ] WebSocket integration
- [ ] Real-time updates

### Week 7: Settlement & Polish
- [ ] Settlement screen
- [ ] Payment flow
- [ ] Dashboard screen
- [ ] Profile screen

### Week 8: Testing & Launch
- [ ] Unit tests
- [ ] Widget tests
- [ ] Bug fixes
- [ ] App Store submission
- [ ] Play Store submission

---

## Quick Reference Commands

```bash
# Run app
flutter run

# Run on specific device
flutter run -d chrome
flutter run -d ios
flutter run -d android

# Generate code (models, providers)
dart run build_runner build --delete-conflicting-outputs

# Watch mode for code generation
dart run build_runner watch

# Analyze code
flutter analyze

# Format code
dart format .

# Clean build
flutter clean && flutter pub get

# Build release
flutter build apk --release
flutter build ios --release
flutter build appbundle --release
```

---

## Resources

- [Flutter Documentation](https://docs.flutter.dev)
- [Riverpod Documentation](https://riverpod.dev)
- [go_router Documentation](https://pub.dev/packages/go_router)
- [Supabase Flutter](https://supabase.com/docs/reference/dart/introduction)
- [Socket.IO Client](https://pub.dev/packages/socket_io_client)

---

## Your Existing API Endpoints Reference

Your FastAPI backend has these endpoints (keep this handy):

```
# Auth
POST /api/auth/sync-user
POST /api/auth/logout
GET  /api/auth/me

# Groups
GET  /api/groups/me
POST /api/groups
GET  /api/groups/{group_id}
PUT  /api/groups/{group_id}
POST /api/groups/{group_id}/invite
GET  /api/groups/{group_id}/games

# Games
POST /api/games
GET  /api/games/{game_id}
POST /api/games/{game_id}/start
POST /api/games/{game_id}/end
POST /api/games/{game_id}/buy-in
POST /api/games/{game_id}/cash-out
GET  /api/games/{game_id}/settlement
POST /api/games/{game_id}/players

# Users
GET  /api/users/{user_id}/stats
GET  /api/users/{user_id}/badges

# Premium
POST /api/stripe/create-checkout
POST /api/stripe/webhook
GET  /api/premium/status
```

---

**You're ready to start building!** Begin with Week 1 tasks and work through sequentially.
