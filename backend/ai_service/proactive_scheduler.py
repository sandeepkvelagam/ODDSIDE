"""
Proactive Trigger Scheduler

Background task that periodically checks all active groups for:
1. Proactive game suggestions (overdue, holidays, weather, regular day)
2. Stale polls that need re-proposal
3. RSVP reminders for upcoming games
4. Outstanding settlement reminders

Runs as an asyncio background task alongside the FastAPI server.
"""

import logging
import asyncio
from typing import Dict, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class ProactiveScheduler:
    """
    Periodically scans all groups and fires proactive AI actions.

    Frequency:
    - Game suggestions check: every 6 hours
    - Stale poll check: every 2 hours
    - RSVP reminders: every 4 hours
    - Settlement reminders: every 24 hours
    """

    SUGGESTION_INTERVAL_SECONDS = 6 * 3600   # 6 hours
    POLL_CHECK_INTERVAL_SECONDS = 2 * 3600   # 2 hours
    RSVP_INTERVAL_SECONDS = 4 * 3600         # 4 hours
    SETTLEMENT_INTERVAL_SECONDS = 24 * 3600  # 24 hours

    def __init__(self, db=None):
        self.db = db
        self._running = False
        self._tasks = []

    async def start(self):
        """Start all periodic background tasks."""
        if self._running:
            logger.warning("ProactiveScheduler already running")
            return

        self._running = True
        logger.info("ProactiveScheduler starting...")

        self._tasks = [
            asyncio.create_task(self._run_periodic(
                self._check_game_suggestions,
                self.SUGGESTION_INTERVAL_SECONDS,
                "game_suggestions"
            )),
            asyncio.create_task(self._run_periodic(
                self._check_stale_polls,
                self.POLL_CHECK_INTERVAL_SECONDS,
                "stale_polls"
            )),
            asyncio.create_task(self._run_periodic(
                self._check_rsvp_reminders,
                self.RSVP_INTERVAL_SECONDS,
                "rsvp_reminders"
            )),
        ]

        logger.info(f"ProactiveScheduler started with {len(self._tasks)} tasks")

    async def stop(self):
        """Stop all background tasks."""
        self._running = False
        for task in self._tasks:
            task.cancel()
        self._tasks.clear()
        logger.info("ProactiveScheduler stopped")

    async def _run_periodic(self, func, interval_seconds: int, name: str):
        """Run a function periodically."""
        # Initial delay to not flood on startup
        await asyncio.sleep(60)

        while self._running:
            try:
                logger.info(f"ProactiveScheduler: running {name}")
                await func()
            except Exception as e:
                logger.error(f"ProactiveScheduler {name} error: {e}")

            await asyncio.sleep(interval_seconds)

    # ==================== Periodic Checks ====================

    async def _check_game_suggestions(self):
        """Check all groups for proactive game suggestions."""
        if self.db is None:
            return

        # Get all groups with AI enabled
        groups = await self._get_ai_enabled_groups()

        for group in groups:
            group_id = group["group_id"]
            try:
                await self._suggest_game_for_group(group_id)
            except Exception as e:
                logger.error(f"Game suggestion check failed for group {group_id}: {e}")

    async def _check_stale_polls(self):
        """Check all groups for stale polls that need re-proposal."""
        if self.db is None:
            return

        groups = await self._get_ai_enabled_groups()

        for group in groups:
            group_id = group["group_id"]
            try:
                from .rsvp_tracker import RSVPTrackerService
                from .host_update_service import HostUpdateService

                host_service = HostUpdateService(db=self.db)
                tracker = RSVPTrackerService(db=self.db, host_update_service=host_service)

                stale = await tracker.check_stale_polls(group_id)
                for poll in stale:
                    logger.info(f"Re-proposing stale poll {poll['poll_id']} in group {group_id}")
                    await tracker.repropose_poll(group_id, poll["poll_id"])
            except Exception as e:
                logger.error(f"Stale poll check failed for group {group_id}: {e}")

    async def _check_rsvp_reminders(self):
        """Send RSVP reminders for upcoming games with pending responses."""
        if self.db is None:
            return

        # Find games happening in the next 24 hours with pending RSVPs
        now = datetime.now(timezone.utc)
        tomorrow = now + timedelta(hours=24)

        upcoming_games = await self.db.game_nights.find({
            "status": {"$in": ["pending", "scheduled"]},
            "scheduled_at": {
                "$gte": now.isoformat(),
                "$lte": tomorrow.isoformat()
            }
        }, {"_id": 0, "game_id": 1, "group_id": 1, "players": 1}).to_list(50)

        for game in upcoming_games:
            pending = [
                p for p in game.get("players", [])
                if p.get("rsvp_status") in ("invited", "pending", None)
            ]
            if pending:
                try:
                    from .rsvp_tracker import RSVPTrackerService
                    tracker = RSVPTrackerService(db=self.db)
                    sent = await tracker.send_rsvp_reminders(game["game_id"])
                    if sent > 0:
                        logger.info(f"Sent {sent} RSVP reminders for game {game['game_id']}")
                except Exception as e:
                    logger.error(f"RSVP reminder failed for game {game['game_id']}: {e}")

    # ==================== Game Suggestion Logic ====================

    async def _suggest_game_for_group(self, group_id: str):
        """Check if a game suggestion is needed for this group and post it."""
        from .context_provider import ContextProvider
        from .event_listener import get_event_listener

        # Check if we already posted a suggestion recently (prevent spam)
        recent_ai_msg = await self.db.group_messages.find_one({
            "group_id": group_id,
            "user_id": "ai_assistant",
            "type": "ai",
            "metadata.action": {"$in": ["suggest_game", "create_poll"]},
            "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()}
        })
        if recent_ai_msg:
            return  # Already suggested recently

        # Check if there's an upcoming game
        upcoming = await self.db.game_nights.count_documents({
            "group_id": group_id,
            "status": {"$in": ["pending", "active", "scheduled"]}
        })
        if upcoming > 0:
            return  # Game already planned

        # Get context and check triggers
        ctx_provider = ContextProvider(db=self.db)
        external_context = await ctx_provider.get_context(group_id=group_id)

        listener = get_event_listener()
        if not listener.game_planner:
            return

        triggers = await listener.game_planner.check_proactive_triggers(
            group_id, external_context
        )

        if not triggers:
            return

        # Pick the highest priority trigger
        trigger = triggers[0]
        result = await listener.game_planner.execute(
            user_input=trigger.get("message", "Suggest a game"),
            context={
                "group_id": group_id,
                "trigger_type": trigger["type"],
                "external_context": external_context
            }
        )

        if result.success and result.data:
            chat_message = result.data.get("chat_message", result.message)
            if chat_message:
                # Post suggestion in group chat
                from .event_listener import get_event_listener
                el = get_event_listener()
                await el._post_ai_message(group_id, chat_message, {
                    "action": "suggest_game",
                    "action_params": {
                        "trigger": trigger["type"],
                        "smart_suggestions": result.data.get("smart_suggestions", [])
                    }
                })

                logger.info(f"Proactive suggestion posted in group {group_id}: {trigger['type']}")

    # ==================== Helpers ====================

    async def _get_ai_enabled_groups(self):
        """Get all groups where AI is enabled."""
        if self.db is None:
            return []

        # Get all groups
        groups = await self.db.groups.find(
            {},
            {"_id": 0, "group_id": 1}
        ).to_list(100)

        # Filter by AI settings
        enabled = []
        for g in groups:
            settings = await self.db.group_ai_settings.find_one(
                {"group_id": g["group_id"]},
                {"_id": 0, "ai_enabled": 1, "auto_suggest_games": 1}
            )
            # Default: AI is enabled
            if settings is None or (settings.get("ai_enabled", True) and settings.get("auto_suggest_games", True)):
                enabled.append(g)

        return enabled


# ==================== Integration with FastAPI ====================

_scheduler: Optional[ProactiveScheduler] = None


def get_proactive_scheduler() -> ProactiveScheduler:
    """Get the global scheduler instance."""
    global _scheduler
    if _scheduler is None:
        _scheduler = ProactiveScheduler()
    return _scheduler


async def start_proactive_scheduler(db):
    """Start the proactive scheduler (call from FastAPI startup)."""
    global _scheduler
    _scheduler = ProactiveScheduler(db=db)
    await _scheduler.start()
    return _scheduler


async def stop_proactive_scheduler():
    """Stop the proactive scheduler (call from FastAPI shutdown)."""
    global _scheduler
    if _scheduler:
        await _scheduler.stop()
