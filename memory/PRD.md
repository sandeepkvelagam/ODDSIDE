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
    │   ├── components/
    │   │   ├── ui/             # Reusable Liquid Glass components
    │   │   └── BottomSheetScreen.tsx
    │   ├── screens/            # All app screens
    │   ├── styles/
    │   │   └── liquidGlass.ts  # Design tokens
    │   ├── navigation/
    │   │   └── RootNavigator.tsx
    │   └── context/
    │       └── ThemeContext.tsx
    └── LIQUID_GLASS_DESIGN_SYSTEM.md
```

## User Personas
- Poker group organizers managing buy-ins, cash-outs, and settlements
- Group members tracking their P&L and settling debts
- Players using the AI poker assistant for game analysis

## Core Requirements
1. Mobile app Liquid Glass design system on all screens
2. Full Wallet functionality (create, send, receive, PIN protection, transaction history)
3. Group management: create group, invite members, accept/reject invites
4. Game management: create game, track buy-ins/cash-outs, settle
5. AI features: poker assistant, hand analysis, AI toolkit
6. Notifications: group invites, game updates, settlements

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
- Design tokens in `/app/mobile/src/styles/liquidGlass.ts`
- Reusable components: `GlassSurface`, `GlassButton`, `BottomSheetScreen`
- Login screen with charcoal theme and poker suits background
- Dashboard V2 with 3-column stats layout, help modal
- AI Toolkit screen (new)
- Poker AI screen with card visibility toggle
- All settings/profile/privacy/billing pages as BottomSheetScreens with transparent modal presentation

### Mobile App — Wallet (Complete - Dec 2025)
- Full wallet setup flow: intro → create → PIN setup → active
- View balance, wallet ID display
- Send money: search recipient → amount → PIN confirm → success
- Receive: display wallet ID for sharing
- Transaction history list
- Backend: All endpoints fully functional (setup, PIN, transfer, transactions, search)

### Mobile App — Notifications & Group Invites (Complete - Dec 2025)
- Pending group invites with Accept/Reject buttons
- Activity feed with notification history  
- Push notification settings toggles
- Groups screen has "Invites" shortcut to Notifications

### Mobile App — Navigation (Complete - Dec 2025)
- All bottom sheet screens use `presentation: "transparentModal"` for see-through modal effect
- TypeScript compiles with 0 errors (glassBg property fixed)

## Tech Stack
- **Frontend**: React, TypeScript, TailwindCSS
- **Backend**: FastAPI, MongoDB, Supabase Auth
- **Mobile**: React Native (Expo), TypeScript, react-native-reanimated, expo-blur, expo-linear-gradient
- **AI**: OpenAI GPT-4o, Whisper
- **Auth**: Supabase

## 3rd Party Integrations
- Supabase: Authentication
- MongoDB: Database
- OpenAI GPT-4o / Whisper: AI features
- Spotify: Music player (Web only)

## Credentials for Testing
- Email: sandeep.kmr8384@gmail.com
- Password: Padma@8384

---

# CHANGELOG

## December 2025 — Mobile Liquid Glass Overhaul & Wallet/Invites
- Fixed TypeScript build error in DashboardScreenV2.tsx (glassBg property)
- Implemented full WalletScreen with create/setup flow, send/receive, transaction history
- Updated NotificationsScreen with pending group invites (accept/reject), activity feed
- GroupsScreen now has "Invites" button navigating to Notifications
- All modal screens (Settings, Profile, Wallet, Notifications, AIAssistant, AIToolkit, etc.) now use `presentation: "transparentModal"`
- TypeScript compiles clean (0 errors)

---

# ROADMAP

## P0 — Next
- [ ] Phase 6 QA Pass: Visual QA on all mobile screens (layout/spacing/theme consistency)
- [ ] AI Assistant visibility toggle (show/hide chat interface)
- [ ] Create Game quick flow from Dashboard (Group selection sheet)

## P1 — Upcoming
- [ ] Voice command business logic implementation
- [ ] GroupHubScreen and GameNightScreen refactor to use Liquid Glass components
- [ ] Blinds Timer feature
- [ ] Game invite notifications → navigate to correct game

## P2 — Future/Backlog
- [ ] Spotify player on mobile (currently "Coming Soon")
- [ ] Refactor monolithic server.py backend
- [ ] QR code scanner for wallet receiving
- [ ] Deposit/withdraw flows (Stripe integration for real money deposit)
- [ ] Push notification delivery (APNs/FCM integration)
