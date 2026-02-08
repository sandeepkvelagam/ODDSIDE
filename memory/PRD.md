# Kvitt PRD - Implementation Status

## Original Problem Statement
Build **Kvitt** - a behavioral ledger app for home poker games.
**Tagline: "Your side, settled."**

## Latest Update: December 2025 (Session 2)

### New Features Implemented This Session ✅

#### 1. Auto Buy-In on Game Start/Join
- **Host auto buy-in**: When creating an active game, host automatically receives default buy-in and chips
- **Player auto buy-in on approve**: When host approves a join request, player auto-receives default buy-in
- Transaction records automatically created with "Initial buy-in (auto)" note
- `total_chips_distributed` properly tracked in game

#### 2. Group Admin Controls
- **Admin can remove members**: DELETE `/api/groups/{group_id}/members/{member_id}`
- **Cannot remove players in active games**: Protection against removing players who haven't cashed out
- **Players can leave groups**: Stats are preserved when leaving
- **Notification on removal**: Removed members receive notification

#### 3. Host Post-Game Edit Permissions
- **Edit chips after cash-out**: POST `/api/games/{game_id}/edit-player-chips`
- **Player notification**: Affected players notified of chip changes
- **Audit trail**: Changes logged in audit_logs
- **System message**: Edit recorded in game thread

#### 4. Notification Navigation
- **View Game button**: Click to navigate to relevant game
- **View Group button**: Click to navigate to relevant group
- **Accept/Decline for invites**: Group invite notifications have action buttons

#### 5. UI Font Size Improvements
- GroupHub: Members, games, leaderboard - all reduced font sizes
- Settlement: Summary, results, payments - cleaner layout
- Better mobile responsiveness

#### 6. Request Join Button
- Added "Join" button on games list for non-players
- Status badges for pending/joined players

---

### Rebrand Complete
- **Name**: Kvitt (from ODDSIDE)
- **Tagline**: "Your side, settled." with "settled." in accent color
- **Logo**: Stylized K mark in charcoal with orange accent
- **Default Theme**: Light (cream/off-white background)
- **Color Palette**:
  - Background: Off-white/cream (#F8F7F3)
  - Text: Dark muted gray (#4A4A4A)
  - Accent: Warm peachy orange (#EF6E59)
  - Buttons: Charcoal (#262626)

### Auth System
- **Supabase Auth** (email/password) - CONFIGURED
- Login and Signup pages with form validation
- JWT token verification on backend

### Game Features
- **Buy-in denominations**: Fixed $5, $10, $20, $50, $100 options
- **Request Buy-In**: Players can request buy-in (notifies host)
- **Admin-only buy-in approval**: Host adds chips after request
- **Cash-out flow**: Player enters chip count → Host approves
- **Admin cash-out**: Host can cash out any player at any time
- **Settlement validation**: All players must cash out before ending
- **Notifications**: All actions notify relevant parties

### Database Collections (MongoDB)
- users, user_sessions
- groups, group_members, group_invites
- game_nights
- players (with cashed_out, chips_returned, net_result)
- transactions
- ledger, audit_logs, notifications, game_threads

## Tech Stack
- **Frontend**: React 19 + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: Supabase Auth (email/password)

---

## What's Been Implemented ✅

### Phase 1 - Foundation (COMPLETE)
- [x] Auth + Profile (Supabase email/password)
- [x] Groups + Roles (admin/member)
- [x] Session logging (buy-in/cash-out)
- [x] Ledger + Settlement algorithm

### Phase 2 - Core Differentiator (COMPLETE)
- [x] Game Night Mode (live game with timer)
- [x] Immutable ledger rules
- [x] Audit trail
- [x] Notifications system
- [x] Game Thread messaging

### Social & Gamification (COMPLETE)
- [x] User Search
- [x] Invite System
- [x] Badge & Level System (5 levels, 12 badges)

### Game Night Enhancements (COMPLETE - December 2025)
- [x] **Request Buy-In**: Players request, host notified
- [x] **Player Cash-Out**: Enter chip count, sends to host for approval
- [x] **Admin Cash-Out**: Host can cash out any player with chip count
- [x] **Notifications**: Buy-in requests, cash-out approvals notify users
- [x] **Transaction history**: Expandable per-player view
- [x] **Poker hand rankings**: Built-in reference sheet

### Landing Page & Legal (COMPLETE)
- [x] **Scroll animations**: Fade-in/slide-up on scroll (31 animated elements)
- [x] **Privacy Policy page** (/privacy) - 7 sections
- [x] **Terms of Use page** (/terms) - 10 sections
- [x] **Game History page** (/history) - Filter, sort, stats

### Kvitt Rebranding (COMPLETE)
- [x] Logo with tagline in header and footer
- [x] Light theme default
- [x] Charcoal buttons
- [x] Updated all page footers

### Pages Implemented
1. **Landing Page** - Scroll animations, Kvitt branding
2. **Dashboard** - Stats, pending invites
3. **Groups Management** - Create, view
4. **Group Hub** - Members, games, invite
5. **Game Night** - Request buy-in, cash-out, admin controls
6. **Settlement** - Results, payment tracking
7. **Profile** - Stats, badges
8. **Privacy Policy** - 7 sections
9. **Terms of Use** - 10 sections
10. **Game History** - Past games with filtering

### API Endpoints
- Auth: sync-user, me, logout
- Groups: CRUD, invite/remove
- Games: CRUD, start/end/join
- **NEW**: `/api/games/{id}/request-buy-in` - Player requests buy-in
- **NEW**: `/api/games/{id}/request-cash-out` - Player requests cash-out
- **NEW**: `/api/games/{id}/admin-cash-out` - Host cashes out player
- **NEW**: `/api/users/game-history` - User's game history with stats
- Settlement: generate, mark paid
- Social: user search, invites, badges

---

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Email notification service for invites (SendGrid/Resend)
- [ ] Verify Supabase auth with actual login test

### P1 - High Priority
- [ ] Enhanced dashboard with charts
- [ ] RSVP calendar for scheduled games
- [ ] Push notifications (browser)

### P2 - Medium Priority
- [ ] AI: Natural language session logging
- [ ] AI: OCR for chip stacks
- [ ] Shareable game result cards

### P3 - Nice to Have
- [ ] Apple Sign-In
- [ ] Export data to CSV
- [ ] Venmo/PayPal integration

---

## Known Issues / Technical Debt
1. **Email Invites MOCKED**: Stored but no email sent
2. **server.py Size**: 1700+ lines - refactor needed

---

## Architecture Notes
- All API routes prefixed with `/api`
- Settlement uses debt minimization algorithm
- Cash-out flow: Player request → Host approval via admin-cash-out
- Notifications sent for all buy-in/cash-out actions
