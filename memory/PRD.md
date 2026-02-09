# Kvitt PRD - Implementation Status

## Original Problem Statement
Build **Kvitt** - a behavioral ledger app for home poker games.
**Tagline: "Your side, settled."**

## Latest Update: December 2025 (Session 4)

### Current Session: Admin/Leave Group Flow Verification ✅
- Verified DELETE `/api/groups/{group_id}/members/{member_id}` endpoint is working
- Verified GroupHub.jsx has full UI implementation for:
  - Admin removing members (with confirmation dialog)
  - Members leaving groups (with confirmation dialog)  
  - Protection for players in active games
  - Proper role badges (Admin/Member)
- Frontend compilation verified and working

### Phase 1: AI-Light Features ✅

#### 1. AI Chat Assistant (Explain-Only)
- **Backend**: `/app/backend/ai_assistant.py` - OpenAI GPT-5.2 via Emergent key
- **Frontend**: `/app/frontend/src/components/AIAssistant.jsx` - Floating chat bubble
- **Endpoint**: POST `/api/assistant/ask`
- **Features**:
  - Quick answers for common questions (no API call)
  - AI responses for complex questions
  - Contextual system prompt about Kvitt
  - Cannot guess chip counts or make predictions
  - Suggestion buttons for first-time users

#### 2. Smart Defaults (Data-Driven)
- **Endpoint**: GET `/api/groups/{group_id}/smart-defaults`
- Returns median buy-in and chips based on group history
- Falls back to app defaults if no history
- **Frontend Integration**: GroupHub auto-loads smart defaults when creating games
- Shows "Based on X games" indicator in game creation dialog
- **Endpoint**: GET `/api/groups/{group_id}/frequent-players`
- Returns frequently invited players for quick game setup

#### 3. Real-Time WebSocket Integration in GameNight
- **Live connection indicator**: Green "Live" / Red "Offline" badge
- **Auto-refresh**: Game data updates when other players take actions
- **Toast notifications**: Real-time alerts for player joins, buy-ins, cash-outs
- **Live chat**: Messages appear instantly via WebSocket

---

### Phase 0: Foundation Infrastructure ✅

#### 1. WebSocket Real-Time Updates
- **Backend**: Socket.IO server integrated with FastAPI (`/app/backend/websocket_manager.py`)
- **Frontend**: WebSocket hook for games (`/app/frontend/src/hooks/useGameSocket.js`)
- **Events**: player_joined, buy_in, cash_out, chips_edited, message, game_state
- **Room-based**: Each game has its own room for targeted updates

#### 2. Game-Agnostic Event Schema
- **File**: `/app/backend/event_schema.py`
- **Supports**: poker, rummy, blackjack, other (extensible)
- **Event Types**: join, leave, buy_in, rebuy, cash_out, chips_edit, game_start, game_end, settle
- **Future-proof**: Ready for multi-game support

#### 3. Rule-Based Onboarding Guide
- **Component**: `/app/frontend/src/components/OnboardingGuide.jsx`
- **7-step flow**: Welcome → Create Group → Invite Friends → Start Game → During Game → Cash Out → Done
- **Features**:
  - Progress tracker
  - Contextual tips
  - Skip option
  - Help button in dashboard to replay

#### 4. Email Notifications (Resend)
- **Backend**: `/app/backend/email_service.py` - Resend integration
- **Beautiful HTML templates** with Kvitt branding
- **Email Types**:
  - `send_welcome_email` - New user registration
  - `send_group_invite_email` - Group invitations (registered & unregistered users)
  - `send_game_started_email` - Game start notifications
  - `send_settlement_ready_email` - Game settled with results
  - `send_payment_reminder_email` - Outstanding payment reminders
  - `send_login_notification_email` - Security login alerts
  - `send_chips_edited_email` - Host chip edit notifications
- **Async/Non-blocking**: Emails sent in background, don't slow down API

---

### Error Handling & Logging ✅

#### 1. Centralized Error Handler
- **Backend**: `/app/backend/error_handler.py`
- **Frontend**: `/app/frontend/src/lib/errorHandler.js`
- **Error Codes**: Standardized codes (AUTH_001, USER_001, etc.)
- **User-friendly messages**: Maps cryptic errors to helpful text

#### 2. Login Error Messages
- "Invalid email or password" → specific guidance
- "No account found" → suggest signup
- "Incorrect password" → link to reset
- "Network error" → connection troubleshooting
- "body locked/disturbed" → mapped to network error

#### 3. Supabase Error Mapping
- Maps all Supabase auth errors to user-friendly messages
- Handles rate limiting, email verification, disabled accounts

---

### Stripe Premium Subscriptions ✅

#### 1. Premium Plans
- **Monthly**: $4.99/month - Unlimited games, analytics, summaries
- **Yearly**: $39.99/year - 2 months free, advanced insights
- **Lifetime**: $99.99 - All features forever

#### 2. Backend Endpoints
- `GET /api/premium/plans` - List available plans
- `POST /api/premium/checkout` - Create Stripe checkout session
- `GET /api/premium/status/{session_id}` - Check payment status
- `GET /api/premium/me` - Get user's premium status
- `POST /api/webhook/stripe` - Handle Stripe webhooks

#### 3. Frontend Page
- `/premium` - Beautiful pricing page with plan comparison
- Auto-polls payment status after checkout
- Shows current plan if subscribed

---

### Previous Session Features ✅

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
- **Player notification**: Affected players notified of chip changes + EMAIL
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
- **NEW**: DELETE `/api/groups/{id}/members/{member_id}` - Remove member or leave group
- Games: CRUD, start/end/join
- **NEW**: `/api/games/{id}/request-buy-in` - Player requests buy-in
- **NEW**: `/api/games/{id}/request-cash-out` - Player requests cash-out
- **NEW**: `/api/games/{id}/admin-cash-out` - Host cashes out player
- **NEW**: `/api/games/{id}/edit-player-chips` - Host edits player chips post cash-out
- **NEW**: `/api/games/{id}/approve-join` - Auto adds default buy-in
- **NEW**: `/api/games/{id}/approve-buy-in` - Host approves buy-in request
- **NEW**: `/api/users/game-history` - User's game history with stats
- Settlement: generate, mark paid
- Social: user search, invites, badges

---

## Prioritized Backlog

### P0 - Critical (Completed This Session)
- [x] Auto buy-in on game start/join
- [x] Host edit chips after cash-out with notification
- [x] Notification navigation (View Game/Group buttons)
- [x] Group admin controls (remove/leave members)

### P1 - High Priority
- [ ] Email notification service for invites (SendGrid/Resend)
- [ ] Verify Supabase auth with actual login test
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
