"""
Chat Watcher Service

Watches group messages and decides when the AI should respond.
Manages throttling, context gathering, and response triggering.
"""

import logging
from typing import Dict, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class ChatWatcherService:
    """
    Watches group messages and decides when the AI should respond.

    Decision rules:
    - Direct mention (@ODDSIDE) → ALWAYS respond
    - Scheduling/planning discussion → respond with suggestions
    - Availability mentions → start tracking for a poll
    - Payment/settlement discussion → offer to check status
    - General game chat → maybe respond (throttled, max 1/5min per group)
    - Unrelated conversation → stay quiet

    Throttling:
    - Max 1 AI message per 5 minutes per group
    - Never respond to own messages
    - Skip if AI was the last sender (avoid conversation loops)
    """

    THROTTLE_SECONDS = 300  # 5 minutes between AI responses per group
    MIN_MESSAGES_BEFORE_RESPONSE = 2  # Wait for at least 2 user messages before jumping in

    def __init__(self, db=None):
        self.db = db
        # Track last response time per group: {group_id: datetime}
        self._last_response_time: Dict[str, datetime] = {}
        # Track consecutive user messages per group for context
        self._message_count_since_ai: Dict[str, int] = {}

    async def should_respond(self, message: Dict, group_id: str) -> Dict:
        """
        Decide whether the AI should respond to this message.

        Args:
            message: The new message dict (content, user_id, type, etc.)
            group_id: The group this message was posted in

        Returns:
            Dict with:
                - respond: bool — whether to respond
                - reason: str — why or why not
                - priority: str — "high", "medium", "low"
                - response_type: str — what kind of response to generate
        """
        content = message.get("content", "")
        user_id = message.get("user_id", "")
        msg_type = message.get("type", "user")

        # Never respond to AI messages (avoid loops)
        if msg_type == "ai" or user_id == "ai_assistant":
            self._message_count_since_ai[group_id] = 0
            return {"respond": False, "reason": "AI message", "priority": "none"}

        # Never respond to system messages
        if msg_type == "system":
            return {"respond": False, "reason": "System message", "priority": "none"}

        # Increment message count since last AI response
        self._message_count_since_ai[group_id] = self._message_count_since_ai.get(group_id, 0) + 1

        # Check throttle (skip for high-priority triggers)
        is_throttled = self._is_throttled(group_id)

        # Check for AI settings (host may have disabled AI)
        ai_enabled = await self._check_ai_enabled(group_id)
        if not ai_enabled:
            return {"respond": False, "reason": "AI disabled for this group", "priority": "none"}

        content_lower = content.lower()

        # HIGH PRIORITY: Direct mention — always respond
        if self._is_direct_mention(content_lower):
            self._record_response(group_id)
            return {
                "respond": True,
                "reason": "Direct mention",
                "priority": "high",
                "response_type": "direct_response"
            }

        # HIGH PRIORITY: Scheduling/planning discussion
        if self._is_scheduling_talk(content_lower):
            if not is_throttled:
                self._record_response(group_id)
                return {
                    "respond": True,
                    "reason": "Scheduling discussion",
                    "priority": "high",
                    "response_type": "game_suggestion"
                }

        # MEDIUM: Availability mentions
        if self._is_availability_mention(content_lower):
            if not is_throttled:
                self._record_response(group_id)
                return {
                    "respond": True,
                    "reason": "Availability mention",
                    "priority": "medium",
                    "response_type": "availability_tracking"
                }

        # MEDIUM: Payment/settlement discussion
        if self._is_payment_talk(content_lower):
            if not is_throttled:
                self._record_response(group_id)
                return {
                    "respond": True,
                    "reason": "Payment discussion",
                    "priority": "medium",
                    "response_type": "payment_check"
                }

        # LOW: General game chat — only if enough messages have accumulated
        if self._is_game_chat(content_lower):
            msgs_since = self._message_count_since_ai.get(group_id, 0)
            if not is_throttled and msgs_since >= self.MIN_MESSAGES_BEFORE_RESPONSE:
                self._record_response(group_id)
                return {
                    "respond": True,
                    "reason": "General game chat",
                    "priority": "low",
                    "response_type": "casual_chat"
                }

        # Default: don't respond
        return {"respond": False, "reason": "Not relevant", "priority": "none"}

    def _is_direct_mention(self, content: str) -> bool:
        """Check if the message directly mentions the AI."""
        triggers = ["@oddside", "hey oddside", "oddside,", "oddside!", "oddside?", "yo oddside"]
        return any(trigger in content for trigger in triggers)

    def _is_scheduling_talk(self, content: str) -> bool:
        """Check if the message is about scheduling a game."""
        keywords = [
            "game this", "game on", "game night", "play this",
            "poker this", "poker on", "when are we", "when's the next",
            "set up a game", "create a game", "schedule", "plan a game",
            "friday night", "saturday night", "this weekend",
            "who's free", "who's down", "who wants to play",
            "should we play", "let's play", "wanna play"
        ]
        return any(kw in content for kw in keywords)

    def _is_availability_mention(self, content: str) -> bool:
        """Check if the message mentions availability."""
        keywords = [
            "i'm free", "i'm available", "i can make it", "i'm in",
            "i'm out", "can't make it", "not available", "busy",
            "count me in", "count me out", "i'm down",
            "what time", "what day", "works for me"
        ]
        return any(kw in content for kw in keywords)

    def _is_payment_talk(self, content: str) -> bool:
        """Check if the message is about payments/settlements."""
        keywords = [
            "owe", "owes", "pay", "paid", "settle", "settlement",
            "venmo", "zelle", "cash app", "transfer", "send me",
            "how much", "balance", "debt"
        ]
        return any(kw in content for kw in keywords)

    def _is_game_chat(self, content: str) -> bool:
        """Check if the message is generally about games/poker."""
        keywords = [
            "poker", "game", "play", "cards", "hand", "bluff",
            "all-in", "fold", "raise", "call", "chips", "buy-in",
            "cash out", "last game", "good game", "gg"
        ]
        return any(kw in content for kw in keywords)

    def _is_throttled(self, group_id: str) -> bool:
        """Check if we're still in the cooldown period for this group."""
        last_time = self._last_response_time.get(group_id)
        if not last_time:
            return False
        elapsed = (datetime.now(timezone.utc) - last_time).total_seconds()
        return elapsed < self.THROTTLE_SECONDS

    def _record_response(self, group_id: str):
        """Record that we responded in this group."""
        self._last_response_time[group_id] = datetime.now(timezone.utc)
        self._message_count_since_ai[group_id] = 0

    async def _check_ai_enabled(self, group_id: str) -> bool:
        """Check if AI is enabled for this group (host setting)."""
        if self.db is None:
            return True  # Default to enabled if no DB

        settings = await self.db.group_ai_settings.find_one(
            {"group_id": group_id},
            {"_id": 0, "ai_enabled": 1}
        )
        if settings is None:
            return True  # Default to enabled
        return settings.get("ai_enabled", True)

    async def get_message_context(self, group_id: str, limit: int = 20) -> Dict:
        """
        Gather context for the AI to generate a response.

        Returns recent messages, group info, and external context.
        """
        context = {
            "message_history": [],
            "group_context": {},
            "external_context": {}
        }

        if self.db is None:
            return context

        # Get recent messages
        messages = await self.db.group_messages.find(
            {"group_id": group_id, "deleted": {"$ne": True}},
            {"_id": 0}
        ).sort("created_at", -1).to_list(limit)
        messages.reverse()

        # Attach user info
        user_ids = list(set(m["user_id"] for m in messages if m["user_id"] != "ai_assistant"))
        users_info = {}
        if user_ids:
            users_list = await self.db.users.find(
                {"user_id": {"$in": user_ids}},
                {"_id": 0, "user_id": 1, "name": 1}
            ).to_list(len(user_ids))
            users_info = {u["user_id"]: u for u in users_list}

        for msg in messages:
            if msg["user_id"] == "ai_assistant":
                msg["user"] = {"user_id": "ai_assistant", "name": "ODDSIDE"}
            else:
                msg["user"] = users_info.get(msg["user_id"], {"name": "Unknown"})

        context["message_history"] = messages

        # Get group info
        group = await self.db.groups.find_one(
            {"group_id": group_id},
            {"_id": 0, "name": 1, "group_id": 1}
        )
        member_count = await self.db.group_members.count_documents({"group_id": group_id})

        # Get last game date
        last_game = await self.db.game_nights.find_one(
            {"group_id": group_id},
            {"_id": 0, "created_at": 1},
            sort=[("created_at", -1)]
        )
        last_game_date = last_game.get("created_at") if last_game else None
        days_since = None
        if last_game_date:
            if isinstance(last_game_date, str):
                last_game_date = datetime.fromisoformat(last_game_date.replace("Z", "+00:00"))
            days_since = (datetime.now(timezone.utc) - last_game_date).days

        context["group_context"] = {
            "group_name": group.get("name", "Poker Group") if group else "Poker Group",
            "member_count": member_count,
            "last_game_date": str(last_game_date) if last_game_date else "never",
            "days_since_last_game": days_since,
        }

        return context
