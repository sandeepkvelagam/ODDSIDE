# ODDSIDE PRD - Implementation Status

## Original Problem Statement
Build ODDSIDE (formerly PokerNight) - a behavioral ledger app for home poker games.
**Tagline: "Track. Settle. Dominate."**

## User Personas
1. **Solo Player** - Logs personal sessions, tracks individual stats
2. **Group Member** - Participates in shared ledger, RSVPs to games
3. **Host (Contextual)** - User who starts a Game Night, controls game flow
4. **Admin (Structural)** - Group owner with elevated permissions

## Core Requirements
- 30-Second Rule: 90% of sessions loggable in under 30 seconds
- Progressive Disclosure: Advanced options hidden by default
- No Forced Socialization: Full participation without messaging
- AI Never Auto-Saves Money: All financial data requires confirmation
- Immutable Ledger: Locked records after settlement with audit trail

## Tech Stack
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: Google OAuth via Emergent Auth

---

## What's Been Implemented ✅

### Date: Feb 5, 2026

### Phase 1 - Foundation (COMPLETE)
- [x] Auth + Profile (Google OAuth via Emergent)
- [x] Groups + Roles (admin/member)
- [x] Session logging (manual buy-in/cash-out)
- [x] Ledger + Settlement algorithm (debt minimization)

### Phase 2 - Core Differentiator (COMPLETE)
- [x] Game Night Mode (live game screen with timer)
- [x] Immutable ledger rules (locked after settlement)
- [x] Audit trail for edits
- [x] Notifications system
- [x] Game Thread (event-scoped messaging)

### Features Implemented
1. **Landing Page** - Dark poker aesthetic with hero image
2. **Dashboard** - Net profit, win rate, balance, active games, groups
3. **Groups Management** - Create, invite members, manage roles
4. **Group Hub** - Members list, games list, leaderboard
5. **Game Night Mode** - Buy-in/Cash-out buttons, timer, players list, chip bank
6. **Settlement View** - Results, who-owes-whom, mark as paid
7. **Profile Page** - Stats, financial summary, pending balances
8. **Notifications** - Real-time alerts for game invites, settlements

### API Endpoints
- Auth: `/api/auth/session`, `/api/auth/me`, `/api/auth/logout`
- Groups: CRUD + invite/remove members
- Games: CRUD + start/end/join/rsvp
- Transactions: buy-in, cash-out
- Settlement: generate, mark paid, edit (admin)
- Stats: personal, group leaderboard
- Notifications: list, mark read

---

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] RSVP calendar integration for scheduled games
- [ ] Push notifications (browser)

### P1 - High Priority
- [ ] Phase 3: Natural language session logging (AI draft)
- [ ] Phase 3: OCR for chip stacks
- [ ] Guest/anonymous players support

### P2 - Medium Priority
- [ ] Phase 4: AI insights (high-confidence only)
- [ ] Phase 4: Tilt detection patterns
- [ ] Light theme option
- [ ] Export data to CSV

### P3 - Nice to Have
- [ ] Apple Sign-In (iOS)
- [ ] Narrative recaps
- [ ] Advanced analytics dashboard

---

## Next Tasks
1. Add RSVP system for scheduled games (calendar picker)
2. Implement browser push notifications
3. Add guest player support for non-registered friends
4. Begin AI scaffolding for Phase 3

---

## Architecture Notes
- All API routes prefixed with `/api`
- MongoDB collections: users, user_sessions, groups, group_members, game_nights, players, transactions, ledger, audit_logs, notifications, game_threads
- Settlement uses debt minimization algorithm
- Ledger entries locked after first status change
