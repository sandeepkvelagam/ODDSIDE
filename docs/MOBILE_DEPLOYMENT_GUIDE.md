# Kvitt Mobile App - iOS & Android Deployment Guide

> Complete guide to deploying the Kvitt mobile app to Apple App Store and Google Play Store.

## Overview

The Kvitt mobile app is built with:
- **Framework:** React Native + Expo SDK 54
- **Build System:** EAS Build (Expo Application Services)
- **Language:** TypeScript

This guide covers end-to-end deployment from development to production release.

---

## Prerequisites

### Developer Accounts Required

| Platform | Cost | URL |
|----------|------|-----|
| Apple Developer Program | $99/year | https://developer.apple.com/programs/ |
| Google Play Console | $25 one-time | https://play.google.com/console/ |
| Expo Account | Free | https://expo.dev/signup |

### Tools Required

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Verify installation
eas --version
```

---

## Current State Audit

| Item | Status | Notes |
|------|--------|-------|
| Expo Config | ✅ | app.json exists |
| Bundle ID | ❌ | Needs configuration |
| EAS Build | ❌ | No eas.json |
| App Icons | ✅ | Assets present in /mobile/assets/ |
| Privacy Policy | ✅ | https://kvitt.app/privacy |
| Terms of Service | ✅ | https://kvitt.app/terms |
| Push Notifications | ❌ | Not implemented |
| Analytics | ❌ | Not implemented |
| Apple Sign-In | ❌ | Not implemented |

---

## Step 1: Configure App Identity

Update `/app/mobile/app.json` with the following configuration:

```json
{
  "expo": {
    "name": "Kvitt",
    "slug": "kvitt-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "kvitt",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,

    "ios": {
      "bundleIdentifier": "app.kvitt.mobile",
      "buildNumber": "1",
      "supportsTablet": true,
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Kvitt uses the microphone for voice commands to control the app hands-free.",
        "CFBundleAllowMixedLocalizations": true
      },
      "config": {
        "usesNonExemptEncryption": false
      }
    },

    "android": {
      "package": "app.kvitt.mobile",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#282B2B"
      },
      "permissions": [
        "RECORD_AUDIO",
        "INTERNET",
        "VIBRATE"
      ]
    },

    "plugins": [
      "expo-secure-store",
      [
        "expo-av",
        {
          "microphonePermission": "Kvitt uses the microphone for voice commands."
        }
      ]
    ],

    "extra": {
      "eas": {
        "projectId": "YOUR_EAS_PROJECT_ID"
      }
    }
  }
}
```

### Key Configuration Notes

- **bundleIdentifier / package:** `app.kvitt.mobile` - Must be unique across all apps
- **usesNonExemptEncryption:** `false` - App doesn't use custom encryption (uses HTTPS only)
- **NSMicrophoneUsageDescription:** Required by Apple for microphone access

---

## Step 2: Create EAS Build Configuration

Create `/app/mobile/eas.json`:

```json
{
  "cli": {
    "version": ">= 16.3.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "ios": {
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

### Build Profiles Explained

| Profile | Purpose | Output |
|---------|---------|--------|
| `development` | Local testing with dev client | iOS Simulator / Android APK |
| `preview` | Internal testing (TestFlight/Internal) | Installable builds |
| `production` | Store submission | iOS IPA / Android AAB |

---

## Step 3: Apple App Store Requirements

### Account Setup Checklist

- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Create app in App Store Connect
- [ ] Obtain Team ID from Membership page
- [ ] EAS handles signing certificates automatically

### App Store Connect Metadata

| Field | Value |
|-------|-------|
| App Name | Kvitt - Poker Settlement |
| Subtitle | Track buy-ins, settle debts instantly |
| Category | Finance / Lifestyle |
| Age Rating | **17+** (gambling reference) |
| Privacy Policy URL | https://kvitt.app/privacy |
| Support URL | https://kvitt.app/support |
| Marketing URL | https://kvitt.app |

### Required Screenshots

| Device | Resolution | Count |
|--------|------------|-------|
| iPhone 6.7" (Pro Max) | 1290 x 2796 | 3-10 |
| iPhone 6.5" (Plus/Max) | 1242 x 2688 | 3-10 |
| iPad Pro 12.9" | 2048 x 2732 | Optional |

### App Review Considerations

> **Important:** Apple may scrutinize gambling-related apps carefully.

- Emphasize "social expense tracking" not "gambling"
- Clearly explain this is for tracking friendly games, not online gambling
- Microphone usage must be clearly justified in description
- Age rating of 17+ recommended for gambling references

---

## Step 4: Google Play Store Requirements

### Account Setup Checklist

- [ ] Create Google Play Developer Account ($25 one-time)
- [ ] Create app in Play Console
- [ ] Create Service Account for automated uploads
- [ ] Download JSON key and save as `google-service-account.json`

### Play Console Metadata

| Field | Value |
|-------|-------|
| App Name | Kvitt - Poker Settlement |
| Short Description (80 chars) | Track poker buy-ins and settle debts instantly with friends |
| Full Description | Detailed feature list (up to 4000 chars) |
| Category | Finance |
| Content Rating | Everyone 10+ |
| Privacy Policy URL | https://kvitt.app/privacy |

### Required Assets

| Asset | Dimensions | Notes |
|-------|------------|-------|
| Phone Screenshots | 1080 x 1920 | 2-8 screenshots |
| Feature Graphic | 1024 x 500 | Required for store listing |
| App Icon | 512 x 512 | High-res version |

---

## Step 5: Build & Submit Commands

### Initial Setup (First Time Only)

```bash
# 1. Login to Expo
eas login

# 2. Navigate to mobile directory
cd /app/mobile

# 3. Configure EAS for the project
eas build:configure
```

### Building for iOS

```bash
# Development build (simulator)
eas build --platform ios --profile development

# Preview build (TestFlight)
eas build --platform ios --profile preview

# Production build (App Store)
eas build --platform ios --profile production
```

### Building for Android

```bash
# Development build (APK)
eas build --platform android --profile development

# Preview build (APK for testers)
eas build --platform android --profile preview

# Production build (AAB for Play Store)
eas build --platform android --profile production
```

### Submitting to Stores

```bash
# Submit latest iOS build to App Store
eas submit --platform ios --latest

# Submit latest Android build to Play Store
eas submit --platform android --latest
```

---

## Step 6: Version Management

### Semantic Versioning

- **version** in app.json: `"1.0.0"` → `"1.1.0"` → `"2.0.0"`
- **iOS buildNumber:** Auto-incremented by EAS
- **Android versionCode:** Auto-incremented by EAS

### Release Workflow

1. Merge changes to `main` branch
2. Update `version` in app.json
3. Create git tag: `git tag mobile-v1.0.0`
4. Push tag: `git push origin mobile-v1.0.0`
5. Run EAS build
6. Test on TestFlight / Internal Testing
7. Promote to production

---

## Step 7: Pre-Submission Testing

### TestFlight (iOS)

1. Build: `eas build --platform ios --profile production`
2. Submit: `eas submit --platform ios --latest`
3. In App Store Connect → TestFlight → Add internal testers
4. Testers install via TestFlight app
5. Collect feedback and fix issues
6. Submit for App Review when ready

### Internal Testing (Android)

1. Build: `eas build --platform android --profile production`
2. Submit: `eas submit --platform android --latest`
3. In Play Console → Testing → Internal testing → Create track
4. Add testers by email
5. Testers install via Play Store opt-in link
6. Graduate to Production when ready

---

## Step 8: Store Listing Screenshots

### Screenshots to Create

Capture these 5 key screens:

| Screen | Caption |
|--------|---------|
| Dashboard | "Track your poker performance" |
| Live Game | "Real-time buy-in tracking" |
| Settlement | "See who owes whom instantly" |
| Groups | "Manage your poker circles" |
| AI Assistant | "Get personalized insights" |

### Feature Graphic (Android)

- Size: 1024 x 500 PNG
- Include Kvitt logo
- Tagline: "Your side, settled"
- Brand colors: Orange (#EE6C29), Jet (#282B2B)

---

## Step 9: Privacy & Compliance

### App Privacy (iOS) - App Store Connect

Declare the following data collection:

| Data Type | Collected | Linked to User | Tracking |
|-----------|-----------|----------------|----------|
| Contact Info (Email) | Yes | Yes | No |
| Identifiers (User ID) | Yes | Yes | No |
| Usage Data | Yes | Yes | No |
| Financial Data | No* | - | - |

*Financial amounts are user-entered, not collected from financial institutions

### Data Safety (Android) - Play Console

| Question | Answer |
|----------|--------|
| Account info collected? | Yes (email) |
| App activity collected? | Yes (interactions) |
| Data shared with third parties? | No |
| Data encrypted in transit? | Yes (HTTPS) |
| Data deletion available? | Yes (on request) |

### GDPR Compliance

- [x] Privacy policy accessible in-app
- [x] Consent for optional data collection ("Help improve Kvitt" toggle)
- [ ] Data deletion request process (implement support email)

---

## Step 10: CI/CD Pipeline (Optional)

Create `.github/workflows/eas-build.yml`:

```yaml
name: EAS Build

on:
  push:
    tags:
      - 'mobile-v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Setup Expo
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: cd mobile && yarn install --frozen-lockfile

      - name: Build iOS
        run: cd mobile && eas build --platform ios --profile production --non-interactive

      - name: Build Android
        run: cd mobile && eas build --platform android --profile production --non-interactive
```

### Required Secrets

Add to GitHub repository settings:
- `EXPO_TOKEN`: Your Expo access token

---

## Step 11: Post-Launch

### Crash Reporting

```bash
# Add Sentry for crash tracking
npx expo install @sentry/react-native
```

### OTA Updates

```bash
# Add expo-updates for over-the-air updates
npx expo install expo-updates
```

### App Store Review Prompts

Use `expo-store-review` to prompt users for reviews after positive experiences.

---

## Implementation Timeline

### Week 1: Setup
- [ ] Create Apple Developer account
- [ ] Create Google Play Developer account
- [ ] Update app.json with bundle IDs
- [ ] Create eas.json
- [ ] Run `eas build:configure`

### Week 2: Build & Test
- [ ] Generate first iOS build
- [ ] Generate first Android build
- [ ] Submit to TestFlight
- [ ] Submit to Internal Testing
- [ ] Recruit 5-10 beta testers

### Week 3: Store Listings
- [ ] Create App Store Connect listing
- [ ] Create Play Console listing
- [ ] Generate all screenshots
- [ ] Write compelling descriptions
- [ ] Complete privacy questionnaires

### Week 4: Submit & Launch
- [ ] Submit iOS for App Review
- [ ] Submit Android for Review
- [ ] Address any review feedback
- [ ] Launch!

---

## Verification Checklist

### Build Success
- [ ] iOS build completes without errors
- [ ] Android build completes without errors
- [ ] Both builds install on physical devices
- [ ] All features work correctly

### Store Submission
- [ ] TestFlight testers can install and use app
- [ ] Internal Testing testers can install and use app
- [ ] All metadata complete and approved
- [ ] Screenshots display correctly

### App Review
- [ ] iOS: Passed App Review (typically 1-3 days)
- [ ] Android: Passed Review (typically 1-3 days)
- [ ] No policy violations

### Production Launch
- [ ] App visible in App Store search
- [ ] App visible in Play Store search
- [ ] Download and install works
- [ ] All features functional
- [ ] Analytics tracking (if implemented)

---

## Troubleshooting

### Common Issues

**"Bundle identifier already exists"**
- Choose a unique bundle ID (e.g., `app.kvitt.mobile.dev`)

**"Missing provisioning profile"**
- EAS handles this automatically; run `eas credentials` to verify

**"App rejected for gambling content"**
- Emphasize social tracking, not gambling
- Add clear disclaimer in app description
- Consider 17+ age rating

**"Build failed - missing dependencies"**
- Run `yarn install` before building
- Check for native module compatibility

### Support Resources

- Expo Documentation: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/
- EAS Submit: https://docs.expo.dev/submit/introduction/
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Google Play Policy: https://play.google.com/console/about/guides/

---

## Files Reference

| File | Purpose |
|------|---------|
| `/app/mobile/app.json` | Expo configuration |
| `/app/mobile/eas.json` | EAS Build configuration |
| `/app/mobile/google-service-account.json` | Play Store credentials (gitignored) |
| `/app/mobile/assets/icon.png` | App icon (1024x1024) |
| `/app/mobile/assets/adaptive-icon.png` | Android adaptive icon |
| `/app/mobile/assets/splash.png` | Splash screen |

---

*Last updated: February 2026*
