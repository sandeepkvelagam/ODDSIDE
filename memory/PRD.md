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
- **Mobile-first responsive design**

### Game Features
- **Buy-in denominations**: Fixed $5, $10, $20, $50, $100 options
- **Chip tracking**: Track chip value and count per player
- **Player limits**: Min 2 to start, max 20 per game
- **Add players mid-game**: Host/admin can add players after start
- **Settlement validation**: All players must cash out before settlement
- **Admin-only buy-ins**: Host controls all buy-ins for players
- **Transaction history**: View all buy-ins per player with expandable details
- **Poker hand rankings reference**: Built-in sheet for quick reference
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
3. **Host (Contextual)** - User who starts a Game Night, controls buy-ins and game flow
4. **Admin (Structural)** - Group owner with elevated permissions

## Core Requirements
- 30-Second Rule: 90% of sessions loggable in under 30 seconds
- Progressive Disclosure: Advanced options hidden by default
- No Forced Socialization: Full participation without messaging
- AI Never Auto-Saves Money: All financial data requires confirmation
- Immutable Ledger: Locked records after settlement with audit trail
- Host-Controlled Buy-ins: Only host/admin can add buy-ins for players

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

### Social & Gamification Features (COMPLETE)
- [x] **User Search**: Search users by name or email
- [x] **Invite System**: InviteMembers with search + email invite
- [x] **Badge & Level System**: 5 Levels, 12 Badges
- [x] **PendingInvites**: Dashboard component for incoming invites

### Game Night UI Enhancements (COMPLETE - December 2025)
- [x] **Mobile-optimized design**: Responsive layout for all screen sizes
- [x] **Fixed buy-in denominations**: $5, $10, $20, $50, $100 buttons
- [x] **Host-only buy-ins**: Admin controls all player buy-ins
- [x] **Chip count display**: Show chips in play at game start
- [x] **Transaction details**: Expandable history per player showing buy-in count
- [x] **Cash-out with chips**: Enter chip count, auto-calculates value
- [x] **Poker hand rankings**: Built-in reference sheet accessible during game
- [x] **Player notifications**: Notify players when buy-in is added for them

### Rebranding (COMPLETE)
- [x] Name: ODDSIDE with tagline "Track. Settle. Dominate."
- [x] Sharp geometric diamond logo (SVG)
- [x] Light/Dark theme toggle
- [x] Full landing page with hero, features, testimonials

### Pages Implemented
1. **Landing Page** - Dark poker aesthetic with hero, features, testimonials
2. **Dashboard** - Net profit, win rate, balance, active games, pending invites
3. **Groups Management** - Create, view groups
4. **Group Hub** - Members, games, leaderboard, invite with search
5. **Game Night Mode** - Enhanced mobile-friendly with chip tracking
6. **Settlement View** - Results, who-owes-whom, mark as paid
7. **Profile Page** - Stats, badges, levels, financial summary
8. **Login/Signup** - Supabase email/password auth

### API Endpoints
- Auth: `/api/auth/sync-user`, `/api/auth/me`, `/api/auth/logout`
- Groups: CRUD + invite/remove members
- Games: CRUD + start/end/join/rsvp/add-player/cancel
- **NEW**: `/api/games/{id}/admin-buy-in` - Host adds buy-in for specific player
- Transactions: buy-in, cash-out (with chip count)
- Settlement: generate, mark paid, edit (admin)
- Stats: personal, group leaderboard
- Social: user search, invites, badges

---

## Prioritized Backlog

### P0 - Critical (Next Sprint)
- [ ] Privacy Policy and Terms of Use pages
- [ ] Email notification service for invites (SendGrid/Resend)
- [ ] Verify Supabase auth with actual login test
- [ ] Add "Request Buy-in" feature for players (notifies host)

### P1 - High Priority
- [ ] Enhanced dashboard with stats visualization (charts)
- [ ] RSVP calendar integration for scheduled games
- [ ] Push notifications (browser)
- [ ] Player borrowing/lending tracking within game
- [ ] Game history page with filtering

### P2 - Medium Priority
- [ ] Phase 3: Natural language session logging (AI draft)
- [ ] Phase 3: OCR for chip stacks
- [ ] Guest/anonymous players support
- [ ] Shareable game result cards for social media
- [ ] Light theme improvements

### P3 - Nice to Have
- [ ] Apple Sign-In (iOS)
- [ ] Animated "How It Works" section
- [ ] Advanced analytics dashboard
- [ ] Export data to CSV
- [ ] Integration with Venmo/PayPal for settlements

---

## Future Enhancement Ideas 💡

### Revenue & Growth
1. **Shareable Game Summary Cards** - Post results to social media for viral growth
2. **Premium Features** - Advanced analytics, custom chip designs, AI insights
3. **Referral System** - Invite friends, earn rewards
4. **Group Sponsorships** - Local poker clubs can sponsor groups

### User Experience
1. **Voice Commands** - "Hey ODDSIDE, add $20 buy-in for John"
2. **Apple Watch/Wear OS** - Quick buy-in from wrist
3. **Split Pot Calculator** - For side pots and all-in scenarios
4. **Blind Timer** - Tournament blind increase timer
5. **Sound Effects** - Chip sounds, notifications

### Social Features
1. **Global Leaderboards** - Compete with players worldwide
2. **Achievements Gallery** - Showcase earned badges
3. **Player Profiles** - Public profiles with stats
4. **Group Chat** - Persistent messaging for groups
5. **Game Replays** - Timeline view of game events

### AI Features (Phase 3+)
1. **Natural Language Logging** - "I put in 50 and cashed out 120"
2. **OCR Chip Counting** - Point camera at chips to count
3. **Tilt Detection** - Warn when player is on a losing streak
4. **Optimal Settlement** - Suggest who should pay whom to minimize transactions
5. **Game Predictions** - Who's likely to win based on patterns

---

## Known Issues / Technical Debt
1. **Email Invites MOCKED**: Invites stored but no email sent
2. **Supabase Key Format**: May need verification
3. **server.py Size**: 1500+ lines - should be refactored into modular routers
4. **N+1 Query Patterns**: Several endpoints have optimization opportunities

---

## Architecture Notes
- All API routes prefixed with `/api`
- MongoDB collections: users, user_sessions, groups, group_members, group_invites, game_nights, players, transactions, ledger, audit_logs, notifications, game_threads
- Settlement uses debt minimization algorithm
- Ledger entries locked after first status change
- Frontend uses Supabase client for auth, session token cookie as fallback
- Buy-ins controlled by host only via `/api/games/{id}/admin-buy-in`
