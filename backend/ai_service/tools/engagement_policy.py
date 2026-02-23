"""
Engagement Policy Tool

Gating layer that decides WHETHER a nudge should be sent, to which channels,
and with what tone. Checks:
- engagement_enabled per group
- cooldowns by category + channel + recipient
- quiet hours (local time)
- user preferences / mute status
- daily caps per user
- escalation caps per inactivity cycle
- risk flags (e.g., big loss → don't send FOMO)

This is the "trust layer" that prevents creepy/spammy engagement behavior.
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class EngagementPolicyTool(BaseTool):
    """
    Decides if an engagement action is allowed before it executes.

    Outputs:
    - allowed: true/false
    - allowed_channels: [push, email, sms, in_app]
    - tone: playful | neutral | respectful
    - blocked_reason: why it was blocked (if blocked)
    """

    # Daily cap: max engagement messages per user per day
    DAILY_CAP_PER_USER = 1
    # Max nudges per inactivity cycle (before the user plays again)
    ESCALATION_CAP = 2
    # Default quiet hours (UTC) — 10pm to 8am
    DEFAULT_QUIET_START = 22
    DEFAULT_QUIET_END = 8

    # Category-specific cooldowns (in days)
    CATEGORY_COOLDOWNS = {
        "inactive_group": 7,
        "inactive_user": 14,
        "milestone": 0,       # No cooldown for milestones (they're rare)
        "big_winner": 14,     # Max 1 winner celebration per 14 days per person
        "digest": 7,          # Weekly digest
        "comeback": 7,
        "closest_finish": 7,
        "host_appreciation": 30,
    }

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "engagement_policy"

    @property
    def description(self) -> str:
        return (
            "Check whether an engagement nudge should be sent. "
            "Enforces cooldowns, quiet hours, user preferences, daily caps, "
            "and risk flags to prevent spam and maintain trust."
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform",
                    "enum": ["check_policy", "record_mute", "get_preferences"]
                },
                "recipient_type": {
                    "type": "string",
                    "description": "Who is the target",
                    "enum": ["user", "group", "admin"]
                },
                "recipient_id": {
                    "type": "string",
                    "description": "User ID or Group ID of the recipient"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID for group-level policy checks"
                },
                "category": {
                    "type": "string",
                    "description": "Nudge category",
                    "enum": [
                        "inactive_group", "inactive_user", "milestone",
                        "big_winner", "digest", "comeback",
                        "closest_finish", "host_appreciation"
                    ]
                },
                "channel": {
                    "type": "string",
                    "description": "Requested delivery channel",
                    "enum": ["push", "email", "sms", "in_app"]
                },
                "context": {
                    "type": "object",
                    "description": "Additional context for risk assessment (e.g., recent_loss)"
                }
            },
            "required": ["action"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute policy check."""
        action = kwargs.get("action")

        if action == "check_policy":
            return await self._check_policy(
                recipient_type=kwargs.get("recipient_type", "user"),
                recipient_id=kwargs.get("recipient_id"),
                group_id=kwargs.get("group_id"),
                category=kwargs.get("category", "inactive_group"),
                channel=kwargs.get("channel"),
                context=kwargs.get("context", {})
            )
        elif action == "record_mute":
            return await self._record_mute(
                recipient_id=kwargs.get("recipient_id"),
                group_id=kwargs.get("group_id"),
                category=kwargs.get("category")
            )
        elif action == "get_preferences":
            return await self._get_preferences(
                recipient_id=kwargs.get("recipient_id"),
                group_id=kwargs.get("group_id")
            )
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    async def _check_policy(
        self,
        recipient_type: str,
        recipient_id: str,
        group_id: str = None,
        category: str = "inactive_group",
        channel: str = None,
        context: Dict = None
    ) -> ToolResult:
        """
        Full policy check pipeline. Returns allowed/blocked with reasons.
        """
        if not self.db or not recipient_id:
            return ToolResult(success=False, error="Database or recipient_id not available")

        context = context or {}
        blocked_reasons = []
        allowed_channels = ["push", "in_app"]  # defaults

        try:
            # 1. Check engagement_enabled for group
            if group_id:
                settings = await self.db.engagement_settings.find_one(
                    {"group_id": group_id}, {"_id": 0}
                )
                if settings and not settings.get("engagement_enabled", True):
                    return ToolResult(
                        success=True,
                        data={
                            "allowed": False,
                            "blocked_reason": "engagement_disabled_for_group",
                            "allowed_channels": [],
                            "tone": "neutral"
                        }
                    )

            # 2. Check user mute/preferences
            user_prefs = await self.db.engagement_preferences.find_one(
                {"user_id": recipient_id}, {"_id": 0}
            )
            if user_prefs:
                if user_prefs.get("muted_all"):
                    return ToolResult(
                        success=True,
                        data={
                            "allowed": False,
                            "blocked_reason": "user_muted_all_engagement",
                            "allowed_channels": [],
                            "tone": "neutral"
                        }
                    )
                # Check category-specific mute
                muted_categories = user_prefs.get("muted_categories", [])
                if category in muted_categories:
                    return ToolResult(
                        success=True,
                        data={
                            "allowed": False,
                            "blocked_reason": f"user_muted_category:{category}",
                            "allowed_channels": [],
                            "tone": "neutral"
                        }
                    )
                # Use user's channel preferences
                pref_channels = user_prefs.get("preferred_channels")
                if pref_channels:
                    allowed_channels = pref_channels

            # 3. Check category-specific cooldown
            cooldown_days = self.CATEGORY_COOLDOWNS.get(category, 7)
            if cooldown_days > 0:
                cooldown_cutoff = datetime.now(timezone.utc) - timedelta(days=cooldown_days)
                recent = await self.db.engagement_nudges_log.find_one({
                    "target_id": recipient_id,
                    "nudge_type": category,
                    "sent_at": {"$gte": cooldown_cutoff.isoformat()}
                })
                if recent:
                    blocked_reasons.append(f"cooldown_active:{category}:{cooldown_days}d")

            # 4. Check daily cap
            today_start = datetime.now(timezone.utc).replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            daily_count = await self.db.engagement_nudges_log.count_documents({
                "target_id": recipient_id,
                "sent_at": {"$gte": today_start.isoformat()}
            })
            if daily_count >= self.DAILY_CAP_PER_USER:
                blocked_reasons.append(f"daily_cap_reached:{daily_count}/{self.DAILY_CAP_PER_USER}")

            # 5. Check escalation cap (per inactivity cycle)
            if category in ("inactive_group", "inactive_user"):
                cycle_count = await self.db.engagement_nudges_log.count_documents({
                    "target_id": recipient_id,
                    "nudge_type": category,
                    "resolved": {"$ne": True}  # Not yet resolved by user action
                })
                if cycle_count >= self.ESCALATION_CAP:
                    blocked_reasons.append(
                        f"escalation_cap:{cycle_count}/{self.ESCALATION_CAP}"
                    )

            # 6. Check quiet hours
            now_utc = datetime.now(timezone.utc)
            # Try to get user's timezone offset, default to UTC
            tz_offset = 0
            if user_prefs:
                tz_offset = user_prefs.get("timezone_offset_hours", 0)
            local_hour = (now_utc.hour + tz_offset) % 24
            quiet_start = self.DEFAULT_QUIET_START
            quiet_end = self.DEFAULT_QUIET_END
            if user_prefs:
                quiet_start = user_prefs.get("quiet_start", quiet_start)
                quiet_end = user_prefs.get("quiet_end", quiet_end)

            in_quiet_hours = False
            if quiet_start > quiet_end:  # Wraps midnight (e.g., 22-8)
                in_quiet_hours = local_hour >= quiet_start or local_hour < quiet_end
            else:  # Same-day range
                in_quiet_hours = quiet_start <= local_hour < quiet_end

            if in_quiet_hours:
                blocked_reasons.append(f"quiet_hours:{local_hour}:00_local")

            # 7. Risk flags
            if context.get("recent_big_loss") and category in ("big_winner", "inactive_user"):
                blocked_reasons.append("risk:recent_big_loss_no_fomo")
            if context.get("user_just_left_group"):
                blocked_reasons.append("risk:user_left_group")

            # 8. Determine tone based on context
            tone = self._determine_tone(category, context, user_prefs)

            # 9. Filter channels based on quiet hours
            if in_quiet_hours:
                # During quiet hours, only allow in_app (silent)
                allowed_channels = ["in_app"]

            # If specific channel requested, check if it's allowed
            if channel and channel not in allowed_channels:
                blocked_reasons.append(f"channel_not_allowed:{channel}")

            if blocked_reasons:
                return ToolResult(
                    success=True,
                    data={
                        "allowed": False,
                        "blocked_reason": blocked_reasons[0],  # Primary reason
                        "all_blocked_reasons": blocked_reasons,
                        "allowed_channels": [],
                        "tone": tone
                    }
                )

            return ToolResult(
                success=True,
                data={
                    "allowed": True,
                    "blocked_reason": None,
                    "allowed_channels": allowed_channels,
                    "tone": tone
                }
            )

        except Exception as e:
            logger.error(f"Policy check error: {e}")
            # Fail closed: block on error
            return ToolResult(
                success=True,
                data={
                    "allowed": False,
                    "blocked_reason": f"policy_check_error:{str(e)}",
                    "allowed_channels": [],
                    "tone": "neutral"
                }
            )

    def _determine_tone(
        self,
        category: str,
        context: Dict,
        user_prefs: Optional[Dict] = None
    ) -> str:
        """Determine the appropriate message tone."""
        # User preference overrides
        if user_prefs and user_prefs.get("preferred_tone"):
            return user_prefs["preferred_tone"]

        # Category-based defaults
        if category in ("milestone", "big_winner", "closest_finish"):
            return "playful"
        if category in ("inactive_user",) and context.get("days_inactive", 0) > 60:
            return "respectful"  # Don't be pushy with very long-dormant users
        if category == "digest":
            return "neutral"

        return "playful"  # Default for poker context

    async def _record_mute(
        self,
        recipient_id: str,
        group_id: str = None,
        category: str = None
    ) -> ToolResult:
        """Record that a user muted engagement notifications."""
        if not self.db or not recipient_id:
            return ToolResult(success=False, error="Database or recipient_id not available")

        try:
            now = datetime.now(timezone.utc).isoformat()

            if category:
                # Mute specific category
                await self.db.engagement_preferences.update_one(
                    {"user_id": recipient_id},
                    {
                        "$addToSet": {"muted_categories": category},
                        "$set": {"updated_at": now}
                    },
                    upsert=True
                )
            else:
                # Mute all
                await self.db.engagement_preferences.update_one(
                    {"user_id": recipient_id},
                    {"$set": {"muted_all": True, "updated_at": now}},
                    upsert=True
                )

            # Log the mute event
            await self.db.engagement_events.insert_one({
                "event_type": "nudge_muted",
                "user_id": recipient_id,
                "group_id": group_id,
                "category": category or "all",
                "created_at": now
            })

            return ToolResult(
                success=True,
                data={"muted": True, "category": category or "all"}
            )

        except Exception as e:
            logger.error(f"Record mute error: {e}")
            return ToolResult(success=False, error=str(e))

    async def _get_preferences(
        self,
        recipient_id: str,
        group_id: str = None
    ) -> ToolResult:
        """Get a user's engagement preferences."""
        if not self.db or not recipient_id:
            return ToolResult(success=False, error="Database or recipient_id not available")

        try:
            prefs = await self.db.engagement_preferences.find_one(
                {"user_id": recipient_id}, {"_id": 0}
            )

            # Defaults
            defaults = {
                "user_id": recipient_id,
                "muted_all": False,
                "muted_categories": [],
                "preferred_channels": ["push", "in_app"],
                "preferred_tone": None,
                "timezone_offset_hours": 0,
                "quiet_start": self.DEFAULT_QUIET_START,
                "quiet_end": self.DEFAULT_QUIET_END,
            }

            if prefs:
                defaults.update(prefs)

            return ToolResult(success=True, data=defaults)

        except Exception as e:
            logger.error(f"Get preferences error: {e}")
            return ToolResult(success=False, error=str(e))
