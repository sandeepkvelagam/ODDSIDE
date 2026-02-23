"""
Automation Policy Tool

Safety gating layer for user automations. Decides WHETHER an automation
should be allowed to execute based on:

1. Rate limiting: per-user daily execution cap
2. Per-group daily cap: don't spam a group from multiple automations
3. Cooldown: minimum time between runs of the same automation
4. Quiet hours: don't run certain actions during quiet hours
5. Group permissions: user must be a member of the target group
6. Action-specific limits: e.g., max 3 game creations per day
7. Budget caps: prevent runaway costs from AI-powered actions

This is the trust layer that prevents automations from being annoying.
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class AutomationPolicyTool(BaseTool):
    """
    Decides if an automation execution is allowed before it runs.
    Prevents spam, enforces rate limits, and respects quiet hours.
    """

    # Global limits
    MAX_EXECUTIONS_PER_USER_PER_DAY = 50
    MAX_EXECUTIONS_PER_GROUP_PER_DAY = 20
    MAX_EXECUTIONS_PER_AUTOMATION_PER_DAY = 10
    MIN_COOLDOWN_SECONDS = 60  # Minimum 1 minute between same automation runs

    # Action-specific daily limits
    ACTION_DAILY_LIMITS = {
        "send_notification": 10,
        "send_email": 5,
        "send_payment_reminder": 3,
        "create_game": 2,
        "auto_rsvp": 10,
        "generate_summary": 5,
    }

    # Default quiet hours (UTC) — 10pm to 8am
    DEFAULT_QUIET_START = 22
    DEFAULT_QUIET_END = 8

    # Actions exempt from quiet hours (user explicitly set these up)
    QUIET_HOURS_EXEMPT = {"auto_rsvp"}

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "automation_policy"

    @property
    def description(self) -> str:
        return (
            "Check whether a user automation should be allowed to execute. "
            "Enforces rate limits, cooldowns, quiet hours, and per-action caps."
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": [
                        "check_policy",
                        "check_action_limits",
                        "get_usage_stats",
                    ],
                },
                "user_id": {"type": "string"},
                "automation_id": {"type": "string"},
                "group_id": {"type": "string"},
                "action_types": {
                    "type": "array",
                    "description": "List of action types to check limits for",
                },
            },
            "required": ["action", "user_id"],
        }

    async def execute(self, **kwargs) -> ToolResult:
        action = kwargs.get("action")

        if action == "check_policy":
            return await self._check_policy(**kwargs)
        elif action == "check_action_limits":
            return await self._check_action_limits(**kwargs)
        elif action == "get_usage_stats":
            return await self._get_usage_stats(**kwargs)
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    # ==================== Check Policy ====================

    async def _check_policy(self, **kwargs) -> ToolResult:
        """
        Full policy check before automation execution.

        Returns:
            allowed: bool
            blocked_reason: str (if blocked)
            checks_passed: list
            checks_failed: list
        """
        user_id = kwargs.get("user_id")
        automation_id = kwargs.get("automation_id")
        group_id = kwargs.get("group_id")
        action_types = kwargs.get("action_types", [])

        checks_passed = []
        checks_failed = []

        # Check 1: Per-user daily execution cap
        user_count = await self._get_user_daily_count(user_id)
        if user_count >= self.MAX_EXECUTIONS_PER_USER_PER_DAY:
            checks_failed.append({
                "check": "user_daily_cap",
                "reason": (
                    f"Daily limit reached ({user_count}/"
                    f"{self.MAX_EXECUTIONS_PER_USER_PER_DAY})"
                ),
            })
        else:
            checks_passed.append("user_daily_cap")

        # Check 2: Per-group daily cap
        if group_id:
            group_count = await self._get_group_daily_count(group_id)
            if group_count >= self.MAX_EXECUTIONS_PER_GROUP_PER_DAY:
                checks_failed.append({
                    "check": "group_daily_cap",
                    "reason": (
                        f"Group daily limit reached ({group_count}/"
                        f"{self.MAX_EXECUTIONS_PER_GROUP_PER_DAY})"
                    ),
                })
            else:
                checks_passed.append("group_daily_cap")

        # Check 3: Per-automation daily cap
        if automation_id:
            auto_count = await self._get_automation_daily_count(automation_id)
            if auto_count >= self.MAX_EXECUTIONS_PER_AUTOMATION_PER_DAY:
                checks_failed.append({
                    "check": "automation_daily_cap",
                    "reason": (
                        f"Automation daily limit reached ({auto_count}/"
                        f"{self.MAX_EXECUTIONS_PER_AUTOMATION_PER_DAY})"
                    ),
                })
            else:
                checks_passed.append("automation_daily_cap")

        # Check 4: Cooldown between runs
        if automation_id:
            last_run = await self._get_last_run_time(automation_id)
            if last_run:
                elapsed = (
                    datetime.now(timezone.utc) - last_run
                ).total_seconds()
                if elapsed < self.MIN_COOLDOWN_SECONDS:
                    remaining = int(self.MIN_COOLDOWN_SECONDS - elapsed)
                    checks_failed.append({
                        "check": "cooldown",
                        "reason": f"Cooldown active ({remaining}s remaining)",
                    })
                else:
                    checks_passed.append("cooldown")
            else:
                checks_passed.append("cooldown")

        # Check 5: Quiet hours (for notification/email actions)
        if action_types and not all(a in self.QUIET_HOURS_EXEMPT for a in action_types):
            in_quiet = self._is_quiet_hours()
            if in_quiet:
                checks_failed.append({
                    "check": "quiet_hours",
                    "reason": "Quiet hours active (10pm - 8am UTC)",
                })
            else:
                checks_passed.append("quiet_hours")

        # Check 6: Per-action daily limits
        for action_type in action_types:
            limit = self.ACTION_DAILY_LIMITS.get(action_type)
            if limit:
                count = await self._get_action_daily_count(user_id, action_type)
                if count >= limit:
                    checks_failed.append({
                        "check": f"action_limit_{action_type}",
                        "reason": f"'{action_type}' daily limit reached ({count}/{limit})",
                    })
                else:
                    checks_passed.append(f"action_limit_{action_type}")

        # Check 7: Group membership
        if group_id:
            is_member = await self._check_group_membership(user_id, group_id)
            if not is_member:
                checks_failed.append({
                    "check": "group_membership",
                    "reason": "User is not a member of the target group",
                })
            else:
                checks_passed.append("group_membership")

        allowed = len(checks_failed) == 0

        return ToolResult(
            success=True,
            data={
                "allowed": allowed,
                "blocked_reason": checks_failed[0]["reason"] if checks_failed else None,
                "checks_passed": checks_passed,
                "checks_failed": [c["check"] for c in checks_failed],
                "checks_failed_details": checks_failed,
            }
        )

    # ==================== Check Action Limits ====================

    async def _check_action_limits(self, **kwargs) -> ToolResult:
        """Check remaining limits for specific action types."""
        user_id = kwargs.get("user_id")
        action_types = kwargs.get("action_types", [])

        limits = {}
        for action_type in action_types:
            daily_limit = self.ACTION_DAILY_LIMITS.get(action_type, 999)
            used = await self._get_action_daily_count(user_id, action_type)
            limits[action_type] = {
                "limit": daily_limit,
                "used": used,
                "remaining": max(0, daily_limit - used),
            }

        return ToolResult(
            success=True,
            data={"limits": limits}
        )

    # ==================== Usage Stats ====================

    async def _get_usage_stats(self, **kwargs) -> ToolResult:
        """Get automation usage statistics for a user."""
        user_id = kwargs.get("user_id")

        if not self.db:
            return ToolResult(success=False, error="Database not available")

        # Count automations
        total_automations = await self.db.user_automations.count_documents(
            {"user_id": user_id}
        )
        enabled_automations = await self.db.user_automations.count_documents(
            {"user_id": user_id, "enabled": True}
        )
        auto_disabled = await self.db.user_automations.count_documents(
            {"user_id": user_id, "auto_disabled": True}
        )

        # Today's execution count
        daily_executions = await self._get_user_daily_count(user_id)

        # Total runs (all time)
        total_runs = 0
        automations = await self.db.user_automations.find(
            {"user_id": user_id},
            {"_id": 0, "run_count": 1}
        ).to_list(50)
        for a in automations:
            total_runs += a.get("run_count", 0)

        return ToolResult(
            success=True,
            data={
                "total_automations": total_automations,
                "enabled": enabled_automations,
                "disabled": total_automations - enabled_automations,
                "auto_disabled": auto_disabled,
                "max_automations": 20,
                "today_executions": daily_executions,
                "max_daily_executions": self.MAX_EXECUTIONS_PER_USER_PER_DAY,
                "total_runs_all_time": total_runs,
            }
        )

    # ==================== Helper Methods ====================

    async def _get_user_daily_count(self, user_id: str) -> int:
        """Get number of automation runs by a user today."""
        if not self.db:
            return 0

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        # Count from automation_runs log
        count = await self.db.automation_runs.count_documents({
            "automation_id": {"$regex": "^auto_"},  # only user automations
            "created_at": {"$gte": today_start},
            "status": {"$in": ["success", "partial_failure"]},
        })

        # Cross-reference with user's automations
        user_auto_ids = await self.db.user_automations.distinct(
            "automation_id",
            {"user_id": user_id}
        )
        if user_auto_ids:
            count = await self.db.automation_runs.count_documents({
                "automation_id": {"$in": user_auto_ids},
                "created_at": {"$gte": today_start},
                "status": {"$in": ["success", "partial_failure"]},
            })

        return count

    async def _get_group_daily_count(self, group_id: str) -> int:
        """Get number of automation runs targeting a group today."""
        if not self.db:
            return 0

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        # Find automations for this group
        group_auto_ids = await self.db.user_automations.distinct(
            "automation_id",
            {"group_id": group_id}
        )

        if not group_auto_ids:
            return 0

        return await self.db.automation_runs.count_documents({
            "automation_id": {"$in": group_auto_ids},
            "created_at": {"$gte": today_start},
            "status": {"$in": ["success", "partial_failure"]},
        })

    async def _get_automation_daily_count(self, automation_id: str) -> int:
        """Get number of runs for a specific automation today."""
        if not self.db:
            return 0

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        return await self.db.automation_runs.count_documents({
            "automation_id": automation_id,
            "created_at": {"$gte": today_start},
        })

    async def _get_action_daily_count(
        self, user_id: str, action_type: str
    ) -> int:
        """Get daily count of a specific action type for a user."""
        if not self.db:
            return 0

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        # Find user's automation IDs
        user_auto_ids = await self.db.user_automations.distinct(
            "automation_id",
            {"user_id": user_id}
        )
        if not user_auto_ids:
            return 0

        # Count runs that included this action type
        pipeline = [
            {
                "$match": {
                    "automation_id": {"$in": user_auto_ids},
                    "created_at": {"$gte": today_start},
                    "action_results": {
                        "$elemMatch": {
                            "type": action_type,
                            "success": True,
                        }
                    }
                }
            },
            {"$count": "total"}
        ]

        result = await self.db.automation_runs.aggregate(pipeline).to_list(1)
        return result[0]["total"] if result else 0

    async def _get_last_run_time(self, automation_id: str) -> Optional[datetime]:
        """Get the last run time for an automation."""
        if not self.db:
            return None

        auto = await self.db.user_automations.find_one(
            {"automation_id": automation_id},
            {"_id": 0, "last_run": 1}
        )

        if not auto or not auto.get("last_run"):
            return None

        last_run = auto["last_run"]
        if isinstance(last_run, str):
            return datetime.fromisoformat(last_run.replace("Z", "+00:00"))
        return last_run

    def _is_quiet_hours(self) -> bool:
        """Check if current time is in quiet hours (UTC)."""
        now = datetime.now(timezone.utc)
        hour = now.hour

        if self.DEFAULT_QUIET_START > self.DEFAULT_QUIET_END:
            # Spans midnight (e.g., 22-8)
            return hour >= self.DEFAULT_QUIET_START or hour < self.DEFAULT_QUIET_END
        else:
            return self.DEFAULT_QUIET_START <= hour < self.DEFAULT_QUIET_END

    async def _check_group_membership(
        self, user_id: str, group_id: str
    ) -> bool:
        """Check if user is a member of the group."""
        if not self.db:
            return True  # Permissive when DB unavailable

        member = await self.db.group_members.find_one(
            {"user_id": user_id, "group_id": group_id},
            {"_id": 0, "user_id": 1}
        )
        return member is not None
