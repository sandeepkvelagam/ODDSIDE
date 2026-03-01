"""
Engagement Scheduler (v2)

Background service that uses a job queue instead of sweep-all-groups.
Only enqueues near-threshold entities to avoid scanning everything every cycle.

Architecture:
- engagement_jobs collection acts as a persistent job queue
- Jobs have: job_type, group_id, user_id, run_at, priority, status
- Scheduler enqueues eligible jobs, then processes them
- Missed jobs (server restart) are picked up on next cycle

Collections used:
- engagement_jobs: persistent job queue
- engagement_settings: per-group settings
- engagement_events: outcome tracking
- game_nights: activity data for threshold detection
"""

import logging
import asyncio
from typing import Optional, List, Dict
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class EngagementScheduler:
    """
    Job-queue-based engagement scheduler.

    Instead of sweeping all groups every N hours, it:
    1. Scans for near-threshold entities and enqueues jobs
    2. Processes queued jobs through the EngagementAgent pipeline
    3. Respects per-group settings and cooldowns

    Frequencies:
    - Job enqueueing: every 6 hours
    - Job processing: every 30 minutes
    - Weekly digests: every 7 days (Mondays at ~9am)
    """

    ENQUEUE_INTERVAL = 6 * 3600      # 6 hours: scan for new jobs
    PROCESS_INTERVAL = 30 * 60       # 30 min: process pending jobs
    DIGEST_INTERVAL = 7 * 24 * 3600  # 7 days: weekly digests

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
        logger.info("EngagementScheduler starting (job-queue mode)...")

        # Pick up any orphaned jobs from before restart
        if self.db is not None:
            recovered = await self._recover_stale_jobs()
            if recovered > 0:
                logger.info(f"Recovered {recovered} stale jobs from previous run")

        self._tasks = [
            asyncio.create_task(self._run_periodic(
                self._enqueue_jobs,
                self.ENQUEUE_INTERVAL,
                "enqueue_jobs"
            )),
            asyncio.create_task(self._run_periodic(
                self._process_jobs,
                self.PROCESS_INTERVAL,
                "process_jobs"
            )),
            asyncio.create_task(self._run_periodic(
                self._enqueue_digests,
                self.DIGEST_INTERVAL,
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

    # ==================== Job Enqueueing (Targeted) ====================

    async def _enqueue_jobs(self):
        """
        Scan for near-threshold entities and enqueue jobs.
        Only targets groups/users that are close to needing a nudge,
        instead of sweeping all groups.
        """
        if self.db is None:
            return

        now = datetime.now(timezone.utc)
        groups = await self._get_engagement_enabled_groups()
        jobs_created = 0

        for group in groups:
            group_id = group["group_id"]
            settings = group.get("settings", {})
            group_threshold = settings.get("inactive_group_nudge_days", 14)
            user_threshold = settings.get("inactive_user_nudge_days", 30)

            # Check group inactivity — only enqueue if near threshold
            last_game = await self.db.game_nights.find_one(
                {"group_id": group_id, "status": {"$in": ["ended", "settled"]}},
                {"_id": 0, "created_at": 1},
                sort=[("created_at", -1)]
            )

            if last_game:
                last_played = self._parse_date(last_game.get("created_at"))
                if last_played:
                    days_since = (now - last_played).days
                    # Near-threshold window: threshold-2 to threshold+30
                    if group_threshold - 2 <= days_since <= group_threshold + 30:
                        # Check no active/scheduled game
                        active = await self.db.game_nights.find_one({
                            "group_id": group_id,
                            "status": {"$in": ["pending", "active", "scheduled"]}
                        })
                        if not active:
                            created = await self._enqueue_if_not_exists(
                                job_type="group_check",
                                group_id=group_id,
                                priority=self._calculate_priority(days_since, group_threshold),
                            )
                            if created:
                                jobs_created += 1
            else:
                # No games ever — enqueue if group has enough members
                member_count = await self.db.group_members.count_documents(
                    {"group_id": group_id}
                )
                if member_count >= 3:
                    created = await self._enqueue_if_not_exists(
                        job_type="group_check",
                        group_id=group_id,
                        priority=1,
                    )
                    if created:
                        jobs_created += 1

            # Enqueue user checks for this group
            # Only check members who are near the user inactivity threshold
            members = await self.db.group_members.find(
                {"group_id": group_id},
                {"_id": 0, "user_id": 1}
            ).to_list(200)

            for member in members:
                user_id = member["user_id"]
                user_last = await self.db.game_nights.find_one(
                    {
                        "players.user_id": user_id,
                        "group_id": group_id,
                        "status": {"$in": ["ended", "settled"]}
                    },
                    {"_id": 0, "created_at": 1},
                    sort=[("created_at", -1)]
                )
                if user_last:
                    last_played = self._parse_date(user_last.get("created_at"))
                    if last_played:
                        user_days = (now - last_played).days
                        # Near-threshold: threshold-5 to threshold+30
                        if user_threshold - 5 <= user_days <= user_threshold + 30:
                            created = await self._enqueue_if_not_exists(
                                job_type="user_check",
                                group_id=group_id,
                                user_id=user_id,
                                priority=self._calculate_priority(user_days, user_threshold),
                            )
                            if created:
                                jobs_created += 1

        logger.info(f"Enqueued {jobs_created} new engagement jobs")

    async def _enqueue_digests(self):
        """Enqueue weekly digest jobs for all enabled groups."""
        if self.db is None:
            return

        groups = await self._get_engagement_enabled_groups()
        jobs_created = 0

        for group in groups:
            settings = group.get("settings", {})
            if not settings.get("weekly_digest", True):
                continue

            created = await self._enqueue_if_not_exists(
                job_type="digest",
                group_id=group["group_id"],
                priority=0,
            )
            if created:
                jobs_created += 1

        logger.info(f"Enqueued {jobs_created} digest jobs")

    async def _enqueue_if_not_exists(
        self,
        job_type: str,
        group_id: str,
        user_id: str = None,
        priority: int = 1,
    ) -> bool:
        """
        Create a job if one doesn't already exist for this target.
        Returns True if a new job was created.
        """
        now = datetime.now(timezone.utc)
        query = {
            "job_type": job_type,
            "group_id": group_id,
            "status": {"$in": ["pending", "processing"]},
        }
        if user_id:
            query["user_id"] = user_id

        existing = await self.db.engagement_jobs.find_one(query)
        if existing:
            return False

        await self.db.engagement_jobs.insert_one({
            "job_type": job_type,
            "group_id": group_id,
            "user_id": user_id,
            "priority": priority,
            "status": "pending",
            "run_at": now.isoformat(),
            "created_at": now.isoformat(),
            "started_at": None,
            "completed_at": None,
            "result": None,
            "error": None,
            "attempts": 0,
            "max_attempts": 3,
        })
        return True

    # ==================== Job Processing ====================

    async def _process_jobs(self):
        """Process pending jobs from the queue, highest priority first."""
        if self.db is None:
            return

        agent = await self._get_engagement_agent()
        if not agent:
            return

        now = datetime.now(timezone.utc)

        # Fetch pending jobs ready to run, ordered by priority (highest first)
        jobs = await self.db.engagement_jobs.find(
            {
                "status": "pending",
                "run_at": {"$lte": now.isoformat()},
                "attempts": {"$lt": 3},
            }
        ).sort("priority", -1).to_list(20)  # Process max 20 per cycle

        processed = 0
        for job in jobs:
            job_id = job.get("_id")

            # Mark as processing
            await self.db.engagement_jobs.update_one(
                {"_id": job_id},
                {
                    "$set": {"status": "processing", "started_at": now.isoformat()},
                    "$inc": {"attempts": 1}
                }
            )

            try:
                result = await agent.execute(
                    "Process engagement job",
                    context={
                        "action": "process_job",
                        "job": {
                            "job_type": job["job_type"],
                            "group_id": job.get("group_id"),
                            "user_id": job.get("user_id"),
                        }
                    }
                )

                # Mark completed
                await self.db.engagement_jobs.update_one(
                    {"_id": job_id},
                    {"$set": {
                        "status": "completed",
                        "completed_at": datetime.now(timezone.utc).isoformat(),
                        "result": {
                            "success": result.success,
                            "message": result.message,
                            "data_summary": {
                                k: v for k, v in (result.data or {}).items()
                                if k in ("sent", "blocked", "skipped", "sent_count", "blocked_count", "nudges_sent", "nudges_blocked")
                            } if result.data else None,
                        },
                    }}
                )
                processed += 1

                if result.success and result.data and not result.data.get("skipped"):
                    logger.info(f"Job {job['job_type']} for {job.get('group_id', job.get('user_id'))}: {result.message}")

            except Exception as e:
                logger.error(f"Job processing error for {job_id}: {e}")
                # Mark failed (will retry if under max_attempts)
                await self.db.engagement_jobs.update_one(
                    {"_id": job_id},
                    {"$set": {
                        "status": "pending" if job.get("attempts", 0) < 2 else "failed",
                        "error": str(e),
                    }}
                )

        if processed > 0:
            logger.info(f"Processed {processed} engagement jobs")

    async def _recover_stale_jobs(self) -> int:
        """Reset jobs stuck in 'processing' state from a previous crash."""
        if self.db is None:
            return 0

        result = await self.db.engagement_jobs.update_many(
            {"status": "processing"},
            {"$set": {"status": "pending"}}
        )
        return result.modified_count

    # ==================== Priority Calculation ====================

    def _calculate_priority(self, days_inactive: int, threshold: int) -> int:
        """
        Calculate job priority based on how far past threshold.
        Higher number = higher priority.
        """
        overshoot = days_inactive - threshold
        if overshoot >= 30:
            return 5  # Critically inactive
        elif overshoot >= 14:
            return 4
        elif overshoot >= 7:
            return 3
        elif overshoot >= 0:
            return 2  # Just crossed threshold
        else:
            return 1  # Near threshold (pre-emptive)

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

    async def _get_engagement_enabled_groups(self) -> List[Dict]:
        """Get all groups where engagement is enabled."""
        if self.db is None:
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

    def _parse_date(self, value) -> Optional[datetime]:
        """Parse a date value."""
        if value is None:
            return None
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value
        if isinstance(value, str):
            try:
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except (ValueError, TypeError):
                return None
        return None


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
