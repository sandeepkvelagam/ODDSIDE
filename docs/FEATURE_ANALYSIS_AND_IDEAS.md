# Kvitt — Feature Analysis & Next-Level Ideas

## What Kvitt Does Today (Complete Summary)

**Kvitt** is a full-stack poker group management & settlement app with web (React), mobile (React Native/Expo), and FastAPI + MongoDB backend. Core problem: "we play poker with friends, now who owes who?"

### 1. Group Management
- Create/manage poker groups with configurable buy-in, chip values, currency
- Invite members via email, accept/reject invites
- Admin roles, transfer admin, remove members
- Group chat with real-time messaging (Socket.IO)
- AI-enabled group chat that participates in conversations

### 2. Game Night Lifecycle
- Create games with scheduling, location, custom buy-in/chip settings
- RSVP system (yes/maybe/no)
- Join requests with host approval
- Real-time buy-in and cash-out tracking (chips-based)
- Host approval queue for buy-ins, edit player chips
- Game thread (in-game chat)
- End game → automatic settlement calculation
- Cancel game with reason

### 3. Settlement & Ledger System
- Auto-calculates who owes who (minimized transactions)
- Ledger entries with paid/unpaid status
- Request payment, confirm received
- Ledger consolidation & optimization across multiple games
- Full audit logging

### 4. Wallet System (Stripe-powered)
- In-app wallet with cent-based accounting (no float precision issues)
- PIN protection (bcrypt hashed), lockout after 5 failures
- Deposit via Stripe checkout
- Peer-to-peer transfers via wallet ID or QR code scan
- Withdrawal requests
- Daily/per-transaction limits, fraud detection
- Immutable transaction ledger
- Rate limiting on all operations

### 5. AI Agent System (Claude/OpenAI powered)
- **AI Orchestrator**: Central router using Claude tool-use API
- **12 specialized agents**: Analytics, Engagement, Feedback, Game Planner, Game Setup, Group Chat, Host Persona, Notification, Payment Reconciliation, User Automation
- **24+ tools**: Poker evaluator, notification sender, game manager, scheduler, report generator, email sender, engagement scorer/planner/policy, feedback collector/classifier/auto-fixer, ledger reconciler, automation builder/runner/policy
- **Poker AI**: Deterministic hand evaluator + LLM strategy suggestions
- **Smart Scheduler**: Suggests game times based on group history, weather, holidays, recency
- **Host Persona**: AI assistant automating entire game lifecycle
- **Voice transcription**: Whisper-based voice commands

### 6. Engagement Engine
- Engagement scoring per user and group
- Automated nudges for inactive groups (14+ days)
- Milestone celebrations (first win, streaks, big wins, centurion)
- Re-engagement for lapsed users (30+ days)
- Weekly digest for hosts
- Policy gating (rate limits, quiet hours, tone control)

### 7. Feedback System
- Post-game surveys with star ratings
- AI-powered feedback classification
- Auto-fixer: AI detects issues and proposes fixes
- Feedback trends and health scoring
- User-confirmable fixes

### 8. Automations (IFTTT-style)
- User-defined trigger → action workflows
- Event-based, schedule-based, condition-based triggers
- Actions: notifications, emails, payment reminders, auto-RSVP, create game, generate summary
- Health monitoring, auto-disable on consecutive errors
- Templates library

### 9. Spotify Integration
- Full playback control (play/pause/skip/volume/shuffle/repeat/seek)
- Search, playlists, liked songs browser
- Device switching
- Host controls during game night

### 10. Premium / Monetization
- Stripe premium tiers: Monthly ($4.99), Yearly ($39.99), Lifetime ($99.99)
- Features: unlimited games, analytics, monthly summaries, data export

### 11. Real-Time Infrastructure
- Socket.IO for live game updates, chat, notifications
- Push notifications (Expo Push Service → APNs/FCM)
- Deep linking from notifications to correct screens
- Typing indicators in group chat

### 12. Gamification
- Player levels: Rookie → Regular → Pro → VIP → Legend
- 12 badges: First Blood, Hot Streak, On Fire, Big Winner, Jackpot, Dedicated, Veteran, Centurion, Host Master, Comeback Kid, Consistent, Social Butterfly
- Player stats and game history

### 13. Other
- Supabase auth (JWKS/RS256 + HS256 fallback)
- Transactional emails (Resend)
- Landing page with animated demos
- Email subscriber/waitlist system
- i18n support
- Dark/light theme
- "Liquid Glass" design system on mobile
- Onboarding agent (chat-based walkthrough)

### Tech Stack
- **Frontend**: React, TailwindCSS, shadcn/ui
- **Mobile**: React Native, Expo SDK 54, NativeWind
- **Backend**: FastAPI, MongoDB (Motor), Socket.IO
- **Auth**: Supabase
- **Payments**: Stripe
- **AI**: OpenAI GPT-4o, Whisper, Claude (tool-use)
- **Email**: Resend
- **Music**: Spotify Web API

---

## Next-Level Ideas

### TIER 1: Game-Changing Social Features

#### 1. Live Spectator Mode & Game Casting
- Non-players follow a live game in real-time (chip counts, buy-ins, cash-outs updating live)
- "Cast" your game night to friends — like a sports ticker for poker
- Optional anonymous mode to hide exact amounts

#### 2. Season System & Leaderboards
- Monthly/quarterly/yearly "seasons" with group rankings
- Points system (games played, profit, consistency, hosting)
- End-of-season awards: MVP, Most Improved, Iron Man (never missed), Biggest Comeback
- Cross-group leaderboards for users in multiple groups
- "Season Pass" with visual progression (think Battle Pass for poker)

#### 3. Head-to-Head Rivalries
- Auto-detect rivalries: players who consistently play against each other
- H2H stats: lifetime record, biggest swings, streak against each other
- Rivalry badges and notifications ("You've beaten Alex 5 times in a row!")

#### 4. Social Feed / Activity Timeline
- Instagram-like feed of game results, achievements, milestones
- Reactions to results (congrats, trash talk emojis)
- Share game summaries as beautiful cards to Instagram/WhatsApp stories
- "Wrapped" — annual stats summary (like Spotify Wrapped for poker)

---

### TIER 2: AI-Powered Intelligence

#### 5. AI Game Recap & Storytelling
- After every game, AI generates a narrative recap
- Highlights key moments (biggest swings, comebacks, eliminations)
- Shareable recap cards with the story

#### 6. Bankroll Management AI
- Track each player's overall bankroll across all groups
- AI advisor: "You're on a 3-game losing streak, consider dropping stakes"
- Recommended buy-in amounts based on bankroll management principles
- "Risk score" per player per session

#### 7. Player Personality Profiles (AI-generated)
- AI analyzes patterns: "The Shark" (consistently profitable), "The Maniac" (high variance), "The Rock" (small edges)
- Evolving profiles that change over time
- "You tend to run hot in the first hour then tilt after midnight"

#### 8. AI Photo Recap
- Players snap photos during game night
- AI stitches them into a recap with game data overlaid
- Auto-generated game night collage

---

### TIER 3: Monetization & Growth

#### 9. Venue / Home Game Marketplace
- List your space as available for hosting
- Browse nearby game-friendly locations
- Ratings and reviews for venues
- "Host for hire" — experienced hosts who organize for a cut

#### 10. Stake-Finding / Group Discovery
- "Find a game" — match with groups near you at your stake level
- Skill-based matching (pair similar experience levels)
- Guest system: groups can open a seat to vetted strangers
- Think "pickup basketball" but for poker

#### 11. Premium Equipment Marketplace
- Partner with poker equipment brands
- Recommend chip sets, cards, tables based on group size/stakes
- Affiliate revenue stream

---

### TIER 4: The Wild Differentiators

#### 12. Blinds Timer & Tournament Mode
- Built-in tournament clock with blind levels, antes, breaks
- Visual timer synced on everyone's phone in real-time
- Auto-announces blind increases via push notification
- SNG / MTT structure presets
- Chip-up reminders, break timers

#### 13. Live Chip Tracking via Camera (AR)
- Phone camera scans and counts physical chip stacks
- AR overlay showing chip values
- Auto-populate buy-in/cash-out amounts from a chip photo
- Killer feature no poker app has

#### 14. Venmo/Zelle/PayPal Deep Integration
- One-tap "Pay via Venmo" from settlement screen
- Auto-detect when payments complete via deep links
- Settlement auto-closes when all payments confirmed

#### 15. Apple Watch / Wearable Companion
- Glanceable chip count on your wrist
- Haptic buzz when blinds go up
- Quick buy-in/cash-out from the watch

#### 16. Game Night Bot (WhatsApp/iMessage/Telegram)
- Bot lives in existing group chat
- "/plan friday" → polls availability, suggests times, creates game
- "/buyin 20" → records buy-in without opening the app
- Meets users where they already are

#### 17. Poker Hand History Import
- Import hand histories from online poker sites (PokerStars, GGPoker)
- Unified stats across live and online play
- AI analyzes both and finds leaks

#### 18. Collectible Achievement Cards
- Digital collectible cards for achievements
- Tradeable within the platform
- Display case on profile
- Limited edition event cards

#### 19. AI Dealer Voice (Text-to-Speech)
- During tournament mode, AI announces blinds, breaks, eliminations through speaker
- Customizable dealer voices (professional, funny, dramatic)
- "Blinds are now 100/200. 4 players remaining. Average stack: 5,000 chips."

#### 20. Multi-Table Game Night
- Run multiple tables simultaneously for bigger groups
- Cross-table leaderboard
- Table balancing suggestions from AI
- Final table merge functionality

---

## Competitive Research — What to Look At

| App | What to steal |
|-----|--------------|
| **Pokerbase** | Clean game tracking UX, tournament support |
| **Poker Bankroll Tracker** | Bankroll management, session logging, graphs |
| **PokerNow** | Live online poker play (real cards dealt digitally) |
| **Splitwise** | Debt simplification, recurring expenses, multi-currency |
| **Venmo/Cash App** | Social feed for payments, instant transfers |
| **FanDuel/DraftKings** | Season system, leaderboards, daily contests |
| **Strava** | Social tracking → apply to poker (streaks, personal records) |
| **Discord** | Bot integrations, voice channels, role management |
| **Spotify Wrapped** | Annual stats recap — do this for poker |
