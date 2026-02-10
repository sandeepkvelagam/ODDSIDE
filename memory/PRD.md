# Kvitt PRD - Implementation Status

## Original Problem Statement
Build **Kvitt** - a behavioral ledger app for home poker games.
**Tagline: "Your side, settled."**

## Latest Update: February 2026 (Session 5)

### Current Session: Mobile App Auth Fix + Navigation Overhaul

#### Critical Bug Fix: Mobile Auth (P0 BLOCKER - RESOLVED)
- **Root Cause:** Mobile app never called `/api/auth/sync-user` after Supabase login, so user didn't exist in MongoDB → all API calls returned 401 "Unauthorized"
- **Fix:** Created `AuthContext.tsx` that calls `sync-user` after login (matching web app's `AuthContext.js` pattern)
- **Files:** `/app/mobile/src/context/AuthContext.tsx` (NEW)
- **Testing:** 100% backend tests passed (11/11), TypeScript compiles with 0 errors

#### Mobile Navigation Overhaul
- Replaced bottom tab navigator with stack-based navigation + drawer
- `RootNavigator.tsx` now uses `AuthContext` for session management
- `DashboardScreen` has hamburger menu → opens `AppDrawer` (glassmorphism slide-out)
- Fixed wrong API endpoints: `/dashboard/stats` → `/stats/me`, `/games/recent` → `/games`
- Fixed `GroupsScreen` and `GroupHubScreen` to use correct `RootStackParamList` types
- All screens updated to use `AuthContext` for user data and sign-out

---

### Phase 1: AI-Light Features (COMPLETE)

#### 1. AI Chat Assistant (Explain-Only)
- **Backend**: `/app/backend/ai_assistant.py` - OpenAI GPT-5.2 via Emergent key
- **Frontend**: `/app/frontend/src/components/AIAssistant.jsx` - Floating chat bubble
- **Endpoint**: POST `/api/assistant/ask`

#### 2. Smart Defaults (Data-Driven)
- **Endpoint**: GET `/api/groups/{group_id}/smart-defaults`
- **Endpoint**: GET `/api/groups/{group_id}/frequent-players`

#### 3. Real-Time WebSocket Integration in GameNight
- Live connection indicator, auto-refresh, toast notifications, live chat

---

### Phase 0: Foundation Infrastructure (COMPLETE)
- WebSocket Real-Time Updates (Socket.IO)
- Game-Agnostic Event Schema
- Rule-Based Onboarding Guide
- Email Notifications (Resend)

### Error Handling & Logging (COMPLETE)
- Centralized Error Handler (backend + frontend)
- Login Error Messages & Supabase Error Mapping

### Stripe Premium Subscriptions (COMPLETE)
- Monthly ($4.99), Yearly ($39.99), Lifetime ($99.99)
- Backend endpoints + Frontend pricing page

### Previous Session Features (COMPLETE)
- Auto Buy-In on Game Start/Join
- Group Admin Controls (remove/leave members)
- Host Post-Game Edit Permissions
- Notification Navigation
- Request Join Button

### Rebrand (COMPLETE)
- Name: Kvitt, Tagline: "Your side, settled."
- Light theme default, Charcoal buttons, Warm peachy orange accent

---

## Tech Stack
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: Supabase Auth (email/password)
- **Mobile**: React Native + Expo
- **Real-time**: Socket.IO
- **Payments**: Stripe
- **Email**: Resend
- **AI**: OpenAI GPT-5.2 via Emergent key

---

## Mobile App Architecture
```
/app/mobile/
├── App.tsx                      # Entry: AuthProvider → DrawerProvider → RootNavigator
├── src/
│   ├── api/
│   │   ├── client.ts            # Axios + Supabase Bearer token interceptor
│   │   ├── games.ts             # /games, /games/:id
│   │   └── groups.ts            # /groups, /groups/:id
│   ├── components/
│   │   ├── AppDrawer.tsx         # Glassmorphism slide-out drawer
│   │   ├── HamburgerButton.tsx   # Menu trigger
│   │   └── ui/                   # Screen, Card components
│   ├── context/
│   │   ├── AuthContext.tsx        # Session + sync-user + user data
│   │   └── DrawerContext.tsx      # Drawer open/close state
│   ├── lib/
│   │   ├── socket.ts             # Socket.IO client
│   │   └── supabase.ts           # Supabase client with SecureStore
│   ├── navigation/
│   │   ├── RootNavigator.tsx      # Stack nav: Login → Dashboard/Groups/GroupHub/GameNight/Settings
│   │   └── MainStack.tsx          # (Legacy, no longer used by RootNavigator)
│   └── screens/
│       ├── DashboardScreen.tsx    # Stats, recent games, drawer, actions
│       ├── GroupsScreen.tsx       # Groups list
│       ├── GroupHubScreen.tsx     # Group details + games
│       ├── GameNightScreen.tsx    # Live game with Socket.IO
│       ├── LoginScreen.tsx        # Supabase email/password auth
│       └── SettingsScreen.tsx     # Profile, sign out
```

---

## Prioritized Backlog

### P0 - Critical (All Completed)
- [x] Mobile auth sync-user fix
- [x] Mobile navigation overhaul (stack + drawer)
- [x] Fix wrong API endpoints in mobile screens

### P1 - High Priority (In Progress)
- [ ] Test mobile app on actual device (user testing)
- [ ] Stripe debt settlement end-to-end testing
- [ ] Fix mobile "Create Account" flow (Supabase email confirmation)
- [ ] Enhanced dashboard with charts

### P2 - Medium Priority
- [ ] Build more mobile screens (Game History, Profile/Badges)
- [ ] AI: Natural language session logging
- [ ] Shareable game result cards
- [ ] RSVP calendar for scheduled games

### P3 - Nice to Have
- [ ] Backend refactoring (split server.py into routers)
- [ ] Landing/marketing page for mobile app
- [ ] Phase 2 & 3 AI features (analytics, revenue AI)
- [ ] Stripe Webhooks for auto subscription management
- [ ] Export data to CSV

---

## Known Issues / Technical Debt
1. `server.py` is 3000+ lines - needs router splitting
2. `GameNight.jsx` is 1370+ lines - needs component splitting
3. Mobile app `MainStack.tsx` is legacy/unused - can be removed
4. nativewind/tailwindcss still in mobile package.json (unused)
