# ODDSIDE PRD - Implementation Status

## Original Problem Statement
Build ODDSIDE - a behavioral ledger app for home poker games.
**Tagline: "Track. Settle. Dominate."**

## Latest Update: December 2025

### Auth System
- **Supabase Auth** (email/password) - CONFIGURED
- Supabase URL: https://hbqngvptbuvocjrozcgw.supabase.co
- Login and Signup pages with form validation
- JWT token verification on backend

### Design System
- **Color Scheme**: Dark theme with orange accent (#FF7043)
- **Font**: Inter (clean, modern sans-serif)
- **Logo**: Sharp geometric diamond in orange

### Game Features
- **Buy-in denominations**: $5, $10, $20, $50, $100 (dropdown)
- **Chip tracking**: Track chip value and count per player
- **Player limits**: Min 2 to start, max 20 per game
- **Add players mid-game**: Host/admin can add players after start
- **Settlement validation**: All players must cash out before settlement
- **Admin controls**: Cancel game, edit game name/location/date
- **Timestamps**: All actions logged with timestamps

### Database Collections (MongoDB)
- users, user_sessions
- groups, group_members, group_invites
- game_nights (with chip_value, chips_per_buy_in, location, timestamps)
- players (with total_chips, chips_returned, joined_at, cashed_out_at)
- transactions (with chips, chip_value, notes)
- ledger, audit_logs, notifications, game_threads

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
- **Auth**: Supabase Auth (email/password)

---

## What's Been Implemented ✅

### Phase 1 - Foundation (COMPLETE)
- [x] Auth + Profile (Supabase email/password)
- [x] Groups + Roles (admin/member)
- [x] Session logging (manual buy-in/cash-out)
- [x] Ledger + Settlement algorithm (debt minimization)

### Phase 2 - Core Differentiator (COMPLETE)
- [x] Game Night Mode (live game screen with timer)
- [x] Immutable ledger rules (locked after settlement)
- [x] Audit trail for edits
- [x] Notifications system
- [x] Game Thread (event-scoped messaging)

### Social & Gamification Features (COMPLETE - December 2025)
- [x] **User Search**: Search users by name or email (`/api/users/search`)
- [x] **Invite System**: 
  - InviteMembers component with search + email invite modes
  - Works for registered users (sends notification)
  - Works for non-registered users (invite waits for signup) - **Email sending MOCKED**
  - PendingInvites component shows incoming invitations
  - Accept/Reject invite functionality
- [x] **Badge & Level System**:
  - 5 Levels: Rookie → Regular → Pro → VIP → Legend
  - 12 Badges: First Blood, Hot Streak, On Fire, Big Winner, Jackpot, etc.
  - UserBadges component (full and compact views)
  - Progress tracking toward next level
  - Stats display (games, wins, profit, win rate)

### Rebranding (COMPLETE)
- [x] Name: ODDSIDE with tagline "Track. Settle. Dominate."
- [x] Sharp geometric diamond logo (SVG)
- [x] Light/Dark theme toggle
- [x] Full landing page redesign:
  - Hero section with gradient
  - 6 feature cards
  - "Why ODDSIDE?" comparison table
  - Testimonials section with 5-star ratings
  - CTA section
  - Footer with Legal & Support links

### Pages Implemented
1. **Landing Page** - Dark poker aesthetic with hero, features, testimonials
2. **Dashboard** - Net profit, win rate, balance, active games, groups, **pending invites**
3. **Groups Management** - Create, view groups
4. **Group Hub** - Members list, games list, leaderboard, **invite members with search**
5. **Game Night Mode** - Buy-in/Cash-out buttons, timer, players list, chip bank
6. **Settlement View** - Results, who-owes-whom, mark as paid
7. **Profile Page** - Stats, financial summary, pending balances, **badges & levels**
8. **Login/Signup** - Supabase email/password auth

### API Endpoints
- Auth: `/api/auth/sync-user`, `/api/auth/me`, `/api/auth/logout`
- Groups: CRUD + invite/remove members
- Games: CRUD + start/end/join/rsvp/add-player/cancel
- Transactions: buy-in, cash-out
- Settlement: generate, mark paid, edit (admin)
- Stats: personal, group leaderboard
- Notifications: list, mark read
- **Social (NEW)**:
  - `/api/users/search` - Search users by name/email
  - `/api/users/invites` - Get pending invites for current user
  - `/api/users/invites/{id}/respond` - Accept/reject invite
  - `/api/users/me/badges` - Get badges and level progress
  - `/api/groups/{id}/invite` - Invite by email
  - `/api/groups/{id}/invites` - List group invites (admin)

---

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Privacy Policy and Terms of Use pages (currently anchor links)
- [ ] Email notification service for invites (SendGrid or Resend)
- [ ] Verify Supabase auth keys with actual login test

### P1 - High Priority
- [ ] Enhanced dashboard with player stats visualization
- [ ] RSVP calendar integration for scheduled games
- [ ] Push notifications (browser)

### P2 - Medium Priority
- [ ] Phase 3: Natural language session logging (AI draft)
- [ ] Phase 3: OCR for chip stacks
- [ ] Guest/anonymous players support
- [ ] Shareable game result cards for social media

### P3 - Nice to Have
- [ ] Apple Sign-In (iOS)
- [ ] Animated "How It Works" section
- [ ] Advanced analytics dashboard
- [ ] Export data to CSV

---

## Known Issues / Technical Debt
1. **Email Invites MOCKED**: Invites for non-registered users are stored but no email is sent
2. **Supabase Key Format**: User provided key may need verification
3. **server.py Size**: 1300+ lines - should be refactored into modular routers
4. **N+1 Query Patterns**: Several endpoints have database query optimization opportunities

---

## Architecture Notes
- All API routes prefixed with `/api`
- MongoDB collections: users, user_sessions, groups, group_members, group_invites, game_nights, players, transactions, ledger, audit_logs, notifications, game_threads
- Settlement uses debt minimization algorithm
- Ledger entries locked after first status change
- Frontend uses Supabase client for auth, session token cookie as fallback
