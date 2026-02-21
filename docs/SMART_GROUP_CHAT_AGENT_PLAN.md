# Smart Group Chat Agent — Architecture Plan

## What We're Building

An AI agent that **participates in group chat like a real group member** — understanding ongoing conversations, proactively suggesting games, polling availability, sending reminders, and keeping the host updated. It's not a bot that responds to commands — it's a group member that happens to be intelligent.

---

## Current State (What Exists)

| Component | Status | Details |
|-----------|--------|---------|
| Game-level chat | Exists | `game_threads` collection, WebSocket delivery via `game_update` event |
| Group-level chat | **MISSING** | No group messaging at all |
| WebSocket rooms | Game only | `game_{game_id}` rooms, no group rooms |
| Push notifications | Exists | Expo push via `send_push_notification_to_user()` |
| AI assistant | Exists | Explainer-only chatbot (GPT), cannot access real data |
| Group system | Exists | `groups` + `group_members` collections, admin/member roles |
| Event listener | Exists | Routes game events to HostPersonaAgent |
| AI orchestrator | Exists | Claude tool-use routing (just upgraded) |

**Key gap:** There is no group-level chat. The AI agent needs a group chat to participate in.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    SMART GROUP CHAT AGENT                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │
│  │ ChatWatcher   │  │ GamePlanner  │  │ ContextProvider       │ │
│  │ Service       │  │ Agent        │  │ (Weather/Holidays)    │ │
│  │               │  │              │  │                       │ │
│  │ • Reads group │  │ • Suggests   │  │ • Holiday calendar    │ │
│  │   messages    │  │   game times │  │ • Weather forecasts   │ │
│  │ • Detects     │  │ • Polls      │  │ • Long weekends       │ │
│  │   relevant    │  │   members    │  │ • Group patterns      │ │
│  │   moments     │  │ • Re-proposes│  │                       │ │
│  │ • Decides     │  │ • Creates    │  │                       │ │
│  │   when to     │  │   games     │  │                       │ │
│  │   respond     │  │ • Sends      │  │                       │ │
│  │               │  │   invites    │  │                       │ │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘ │
│         │                  │                       │             │
│         ▼                  ▼                       ▼             │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              GroupChatAgent (BaseAgent)                   │    │
│  │                                                          │    │
│  │  • Generates contextual responses via Claude             │    │
│  │  • Posts messages as "ODDSIDE" group member              │    │
│  │  • Manages conversation memory (last N messages)         │    │
│  │  • Throttled: max 1 message per 5 min per group          │    │
│  │  • Personality: Casual, fun, game-focused                │    │
│  └──────────────────────┬───────────────────────────────────┘    │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
            ┌─────────────┼─────────────┐
            ▼             ▼             ▼
     ┌──────────┐  ┌──────────┐  ┌──────────┐
     │ Group    │  │ WebSocket│  │ Push     │
     │ Messages │  │ Rooms    │  │ Notifs   │
     │ (DB)     │  │ (live)   │  │ (Expo)   │
     └──────────┘  └──────────┘  └──────────┘
```

---

## Phase 1: Group Chat Infrastructure

Before the AI can participate, we need group chat to exist.

### 1.1 Database: `group_messages` Collection

```python
group_messages = {
    "message_id": str,           # "gmsg_{uuid[:12]}"
    "group_id": str,             # Which group
    "user_id": str,              # Who sent it (or "system" / "ai_assistant")
    "content": str,              # Message text
    "type": str,                 # "user", "system", "ai"
    "reply_to": Optional[str],   # message_id for threading
    "metadata": Optional[Dict],  # Extra data (poll_id, game_id, etc.)
    "created_at": datetime,
    "edited_at": Optional[datetime],
    "deleted": bool              # Soft delete (default: False)
}

# Indexes:
# - (group_id, created_at) — for fetching messages in order
# - (group_id, user_id) — for per-user message history
# - (message_id) — unique lookup
```

### 1.2 API Endpoints

```
POST /api/groups/{group_id}/messages          # Send message
GET  /api/groups/{group_id}/messages          # Get messages (paginated, cursor-based)
     ?limit=50&before={message_id}
PUT  /api/groups/{group_id}/messages/{id}     # Edit message
DELETE /api/groups/{group_id}/messages/{id}   # Soft-delete message
```

### 1.3 WebSocket: Group Rooms

```python
# New event handlers in websocket_manager.py

@sio.event
async def join_group(sid, data):
    """Join a group's chat room"""
    group_id = data.get("group_id")
    # Verify membership
    room = f"group_{group_id}"
    sio.enter_room(sid, room)

@sio.event
async def leave_group(sid, data):
    group_id = data.get("group_id")
    room = f"group_{group_id}"
    sio.leave_room(sid, room)

# New emitter
async def emit_group_message(group_id, message_data):
    """Broadcast a message to all group members in the room"""
    await sio.emit("group_message", message_data, room=f"group_{group_id}")

async def emit_group_typing(group_id, user_id, user_name):
    """Broadcast typing indicator"""
    await sio.emit("group_typing", {
        "group_id": group_id,
        "user_id": user_id,
        "user_name": user_name
    }, room=f"group_{group_id}")
```

---

## Phase 2: GroupChatAgent — The AI Group Member

### 2.1 Agent Design

The GroupChatAgent is a new `BaseAgent` that:
1. **Watches** group messages in real-time
2. **Decides** when to respond (not every message!)
3. **Generates** contextual, natural responses via Claude
4. **Posts** messages as the AI group member
5. **Triggers** actions (create polls, send invites, suggest games)

```python
# backend/ai_service/agents/group_chat_agent.py

class GroupChatAgent(BaseAgent):
    """
    AI group member that participates in group chat conversations.

    Personality: Casual, fun, poker-enthusiast. Like a friend who's
    always down for a game and helps organize.

    Decision rules for when to respond:
    - Someone asks about scheduling a game → respond with suggestions
    - General game discussion → join in naturally (but not every message)
    - Someone mentions availability → start tracking for a poll
    - No game in 2+ weeks → proactively suggest one
    - Holiday/long weekend coming → mention it as game opportunity
    - Direct mention (@ODDSIDE or "hey oddside") → always respond
    - Settlement/payment discussion → offer to check status
    """

    name = "group_chat"

    capabilities = [
        "Participate in group conversations naturally",
        "Suggest game times based on group patterns and external context",
        "Poll members for availability",
        "Send game invites and reminders",
        "Track RSVPs and re-propose times",
        "Keep host updated on group activity",
        "Detect holidays, long weekends, and weather events",
    ]

    available_tools = [
        "game_manager",
        "scheduler",
        "notification_sender",
        "smart_config",
        "payment_tracker",
    ]
```

### 2.2 Message Processing Pipeline

When a new group message arrives:

```
New Message → ChatWatcher
    │
    ├─ Is it @ODDSIDE or a direct question? → ALWAYS respond
    │
    ├─ Is it about scheduling/planning? → Respond with game suggestions
    │
    ├─ Is it about availability? → Start/update availability poll
    │
    ├─ Is it about payments/settlements? → Offer payment status
    │
    ├─ Is it general game chat? → Maybe respond (30% chance, max 1/5min)
    │
    └─ Is it unrelated to games? → Stay quiet (don't be annoying)
```

### 2.3 Response Decision Engine

```python
class ChatWatcherService:
    """
    Watches group messages and decides when the AI should respond.

    Runs as a background service that processes messages from the
    event listener.
    """

    # Throttle: max 1 AI message per group per N minutes
    MIN_RESPONSE_INTERVAL_SECONDS = 300  # 5 minutes

    # Context window: how many recent messages to feed Claude
    CONTEXT_WINDOW_SIZE = 20

    async def should_respond(self, message, recent_messages, group_context):
        """
        Decide whether the AI should respond to this message.

        Uses a fast Claude Haiku call with the recent message context
        to determine relevance and appropriateness.

        Returns:
            {
                "should_respond": bool,
                "reason": str,
                "response_type": "suggestion" | "poll" | "reminder" |
                                 "conversation" | "proactive",
                "urgency": "immediate" | "soon" | "whenever"
            }
        """
        # Rule-based fast path
        content_lower = message["content"].lower()

        # Always respond to direct mentions
        if "@oddside" in content_lower or "hey oddside" in content_lower:
            return {"should_respond": True, "reason": "direct_mention",
                    "response_type": "conversation", "urgency": "immediate"}

        # Check throttle
        if self._is_throttled(message["group_id"]):
            return {"should_respond": False, "reason": "throttled"}

        # Use Claude Haiku to classify (fast + cheap)
        # Feed last N messages for context
        ...
```

### 2.4 Response Generation

```python
async def generate_response(self, message, recent_messages, group_context,
                             response_type, external_context=None):
    """
    Generate a contextual response using Claude.

    Args:
        message: The triggering message
        recent_messages: Last N messages for conversation context
        group_context: Group info, member names, recent games
        response_type: What kind of response (suggestion, poll, etc.)
        external_context: Weather, holidays, etc.

    Returns:
        {
            "content": str,       # The message to post
            "actions": [          # Optional follow-up actions
                {"type": "create_poll", "options": [...]},
                {"type": "send_invite", "game_config": {...}},
                {"type": "send_reminder", "user_ids": [...]},
            ]
        }
    """
    system_prompt = """You are ODDSIDE's AI group member in a poker group chat.

PERSONALITY:
- Casual and fun, like a friend who loves poker
- Use informal language, occasional humor
- Keep messages short (1-3 sentences max)
- Don't be robotic or formal
- Don't overuse emojis (1-2 max per message)
- NEVER be pushy or annoying

GAME KNOWLEDGE:
- You know the group's game history (frequency, usual buy-in, regular players)
- You know who's been active recently
- You can see recent conversation context
- You know about upcoming holidays, weather, and events

RULES:
- Only talk about game-related topics
- If the conversation has moved on from games, stay quiet
- When suggesting a game, give a specific reason (long weekend, been a while, etc.)
- When people discuss availability, offer to create a poll
- Never share private payment info in group chat
- If someone asks about payments, suggest they check the app privately
"""
```

### 2.5 AI Personality Examples

```
─── Group Chat ───────────────────────────────────────

Mike: Anyone down for poker this weekend?

ODDSIDE: You guys haven't played in 12 days — definitely
         overdue! Saturday works best based on your usual
         schedule. Want me to send out a poll?

Sarah: I'm free Saturday evening

Jake: Same, after 7 works

ODDSIDE: Cool, looks like Saturday 7pm is shaping up.
         Mike, want me to set it up with the usual $20
         buy-in? I'll ping everyone who hasn't responded yet.

Mike: Yeah do it

ODDSIDE: Done! Game created for Saturday 7pm — $20 buy-in,
         20 chips. Invites sent to the whole crew. 4 people
         still need to RSVP.

─── Later that week ──────────────────────────────────

ODDSIDE: Heads up — long weekend coming up (Presidents' Day
         Monday). Might be a good excuse for a Sunday night
         session too. Just throwing it out there.

─── Weather awareness ────────────────────────────────

ODDSIDE: Big snowstorm hitting your area Saturday. Perfect
         excuse to hunker down and play some cards! Everyone
         still good for tonight?
```

---

## Phase 3: Game Planning Engine

### 3.1 Proactive Suggestion Triggers

The GamePlannerAgent runs on a schedule (or event-driven) to detect opportunities:

```python
class GamePlannerAgent(BaseAgent):
    """
    Proactively detects opportunities for games and suggests them
    in the group chat.

    Trigger conditions:
    1. Group hasn't played in N days (configurable, default 14)
    2. Holiday/long weekend approaching (within 5 days)
    3. Weather event (storm/heavy rain) in group's area
    4. Regular game day approaching (e.g., usual Friday game)
    5. Host manually requests a suggestion
    """
```

### 3.2 Availability Polling System

```python
# Database: polls collection
polls = {
    "poll_id": str,              # "poll_{uuid[:12]}"
    "group_id": str,
    "created_by": str,           # "ai_assistant" or user_id
    "type": "availability",
    "question": str,             # "When works for poker this weekend?"
    "options": [
        {
            "option_id": str,
            "label": str,        # "Saturday 7pm"
            "votes": [str],      # list of user_ids
        }
    ],
    "status": "active" | "closed",
    "expires_at": datetime,      # Auto-close after 48h
    "winning_option": Optional[str],
    "created_at": datetime,
    "message_id": str            # The group message containing this poll
}
```

**Poll Workflow:**
```
AI detects game interest in chat
    │
    ├─ Create poll with time options
    │   (based on group patterns + external context)
    │
    ├─ Post poll in group chat
    │
    ├─ Track votes as they come in via reactions or replies
    │
    ├─ After 24h or when majority voted:
    │   ├─ Announce winning time
    │   ├─ Ask host to confirm
    │   └─ On confirm: create game + send invites
    │
    └─ If no clear winner after 48h:
        ├─ Re-propose with new options
        └─ Or ask group for preferences
```

### 3.3 Smart Time Suggestions

When suggesting game times, the AI considers:

```python
class SmartSchedulerService:
    """
    Generates intelligent time suggestions by combining:
    1. Group history (what days/times they usually play)
    2. Holiday calendar (upcoming long weekends, holidays)
    3. Weather forecasts (storms = stay-home opportunity)
    4. Recent activity (how long since last game)
    5. Member availability patterns (who's usually free when)
    """

    async def suggest_times(self, group_id, num_suggestions=3):
        """
        Returns ranked time suggestions with reasons.

        Example return:
        [
            {
                "datetime": "2026-02-28T19:00:00",
                "day_label": "Saturday",
                "reason": "Your group usually plays Saturdays. Plus it's been
                          16 days since your last game.",
                "confidence": 0.85,
                "factors": ["regular_day", "overdue", "weather_good"]
            },
            {
                "datetime": "2026-03-01T18:00:00",
                "day_label": "Sunday",
                "reason": "Long weekend — Monday is off. Good chance for a
                          longer session.",
                "confidence": 0.72,
                "factors": ["long_weekend", "no_work_next_day"]
            }
        ]
        """
```

---

## Phase 4: External Context Provider

### 4.1 Holiday Detection

```python
# backend/services/context_provider.py

class ContextProvider:
    """
    Provides external context for smart game suggestions.
    """

    async def get_upcoming_holidays(self, country_code="US", days_ahead=14):
        """
        Get upcoming holidays and long weekends.

        Uses the `holidays` Python package (free, no API needed).
        Detects:
        - Official holidays
        - Long weekends (holiday on Mon/Fri)
        - Notable dates (Super Bowl Sunday, etc.)
        """

    async def get_weather_forecast(self, latitude, longitude, days_ahead=7):
        """
        Get weather forecast for the group's area.

        Uses Open-Meteo API (free, no key required, 10k requests/day).
        Detects:
        - Heavy snow (>4 inches)
        - Heavy rain
        - Extreme cold/heat
        - Severe weather warnings

        Returns "stay home" events that are game opportunities.
        """

    async def get_group_context(self, group_id):
        """
        Get group-specific context:
        - Days since last game
        - Usual game day/time
        - Active member count
        - Outstanding payments
        - Recent game results
        """
```

### 4.2 Weather Integration (Open-Meteo — Free, No API Key)

```python
# Free weather API: https://open-meteo.com/
# No API key needed, 10,000 requests/day

async def get_weather_forecast(self, lat, lon, days_ahead=7):
    """Fetch weather and detect 'stay home' events"""
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&daily=precipitation_sum,snowfall_sum,temperature_2m_max,"
        f"temperature_2m_min,weather_code"
        f"&forecast_days={days_ahead}"
        f"&timezone=auto"
    )

    # Parse response and detect stay-home events:
    # - snowfall_sum > 10cm (4 inches)
    # - precipitation_sum > 25mm (1 inch rain)
    # - weather_code in [71,73,75,77,85,86] (snow codes)
    # - temperature_2m_max < -10°C (extreme cold)
```

### 4.3 Holiday Integration (Python `holidays` Package — Free)

```python
import holidays

def get_upcoming_holidays(country="US", state=None, days_ahead=14):
    """Detect upcoming holidays and long weekends"""
    us_holidays = holidays.US(state=state, years=[2026])
    today = date.today()

    upcoming = []
    for d in range(days_ahead):
        check_date = today + timedelta(days=d)
        if check_date in us_holidays:
            upcoming.append({
                "date": check_date,
                "name": us_holidays[check_date],
                "is_long_weekend": _is_long_weekend(check_date),
                "days_until": d
            })
    return upcoming
```

---

## Phase 5: Host Dashboard Integration

### 5.1 Host Update Feed

The AI keeps the host informed via a dedicated channel:

```python
class HostUpdateService:
    """
    Sends structured updates to the host about group activity.

    Updates are sent as special notifications (not in group chat):
    - "3 people confirmed for Saturday's game"
    - "Jake declined — want me to invite backup players?"
    - "No one has responded to the poll in 24h — should I re-send?"
    - "Settlement from last game: 2 payments still outstanding"
    """
```

### 5.2 Host Controls

Hosts can configure the AI behavior per group:

```python
# Database: group_ai_settings collection
group_ai_settings = {
    "group_id": str,
    "enabled": bool,                      # Master on/off
    "auto_suggest_games": bool,           # Proactive game suggestions
    "auto_create_polls": bool,            # Auto-create availability polls
    "auto_send_invites": bool,            # Auto-send invites after poll
    "auto_send_reminders": bool,          # Auto-send game reminders
    "weather_awareness": bool,            # Use weather for suggestions
    "holiday_awareness": bool,            # Use holidays for suggestions
    "chat_participation": str,            # "active" | "reactive" | "silent"
    "suggestion_frequency_days": int,     # Min days between proactive suggestions
    "quiet_hours": {                      # Don't post during these hours
        "start": "23:00",
        "end": "08:00"
    },
    "group_location": {                   # For weather/timezone
        "latitude": float,
        "longitude": float,
        "timezone": str
    },
    "updated_at": datetime
}
```

---

## New Files to Create

```
backend/
├── services/
│   ├── context_provider.py          # Weather, holidays, external context
│   └── chat_watcher.py              # Message processing pipeline
│
├── ai_service/
│   └── agents/
│       ├── group_chat_agent.py      # The AI group member agent
│       └── game_planner_agent.py    # Proactive game suggestion engine
│
└── (modify existing)
    ├── server.py                    # Add group message endpoints
    ├── websocket_manager.py         # Add group rooms + events
    └── ai_service/
        ├── orchestrator.py          # Register new agents
        ├── event_listener.py        # Add group message event handlers
        └── agents/registry.py       # Register new agents
```

---

## New Database Collections

```
group_messages          # Group chat messages
polls                   # Availability polls
group_ai_settings       # Per-group AI configuration
ai_message_log          # Track AI messages for throttling/analytics
```

---

## Implementation Order

```
Phase 1: Group Chat Infrastructure (Foundation)
├── 1a. group_messages collection + CRUD endpoints
├── 1b. WebSocket group rooms (join_group, leave_group, group_message)
├── 1c. emit_group_message() + emit_group_typing()
└── 1d. Wire into event listener

Phase 2: GroupChatAgent (The AI Brain)
├── 2a. GroupChatAgent (BaseAgent) with Claude response generation
├── 2b. ChatWatcherService (decide when to respond)
├── 2c. Response throttling + conversation memory
├── 2d. Register in orchestrator + event listener
└── 2e. Host AI settings (group_ai_settings collection)

Phase 3: Smart Game Planning
├── 3a. ContextProvider (holidays via `holidays` package)
├── 3b. ContextProvider (weather via Open-Meteo free API)
├── 3c. GamePlannerAgent with proactive triggers
├── 3d. Availability polling system (polls collection)
└── 3e. Auto-create game after successful poll

Phase 4: Host Integration
├── 4a. HostUpdateService (structured host notifications)
├── 4b. Host control panel endpoints (group_ai_settings CRUD)
├── 4c. RSVP tracking + re-proposal logic
└── 4d. Backup player suggestions when someone declines

Phase 5: Mobile/Web UI (Separate task)
├── 5a. Group Chat Screen (mobile)
├── 5b. Group Chat Page (web)
├── 5c. Poll UI component
├── 5d. AI settings panel for hosts
└── 5e. Host dashboard updates
```

---

## Cost Estimate

| Component | Model | Calls/day | Tokens/call | Monthly Cost |
|-----------|-------|-----------|-------------|-------------|
| Should-respond classifier | Haiku | 200-500 | ~300 | ~$2-5 |
| Response generation | Sonnet | 30-100 | ~800 | ~$5-20 |
| Game planning | Haiku | 10-30 | ~500 | ~$1-2 |
| Weather API | Open-Meteo | 10-50 | Free | $0 |
| Holidays | Python pkg | N/A | Free | $0 |
| **Total** | | | | **~$8-27/mo** |

---

## Key Design Principles

1. **Don't be annoying** — Throttle responses, stay quiet when irrelevant
2. **Be useful, not chatty** — Every AI message should add value
3. **Host controls everything** — Host can toggle every feature on/off
4. **Graceful degradation** — Works without weather/holiday APIs
5. **Privacy first** — Never share payment details in group chat
6. **Natural language** — Responses should feel human, not robotic
