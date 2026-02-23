"""
Payment Policy Tool

Policy gating for payment reconciliation actions.
Controls reminder frequency, escalation rules, quiet hours,
and per-group payment settings.

Used by PaymentReconciliationAgent before sending reminders or escalating.
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)

# Default policy configuration
DEFAULT_POLICY = {
    "reminder_cooldown_hours": 24,        # Min hours between reminders to same user
    "max_reminders_per_entry": 5,         # Max reminders before auto-escalate
    "escalation_threshold_days": 7,       # Days before escalating to host
    "quiet_hours_start": 22,              # 10 PM local time
    "quiet_hours_end": 8,                 # 8 AM local time
    "weekend_reminders_enabled": True,    # Allow reminders on weekends
    "consolidation_min_games": 2,         # Min games to suggest consolidation
    "auto_mark_paid_confidence": 0.95,    # Min confidence to auto-mark Stripe match
    "chronic_nonpayer_threshold": 3,      # Pending entries to flag as chronic
}

# Urgency-based tone mapping
URGENCY_TONE = {
    "gentle": {
        "tone": "friendly",
        "emoji": True,
        "include_amount": True,
        "include_deadline": False,
    },
    "firm": {
        "tone": "professional",
        "emoji": False,
        "include_amount": True,
        "include_deadline": True,
    },
    "final": {
        "tone": "urgent",
        "emoji": False,
        "include_amount": True,
        "include_deadline": True,
    },
    "escalate": {
        "tone": "formal",
        "emoji": False,
        "include_amount": True,
        "include_deadline": True,
    },
}


class PaymentPolicyTool(BaseTool):
    """
    Policy gating for payment reconciliation actions.

    Checks:
    - Reminder cooldown (don't spam users)
    - Max reminder cap per entry
    - Quiet hours enforcement
    - Per-group payment settings (enabled/disabled, custom thresholds)
    - Escalation readiness (has enough reminders been sent?)
    - Stripe auto-match confidence threshold
    """

    def __init__(self, db=None, **kwargs):
        self.db = db

    @property
    def name(self) -> str:
        return "payment_policy"

    @property
    def description(self) -> str:
        return (
            "Check payment reconciliation policies before sending reminders, "
            "escalating to hosts, or auto-marking payments. Enforces cooldowns, "
            "quiet hours, reminder caps, and per-group settings."
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Policy check action",
                    "enum": [
                        "check_reminder_policy",
                        "check_escalation_policy",
                        "check_auto_mark_policy",
                        "check_consolidation_policy",
                        "get_reminder_tone",
                    ]
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID being reminded"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID for group-specific settings"
                },
                "ledger_id": {
                    "type": "string",
                    "description": "Ledger entry ID"
                },
                "urgency": {
                    "type": "string",
                    "description": "Urgency level of the reminder",
                    "enum": ["gentle", "firm", "final", "escalate"]
                },
                "match_confidence": {
                    "type": "number",
                    "description": "Stripe match confidence for auto-mark check"
                },
                "debt_data": {
                    "type": "object",
                    "description": "Consolidated debt data for consolidation check"
                },
            },
            "required": ["action"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute policy check."""
        action = kwargs.get("action")

        if action == "check_reminder_policy":
            return await self._check_reminder_policy(
                user_id=kwargs.get("user_id"),
                group_id=kwargs.get("group_id"),
                ledger_id=kwargs.get("ledger_id"),
                urgency=kwargs.get("urgency", "gentle"),
            )
        elif action == "check_escalation_policy":
            return await self._check_escalation_policy(
                ledger_id=kwargs.get("ledger_id"),
                group_id=kwargs.get("group_id"),
            )
        elif action == "check_auto_mark_policy":
            return await self._check_auto_mark_policy(
                match_confidence=kwargs.get("match_confidence", 0),
                group_id=kwargs.get("group_id"),
            )
        elif action == "check_consolidation_policy":
            return await self._check_consolidation_policy(
                debt_data=kwargs.get("debt_data", {}),
                group_id=kwargs.get("group_id"),
            )
        elif action == "get_reminder_tone":
            return self._get_reminder_tone(
                urgency=kwargs.get("urgency", "gentle"),
            )
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    async def _get_group_settings(self, group_id: str = None) -> Dict:
        """Get merged policy settings (group overrides + defaults)."""
        settings = dict(DEFAULT_POLICY)
        if not group_id or not self.db:
            return settings

        group_settings = await self.db.payment_settings.find_one(
            {"group_id": group_id}, {"_id": 0}
        )
        if group_settings:
            for key in DEFAULT_POLICY:
                if key in group_settings:
                    settings[key] = group_settings[key]

        return settings

    # ==================== Check Reminder Policy ====================

    async def _check_reminder_policy(
        self,
        user_id: str = None,
        group_id: str = None,
        ledger_id: str = None,
        urgency: str = "gentle",
    ) -> ToolResult:
        """
        Check if a payment reminder is allowed.

        Checks:
        1. Payment reminders enabled for group
        2. Quiet hours (user's local time if available, else UTC)
        3. Cooldown since last reminder to this user
        4. Max reminders per ledger entry
        5. Weekend check
        """
        settings = await self._get_group_settings(group_id)
        checks_passed = []
        checks_failed = []

        # Check 1: Group payment reminders enabled
        if self.db and group_id:
            group_pref = await self.db.payment_settings.find_one(
                {"group_id": group_id}, {"_id": 0}
            )
            if group_pref and not group_pref.get("reminders_enabled", True):
                checks_failed.append("group_reminders_disabled")
                return ToolResult(
                    success=True,
                    data={
                        "allowed": False,
                        "blocked_reason": "group_reminders_disabled",
                        "checks_passed": checks_passed,
                        "checks_failed": checks_failed,
                    }
                )
        checks_passed.append("group_enabled")

        # Check 2: Quiet hours
        now = datetime.now(timezone.utc)
        hour = now.hour
        quiet_start = settings["quiet_hours_start"]
        quiet_end = settings["quiet_hours_end"]

        in_quiet_hours = False
        if quiet_start > quiet_end:
            # Wraps midnight: e.g., 22-8
            in_quiet_hours = hour >= quiet_start or hour < quiet_end
        else:
            in_quiet_hours = quiet_start <= hour < quiet_end

        if in_quiet_hours and urgency != "escalate":
            # Escalations bypass quiet hours
            checks_failed.append("quiet_hours")
            return ToolResult(
                success=True,
                data={
                    "allowed": False,
                    "blocked_reason": "quiet_hours",
                    "retry_after": self._next_active_hour(quiet_end),
                    "checks_passed": checks_passed,
                    "checks_failed": checks_failed,
                }
            )
        checks_passed.append("quiet_hours")

        # Check 3: Weekend check
        if not settings["weekend_reminders_enabled"] and now.weekday() >= 5:
            if urgency not in ("final", "escalate"):
                checks_failed.append("weekend_blocked")
                return ToolResult(
                    success=True,
                    data={
                        "allowed": False,
                        "blocked_reason": "weekend_blocked",
                        "checks_passed": checks_passed,
                        "checks_failed": checks_failed,
                    }
                )
        checks_passed.append("weekend")

        # Check 4: Cooldown since last reminder
        if self.db and user_id:
            cooldown_hours = settings["reminder_cooldown_hours"]
            cooldown_cutoff = (
                now - timedelta(hours=cooldown_hours)
            ).isoformat()

            recent_reminder = await self.db.payment_reminders_log.find_one({
                "user_id": user_id,
                "sent_at": {"$gte": cooldown_cutoff},
            })
            if recent_reminder:
                checks_failed.append("cooldown")
                return ToolResult(
                    success=True,
                    data={
                        "allowed": False,
                        "blocked_reason": "cooldown",
                        "cooldown_hours": cooldown_hours,
                        "last_reminder_at": recent_reminder.get("sent_at"),
                        "checks_passed": checks_passed,
                        "checks_failed": checks_failed,
                    }
                )
        checks_passed.append("cooldown")

        # Check 5: Max reminders per entry
        if self.db and ledger_id:
            from bson import ObjectId
            entry = await self.db.ledger_entries.find_one(
                {"_id": ObjectId(ledger_id)},
                {"_id": 0, "reminder_count": 1}
            )
            if entry:
                reminder_count = entry.get("reminder_count", 0)
                max_reminders = settings["max_reminders_per_entry"]
                if reminder_count >= max_reminders:
                    checks_failed.append("max_reminders_reached")
                    return ToolResult(
                        success=True,
                        data={
                            "allowed": False,
                            "blocked_reason": "max_reminders_reached",
                            "reminder_count": reminder_count,
                            "max_reminders": max_reminders,
                            "should_escalate": True,
                            "checks_passed": checks_passed,
                            "checks_failed": checks_failed,
                        }
                    )
        checks_passed.append("max_reminders")

        # All checks passed
        tone = URGENCY_TONE.get(urgency, URGENCY_TONE["gentle"])

        return ToolResult(
            success=True,
            data={
                "allowed": True,
                "urgency": urgency,
                "tone": tone["tone"],
                "tone_config": tone,
                "checks_passed": checks_passed,
                "checks_failed": checks_failed,
            }
        )

    # ==================== Check Escalation Policy ====================

    async def _check_escalation_policy(
        self,
        ledger_id: str = None,
        group_id: str = None,
    ) -> ToolResult:
        """
        Check if a payment should be escalated to the host.

        Conditions for escalation:
        1. Days overdue >= escalation threshold
        2. Reminder count >= max reminders
        3. Not already escalated
        """
        settings = await self._get_group_settings(group_id)

        if not self.db or not ledger_id:
            return ToolResult(success=False, error="Database and ledger_id required")

        try:
            from bson import ObjectId
            entry = await self.db.ledger_entries.find_one({"_id": ObjectId(ledger_id)})
            if not entry:
                return ToolResult(success=False, error="Ledger entry not found")

            if entry.get("status") != "pending":
                return ToolResult(
                    success=True,
                    data={"should_escalate": False, "reason": "already_paid"},
                )

            # Already escalated check
            if entry.get("escalated_to_host"):
                return ToolResult(
                    success=True,
                    data={"should_escalate": False, "reason": "already_escalated"},
                )

            # Days overdue check
            created_at = entry.get("created_at")
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if isinstance(created_at, datetime):
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                days_overdue = (datetime.now(timezone.utc) - created_at).days
            else:
                days_overdue = 0

            # Reminder count check
            reminder_count = entry.get("reminder_count", 0)
            max_reminders = settings["max_reminders_per_entry"]
            threshold_days = settings["escalation_threshold_days"]

            should_escalate = (
                days_overdue >= threshold_days or
                reminder_count >= max_reminders
            )

            reasons = []
            if days_overdue >= threshold_days:
                reasons.append(f"overdue {days_overdue} days (threshold: {threshold_days})")
            if reminder_count >= max_reminders:
                reasons.append(f"{reminder_count} reminders sent (max: {max_reminders})")

            return ToolResult(
                success=True,
                data={
                    "should_escalate": should_escalate,
                    "days_overdue": days_overdue,
                    "reminder_count": reminder_count,
                    "reasons": reasons,
                    "amount": entry.get("amount", 0),
                    "from_user_id": entry.get("from_user_id"),
                    "to_user_id": entry.get("to_user_id"),
                }
            )

        except Exception as e:
            logger.error(f"Error checking escalation policy: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Check Auto-Mark Policy ====================

    async def _check_auto_mark_policy(
        self,
        match_confidence: float = 0,
        group_id: str = None,
    ) -> ToolResult:
        """
        Check if a Stripe-matched payment can be auto-marked as paid.

        Only auto-marks if confidence >= threshold from group settings.
        """
        settings = await self._get_group_settings(group_id)
        threshold = settings["auto_mark_paid_confidence"]

        allowed = match_confidence >= threshold

        return ToolResult(
            success=True,
            data={
                "allowed": allowed,
                "match_confidence": match_confidence,
                "threshold": threshold,
                "requires_manual": not allowed,
                "reason": (
                    "confidence meets threshold" if allowed
                    else f"confidence {match_confidence:.2f} below threshold {threshold}"
                ),
            }
        )

    # ==================== Check Consolidation Policy ====================

    async def _check_consolidation_policy(
        self,
        debt_data: Dict = None,
        group_id: str = None,
    ) -> ToolResult:
        """
        Check if a debt consolidation suggestion is appropriate.

        Only suggests consolidation when:
        - 2+ games involved
        - Net amount > $0
        - Group hasn't opted out of consolidation
        """
        settings = await self._get_group_settings(group_id)
        debt_data = debt_data or {}

        min_games = settings["consolidation_min_games"]
        game_count = debt_data.get("game_count", 0)
        net_amount = debt_data.get("net_amount", 0)

        # Check group opt-out
        if self.db and group_id:
            group_pref = await self.db.payment_settings.find_one(
                {"group_id": group_id}, {"_id": 0}
            )
            if group_pref and not group_pref.get("consolidation_enabled", True):
                return ToolResult(
                    success=True,
                    data={
                        "allowed": False,
                        "reason": "consolidation_disabled_for_group",
                    }
                )

        allowed = game_count >= min_games and net_amount > 0

        return ToolResult(
            success=True,
            data={
                "allowed": allowed,
                "game_count": game_count,
                "min_games_required": min_games,
                "net_amount": net_amount,
                "reason": (
                    "meets consolidation criteria" if allowed
                    else f"needs {min_games}+ games (has {game_count})"
                ),
            }
        )

    # ==================== Get Reminder Tone ====================

    def _get_reminder_tone(self, urgency: str = "gentle") -> ToolResult:
        """Get the appropriate tone configuration for a reminder urgency level."""
        tone = URGENCY_TONE.get(urgency, URGENCY_TONE["gentle"])

        return ToolResult(
            success=True,
            data={
                "urgency": urgency,
                "tone": tone["tone"],
                "config": tone,
            }
        )

    # ==================== Helpers ====================

    def _next_active_hour(self, quiet_end: int) -> str:
        """Calculate next active hour after quiet hours end."""
        now = datetime.now(timezone.utc)
        next_active = now.replace(hour=quiet_end, minute=0, second=0, microsecond=0)
        if next_active <= now:
            next_active += timedelta(days=1)
        return next_active.isoformat()
