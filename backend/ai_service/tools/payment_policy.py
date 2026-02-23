"""
Payment Policy Tool (v2)

Policy gating for payment reconciliation actions.
Controls reminder frequency, escalation rules, quiet hours,
and per-group payment settings.

v2 improvements:
- Single consistent escalation timeline (soft at 7d + 2 reminders, hard at 14d)
- Per-user/day and per-group/day reminder caps (anti-spam)
- Quiet hours: escalation bypass for hosts only, NOT payers
- Consolidation: block disputed entries and cross-currency
- Batch reminder policy for grouping multiple debts per user
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)

# Default policy configuration
DEFAULT_POLICY = {
    # Reminder controls
    "reminder_cooldown_hours": 24,            # Min hours between reminders per ledger entry
    "max_reminders_per_entry": 5,             # Max reminders before auto-escalate
    "min_days_between_reminders": 1,          # Floor: can't send > 1 reminder/day per entry
    "max_reminders_per_user_per_day": 2,      # Cap per user across ALL their debts
    "max_reminders_per_group_per_day": 10,    # Cap per group to prevent flood
    # Escalation timeline (single source of truth)
    "soft_escalation_days": 7,                # Host gets visibility (not blocking)
    "soft_escalation_min_reminders": 2,       # Must have sent at least N reminders for soft
    "hard_escalation_days": 14,               # Unconditional host escalation
    # Quiet hours
    "quiet_hours_start": 22,                  # 10 PM
    "quiet_hours_end": 8,                     # 8 AM
    "weekend_reminders_enabled": True,
    # Consolidation
    "consolidation_min_games": 2,
    "consolidation_enabled": True,
    # Stripe auto-mark
    "auto_mark_paid_confidence": 0.95,
    # Nonpayer
    "chronic_nonpayer_threshold": 3,
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
    Policy gating for payment reconciliation actions (v2).

    Checks:
    - Reminder cooldown per entry (don't spam)
    - Per-user/day cap across all debts
    - Per-group/day cap to prevent flood
    - Quiet hours (escalation bypass for HOSTS only)
    - Max reminder cap per entry
    - Soft/hard escalation with consistent timeline
    - Stripe auto-match confidence threshold
    - Consolidation: block disputed/cross-currency
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
            "quiet hours, per-user/group daily caps, and per-group settings."
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
                        "check_batch_reminder_policy",
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
                "target_type": {
                    "type": "string",
                    "description": "Who is the notification target: 'payer' or 'host'",
                    "enum": ["payer", "host"]
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
                target_type=kwargs.get("target_type", "payer"),
            )
        elif action == "check_batch_reminder_policy":
            return await self._check_batch_reminder_policy(
                user_id=kwargs.get("user_id"),
                group_id=kwargs.get("group_id"),
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
        target_type: str = "payer",
    ) -> ToolResult:
        """
        Check if a payment reminder is allowed.

        Checks (in order):
        1. Group payment reminders enabled
        2. Quiet hours (escalation bypass for HOSTS only, not payers)
        3. Weekend check
        4. Per-user daily cap (max N reminders/day/user across all debts)
        5. Per-group daily cap (max N reminders/day/group)
        6. Cooldown since last reminder per entry
        7. Max reminders per entry (auto-escalate if exceeded)
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
        # Escalation notifications bypass quiet hours ONLY for hosts, not payers
        now = datetime.now(timezone.utc)
        hour = now.hour
        quiet_start = settings["quiet_hours_start"]
        quiet_end = settings["quiet_hours_end"]

        in_quiet_hours = False
        if quiet_start > quiet_end:
            in_quiet_hours = hour >= quiet_start or hour < quiet_end
        else:
            in_quiet_hours = quiet_start <= hour < quiet_end

        if in_quiet_hours:
            # Only hosts bypass quiet hours on escalation
            bypass = (urgency == "escalate" and target_type == "host")
            if not bypass:
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

        # Check 4: Per-user daily cap
        if self.db and user_id:
            today_start = now.replace(
                hour=0, minute=0, second=0, microsecond=0
            ).isoformat()
            user_today_count = await self.db.payment_reminders_log.count_documents({
                "user_id": user_id,
                "sent_at": {"$gte": today_start},
            })
            max_per_user = settings["max_reminders_per_user_per_day"]
            if user_today_count >= max_per_user:
                checks_failed.append("user_daily_cap")
                return ToolResult(
                    success=True,
                    data={
                        "allowed": False,
                        "blocked_reason": "user_daily_cap",
                        "user_reminders_today": user_today_count,
                        "max_per_user_per_day": max_per_user,
                        "checks_passed": checks_passed,
                        "checks_failed": checks_failed,
                    }
                )
        checks_passed.append("user_daily_cap")

        # Check 5: Per-group daily cap
        if self.db and group_id:
            today_start = now.replace(
                hour=0, minute=0, second=0, microsecond=0
            ).isoformat()
            group_today_count = await self.db.payment_reminders_log.count_documents({
                "group_id": group_id,
                "sent_at": {"$gte": today_start},
            })
            max_per_group = settings["max_reminders_per_group_per_day"]
            if group_today_count >= max_per_group:
                checks_failed.append("group_daily_cap")
                return ToolResult(
                    success=True,
                    data={
                        "allowed": False,
                        "blocked_reason": "group_daily_cap",
                        "group_reminders_today": group_today_count,
                        "max_per_group_per_day": max_per_group,
                        "checks_passed": checks_passed,
                        "checks_failed": checks_failed,
                    }
                )
        checks_passed.append("group_daily_cap")

        # Check 6: Cooldown since last reminder per entry
        if self.db and ledger_id:
            cooldown_hours = settings["reminder_cooldown_hours"]
            min_days = settings["min_days_between_reminders"]
            # Effective cooldown is the max of cooldown_hours and min_days
            effective_cooldown_hours = max(cooldown_hours, min_days * 24)

            cooldown_cutoff = (
                now - timedelta(hours=effective_cooldown_hours)
            ).isoformat()

            recent_reminder = await self.db.payment_reminders_log.find_one({
                "ledger_id": ledger_id,
                "sent_at": {"$gte": cooldown_cutoff},
            })
            if recent_reminder:
                checks_failed.append("cooldown")
                return ToolResult(
                    success=True,
                    data={
                        "allowed": False,
                        "blocked_reason": "cooldown",
                        "cooldown_hours": effective_cooldown_hours,
                        "last_reminder_at": recent_reminder.get("sent_at"),
                        "checks_passed": checks_passed,
                        "checks_failed": checks_failed,
                    }
                )
        checks_passed.append("cooldown")

        # Check 7: Max reminders per entry
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

    # ==================== Batch Reminder Policy ====================

    async def _check_batch_reminder_policy(
        self,
        user_id: str = None,
        group_id: str = None,
    ) -> ToolResult:
        """
        Check if a user should receive a batched reminder (single notification
        for multiple debts) instead of individual reminders.

        Returns how many more reminders this user can receive today,
        so the agent can batch them into one notification.
        """
        settings = await self._get_group_settings(group_id)

        if not self.db or not user_id:
            return ToolResult(
                success=True,
                data={"remaining_today": settings["max_reminders_per_user_per_day"]}
            )

        now = datetime.now(timezone.utc)
        today_start = now.replace(
            hour=0, minute=0, second=0, microsecond=0
        ).isoformat()

        user_today_count = await self.db.payment_reminders_log.count_documents({
            "user_id": user_id,
            "sent_at": {"$gte": today_start},
        })

        max_per_user = settings["max_reminders_per_user_per_day"]
        remaining = max(0, max_per_user - user_today_count)

        return ToolResult(
            success=True,
            data={
                "user_id": user_id,
                "reminders_sent_today": user_today_count,
                "max_per_day": max_per_user,
                "remaining_today": remaining,
                "should_batch": remaining <= 1 and user_today_count > 0,
            }
        )

    # ==================== Check Escalation Policy (v2) ====================

    async def _check_escalation_policy(
        self,
        ledger_id: str = None,
        group_id: str = None,
    ) -> ToolResult:
        """
        Check if a payment should be escalated to the host.

        Single consistent timeline (v2):
        - Soft escalation: days >= 7 AND reminders >= 2 (host gets visibility)
        - Hard escalation: days >= 14 (unconditional, no matter reminder count)
        - Reminder cap: reminders >= max (auto-escalate, but only if days >= 3)

        The min-days guard on reminder cap prevents logic bugs from spamming
        5 reminders in 5 days then escalating prematurely.
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
                    data={
                        "should_escalate": False,
                        "escalation_type": None,
                        "reason": "not_pending",
                    },
                )

            # Already hard-escalated
            if entry.get("hard_escalated"):
                return ToolResult(
                    success=True,
                    data={
                        "should_escalate": False,
                        "escalation_type": None,
                        "reason": "already_hard_escalated",
                    },
                )

            # Calculate days overdue
            created_at = entry.get("created_at")
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if isinstance(created_at, datetime):
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                days_overdue = (datetime.now(timezone.utc) - created_at).days
            else:
                days_overdue = 0

            reminder_count = entry.get("reminder_count", 0)
            soft_days = settings["soft_escalation_days"]
            soft_min_reminders = settings["soft_escalation_min_reminders"]
            hard_days = settings["hard_escalation_days"]
            max_reminders = settings["max_reminders_per_entry"]

            # Determine escalation type
            escalation_type = None
            reasons = []

            # Hard escalation: 14+ days, unconditional
            if days_overdue >= hard_days:
                escalation_type = "hard"
                reasons.append(
                    f"overdue {days_overdue} days (hard threshold: {hard_days})"
                )

            # Reminder cap escalation: 5+ reminders but only if 3+ days
            elif reminder_count >= max_reminders and days_overdue >= 3:
                escalation_type = "hard"
                reasons.append(
                    f"{reminder_count} reminders sent (max: {max_reminders}), "
                    f"{days_overdue} days overdue"
                )

            # Soft escalation: 7+ days AND 2+ reminders
            elif (
                days_overdue >= soft_days
                and reminder_count >= soft_min_reminders
                and not entry.get("soft_escalated")
            ):
                escalation_type = "soft"
                reasons.append(
                    f"overdue {days_overdue} days with {reminder_count} reminders "
                    f"(soft threshold: {soft_days}d + {soft_min_reminders} reminders)"
                )

            return ToolResult(
                success=True,
                data={
                    "should_escalate": escalation_type is not None,
                    "escalation_type": escalation_type,
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

        Only auto-marks if confidence >= threshold.
        Metadata match (1.0) passes. Fuzzy matches (0.85-0.9) need manual review.
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

    # ==================== Check Consolidation Policy (v2) ====================

    async def _check_consolidation_policy(
        self,
        debt_data: Dict = None,
        group_id: str = None,
    ) -> ToolResult:
        """
        Check if a debt consolidation suggestion is appropriate (v2).

        Blocks consolidation when:
        - Group opted out
        - < 2 games involved
        - Net amount is $0
        - Any entry is disputed
        - Entries have mixed currencies
        """
        settings = await self._get_group_settings(group_id)
        debt_data = debt_data or {}

        # Group opt-out
        if not settings.get("consolidation_enabled", True):
            return ToolResult(
                success=True,
                data={"allowed": False, "reason": "consolidation_disabled_for_group"}
            )
        if self.db and group_id:
            group_pref = await self.db.payment_settings.find_one(
                {"group_id": group_id}, {"_id": 0}
            )
            if group_pref and not group_pref.get("consolidation_enabled", True):
                return ToolResult(
                    success=True,
                    data={"allowed": False, "reason": "consolidation_disabled_for_group"}
                )

        min_games = settings["consolidation_min_games"]
        game_count = debt_data.get("game_count", 0)
        net_amount = debt_data.get("net_amount", 0)

        # Check for disputed entries
        has_disputed = debt_data.get("has_disputed", False)
        if has_disputed:
            return ToolResult(
                success=True,
                data={"allowed": False, "reason": "contains_disputed_entries"}
            )

        # Check for mixed currencies
        has_mixed_currencies = debt_data.get("has_mixed_currencies", False)
        if has_mixed_currencies:
            return ToolResult(
                success=True,
                data={"allowed": False, "reason": "mixed_currencies"}
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
