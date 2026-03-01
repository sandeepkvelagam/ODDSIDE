"""
Engagement Planner Tool

Turns a "finding" (detection result) into an actionable plan with:
- target audience
- message intent + template + variables
- channel preference
- send window
- outcome tracking metadata

Plans are logged to engagement_events for A/B testing and effectiveness measurement.
Supports multiple celebration types beyond just "big winner":
- closest_finish, comeback, most_consistent, host_appreciation
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone
import uuid
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


# Message templates with privacy-safe defaults
TEMPLATES = {
    # ==================== Inactive Group Nudges ====================
    "inactive_group_mild": {
        "title": "Time for poker?",
        "body": "It's been {days_inactive} days since {group_name}'s last game. Your {member_count} members are waiting!",
        "category": "inactive_group",
        "tone": "playful",
    },
    "inactive_group_moderate": {
        "title": "Missing the action?",
        "body": "{group_name} hasn't played in {days_inactive} days. Don't let the streak end — schedule a game this week?",
        "category": "inactive_group",
        "tone": "playful",
    },
    "inactive_group_strong": {
        "title": "Your crew is still here",
        "body": "It's been {days_inactive} days since {group_name} played. {member_count} members are ready. Kick things off with a new game!",
        "category": "inactive_group",
        "tone": "neutral",
    },
    "inactive_group_first_game": {
        "title": "Ready for your first game?",
        "body": "{group_name} has {member_count} members ready to go. Start your first poker night!",
        "category": "inactive_group",
        "tone": "playful",
    },

    # ==================== Inactive User Nudges ====================
    "inactive_user_fomo": {
        "title": "Your group played without you!",
        "body": "Your group played {games_missed} games while you were away. Jump back in!",
        "category": "inactive_user",
        "tone": "playful",
    },
    "inactive_user_gentle": {
        "title": "We miss you at the table!",
        "body": "It's been {days_inactive} days since your last game. Your poker crew misses you!",
        "category": "inactive_user",
        "tone": "neutral",
    },
    "inactive_user_first": {
        "title": "Join your first game!",
        "body": "You haven't played a game yet. Join a poker night and start building your stats!",
        "category": "inactive_user",
        "tone": "playful",
    },

    # ==================== Milestones ====================
    "user_milestone": {
        "title": "Milestone: {ordinal_count} Game!",
        "body": "Congrats {user_name}! You just played your {ordinal_count} game. {milestone_flavor}",
        "category": "milestone",
        "tone": "playful",
    },
    "group_milestone": {
        "title": "Group Milestone: {ordinal_count} Game!",
        "body": "{group_name} just completed their {ordinal_count} game! Here's to {count} more!",
        "category": "milestone",
        "tone": "playful",
    },

    # ==================== Winner / Celebrations (privacy-safe) ====================
    "big_winner_private": {
        "title": "Nice run!",
        "body": "You crushed it at {game_title}! Great performance last night.",
        "category": "big_winner",
        "tone": "playful",
    },
    "big_winner_with_amount": {
        "title": "Big Win!",
        "body": "You crushed it at {game_title}! +${net_result:.2f} profit. That's worth bragging about!",
        "category": "big_winner",
        "tone": "playful",
    },
    "closest_finish": {
        "title": "Photo Finish!",
        "body": "Last night's game at {group_name} came down to the wire. What a battle!",
        "category": "closest_finish",
        "tone": "playful",
    },
    "comeback": {
        "title": "The Comeback Kid",
        "body": "{user_name} made an incredible comeback at {game_title}!",
        "category": "comeback",
        "tone": "playful",
    },
    "most_consistent": {
        "title": "Mr./Ms. Consistent",
        "body": "{user_name} has been steady as a rock — {games_count} games played this month.",
        "category": "milestone",
        "tone": "neutral",
    },
    "host_appreciation": {
        "title": "Thanks for hosting!",
        "body": "You've hosted {games_hosted} games for {group_name}. Your crew appreciates you!",
        "category": "host_appreciation",
        "tone": "neutral",
    },

    # ==================== Digest ====================
    "weekly_digest": {
        "title": "Weekly Group Health Report",
        "body": "{digest_content}",
        "category": "digest",
        "tone": "neutral",
    },
}


class EngagementPlannerTool(BaseTool):
    """
    Creates an engagement plan from a detection finding.

    Flow: Detect → Plan → (Policy Check) → Execute → Measure
    This tool handles the "Plan" step.
    """

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "engagement_planner"

    @property
    def description(self) -> str:
        return (
            "Create an engagement plan from a detection finding. "
            "Selects the right template, fills variables, chooses channels, "
            "and prepares the plan for policy check and execution."
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform",
                    "enum": [
                        "plan_inactive_group_nudge",
                        "plan_inactive_user_nudge",
                        "plan_milestone_celebration",
                        "plan_winner_celebration",
                        "plan_digest",
                        "plan_alternate_celebration",
                        "get_templates"
                    ]
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID"
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID"
                },
                "finding": {
                    "type": "object",
                    "description": "Detection finding data from scorer"
                },
                "celebration_type": {
                    "type": "string",
                    "description": "Type of alternate celebration",
                    "enum": ["closest_finish", "comeback", "most_consistent", "host_appreciation"]
                }
            },
            "required": ["action"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute planner action."""
        action = kwargs.get("action")

        if action == "plan_inactive_group_nudge":
            return await self._plan_inactive_group_nudge(kwargs.get("finding", {}))
        elif action == "plan_inactive_user_nudge":
            return await self._plan_inactive_user_nudge(kwargs.get("finding", {}))
        elif action == "plan_milestone_celebration":
            return await self._plan_milestone(kwargs.get("finding", {}))
        elif action == "plan_winner_celebration":
            return await self._plan_winner(kwargs.get("finding", {}))
        elif action == "plan_digest":
            return await self._plan_digest(kwargs.get("finding", {}))
        elif action == "plan_alternate_celebration":
            return await self._plan_alternate(
                kwargs.get("celebration_type", "closest_finish"),
                kwargs.get("finding", {})
            )
        elif action == "get_templates":
            return ToolResult(
                success=True,
                data={"templates": list(TEMPLATES.keys())}
            )
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    async def _plan_inactive_group_nudge(self, finding: Dict) -> ToolResult:
        """Create a plan for inactive group nudge."""
        days = finding.get("days_inactive")
        group_name = finding.get("group_name", "Your poker group")
        group_id = finding.get("group_id")
        member_count = finding.get("member_count", 0)

        # Select template based on severity
        if days is None:
            template_key = "inactive_group_first_game"
        elif days < 21:
            template_key = "inactive_group_mild"
        elif days < 45:
            template_key = "inactive_group_moderate"
        else:
            template_key = "inactive_group_strong"

        template = TEMPLATES[template_key]
        variables = {
            "days_inactive": days or "many",
            "group_name": group_name,
            "member_count": member_count,
        }

        plan = self._build_plan(
            plan_type="inactive_group_nudge",
            template_key=template_key,
            template=template,
            variables=variables,
            recipient_type="admin",
            recipient_id=group_id,
            group_id=group_id,
            channel_preference=["push", "in_app"],
        )

        return ToolResult(success=True, data=plan)

    async def _plan_inactive_user_nudge(self, finding: Dict) -> ToolResult:
        """Create a plan for inactive user nudge."""
        days = finding.get("days_inactive")
        user_id = finding.get("user_id")
        group_id = finding.get("group_id")
        games_missed = finding.get("games_missed", 0)

        if days is None:
            template_key = "inactive_user_first"
        elif games_missed > 0:
            template_key = "inactive_user_fomo"
        else:
            template_key = "inactive_user_gentle"

        template = TEMPLATES[template_key]
        variables = {
            "days_inactive": days or "many",
            "games_missed": games_missed,
        }

        plan = self._build_plan(
            plan_type="inactive_user_nudge",
            template_key=template_key,
            template=template,
            variables=variables,
            recipient_type="user",
            recipient_id=user_id,
            group_id=group_id,
            channel_preference=["push", "in_app"],
        )

        return ToolResult(success=True, data=plan)

    async def _plan_milestone(self, finding: Dict) -> ToolResult:
        """Create a plan for milestone celebration."""
        milestone_type = finding.get("type", "user_milestone")
        count = finding.get("milestone", 0)
        user_id = finding.get("user_id")
        user_name = finding.get("user_name", "Player")
        group_id = finding.get("group_id")
        group_name = finding.get("group_name", "Your group")

        if milestone_type == "group_milestone":
            template_key = "group_milestone"
            recipient_type = "group"
            recipient_id = group_id
        else:
            template_key = "user_milestone"
            recipient_type = "user"
            recipient_id = user_id

        # Milestone flavor text
        if count >= 100:
            flavor = "You're a true poker legend!"
        elif count >= 50:
            flavor = "You're a poker veteran!"
        elif count >= 25:
            flavor = "Seasoned pro status unlocked!"
        elif count >= 10:
            flavor = "Double digits — keep it going!"
        else:
            flavor = "Keep the streak alive!"

        template = TEMPLATES[template_key]
        variables = {
            "ordinal_count": self._ordinal(count),
            "count": count,
            "user_name": user_name,
            "group_name": group_name,
            "milestone_flavor": flavor,
        }

        plan = self._build_plan(
            plan_type="milestone_celebration",
            template_key=template_key,
            template=template,
            variables=variables,
            recipient_type=recipient_type,
            recipient_id=recipient_id,
            group_id=group_id,
            channel_preference=["push", "in_app"],
        )

        return ToolResult(success=True, data=plan)

    async def _plan_winner(self, finding: Dict) -> ToolResult:
        """
        Create a plan for winner celebration.
        Privacy-safe by default: no amounts unless settings allow it.
        """
        user_id = finding.get("user_id")
        user_name = finding.get("user_name", "Player")
        net_result = finding.get("net_result", 0)
        game_id = finding.get("game_id")
        game_title = finding.get("game_title", "Poker Night")
        group_id = finding.get("group_id")

        # Check group settings for amount visibility
        show_amounts = False
        if self.db is not None and group_id:
            settings = await self.db.engagement_settings.find_one(
                {"group_id": group_id}, {"_id": 0}
            )
            if settings:
                show_amounts = settings.get("show_amounts_in_celebrations", False)

        template_key = "big_winner_with_amount" if show_amounts else "big_winner_private"
        template = TEMPLATES[template_key]
        variables = {
            "user_name": user_name,
            "net_result": net_result,
            "game_title": game_title,
            "group_name": finding.get("group_name", ""),
        }

        plan = self._build_plan(
            plan_type="winner_celebration",
            template_key=template_key,
            template=template,
            variables=variables,
            recipient_type="user",
            recipient_id=user_id,
            group_id=group_id,
            channel_preference=["push", "in_app"],
            metadata={"game_id": game_id, "show_amounts": show_amounts},
        )

        return ToolResult(success=True, data=plan)

    async def _plan_digest(self, finding: Dict) -> ToolResult:
        """Create a plan for weekly engagement digest."""
        group_id = finding.get("group_id")
        digest_content = finding.get("digest_content", "")
        admin_ids = finding.get("admin_ids", [])

        template = TEMPLATES["weekly_digest"]
        variables = {"digest_content": digest_content}

        plan = self._build_plan(
            plan_type="digest",
            template_key="weekly_digest",
            template=template,
            variables=variables,
            recipient_type="admin",
            recipient_id=group_id,
            group_id=group_id,
            channel_preference=["push", "in_app", "email"],
            metadata={"admin_ids": admin_ids},
        )

        return ToolResult(success=True, data=plan)

    async def _plan_alternate(self, celebration_type: str, finding: Dict) -> ToolResult:
        """Create a plan for alternate celebration types."""
        template_key = celebration_type
        if template_key not in TEMPLATES:
            return ToolResult(success=False, error=f"Unknown celebration type: {celebration_type}")

        template = TEMPLATES[template_key]
        variables = finding.copy()

        plan = self._build_plan(
            plan_type=f"alternate_{celebration_type}",
            template_key=template_key,
            template=template,
            variables=variables,
            recipient_type=finding.get("recipient_type", "group"),
            recipient_id=finding.get("recipient_id") or finding.get("group_id"),
            group_id=finding.get("group_id"),
            channel_preference=["push", "in_app"],
        )

        return ToolResult(success=True, data=plan)

    def _build_plan(
        self,
        plan_type: str,
        template_key: str,
        template: Dict,
        variables: Dict,
        recipient_type: str,
        recipient_id: str,
        group_id: str = None,
        channel_preference: List[str] = None,
        metadata: Dict = None,
    ) -> Dict:
        """Build a standard plan object."""
        # Render template
        title = template["title"]
        body = template["body"]
        try:
            title = title.format(**variables)
        except (KeyError, ValueError):
            pass
        try:
            body = body.format(**variables)
        except (KeyError, ValueError):
            pass

        return {
            "plan_id": f"plan_{uuid.uuid4().hex[:12]}",
            "plan_type": plan_type,
            "template_key": template_key,
            "category": template.get("category", plan_type),
            "title": title,
            "body": body,
            "tone": template.get("tone", "neutral"),
            "recipient_type": recipient_type,
            "recipient_id": recipient_id,
            "group_id": group_id,
            "channel_preference": channel_preference or ["push", "in_app"],
            "variables": variables,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def _ordinal(self, n: int) -> str:
        """Convert number to ordinal string."""
        if 11 <= (n % 100) <= 13:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return f"{n}{suffix}"
