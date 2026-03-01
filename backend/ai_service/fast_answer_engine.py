"""
Fast Answer Engine — DB-backed answers for Tier 0 intents.

No LLM call. Queries the database and formats answers using templates.
Returns instant, accurate, personalized responses for common questions.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
import random

from .intent_router import IntentResult

logger = logging.getLogger(__name__)


CURRENCY_SYMBOLS = {
    "USD": "$", "EUR": "€", "GBP": "£", "NOK": "kr", "SEK": "kr",
    "DKK": "kr", "CAD": "C$", "AUD": "A$", "INR": "₹",
}


@dataclass
class FastAnswer:
    text: str
    follow_ups: List[str] = field(default_factory=list)
    navigation: Optional[Dict] = None
    source: str = "fast_answer"


# Follow-up suggestion pools per intent
FOLLOW_UP_POOLS = {
    "GROUPS_COUNT": [
        "Do I have any active games?",
        "Who owes me money?",
        "What are my stats?",
        "Any games planned this week?",
    ],
    "GROUPS_LIST": [
        "Any active games right now?",
        "What's my total profit?",
        "Do I owe anyone?",
        "Any upcoming games?",
    ],
    "ACTIVE_GAMES": [
        "Who owes me money?",
        "Show my groups",
        "What are my stats?",
        "Any pending payments?",
    ],
    "UPCOMING_GAMES": [
        "What about active games?",
        "Who owes me?",
        "Show my stats",
        "What groups am I in?",
    ],
    "RECENT_GAMES": [
        "How much have I won total?",
        "Any upcoming games?",
        "Who owes me money?",
        "What are my stats?",
    ],
    "WHO_OWES_ME": [
        "What do I owe others?",
        "Show my recent games",
        "What's my total profit?",
        "Any active games?",
    ],
    "WHAT_I_OWE": [
        "Who owes me money?",
        "Show my recent games",
        "What are my stats?",
        "Any upcoming games?",
    ],
    "MY_STATS": [
        "Show my groups",
        "Any active games?",
        "Who owes me money?",
        "Show my recent games",
    ],
    "MY_RECORD": [
        "What are my stats?",
        "Any games this week?",
        "Show my groups",
        "Any pending payments?",
    ],
    "HOW_TO": [
        "How does buy-in work?",
        "How do I cash out?",
        "What is settlement?",
        "How do I create a group?",
    ],
}


class FastAnswerEngine:
    """DB-backed answer service for Tier 0 intents."""

    def __init__(self, db):
        self.db = db

    async def answer(self, intent: IntentResult, user_id: str) -> FastAnswer:
        """
        Generate a fast answer for a Tier 0 intent.

        Args:
            intent: The classified intent from IntentRouter
            user_id: The requesting user's ID

        Returns:
            FastAnswer with text, follow-ups, and optional navigation
        """
        try:
            handler = getattr(self, f"_handle_{intent.intent.lower()}", None)
            if handler:
                return await handler(user_id, intent.params)
            # Fallback if handler not found
            return FastAnswer(
                text="I'm not sure how to answer that. Try asking differently!",
                follow_ups=self._pick_follow_ups("MY_STATS"),
            )
        except Exception as e:
            logger.error(f"FastAnswerEngine error for {intent.intent}: {e}")
            return FastAnswer(
                text="Sorry, I had trouble looking that up. Try again in a moment.",
                follow_ups=["What are my stats?", "Show my groups", "Any active games?"],
            )

    # ==================== Intent Handlers ====================

    async def _handle_groups_count(self, user_id: str, params: Dict) -> FastAnswer:
        memberships = await self.db.group_members.find(
            {"user_id": user_id}, {"_id": 0, "group_id": 1}
        ).to_list(100)
        group_ids = [m["group_id"] for m in memberships]

        if not group_ids:
            return FastAnswer(
                text="You're not in any groups yet. Create one or ask a friend to invite you!",
                follow_ups=["How do I create a group?", "How do I join a group?"],
                navigation={"screen": "Groups"},
            )

        groups = await self.db.groups.find(
            {"group_id": {"$in": group_ids}}, {"_id": 0, "group_id": 1, "name": 1}
        ).to_list(100)
        names = [g.get("name", "Unnamed") for g in groups]
        count = len(names)
        names_str = ", ".join(names[:5])
        if count > 5:
            names_str += f" and {count - 5} more"

        s = "s" if count != 1 else ""
        text = f"You're in {count} group{s}: {names_str}."

        return FastAnswer(
            text=text,
            follow_ups=self._pick_follow_ups("GROUPS_COUNT"),
            navigation={"screen": "Groups"},
        )

    async def _handle_groups_list(self, user_id: str, params: Dict) -> FastAnswer:
        memberships = await self.db.group_members.find(
            {"user_id": user_id}, {"_id": 0, "group_id": 1, "role": 1}
        ).to_list(100)
        group_ids = [m["group_id"] for m in memberships]

        if not group_ids:
            return FastAnswer(
                text="You're not in any groups yet. Create one or ask a friend to invite you!",
                follow_ups=["How do I create a group?"],
                navigation={"screen": "Groups"},
            )

        groups = await self.db.groups.find(
            {"group_id": {"$in": group_ids}}, {"_id": 0, "group_id": 1, "name": 1}
        ).to_list(100)
        group_map = {g["group_id"]: g.get("name", "Unnamed") for g in groups}
        role_map = {m["group_id"]: m.get("role", "member") for m in memberships}

        lines = []
        for gid in group_ids:
            name = group_map.get(gid, "Unnamed")
            role = role_map.get(gid, "member")
            role_tag = " (admin)" if role == "admin" else ""
            lines.append(f"• {name}{role_tag}")

        text = f"Your groups ({len(lines)}):\n" + "\n".join(lines)

        return FastAnswer(
            text=text,
            follow_ups=self._pick_follow_ups("GROUPS_LIST"),
            navigation={"screen": "Groups"},
        )

    async def _handle_active_games(self, user_id: str, params: Dict) -> FastAnswer:
        group_ids = await self._get_user_group_ids(user_id)
        if not group_ids:
            return FastAnswer(
                text="You're not in any groups yet, so no active games.",
                follow_ups=["How do I create a group?"],
            )

        games = await self.db.game_nights.find(
            {"group_id": {"$in": group_ids}, "status": "active"},
            {"_id": 0, "title": 1, "group_id": 1, "game_id": 1}
        ).to_list(20)

        group_names = await self._get_group_names(group_ids)

        if not games:
            return FastAnswer(
                text="No active games right now. Time to start one?",
                follow_ups=["Any upcoming games?", "Show my groups", "How do I start a game?"],
            )

        count = len(games)
        s = "s" if count != 1 else ""
        lines = []
        for g in games[:5]:
            title = g.get("title", "Untitled")
            group = group_names.get(g.get("group_id", ""), "")
            lines.append(f"• {title} ({group})")

        text = f"You have {count} active game{s}:\n" + "\n".join(lines)

        return FastAnswer(
            text=text,
            follow_ups=self._pick_follow_ups("ACTIVE_GAMES"),
            navigation={"screen": "GameNight"},
        )

    async def _handle_upcoming_games(self, user_id: str, params: Dict) -> FastAnswer:
        group_ids = await self._get_user_group_ids(user_id)
        if not group_ids:
            return FastAnswer(
                text="You're not in any groups yet, so no upcoming games.",
                follow_ups=["How do I create a group?"],
            )

        now = datetime.now(timezone.utc)
        time_filter = params.get("time_filter")

        # Build date range
        if time_filter == "today":
            end = now.replace(hour=23, minute=59, second=59)
            label = "today"
        elif time_filter == "tomorrow":
            tomorrow = now + timedelta(days=1)
            now = tomorrow.replace(hour=0, minute=0, second=0)
            end = tomorrow.replace(hour=23, minute=59, second=59)
            label = "tomorrow"
        elif time_filter == "this_weekend":
            days_until_sat = (5 - now.weekday()) % 7
            sat = now + timedelta(days=days_until_sat)
            sun = sat + timedelta(days=1)
            now = sat.replace(hour=0, minute=0, second=0)
            end = sun.replace(hour=23, minute=59, second=59)
            label = "this weekend"
        else:
            # Default: next 7 days
            end = now + timedelta(days=7)
            label = "the next 7 days"

        games = await self.db.game_nights.find(
            {
                "group_id": {"$in": group_ids},
                "status": "scheduled",
                "scheduled_at": {"$gte": now.isoformat(), "$lte": end.isoformat()},
            },
            {"_id": 0, "title": 1, "group_id": 1, "scheduled_at": 1}
        ).sort("scheduled_at", 1).to_list(20)

        group_names = await self._get_group_names(group_ids)

        if not games:
            return FastAnswer(
                text=f"No games scheduled for {label}. Maybe time to plan one?",
                follow_ups=["Any active games?", "Show my groups", "How do I start a game?"],
            )

        count = len(games)
        s = "s" if count != 1 else ""
        lines = []
        for g in games[:5]:
            title = g.get("title", "Untitled")
            group = group_names.get(g.get("group_id", ""), "")
            sched = g.get("scheduled_at", "")
            if sched:
                try:
                    dt = datetime.fromisoformat(str(sched).replace("Z", "+00:00"))
                    sched = dt.strftime("%a %b %d, %I:%M %p")
                except (ValueError, TypeError):
                    sched = str(sched)[:16]
            lines.append(f"• {title} — {group} ({sched})")

        text = f"{count} game{s} scheduled for {label}:\n" + "\n".join(lines)

        return FastAnswer(
            text=text,
            follow_ups=self._pick_follow_ups("UPCOMING_GAMES"),
        )

    async def _handle_recent_games(self, user_id: str, params: Dict) -> FastAnswer:
        group_ids = await self._get_user_group_ids(user_id)
        if not group_ids:
            return FastAnswer(
                text="You're not in any groups yet, so no game history.",
                follow_ups=["How do I create a group?"],
            )

        games = await self.db.game_nights.find(
            {
                "group_id": {"$in": group_ids},
                "status": {"$in": ["ended", "settled"]},
            },
            {"_id": 0, "title": 1, "group_id": 1, "status": 1, "created_at": 1}
        ).sort("created_at", -1).to_list(5)

        group_names = await self._get_group_names(group_ids)

        if not games:
            return FastAnswer(
                text="No completed games yet. Your history will show up here after your first game!",
                follow_ups=["Any active games?", "Show my groups"],
            )

        lines = []
        for g in games:
            title = g.get("title", "Untitled")
            group = group_names.get(g.get("group_id", ""), "")
            status = g.get("status", "ended")
            created = g.get("created_at", "")
            if created:
                try:
                    dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                    created = dt.strftime("%b %d")
                except (ValueError, TypeError):
                    created = str(created)[:10]
            status_label = "settled" if status == "settled" else "ended"
            lines.append(f"• {title} ({group}) — {created} [{status_label}]")

        text = f"Your last {len(games)} games:\n" + "\n".join(lines)

        return FastAnswer(
            text=text,
            follow_ups=self._pick_follow_ups("RECENT_GAMES"),
        )

    async def _handle_who_owes_me(self, user_id: str, params: Dict) -> FastAnswer:
        entries = await self.db.ledger.find(
            {"to_user_id": user_id, "status": {"$ne": "paid"}},
            {"_id": 0, "from_user_id": 1, "amount": 1, "group_id": 1}
        ).to_list(50)

        if not entries:
            return FastAnswer(
                text="Nobody owes you anything right now. All settled up!",
                follow_ups=self._pick_follow_ups("WHO_OWES_ME"),
            )

        # Resolve user names
        from_ids = list({e["from_user_id"] for e in entries})
        users = await self.db.users.find(
            {"user_id": {"$in": from_ids}}, {"_id": 0, "user_id": 1, "name": 1}
        ).to_list(50)
        name_map = {u["user_id"]: u.get("name", "Someone") for u in users}

        total = sum(e.get("amount", 0) for e in entries)
        currency = await self._get_default_currency(entries)
        symbol = CURRENCY_SYMBOLS.get(currency, "$")

        lines = []
        # Aggregate by person
        by_person: Dict[str, float] = {}
        for e in entries:
            pid = e["from_user_id"]
            by_person[pid] = by_person.get(pid, 0) + e.get("amount", 0)

        for pid, amount in sorted(by_person.items(), key=lambda x: -x[1]):
            name = name_map.get(pid, "Someone")
            lines.append(f"• {name}: {symbol}{amount:.2f}")

        count = len(by_person)
        s = "s" if count != 1 else ""
        text = f"{count} person{s} owe{'' if count != 1 else 's'} you a total of {symbol}{total:.2f}:\n" + "\n".join(lines)

        return FastAnswer(
            text=text,
            follow_ups=self._pick_follow_ups("WHO_OWES_ME"),
        )

    async def _handle_what_i_owe(self, user_id: str, params: Dict) -> FastAnswer:
        entries = await self.db.ledger.find(
            {"from_user_id": user_id, "status": {"$ne": "paid"}},
            {"_id": 0, "to_user_id": 1, "amount": 1, "group_id": 1}
        ).to_list(50)

        if not entries:
            return FastAnswer(
                text="You're all squared up! You don't owe anyone.",
                follow_ups=self._pick_follow_ups("WHAT_I_OWE"),
            )

        to_ids = list({e["to_user_id"] for e in entries})
        users = await self.db.users.find(
            {"user_id": {"$in": to_ids}}, {"_id": 0, "user_id": 1, "name": 1}
        ).to_list(50)
        name_map = {u["user_id"]: u.get("name", "Someone") for u in users}

        total = sum(e.get("amount", 0) for e in entries)
        currency = await self._get_default_currency(entries)
        symbol = CURRENCY_SYMBOLS.get(currency, "$")

        by_person: Dict[str, float] = {}
        for e in entries:
            pid = e["to_user_id"]
            by_person[pid] = by_person.get(pid, 0) + e.get("amount", 0)

        lines = []
        for pid, amount in sorted(by_person.items(), key=lambda x: -x[1]):
            name = name_map.get(pid, "Someone")
            lines.append(f"• {name}: {symbol}{amount:.2f}")

        count = len(by_person)
        s = "s" if count != 1 else ""
        text = f"You owe {count} person{s} a total of {symbol}{total:.2f}:\n" + "\n".join(lines)

        return FastAnswer(
            text=text,
            follow_ups=self._pick_follow_ups("WHAT_I_OWE"),
        )

    async def _handle_my_stats(self, user_id: str, params: Dict) -> FastAnswer:
        user = await self.db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "name": 1, "level": 1, "total_games": 1,
             "total_profit": 1, "badges": 1, "created_at": 1}
        )

        if not user:
            return FastAnswer(
                text="I couldn't find your profile. Try refreshing the app.",
                follow_ups=["Show my groups"],
            )

        name = user.get("name", "there")
        level = user.get("level", "Rookie")
        total_games = user.get("total_games", 0)
        total_profit = user.get("total_profit", 0.0)
        badges = user.get("badges", [])
        badge_count = len(badges)
        created = user.get("created_at", "")

        profit_str = f"+${total_profit:.2f}" if total_profit >= 0 else f"-${abs(total_profit):.2f}"
        member_since = ""
        if created:
            try:
                dt = datetime.fromisoformat(str(created).replace("Z", "+00:00"))
                member_since = f" Member since {dt.strftime('%b %Y')}."
            except (ValueError, TypeError):
                pass

        text = (
            f"Hey {name}! Here's your profile:\n"
            f"• Level: {level}\n"
            f"• Games played: {total_games}\n"
            f"• Net profit: {profit_str}\n"
            f"• Badges: {badge_count}"
        )
        if badges:
            text += f" ({', '.join(badges[:5])})"
        text += f"\n{member_since}".rstrip()

        return FastAnswer(
            text=text,
            follow_ups=self._pick_follow_ups("MY_STATS"),
        )

    async def _handle_my_record(self, user_id: str, params: Dict) -> FastAnswer:
        user = await self.db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "name": 1, "total_games": 1, "total_profit": 1}
        )

        if not user:
            return FastAnswer(
                text="I couldn't find your profile.",
                follow_ups=["Show my groups"],
            )

        total_games = user.get("total_games", 0)
        total_profit = user.get("total_profit", 0.0)

        if total_games == 0:
            return FastAnswer(
                text="You haven't played any games yet. Your record will show here after your first game!",
                follow_ups=["Show my groups", "How do I start a game?"],
            )

        if total_profit > 0:
            status = f"You're up ${total_profit:.2f} overall across {total_games} games. Nice work!"
        elif total_profit < 0:
            status = f"You're down ${abs(total_profit):.2f} overall across {total_games} games. Better luck ahead!"
        else:
            status = f"You're exactly even after {total_games} games. Perfectly balanced."

        return FastAnswer(
            text=status,
            follow_ups=self._pick_follow_ups("MY_RECORD"),
        )

    async def _handle_how_to(self, user_id: str, params: Dict) -> FastAnswer:
        from ai_assistant import get_quick_answer
        quick = get_quick_answer(params.get("original_message", ""))
        if quick and isinstance(quick, dict):
            return FastAnswer(
                text=quick["text"],
                follow_ups=quick.get("follow_ups", self._pick_follow_ups("HOW_TO")),
                navigation=quick.get("navigation"),
            )
        return FastAnswer(
            text=(
                "I can help with common tasks! Try asking:\n"
                "• How do I create a group?\n"
                "• How does buy-in work?\n"
                "• How do I cash out?\n"
                "• What is settlement?\n"
                "• Poker hand rankings"
            ),
            follow_ups=self._pick_follow_ups("HOW_TO"),
        )

    # ==================== Helpers ====================

    async def _get_user_group_ids(self, user_id: str) -> List[str]:
        """Get all group IDs for a user."""
        memberships = await self.db.group_members.find(
            {"user_id": user_id}, {"_id": 0, "group_id": 1}
        ).to_list(100)
        return [m["group_id"] for m in memberships]

    async def _get_group_names(self, group_ids: List[str]) -> Dict[str, str]:
        """Get a map of group_id -> group name."""
        if not group_ids:
            return {}
        groups = await self.db.groups.find(
            {"group_id": {"$in": group_ids}}, {"_id": 0, "group_id": 1, "name": 1}
        ).to_list(100)
        return {g["group_id"]: g.get("name", "Unnamed") for g in groups}

    async def _get_default_currency(self, ledger_entries: List[Dict]) -> str:
        """Get the most likely currency from ledger entries' groups."""
        if not ledger_entries:
            return "USD"
        # Check first entry's group for currency
        gid = ledger_entries[0].get("group_id")
        if gid:
            group = await self.db.groups.find_one(
                {"group_id": gid}, {"_id": 0, "currency": 1}
            )
            if group:
                return group.get("currency", "USD")
        return "USD"

    def _pick_follow_ups(self, intent: str, count: int = 3) -> List[str]:
        """Pick random follow-up suggestions for an intent."""
        pool = FOLLOW_UP_POOLS.get(intent, FOLLOW_UP_POOLS.get("MY_STATS", []))
        if len(pool) <= count:
            return pool[:]
        return random.sample(pool, count)
