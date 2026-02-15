# ODDSIDE Horizontal Expansion Plan: Rummy & Multi-Game Support

## Part 1: What the App Currently Lacks

### Critical Gaps
1. **Single game type** — Everything is hardcoded for poker (chip-based buy-in/cash-out model). No abstraction layer for different game types.
2. **No round/hand tracking** — Poker page tracks total chips but not individual hands. This is fine for poker but blocks point-based games like rummy.
3. **Fixed denominations** — Buy-in amounts locked to [5, 10, 20, 50, 100]. No custom amounts.
4. **No recurring games** — Can't schedule "every Thursday 8pm" games.
5. **No game templates** — Users recreate the same setup every time.
6. **No spectator mode** — Must join to see a live game.
7. **No friend system** — Only group-based connections. Can't add individual friends.
8. **No tournament support** — No elimination brackets or multi-table games.
9. **No export/share** — Can't share results on social media or export to CSV.
10. **Stats not segmented by game type** — Once you add rummy, poker stats and rummy stats will be mixed together unless separated.

### Nice-to-Have Improvements
- Push notifications (currently only in-app)
- Dark/light theme toggle
- Game replay/timeline view
- Customizable avatars or player colors
- Voice/video chat integration
- Offline mode for mobile

---

## Part 2: Horizontal Expansion Strategy

### Architecture Change: Game Type Abstraction

The core idea: introduce a `game_type` field and make the game engine pluggable.

```
Current:  Group → GameNight (poker only) → Players → Transactions (buy-in/cash-out)
Proposed: Group → GameSession → GameType Config → Players → Scoring Engine
```

### Supported Game Types (Phase 1)
| Game Type | Scoring Model | Key Mechanic |
|-----------|--------------|--------------|
| **Poker** (existing) | Chip-based | Buy-in → Chips → Cash-out → Settlement |
| **Rummy** (new) | Point-based | Rounds → Points per player → Running total → Settlement |

### Future Game Types (Phase 2+)
| Game Type | Scoring Model | Key Mechanic |
|-----------|--------------|--------------|
| **Teen Patti** | Pot-based | Similar to poker, blind/seen betting |
| **UNO** | Point-based | Points from cards left in hand |
| **Mahjong** | Point-based | Scoring based on winning hand type |
| **Blackjack** | Chip-based | House vs players, chip tracking |
| **Generic Card Game** | Configurable | Custom scoring rules |

---

## Part 3: Rummy Game — Detailed Feature Plan

### 3.1 How Rummy Differs from Poker

| Aspect | Poker (Current) | Rummy (New) |
|--------|-----------------|-------------|
| **Scoring** | Chips (buy-in/cash-out) | Points per round |
| **Rounds** | Single session | Multiple rounds per session |
| **Currency unit** | Chip value ($/chip) | Point value ($/point) |
| **Player action** | Buy-in, Cash-out | Score entry per round |
| **Winner determination** | Chip count at cash-out | Lowest points / Declare |
| **Settlement** | chip_diff × chip_value | point_diff × point_value |
| **Special mechanics** | Rebuy, All-in | Drop, Middle Drop, Declare, Deadwood |

### 3.2 Rummy Variants to Support

**Indian Rummy (13 Cards)** — Primary
- 13 cards dealt
- Must form valid sets and sequences (at least one pure sequence)
- Declare when done → other players count deadwood points
- Drop (0 cards played): Fixed penalty (e.g., 20 points)
- Middle Drop (some cards played): Fixed penalty (e.g., 40 points)
- Full count (didn't declare): 80 points max
- Winner gets 0 points

**Points Rummy** — Quick variant
- Single round
- Loser pays winner: loser_points × point_value

**Pool Rummy (101/201)** — Elimination variant
- Players eliminated when total crosses 101 or 201 points
- Last player standing wins
- Rejoin option at threshold

**Deals Rummy** — Fixed rounds
- Pre-decided number of deals
- Chips distributed at start
- Winner of each deal gets loser chips

### 3.3 Data Models

#### RummyGameConfig (new)
```
game_id: str (links to GameSession)
variant: str (points_rummy | pool_101 | pool_201 | deals)
point_value: float (e.g., 1.0 = ₹1 per point)
max_points: int (80 for Indian Rummy)
drop_score: int (20)
middle_drop_score: int (40)
full_count_score: int (80)
pool_limit: Optional[int] (101 or 201 for pool rummy)
num_deals: Optional[int] (for deals rummy)
joker_rules: str (standard | no_joker)
```

#### RummyRound (new)
```
round_id: str
game_id: str
round_number: int
dealer_user_id: Optional[str]
winner_user_id: str
scores: List[RummyPlayerScore]
started_at: datetime
ended_at: datetime
notes: Optional[str]
```

#### RummyPlayerScore (new)
```
user_id: str
points: int (0 for winner)
status: str (won | lost | dropped | middle_dropped)
deadwood_points: Optional[int]
```

#### Updated GameSession Model (modified GameNight)
```
game_id: str
group_id: str
host_id: str
game_type: str (poker | rummy)        ← NEW
title: Optional[str]
status: str (scheduled | active | ended | settled)
created_at: datetime
... existing fields ...

# Poker-specific (only when game_type=poker)
chip_value: Optional[float]
chips_per_buy_in: Optional[int]
buy_in_amount: Optional[float]
total_chips_distributed: Optional[int]
total_chips_returned: Optional[int]

# Rummy-specific (only when game_type=rummy)
rummy_config: Optional[RummyGameConfig]  ← NEW
current_round: Optional[int]             ← NEW
total_rounds: Optional[int]              ← NEW
```

### 3.4 Backend API Endpoints (New)

```
POST   /games                              ← Modified: accept game_type + config
GET    /games/{game_id}                     ← Modified: return type-specific data

# Rummy-specific endpoints
POST   /games/{game_id}/rounds              → Start a new round
PUT    /games/{game_id}/rounds/{round_id}   → Submit scores for a round
GET    /games/{game_id}/rounds              → Get all rounds with scores
DELETE /games/{game_id}/rounds/{round_id}   → Delete last round (undo)
GET    /games/{game_id}/scoreboard          → Running totals for all players
POST   /games/{game_id}/drop               → Record a player drop
POST   /games/{game_id}/settle              ← Modified: handle point-based settlement
```

### 3.5 Rummy Settlement Algorithm

```
For each pair of players (A, B):
  point_diff = A.total_points - B.total_points
  If A has more points (lost more):
    A owes B: point_diff × point_value

Optimized: Use same debt-matching algorithm as poker
  - Calculate net_result per player:
    net_result = (average_points - player_points) × point_value
    (Lower points = positive result = winner)
  - Feed into existing settlement optimizer
```

### 3.6 Rummy Game Page — UI/UX Design

#### Page Layout (matching poker page structure)

```
┌─────────────────────────────────────────────┐
│  ← Back to Group    RUMMY    🟢 Live        │
│  "Friday Night Rummy"                        │
│  Pool 101 • ₹2/point                         │
├─────────────────────────────────────────────┤
│                                              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│  │ Rounds   │ │ Players  │ │   Pot    │    │
│  │   12     │ │    5     │ │  ₹2,450  │    │
│  └──────────┘ └──────────┘ └──────────┘    │
│                                              │
│  ┌─── SCOREBOARD ──────────────────────┐    │
│  │ #  Player    R1  R2  R3  R4  Total  │    │
│  │ 1  Sandeep    0  23   0  15    38   │    │
│  │ 2  Rahul     45   0  30   0    75   │    │
│  │ 3  Priya     20  40  55  25   140 ❌│    │
│  │ 4  Amit      80  15   0  40   135   │    │
│  │ 5  Neha       0  35  20   0    55   │    │
│  └─────────────────────────────────────┘    │
│                                              │
│  ❌ = Eliminated (Pool 101 crossed)          │
│                                              │
├─── HOST CONTROLS ───────────────────────────┤
│  [+ New Round]  [Record Drop]  [End Game]   │
│                                              │
├─── CURRENT ROUND (Round 5) ─────────────────┤
│  Enter scores:                               │
│  Sandeep:  [___] pts   ⭐ Winner (0)        │
│  Rahul:    [___] pts                         │
│  Amit:     [___] pts                         │
│  Neha:     [___] pts                         │
│                                              │
│  [Submit Round]                              │
│                                              │
├─── GAME THREAD ─────────────────────────────┤
│  🏆 Round 4: Sandeep wins!                   │
│  📋 Scores: Rahul 0, Amit 40, Neha 0...     │
│  💬 "Nice declare!" - Rahul                  │
│  ❌ Priya eliminated (total: 140 > 101)      │
└─────────────────────────────────────────────┘
```

#### Key UI Components

**1. Scoreboard Table (new component)**
- Scrollable table with all rounds as columns
- Player rows sorted by total points (ascending = winning)
- Color coding: Green (winner/low), Red (eliminated/high)
- Pool limit indicator line (at 101 or 201)
- Tap round column to expand/edit that round's scores

**2. Score Entry Sheet (new component)**
- Opens when host clicks "+ New Round"
- Lists all active (non-eliminated) players
- Number input for each player's deadwood points
- "Winner" toggle — auto-sets to 0 points
- Quick-entry buttons: [Drop: 20] [Mid-Drop: 40] [Full: 80]
- Shows running total preview before submission
- Validates: exactly one winner with 0 points

**3. Round History Cards (new component)**
- Collapsible cards for each completed round
- Shows: Round #, Winner, all scores
- "Undo" button on last round only
- Timestamp per round

**4. Elimination Banner (for Pool Rummy)**
- Red banner when a player crosses the pool limit
- "Priya has been eliminated (141/101 points)"
- Eliminated players grayed out in scoreboard
- Optional: "Rejoin" button if group allows it

**5. Game Stats Panel (new component)**
- Current leader
- Average points per round
- Rounds played / remaining (for deals rummy)
- Fastest declare
- Most drops

**6. Settlement Integration**
- Same SettlementCalculator animation
- Instead of chips: "Based on point differences"
- Shows: "Rahul (75 pts) → owes Sandeep (38 pts): 37 × ₹2 = ₹74"

#### Comparison: Poker vs Rummy Game Page

| Section | Poker Page | Rummy Page |
|---------|-----------|------------|
| **Header stats** | Chips distributed, Players, Pot, Duration | Rounds, Players, Pot, Duration |
| **Main content** | Player list with chip counts | Scoreboard table with round scores |
| **Host controls** | Buy-In, Cash-Out, Add Player | New Round, Record Drop, Add Player |
| **Player actions** | Request Buy-In, Cash Out | (scores entered by host) |
| **Real-time** | Socket updates on buy-in/cash-out | Socket updates on round completion |
| **AI Assistant** | Poker hand analyzer | Rummy strategy tips |
| **Settlement** | chip_diff × chip_value | point_diff × point_value |
| **Special** | Poker hand rankings sheet | Rummy rules & valid melds reference |

### 3.7 Game Creation Flow (Modified GroupHub)

```
Current:
  [Start Game] → Buy-in dialog → Create poker game

Proposed:
  [Start Game] → Game Type Selector → Type-specific config → Create game

  ┌─── Choose Game Type ───────────┐
  │                                 │
  │   🃏 Poker          🎴 Rummy   │
  │   Chip-based         Points     │
  │                                 │
  │   (future: Teen Patti, UNO...) │
  └─────────────────────────────────┘

  If Poker selected → existing buy-in/chips dialog
  If Rummy selected:
  ┌─── Rummy Setup ────────────────┐
  │                                 │
  │  Variant:                       │
  │  ○ Points Rummy (quick)        │
  │  ○ Pool 101                    │
  │  ○ Pool 201                    │
  │  ○ Deals Rummy                 │
  │                                 │
  │  Point Value: [₹___] per point │
  │  (Suggestions: ₹0.5, ₹1, ₹2)  │
  │                                 │
  │  Drop Score:     [20]          │
  │  Mid-Drop Score: [40]          │
  │  Max Points:     [80]          │
  │                                 │
  │  Players: (same as poker)       │
  │  ☑ Sandeep  ☑ Rahul  ☐ Priya  │
  │                                 │
  │  [Start Game]                   │
  └─────────────────────────────────┘
```

### 3.8 Implementation Phases

#### Phase 1: Foundation (Backend + Models)
- Add `game_type` field to GameNight model
- Create RummyGameConfig, RummyRound, RummyPlayerScore models
- Add rummy-specific API endpoints (rounds, scoreboard, drop)
- Modify game creation endpoint to accept game_type + config
- Modify settlement to support point-based calculation
- Add MongoDB indexes for new collections

#### Phase 2: Rummy Game Page (Frontend)
- Create RummyGameNight.jsx page (or modify GameNight with type switch)
- Build Scoreboard component
- Build ScoreEntry sheet
- Build RoundHistory cards
- Build EliminationBanner
- Wire up Socket.IO for round updates

#### Phase 3: Game Creation & Navigation
- Add game type selector to GroupHub
- Rummy-specific configuration dialog
- Update Dashboard stats to segment by game type
- Update GameHistory filters for game type
- Update group leaderboard for game type

#### Phase 4: Polish & Features
- Rummy rules reference sheet
- AI Rummy assistant
- Smart defaults for rummy (based on group history)
- Mobile RummyGameNight screen
- Rummy-specific notifications

---

## Part 4: Other Features to Introduce

### High Priority
1. **Game type selector** — Foundation for horizontal expansion
2. **Recurring game scheduling** — "Every Thursday at 8pm"
3. **Game templates** — Save & reuse favorite configurations
4. **Push notifications** — Mobile + browser
5. **Per-game-type stats** — Separate poker and rummy stats

### Medium Priority
6. **Friend system** — Add friends, see their activity
7. **Spectator mode** — Watch games without joining
8. **Game history export** — CSV/PDF export
9. **Social sharing** — Share results to WhatsApp/Instagram stories
10. **Custom buy-in amounts** — Remove fixed [5,10,20,50,100] restriction

### Low Priority
11. **Tournament mode** — Multi-round elimination brackets
12. **Achievement expansion** — Game-type-specific badges
13. **Dark/light theme** — User preference
14. **Offline mode** — Cache game state for mobile
15. **Voice chat** — In-game voice during play
