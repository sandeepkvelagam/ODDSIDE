"""
Engagement Scheduler

Background service that periodically runs engagement checks:
1. Inactive group nudges (every 12 hours)
2. Inactive user nudges (every 24 hours)
3. Weekly engagement digests (every 7 days)

Integrates with the EngagementAgent and respects per-group engagement settings.
Runs as an asyncio background task alongside the FastAPI server.
"""

import logging
import asyncio
from typing import Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class EngagementScheduler:
    """
    Periodically runs engagement checks across all groups.

    Frequencies:
    - Inactive group nudges: every 12 hours
    - Inactive user nudges: every 24 hours
    - Weekly digests: every 7 days (Mondays at ~9am)
    """

    INACTIVE_GROUP_INTERVAL = 12 * 3600   # 12 hours
    INACTIVE_USER_INTERVAL = 24 * 3600    # 24 hours
    WEEKLY_DIGEST_INTERVAL = 7 * 24 * 3600  # 7 days

    def __init__(self, db=None):
        self.db = db
        self._running = False
        self._tasks = []

    async def start(self):
        """Start all periodic engagement tasks."""
        if self._running:
            logger.warning("EngagementScheduler already running")
            return

        self._running = True
        logger.info("EngagementScheduler starting...")

        self._tasks = [
            asyncio.create_task(self._run_periodic(
                self._check_inactive_groups,
                self.INACTIVE_GROUP_INTERVAL,
                "inactive_groups"
            )),
            asyncio.create_task(self._run_periodic(
                self._check_inactive_users,
                self.INACTIVE_USER_INTERVAL,
                "inactive_users"
            )),
            asyncio.create_task(self._run_periodic(
                self._send_weekly_digests,
                self.WEEKLY_DIGEST_INTERVAL,
                "weekly_digests"
            )),
        ]

        logger.info(f"EngagementScheduler started with {len(self._tasks)} tasks")

    async def stop(self):
        """Stop all background tasks."""
        self._running = False
        for task in self._tasks:
            task.cancel()
        self._tasks.clear()
        logger.info("EngagementScheduler stopped")

    async def _run_periodic(self, func, interval_seconds: int, name: str):
        """Run a function periodically with initial delay."""
        # Stagger start: wait 2-5 minutes to avoid startup flood
        await asyncio.sleep(120 + hash(name) % 180)

        while self._running:
            try:
                logger.info(f"EngagementScheduler: running {name}")
                await func()
            except Exception as e:
                logger.error(f"EngagementScheduler {name} error: {e}")

            await asyncio.sleep(interval_seconds)

    # ==================== Periodic Checks ====================

    async def _check_inactive_groups(self):
        """Find and nudge inactive groups."""
        if not self.db:
            return

        agent = await self._get_engagement_agent()
        if not agent:
            return

        # Get groups with engagement enabled
        groups = await self._get_engagement_enabled_groups()

        for group in groups:
            group_id = group["group_id"]
            settings = group.get("settings", {})
            inactive_days = settings.get("inactive_group_nudge_days", 14)

            try:
                result = await agent.execute(
                    "Check inactive group",
                    context={
                        "action": "nudge_group",
                        "group_id": group_id,
                        "inactive_days": inactive_days
                    }
                )
                if result.success and result.data and not result.data.get("skipped"):
                    logger.info(f"Engagement nudge sent to group {group_id}")
            except Exception as e:
                logger.error(f"Inactive group check failed for {group_id}: {e}")

    async def _check_inactive_users(self):
        """Find and nudge inactive users across all groups."""
        if not self.db:
            return

        agent = await self._get_engagement_agent()
        if not agent:
            return

        groups = await self._get_engagement_enabled_groups()

        for group in groups:
            group_id = group["group_id"]
            settings = group.get("settings", {})
            inactive_days = settings.get("inactive_user_nudge_days", 30)

            try:
                result = await agent.execute(
                    "Check inactive users",
                    context={
                        "action": "check_inactive_users",
                        "group_id": group_id,
                        "inactive_days": inactive_days
                    }
                )
                if result.success and result.data:
                    nudged = result.data.get("nudges_sent", 0)
                    if nudged > 0:
                        logger.info(f"Sent {nudged} user nudges for group {group_id}")
            except Exception as e:
                logger.error(f"Inactive user check failed for {group_id}: {e}")

    async def _send_weekly_digests(self):
        """Send weekly engagement digests to group hosts."""
        if not self.db:
            return

        agent = await self._get_engagement_agent()
        if not agent:
            return

        groups = await self._get_engagement_enabled_groups()

        for group in groups:
            group_id = group["group_id"]
            settings = group.get("settings", {})

            if not settings.get("weekly_digest", True):
                continue

            try:
                result = await agent.execute(
                    "Send weekly digest",
                    context={
                        "action": "send_engagement_digest",
                        "group_id": group_id
                    }
                )
                if result.success:
                    logger.info(f"Weekly digest sent for group {group_id}")
            except Exception as e:
                logger.error(f"Weekly digest failed for {group_id}: {e}")

    # ==================== Helpers ====================

    async def _get_engagement_agent(self):
        """Get the engagement agent from the event listener's orchestrator."""
        try:
            from .event_listener import get_event_listener
            listener = get_event_listener()
            if listener and listener.engagement_agent:
                return listener.engagement_agent

            # Fallback: create a standalone agent
            from .agents.engagement_agent import EngagementAgent
            from .tools.registry import ToolRegistry
            tool_registry = ToolRegistry()
            return EngagementAgent(tool_registry=tool_registry, db=self.db)
        except Exception as e:
            logger.error(f"Failed to get engagement agent: {e}")
            return None

    async def _get_engagement_enabled_groups(self):
        """Get all groups where engagement is enabled."""
        if not self.db:
            return []

        groups = await self.db.groups.find(
            {},
            {"_id": 0, "group_id": 1, "name": 1}
        ).to_list(200)

        enabled = []
        for g in groups:
            settings = await self.db.engagement_settings.find_one(
                {"group_id": g["group_id"]},
                {"_id": 0}
            )
            # Default: engagement enabled
            if settings is None or settings.get("engagement_enabled", True):
                enabled.append({
                    **g,
                    "settings": settings or {}
                })

        return enabled


# ==================== Integration with FastAPI ====================

_engagement_scheduler: Optional[EngagementScheduler] = None


def get_engagement_scheduler() -> EngagementScheduler:
    """Get the global engagement scheduler instance."""
    global _engagement_scheduler
    if _engagement_scheduler is None:
        _engagement_scheduler = EngagementScheduler()
    return _engagement_scheduler


async def start_engagement_scheduler(db):
    """Start the engagement scheduler (call from FastAPI startup)."""
    global _engagement_scheduler
    _engagement_scheduler = EngagementScheduler(db=db)
    await _engagement_scheduler.start()
    return _engagement_scheduler


async def stop_engagement_scheduler():
    """Stop the engagement scheduler (call from FastAPI shutdown)."""
    global _engagement_scheduler
    if _engagement_scheduler:
        await _engagement_scheduler.stop()
