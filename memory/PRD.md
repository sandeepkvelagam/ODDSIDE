# Kvitt — Product Requirements Document

## Original Problem Statement
Full-stack poker group settlement app with React frontend, FastAPI backend, MongoDB, and React Native (Expo) mobile app. The mobile app is undergoing a "Dashboard v2 Mobile — Liquid Glass Styling + Motion System" overhaul. All mobile screens should match a "Liquid Glass" aesthetic with spring-based animations for a premium feel, ensuring feature parity with the web application.

## App Architecture
```
/app
├── frontend/          # React web app
├── backend/           # FastAPI + MongoDB
└── mobile/            # React Native (Expo)
    ├── src/
    │   ├── components/ui/      # Reusable Liquid Glass + QR components
    │   ├── screens/            # All app screens
    │   ├── services/           # pushNotifications.ts
    │   ├── styles/
    │   │   └── liquidGlass.ts  # Design tokens
    │   ├── navigation/
    │   │   └── RootNavigator.tsx
    │   └── context/
    │       └── ThemeContext.tsx, AuthContext.tsx
    └── LIQUID_GLASS_DESIGN_SYSTEM.md
```

## User Personas
- Poker group organizers managing buy-ins, cash-outs, and settlements
- Group members tracking their P&L and settling debts
- Players using the AI poker assistant for game analysis

## Core Requirements
1. Mobile app Liquid Glass design system on all screens
2. Full Wallet functionality (create, send/receive with QR, deposit via Stripe, withdraw request, PIN protection, transaction history)
3. Group management: create group, invite members, accept/reject invites
4. Game management: create game, track buy-ins/cash-outs, settle
5. AI features: poker assistant, hand analysis, AI toolkit
6. Push notifications: game events, settlements, invites, wallet transfers

## What's Been Implemented

### Web App (Complete)
- Dashboard with stats, recent games, balance overview
- Groups management with invite system
- Game night tracking (buy-ins, cash-outs, settlements)
- Settlement generation and ledger system
- AI Assistant (GPT-4o), Voice Commands (Whisper)
- Spotify integration, Wallet system (backend complete)
- Supabase authentication

### Mobile App — Liquid Glass Design System (Complete)
- Design tokens, reusable components (GlassSurface, GlassButton, BottomSheetScreen)
- Login, Dashboard V2, AI Toolkit, Poker AI, all settings/profile pages
- All modal screens use `presentation: "transparentModal"`
- TypeScript compiles 0 errors

### Mobile App — Wallet (Complete - Dec 2025)
- Setup flow: intro → create → PIN setup → active
- View balance, wallet ID display
- QR code display for receiving (react-native-qrcode-svg)
- QR code scanner for sending (expo-camera)
- Send: search / scan QR → amount → PIN confirm → done
- Deposit via Stripe: select amount → Stripe checkout → poll for completion
- Withdraw request: amount + destination + PIN → submitted to backend
- Transaction history list

### Mobile App — Push Notifications (Complete - Dec 2025)
- expo-notifications integration (APNs/FCM via Expo Push Service)
- Permission request on login, token registered with backend
- Token unregistered on logout
- Events: game started, settlement ready, group invite, wallet transfer received
- Android notification channels: default, wallet, games

### Mobile App — Notifications & Group Invites (Complete - Dec 2025)
- Pending group invites with Accept/Reject buttons
- Activity feed with notification history
- Groups screen has "Invites" shortcut

### Backend — New Endpoints (Dec 2025)
- POST /api/wallet/withdraw — simple withdrawal request
- GET /api/wallet/withdrawals — withdrawal history
- POST /api/users/push-token — register Expo push token
- DELETE /api/users/push-token — unregister on logout
- Push sent on: game_started, settlement_generated, wallet_received, group_invite, invite_accepted, withdrawal_requested

## Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: FastAPI, MongoDB, Supabase Auth, httpx
- **Mobile**: React Native (Expo SDK 54), TypeScript, react-native-reanimated, expo-blur, expo-linear-gradient, expo-notifications, expo-camera, react-native-qrcode-svg
- **AI**: OpenAI GPT-4o, Whisper
- **Payments**: Stripe (via emergentintegrations)
- **Auth**: Supabase

## Credentials for Testing
- Email: sandeep.kmr8384@gmail.com
- Password: Padma@8384

---

# ROADMAP

## P0 — Next
- [ ] Phase 6 QA Pass: Visual test all mobile screens on a real device/Expo build
- [ ] AI Assistant visibility toggle (show/hide chat interface)
- [ ] Create Game quick flow from Dashboard (Group selection sheet)

## P1 — Upcoming
- [ ] Voice command business logic implementation
- [ ] GroupHubScreen & GameNightScreen refactor to use Liquid Glass components
- [ ] Blinds Timer feature
- [ ] Game invite notifications → navigate to correct game on tap

## P2 — Future/Backlog
- [ ] Spotify player on mobile (currently "Coming Soon")
- [ ] Refactor monolithic server.py backend
- [ ] Push notification deep linking (tap notification → go to correct screen)
- [ ] Admin panel for processing withdrawal requests
- [ ] Stripe webhook for deposit status (backup to polling)
