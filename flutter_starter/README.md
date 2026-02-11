# Kvitt Flutter Mobile App Starter

Ready-to-use Flutter project files for the Kvitt mobile app.

## Quick Start

### 1. Create Flutter Project

```bash
# Navigate to your projects folder
cd ~/projects

# Create new Flutter project
flutter create kvitt_mobile --org com.kvitt --platforms android,ios

# Enter project
cd kvitt_mobile
```

### 2. Copy Starter Files

Copy the contents of this `flutter_starter` folder into your new Flutter project:

```bash
# From the kvitt repo
cp -r /path/to/kvitt/flutter_starter/* /path/to/kvitt_mobile/

# Or manually copy:
# - pubspec.yaml (replace existing)
# - lib/ folder (replace existing)
```

### 3. Configure Environment

Edit `lib/core/constants/env.dart` with your actual values:

```dart
class Env {
  static const String apiBaseUrl = 'https://YOUR-BACKEND.up.railway.app/api';
  static const String socketUrl = 'https://YOUR-BACKEND.up.railway.app';
  static const String supabaseUrl = 'https://YOUR-PROJECT.supabase.co';
  static const String supabaseAnonKey = 'your-anon-key';
}
```

### 4. Add Fonts

Download Inter font and add to `assets/fonts/`:
- Inter-Regular.ttf
- Inter-Medium.ttf
- Inter-SemiBold.ttf
- Inter-Bold.ttf

### 5. Install Dependencies

```bash
flutter pub get
```

### 6. Run the App

```bash
# Run on connected device/emulator
flutter run

# Run on specific platform
flutter run -d android
flutter run -d ios
```

## Project Structure

```
lib/
├── main.dart                 # Entry point
├── app.dart                  # App configuration
├── core/
│   ├── constants/
│   │   ├── colors.dart       # Kvitt color palette
│   │   └── env.dart          # Environment config
│   ├── theme/
│   │   └── app_theme.dart    # Light/dark themes
│   └── router/
│       └── app_router.dart   # Navigation routes
├── data/
│   └── datasources/
│       └── api_client.dart   # HTTP client with auth
├── features/
│   ├── auth/                 # Login, signup
│   ├── dashboard/            # Home screen
│   ├── groups/               # Groups list, hub, create
│   ├── games/                # Game night, settlement
│   └── profile/              # User profile
└── shared/
    └── widgets/              # Reusable UI components
```

## What's Included

### Screens (7 total)
- Login / Signup
- Dashboard
- Groups List / Group Hub / Create Group
- Game Night / Settlement
- Profile

### Shared Widgets
- `KvittButton` - Primary, secondary, outline, ghost variants
- `KvittInput` - Text input with validation
- `KvittCard` - Cards with optional tap handlers
- `KvittAvatar` - User avatars with initials fallback
- Loading states, error views, empty states

### Core Features
- Supabase authentication
- API client with JWT injection
- go_router navigation with auth guards
- Riverpod state management setup
- Light/dark theme support
- Kvitt design system colors

## Next Steps

1. **Connect to your backend** - Update API endpoints in `env.dart`
2. **Add real data providers** - Replace placeholder providers with actual API calls
3. **Implement WebSocket** - Add `socket_client.dart` for real-time game updates
4. **Add remaining features** - Premium, notifications, game history
5. **Test on devices** - Run on real iOS/Android devices

## Commands

```bash
# Install dependencies
flutter pub get

# Run app
flutter run

# Build for release
flutter build apk --release
flutter build ios --release

# Run tests
flutter test

# Analyze code
flutter analyze
```

## Resources

- [Flutter Documentation](https://docs.flutter.dev)
- [Riverpod Documentation](https://riverpod.dev)
- [go_router Documentation](https://pub.dev/packages/go_router)
- [Supabase Flutter](https://supabase.com/docs/reference/dart/introduction)
