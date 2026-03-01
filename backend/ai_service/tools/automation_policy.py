"""
Automation Policy Tool

Safety gating layer for user automations. Decides WHETHER an automation
should be allowed to execute based on:

1. Rate limiting: per-user daily execution cap
2. Per-group daily cap: don't spam a group from multiple automations
3. Cooldown: minimum time between runs of the same automation
4. Quiet hours: per-user timezone, with per-action-type exemptions
5. Group permissions: user must be a member of the target group
6. Action-specific limits: e.g., max 3 game creations per day
7. Action permission matrix: role-based access per action type
8. Budget caps: prevent runaway costs from AI-powered actions
9. Build-time policy: block invalid automations at creation

This is the trust layer that prevents automations from being annoying.
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
import logging
import re

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class AutomationPolicyTool(BaseTool):
    """
    Decides if an automation execution is allowed before it runs.
    Prevents spam, enforces rate limits, respects quiet hours per
    user timezone, and checks role-based action permissions.
    """

    # Global limits
    MAX_EXECUTIONS_PER_USER_PER_DAY = 50
    MAX_EXECUTIONS_PER_GROUP_PER_DAY = 20
    MAX_EXECUTIONS_PER_AUTOMATION_PER_DAY = 10
    MIN_COOLDOWN_SECONDS = 60  # Minimum 1 minute between same automation runs

    # Action-specific daily limits (kept for backwards compat, see also cost points)
    ACTION_DAILY_LIMITS = {
        "send_notification": 10,
        "send_email": 5,
        "send_payment_reminder": 3,
        "create_game": 2,
        "auto_rsvp": 10,
        "generate_summary": 5,
    }

    # ==================== Action Cost Weighting ====================
    # Point-based budget system — not all actions are equal.
    # Lightweight actions cost 1 pt, AI/heavy actions cost more.
    ACTION_COST_POINTS = {
        "send_notification": 1,
        "send_email": 2,
        "send_payment_reminder": 2,
        "auto_rsvp": 1,
        "create_game": 3,
        "generate_summary": 5,
    }
    DEFAULT_ACTION_COST = 1
    MAX_DAILY_COST_POINTS_PER_USER = 100

    # Default quiet hours (in user's local time)
    DEFAULT_QUIET_START = 22  # 10pm
    DEFAULT_QUIET_END = 8    # 8am

    # Actions exempt from quiet hours (user explicitly set these up)
    QUIET_HOURS_EXEMPT = {"auto_rsvp"}

    # Actions that can run during quiet hours but get queued for delivery later
    QUIET_HOURS_QUEUE = {"send_notification", "send_email"}

    # ==================== Action Permission Matrix ====================
    # Defines who can use which action based on group role.
    # Roles: "admin" (host), "member", "self" (always allowed for self-targeting)
    #
    # Format: action_type → {target_scope → required_roles}
    # "any" means any target, "group" means target=group, "self" means target=self
    ACTION_PERMISSIONS = {
        "send_notification": {
            "self": ["member", "admin"],     # Anyone can notify themselves
            "group": ["admin"],              # Only admin can mass-notify group
            "host": ["member", "admin"],     # Anyone can notify the host
        },
        "send_email": {
            "self": ["member", "admin"],
            "group": ["admin"],              # Only admin can mass-email
            "host": ["admin"],
        },
        "send_payment_reminder": {
            # Only creditor or host can send reminders
            "any": ["admin", "creditor"],
        },
        "create_game": {
            "any": ["admin"],                # Only admin/host can create games
        },
        "auto_rsvp": {
            "any": ["member", "admin"],      # Always allowed (self-action)
        },
        "generate_summary": {
            "self": ["member", "admin"],
            "group": ["admin"],              # Only admin can share to group
        },
    }

    # Cron constraints
    MIN_CRON_INTERVAL_MINUTES = 15  # Minimum schedule interval

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "automation_policy"

    @property
    def description(self) -> str:
        return (
            "Check whether a user automation should be allowed to execute. "
            "Enforces rate limits, cooldowns, timezone-aware quiet hours, "
            "per-action caps, and role-based action permissions."
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
                        "check_build_policy",
                        "check_action_limits",
                        "check_action_permissions",
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
                "actions": {
                    "type": "array",
                    "description": "Full action configs (for build-time permission check)",
                },
                "trigger": {
                    "type": "object",
                    "description": "Trigger config (for build-time policy)",
                },
            },
            "required": ["action", "user_id"],
        }

    async def execute(self, **kwargs) -> ToolResult:
        action = kwargs.get("action")

        if action == "check_policy":
            return await self._check_policy(**kwargs)
        elif action == "check_build_policy":
            return await self._check_build_policy(**kwargs)
        elif action == "check_action_limits":
            return await self._check_action_limits(**kwargs)
        elif action == "check_action_permissions":
            return await self._check_action_permissions(**kwargs)
        elif action == "get_usage_stats":
            return await self._get_usage_stats(**kwargs)
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    # ==================== Check Policy (Runtime) ====================

    async def _check_policy(self, **kwargs) -> ToolResult:
        """
        Full policy check before automation execution.

        Returns:
            allowed: bool
            blocked_reason: str (if blocked) — specific skip reason
            checks_passed: list
            checks_failed: list with detailed reasons
        """
        user_id = kwargs.get("user_id")
        automation_id = kwargs.get("automation_id")
        group_id = kwargs.get("group_id")
        action_types = kwargs.get("action_types", [])
        actions = kwargs.get("actions", [])

        checks_passed = []
        checks_failed = []

        # Check 1: Per-user daily execution cap
        user_count = await self._get_user_daily_count(user_id)
        if user_count >= self.MAX_EXECUTIONS_PER_USER_PER_DAY:
            checks_failed.append({
                "check": "policy_cap_exceeded",
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
                    "check": "policy_cap_exceeded",
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
                    "check": "policy_cap_exceeded",
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
                        "check": "cooldown_active",
                        "reason": f"Cooldown active ({remaining}s remaining)",
                    })
                else:
                    checks_passed.append("cooldown")
            else:
                checks_passed.append("cooldown")

        # Check 5: Quiet hours (timezone-aware)
        if action_types and not all(a in self.QUIET_HOURS_EXEMPT for a in action_types):
            user_tz = await self._get_user_timezone(user_id, group_id)
            in_quiet = self._is_quiet_hours(user_tz)
            if in_quiet:
                checks_failed.append({
                    "check": "policy_quiet_hours",
                    "reason": (
                        f"Quiet hours active (10pm - 8am {user_tz or 'UTC'})"
                    ),
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
                        "check": f"policy_action_limit_{action_type}",
                        "reason": f"'{action_type}' daily limit reached ({count}/{limit})",
                    })
                else:
                    checks_passed.append(f"action_limit_{action_type}")

        # Check 7: Group membership
        if group_id:
            is_member = await self._check_group_membership(user_id, group_id)
            if not is_member:
                checks_failed.append({
                    "check": "policy_membership_failed",
                    "reason": "User is not a member of the target group",
                })
            else:
                checks_passed.append("group_membership")

        # Check 8: Action permission matrix
        if group_id and (actions or action_types):
            perm_result = await self._check_action_permission_matrix(
                user_id, group_id, actions, action_types
            )
            if perm_result:
                checks_failed.append({
                    "check": "policy_action_not_allowed",
                    "reason": perm_result,
                })
            else:
                checks_passed.append("action_permissions")

        # Check 9: Action cost budget
        if action_types:
            run_cost = sum(
                self.ACTION_COST_POINTS.get(at, self.DEFAULT_ACTION_COST)
                for at in action_types
            )
            daily_cost = await self._get_user_daily_cost(user_id)
            if daily_cost + run_cost > self.MAX_DAILY_COST_POINTS_PER_USER:
                checks_failed.append({
                    "check": "policy_cost_budget_exceeded",
                    "reason": (
                        f"Daily cost budget exceeded "
                        f"({daily_cost}+{run_cost}/{self.MAX_DAILY_COST_POINTS_PER_USER} pts)"
                    ),
                })
            else:
                checks_passed.append("cost_budget")

        allowed = len(checks_failed) == 0

        return ToolResult(
            success=True,
            data={
                "allowed": allowed,
                "blocked_reason": checks_failed[0]["reason"] if checks_failed else None,
                "blocked_check": checks_failed[0]["check"] if checks_failed else None,
                "checks_passed": checks_passed,
                "checks_failed": [c["check"] for c in checks_failed],
                "checks_failed_details": checks_failed,
            }
        )

    # ==================== Check Build Policy ====================

    async def _check_build_policy(self, **kwargs) -> ToolResult:
        """
        Policy check at automation CREATION time.
        Blocks automations that would always be rejected at runtime.

        Checks:
        1. Action permissions: user role allows these actions
        2. Schedule constraints: cron interval not too frequent
        3. Action target validity: non-admin can't broadcast to group
        """
        user_id = kwargs.get("user_id")
        group_id = kwargs.get("group_id")
        trigger = kwargs.get("trigger", {})
        actions = kwargs.get("actions", [])

        errors = []

        # Check 1: Action permissions
        if group_id:
            for i, action_config in enumerate(actions):
                action_type = action_config.get("type")
                target = action_config.get("params", {}).get("target", "self")

                perm_check = await self._check_single_action_permission(
                    user_id, group_id, action_type, target
                )
                if perm_check:
                    errors.append(
                        f"Action {i+1} ({action_type}, target={target}): {perm_check}"
                    )

        # Check 2: Cron schedule constraints
        if trigger.get("type") == "schedule":
            schedule = trigger.get("schedule", "")
            cron_error = self._validate_cron_constraints(schedule)
            if cron_error:
                errors.append(f"Schedule: {cron_error}")

        if errors:
            return ToolResult(
                success=False,
                error="; ".join(errors),
                data={"allowed": False, "errors": errors},
            )

        return ToolResult(
            success=True,
            data={"allowed": True, "errors": []},
            message="Build policy check passed",
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

    # ==================== Check Action Permissions ====================

    async def _check_action_permissions(self, **kwargs) -> ToolResult:
        """Check if user has permissions for specific actions in a group."""
        user_id = kwargs.get("user_id")
        group_id = kwargs.get("group_id")
        actions = kwargs.get("actions", [])

        if not group_id:
            return ToolResult(
                success=True,
                data={"allowed": True, "details": "No group scope — permissions not applicable"},
            )

        results = []
        all_allowed = True

        for action_config in actions:
            action_type = action_config.get("type")
            target = action_config.get("params", {}).get("target", "self")

            error = await self._check_single_action_permission(
                user_id, group_id, action_type, target
            )

            results.append({
                "action_type": action_type,
                "target": target,
                "allowed": error is None,
                "reason": error,
            })

            if error:
                all_allowed = False

        return ToolResult(
            success=True,
            data={"allowed": all_allowed, "details": results},
        )

    # ==================== Usage Stats ====================

    async def _get_usage_stats(self, **kwargs) -> ToolResult:
        """Get automation usage statistics for a user."""
        user_id = kwargs.get("user_id")

        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        total_automations = await self.db.user_automations.count_documents(
            {"user_id": user_id}
        )
        enabled_automations = await self.db.user_automations.count_documents(
            {"user_id": user_id, "enabled": True}
        )
        auto_disabled = await self.db.user_automations.count_documents(
            {"user_id": user_id, "auto_disabled": True}
        )

        daily_executions = await self._get_user_daily_count(user_id)

        total_runs = 0
        automations = await self.db.user_automations.find(
            {"user_id": user_id},
            {"_id": 0, "run_count": 1}
        ).to_list(50)
        for a in automations:
            total_runs += a.get("run_count", 0)

        daily_cost = await self._get_user_daily_cost(user_id)

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
                "today_cost_points": daily_cost,
                "max_daily_cost_points": self.MAX_DAILY_COST_POINTS_PER_USER,
                "cost_budget_remaining": max(0, self.MAX_DAILY_COST_POINTS_PER_USER - daily_cost),
                "action_cost_table": self.ACTION_COST_POINTS,
            }
        )

    # ==================== Action Permission Matrix Helpers ====================

    async def _check_action_permission_matrix(
        self,
        user_id: str,
        group_id: str,
        actions: List,
        action_types: List[str],
    ) -> Optional[str]:
        """
        Check all actions against the permission matrix.
        Returns error string if blocked, None if allowed.
        """
        # Get user's role in the group
        role = await self._get_user_group_role(user_id, group_id)
        if not role:
            return "User has no role in the target group"

        # Check each action
        for action_config in (actions or []):
            action_type = action_config.get("type") if isinstance(action_config, dict) else action_config
            target = "self"
            if isinstance(action_config, dict):
                target = action_config.get("params", {}).get("target", "self")

            error = self._check_permission_for_role(action_type, target, role)
            if error:
                return error

        # If only action_types provided (no full configs), check with default target
        if not actions and action_types:
            for action_type in action_types:
                error = self._check_permission_for_role(action_type, "self", role)
                if error:
                    return error

        return None

    async def _check_single_action_permission(
        self, user_id: str, group_id: str, action_type: str, target: str
    ) -> Optional[str]:
        """Check a single action's permission. Returns error string or None."""
        role = await self._get_user_group_role(user_id, group_id)
        if not role:
            return "User has no role in the target group"

        return self._check_permission_for_role(action_type, target, role)

    def _check_permission_for_role(
        self, action_type: str, target: str, role: str
    ) -> Optional[str]:
        """Check if a role is allowed for an action+target combination."""
        perms = self.ACTION_PERMISSIONS.get(action_type)
        if not perms:
            return None  # Unknown action — let validator handle it

        # Check target-specific permission first, then fallback to "any"
        allowed_roles = perms.get(target) or perms.get("any")
        if not allowed_roles:
            return None  # No restriction defined

        if role not in allowed_roles:
            return (
                f"'{action_type}' with target='{target}' requires role "
                f"{allowed_roles}, but user has role '{role}'"
            )

        return None

    async def _get_user_group_role(
        self, user_id: str, group_id: str
    ) -> Optional[str]:
        """Get user's role in a group (admin, member, etc.)."""
        if self.db is None:
            return "member"  # Permissive when DB unavailable

        member = await self.db.group_members.find_one(
            {"user_id": user_id, "group_id": group_id},
            {"_id": 0, "role": 1}
        )

        if not member:
            return None

        return member.get("role", "member")

    # ==================== Cron Constraint Validation ====================

    def _validate_cron_constraints(self, schedule: str) -> Optional[str]:
        """
        Validate cron schedule against safety constraints.
        Returns error string or None.
        """
        if not schedule:
            return "Schedule expression is required"

        parts = schedule.strip().split()
        if len(parts) != 5:
            return "Invalid cron expression"

        minute, hour = parts[0], parts[1]

        # Check for "every minute" or overly frequent patterns
        if minute == "*" and hour == "*":
            return (
                f"Schedule too frequent. Minimum interval is "
                f"{self.MIN_CRON_INTERVAL_MINUTES} minutes."
            )

        # Check step intervals (*/N)
        if minute.startswith("*/"):
            try:
                interval = int(minute.split("/")[1])
                if interval < self.MIN_CRON_INTERVAL_MINUTES and hour == "*":
                    return (
                        f"Schedule interval ({interval} minutes) is below "
                        f"minimum ({self.MIN_CRON_INTERVAL_MINUTES} minutes)"
                    )
            except (ValueError, IndexError):
                pass

        # Check for comma-separated minutes that exceed frequency limit
        if "," in minute and hour == "*":
            minute_list = [m.strip() for m in minute.split(",")]
            if len(minute_list) > 4:
                return (
                    f"Too many scheduled minutes per hour ({len(minute_list)}). "
                    f"Maximum 4 runs per hour allowed."
                )

        return None

    # ==================== Timezone Helpers ====================

    async def _get_user_timezone(
        self, user_id: str, group_id: str = None
    ) -> Optional[str]:
        """
        Get the user's timezone (IANA string like 'America/New_York').
        Falls back to group timezone, then UTC.
        """
        if self.db is None:
            return None  # Will use UTC

        # Try user-level timezone
        user = await self.db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "timezone": 1}
        )
        if user and user.get("timezone"):
            return user["timezone"]

        # Try group-level timezone
        if group_id:
            group = await self.db.groups.find_one(
                {"group_id": group_id},
                {"_id": 0, "timezone": 1}
            )
            if group and group.get("timezone"):
                return group["timezone"]

        return None

    def _is_quiet_hours(self, user_tz: Optional[str] = None) -> bool:
        """
        Check if current time is in quiet hours.
        Uses user's timezone if available, otherwise UTC.
        """
        now_utc = datetime.now(timezone.utc)

        if user_tz:
            try:
                # Use zoneinfo (Python 3.9+) for timezone conversion
                from zoneinfo import ZoneInfo
                user_zone = ZoneInfo(user_tz)
                now_local = now_utc.astimezone(user_zone)
                hour = now_local.hour
            except (ImportError, KeyError):
                # Fallback to UTC if zoneinfo unavailable or bad tz string
                logger.warning(
                    f"Invalid timezone '{user_tz}', falling back to UTC"
                )
                hour = now_utc.hour
        else:
            hour = now_utc.hour

        if self.DEFAULT_QUIET_START > self.DEFAULT_QUIET_END:
            # Spans midnight (e.g., 22-8)
            return hour >= self.DEFAULT_QUIET_START or hour < self.DEFAULT_QUIET_END
        else:
            return self.DEFAULT_QUIET_START <= hour < self.DEFAULT_QUIET_END

    # ==================== DB Helper Methods ====================

    async def _get_user_daily_count(self, user_id: str) -> int:
        """Get number of automation runs by a user today."""
        if self.db is None:
            return 0

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        user_auto_ids = await self.db.user_automations.distinct(
            "automation_id",
            {"user_id": user_id}
        )
        if not user_auto_ids:
            return 0

        count = await self.db.automation_runs.count_documents({
            "automation_id": {"$in": user_auto_ids},
            "created_at": {"$gte": today_start},
            "status": {"$in": ["success", "partial_failure"]},
        })

        return count

    async def _get_group_daily_count(self, group_id: str) -> int:
        """Get number of automation runs targeting a group today."""
        if self.db is None:
            return 0

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

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
        if self.db is None:
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
        if self.db is None:
            return 0

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        user_auto_ids = await self.db.user_automations.distinct(
            "automation_id",
            {"user_id": user_id}
        )
        if not user_auto_ids:
            return 0

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
        if self.db is None:
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

    async def _get_user_daily_cost(self, user_id: str) -> int:
        """Get total action cost points consumed by a user today."""
        if self.db is None:
            return 0

        today_start = datetime.now(timezone.utc).replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        user_auto_ids = await self.db.user_automations.distinct(
            "automation_id",
            {"user_id": user_id}
        )
        if not user_auto_ids:
            return 0

        # Fetch today's successful runs with action_results
        runs = await self.db.automation_runs.find(
            {
                "automation_id": {"$in": user_auto_ids},
                "created_at": {"$gte": today_start},
                "status": {"$in": ["success", "partial_failure"]},
            },
            {"_id": 0, "action_results": 1}
        ).to_list(200)

        total_cost = 0
        for run in runs:
            for action_result in (run.get("action_results") or []):
                if action_result.get("success"):
                    action_type = action_result.get("type", "")
                    total_cost += self.ACTION_COST_POINTS.get(
                        action_type, self.DEFAULT_ACTION_COST
                    )

        return total_cost

    async def _check_group_membership(
        self, user_id: str, group_id: str
    ) -> bool:
        """Check if user is a member of the group."""
        if self.db is None:
            return True  # Permissive when DB unavailable

        member = await self.db.group_members.find_one(
            {"user_id": user_id, "group_id": group_id},
            {"_id": 0, "user_id": 1}
        )
        return member is not None
