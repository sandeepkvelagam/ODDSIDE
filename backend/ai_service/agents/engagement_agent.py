"""
Engagement Agent

Autonomous agent that keeps users and groups active with intelligent nudges.

Trigger Types:
1. Group inactive 14+ days → "Time for another game night?"
2. User hasn't played 30 days → "Your group played without you!"
3. After Nth game milestone → Celebration notification
4. Big winner event → "Share your victory!"
5. Group milestone (10th/50th/100th) → All-time stats celebration
6. Weekly engagement digest → Activity summary for hosts

The agent can be triggered by:
- Scheduled background checks (EngagementScheduler)
- Event-driven triggers (game_ended, settlement_generated)
- Manual API calls (admin/host triggers)
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging

from .base import BaseAgent, AgentResult

logger = logging.getLogger(__name__)


class EngagementAgent(BaseAgent):
    """
    Agent for re-engaging inactive users and celebrating milestones.

    Decides what engagement action to take based on context, then
    sends personalized nudges via notifications and group chat.
    """

    @property
    def name(self) -> str:
        return "engagement"

    @property
    def description(self) -> str:
        return "re-engaging inactive users and groups, celebrating milestones, and sending intelligent activity nudges"

    @property
    def capabilities(self) -> List[str]:
        return [
            "Detect and nudge inactive groups (14+ days without a game)",
            "Detect and nudge inactive users (30+ days without playing)",
            "Celebrate user milestones (5th, 10th, 50th, 100th game)",
            "Celebrate group milestones (10th, 50th, 100th game)",
            "Identify and celebrate big winners after games",
            "Generate weekly engagement digests for hosts",
            "Score user and group engagement levels",
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "engagement_scorer",
            "notification_sender",
            "scheduler",
            "smart_config",
        ]

    @property
    def input_schema(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "user_input": {
                    "type": "string",
                    "description": "The engagement request, e.g. 'Check for inactive groups' or 'Send milestone celebration'"
                },
                "action": {
                    "type": "string",
                    "description": "Specific engagement action to perform",
                    "enum": [
                        "check_inactive_groups",
                        "check_inactive_users",
                        "check_milestones",
                        "celebrate_big_winner",
                        "send_engagement_digest",
                        "nudge_group",
                        "nudge_user",
                        "run_full_check"
                    ]
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID for group-specific engagement"
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID for user-specific engagement"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID for post-game engagement triggers"
                }
            },
            "required": ["user_input"]
        }

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """Execute engagement tasks."""
        context = context or {}
        steps_taken = []

        try:
            action = context.get("action") or self._parse_action(user_input)

            if action == "check_inactive_groups":
                return await self._check_inactive_groups(context, steps_taken)
            elif action == "check_inactive_users":
                return await self._check_inactive_users(context, steps_taken)
            elif action == "check_milestones":
                return await self._check_milestones(context, steps_taken)
            elif action == "celebrate_big_winner":
                return await self._celebrate_big_winner(context, steps_taken)
            elif action == "send_engagement_digest":
                return await self._send_engagement_digest(context, steps_taken)
            elif action == "nudge_group":
                return await self._nudge_inactive_group(context, steps_taken)
            elif action == "nudge_user":
                return await self._nudge_inactive_user(context, steps_taken)
            elif action == "run_full_check":
                return await self._run_full_engagement_check(context, steps_taken)
            elif action == "post_game_check":
                return await self._post_game_engagement_check(context, steps_taken)
            else:
                return AgentResult(
                    success=False,
                    error="Unknown engagement action",
                    message="Available actions: check_inactive_groups, check_inactive_users, "
                            "check_milestones, celebrate_big_winner, send_engagement_digest, "
                            "nudge_group, nudge_user, run_full_check",
                    steps_taken=steps_taken
                )

        except Exception as e:
            logger.error(f"EngagementAgent error: {e}")
            return AgentResult(
                success=False,
                error=str(e),
                steps_taken=steps_taken
            )

    def _parse_action(self, user_input: str) -> str:
        """Parse action from natural language input."""
        input_lower = user_input.lower()

        if any(kw in input_lower for kw in ["inactive group", "dormant group", "group inactive"]):
            return "check_inactive_groups"
        if any(kw in input_lower for kw in ["inactive user", "dormant user", "user inactive"]):
            return "check_inactive_users"
        if any(kw in input_lower for kw in ["milestone", "achievement", "celebration"]):
            return "check_milestones"
        if any(kw in input_lower for kw in ["big winner", "winner", "victory"]):
            return "celebrate_big_winner"
        if any(kw in input_lower for kw in ["digest", "weekly", "summary", "report"]):
            return "send_engagement_digest"
        if any(kw in input_lower for kw in ["nudge group", "re-engage group"]):
            return "nudge_group"
        if any(kw in input_lower for kw in ["nudge user", "re-engage user"]):
            return "nudge_user"
        if any(kw in input_lower for kw in ["full check", "run all", "check all"]):
            return "run_full_check"

        return "run_full_check"

    # ==================== Inactive Group Nudges ====================

    async def _check_inactive_groups(self, context: Dict, steps: List) -> AgentResult:
        """
        Find inactive groups and send re-engagement nudges.
        """
        inactive_days = context.get("inactive_days", 14)

        # Step 1: Find inactive groups
        scorer_result = await self.call_tool(
            "engagement_scorer",
            action="find_inactive_groups",
            inactive_days=inactive_days
        )
        steps.append({"step": "find_inactive_groups", "result": scorer_result})

        if not scorer_result.get("success"):
            return AgentResult(
                success=False,
                error=scorer_result.get("error", "Failed to find inactive groups"),
                steps_taken=steps
            )

        inactive_groups = scorer_result.get("data", {}).get("inactive_groups", [])
        nudges_sent = 0

        # Step 2: Send nudges to each inactive group
        for group in inactive_groups:
            group_id = group["group_id"]

            # Check if we already sent a nudge recently (prevent spam)
            if not await self._can_send_nudge(group_id, "group_inactive", cooldown_days=7):
                steps.append({
                    "step": f"skip_nudge_{group_id}",
                    "reason": "cooldown_active"
                })
                continue

            # Get group admins to notify
            admins = await self._get_group_admins(group_id)
            if not admins:
                continue

            days = group.get("days_inactive", "many")
            group_name = group.get("group_name", "Your poker group")
            member_count = group.get("member_count", 0)

            # Craft the nudge message
            if days and isinstance(days, int):
                if days < 21:
                    message = (
                        f"It's been {days} days since {group_name}'s last game. "
                        f"Time for another poker night? Your {member_count} members are waiting!"
                    )
                elif days < 45:
                    message = (
                        f"{group_name} hasn't played in {days} days. "
                        f"Don't let the streak end! How about scheduling a game this week?"
                    )
                else:
                    message = (
                        f"It's been a while since {group_name} played ({days} days). "
                        f"Your group of {member_count} is still here. Kick things off with a new game!"
                    )
            else:
                message = (
                    f"{group_name} has members ready but no games yet. "
                    f"Start your first poker night!"
                )

            # Send notification to admins
            notif_result = await self.call_tool(
                "notification_sender",
                user_ids=admins,
                title="Time for another game?",
                message=message,
                notification_type="engagement",
                data={
                    "nudge_type": "group_inactive",
                    "group_id": group_id,
                    "days_inactive": days
                }
            )
            steps.append({"step": f"nudge_group_{group_id}", "result": notif_result})

            # Log the nudge
            await self._log_nudge(group_id, None, "group_inactive", message)
            nudges_sent += 1

        return AgentResult(
            success=True,
            data={
                "inactive_groups_found": len(inactive_groups),
                "nudges_sent": nudges_sent,
                "threshold_days": inactive_days
            },
            message=f"Found {len(inactive_groups)} inactive groups, sent {nudges_sent} nudges",
            steps_taken=steps
        )

    # ==================== Inactive User Nudges ====================

    async def _check_inactive_users(self, context: Dict, steps: List) -> AgentResult:
        """
        Find inactive users and send re-engagement nudges.
        """
        group_id = context.get("group_id")
        inactive_days = context.get("inactive_days", 30)

        # Step 1: Find inactive users
        scorer_result = await self.call_tool(
            "engagement_scorer",
            action="find_inactive_users",
            group_id=group_id,
            inactive_days=inactive_days
        )
        steps.append({"step": "find_inactive_users", "result": scorer_result})

        if not scorer_result.get("success"):
            return AgentResult(
                success=False,
                error=scorer_result.get("error"),
                steps_taken=steps
            )

        inactive_users = scorer_result.get("data", {}).get("inactive_users", [])
        nudges_sent = 0

        # Step 2: Send nudges to each inactive user
        for user in inactive_users:
            user_id = user["user_id"]
            days = user.get("days_inactive")

            # Check cooldown
            if not await self._can_send_nudge(group_id or "global", f"user_inactive_{user_id}", cooldown_days=14):
                continue

            # Check if the user's group has been active (FOMO trigger)
            fomo_message = ""
            if group_id:
                recent_games = await self._get_recent_group_games(group_id, days=30)
                if recent_games:
                    fomo_message = f" Your group played {len(recent_games)} games without you!"

            if days:
                message = (
                    f"Hey! It's been {days} days since your last game.{fomo_message} "
                    f"Jump back in and show them what you've got!"
                )
            else:
                message = (
                    f"You haven't played a game yet!{fomo_message} "
                    f"Join a poker night and start building your stats."
                )

            notif_result = await self.call_tool(
                "notification_sender",
                user_ids=[user_id],
                title="We miss you at the table!",
                message=message,
                notification_type="engagement",
                data={
                    "nudge_type": "user_inactive",
                    "group_id": group_id,
                    "days_inactive": days
                }
            )
            steps.append({"step": f"nudge_user_{user_id}", "result": notif_result})

            await self._log_nudge(group_id, user_id, "user_inactive", message)
            nudges_sent += 1

        return AgentResult(
            success=True,
            data={
                "inactive_users_found": len(inactive_users),
                "nudges_sent": nudges_sent,
                "threshold_days": inactive_days,
                "group_id": group_id
            },
            message=f"Found {len(inactive_users)} inactive users, sent {nudges_sent} nudges",
            steps_taken=steps
        )

    # ==================== Milestone Celebrations ====================

    async def _check_milestones(self, context: Dict, steps: List) -> AgentResult:
        """
        Check and celebrate milestones after a game ends.
        """
        game_id = context.get("game_id")
        group_id = context.get("group_id")
        player_ids = context.get("player_ids", [])

        milestones_found = []

        # Check each player for milestones
        for user_id in player_ids:
            result = await self.call_tool(
                "engagement_scorer",
                action="check_milestones",
                user_id=user_id,
                group_id=group_id,
                game_id=game_id
            )

            if result.get("success") and result.get("data", {}).get("has_milestones"):
                for milestone in result["data"]["milestones"]:
                    milestones_found.append(milestone)

        # Check group milestone
        if group_id:
            group_result = await self.call_tool(
                "engagement_scorer",
                action="check_milestones",
                group_id=group_id,
                game_id=game_id
            )
            if group_result.get("success") and group_result.get("data", {}).get("has_milestones"):
                for milestone in group_result["data"]["milestones"]:
                    if milestone["type"] == "group_milestone":
                        milestones_found.append(milestone)

        steps.append({"step": "check_milestones", "milestones": milestones_found})

        # Send celebration notifications for each milestone
        celebrations_sent = 0
        for milestone in milestones_found:
            if milestone["type"] == "user_milestone":
                user_id = milestone["user_id"]
                count = milestone["milestone"]
                name = milestone.get("user_name", "Player")

                notif_result = await self.call_tool(
                    "notification_sender",
                    user_ids=[user_id],
                    title=f"Milestone: {self._ordinal(count)} Game!",
                    message=(
                        f"Congrats {name}! You just played your {self._ordinal(count)} game. "
                        f"{'You are a true poker veteran!' if count >= 50 else 'Keep the streak going!'}"
                    ),
                    notification_type="engagement",
                    data={
                        "nudge_type": "user_milestone",
                        "milestone": count,
                        "game_id": game_id
                    }
                )
                steps.append({"step": f"celebrate_user_{user_id}", "result": notif_result})
                celebrations_sent += 1

            elif milestone["type"] == "group_milestone":
                # Notify all group members
                members = await self._get_group_member_ids(milestone.get("group_id", group_id))
                count = milestone["milestone"]
                group_name = milestone.get("group_name", "Your group")

                notif_result = await self.call_tool(
                    "notification_sender",
                    user_ids=members,
                    title=f"Group Milestone: {self._ordinal(count)} Game!",
                    message=(
                        f"{group_name} just completed their {self._ordinal(count)} game! "
                        f"That's an incredible run. Here's to {count} more!"
                    ),
                    notification_type="engagement",
                    data={
                        "nudge_type": "group_milestone",
                        "milestone": count,
                        "group_id": group_id
                    }
                )
                steps.append({"step": f"celebrate_group_{group_id}", "result": notif_result})
                celebrations_sent += 1

        return AgentResult(
            success=True,
            data={
                "milestones_found": milestones_found,
                "celebrations_sent": celebrations_sent
            },
            message=f"Found {len(milestones_found)} milestones, sent {celebrations_sent} celebrations",
            steps_taken=steps
        )

    # ==================== Big Winner Celebration ====================

    async def _celebrate_big_winner(self, context: Dict, steps: List) -> AgentResult:
        """
        Celebrate big winners after a game ends.
        """
        game_id = context.get("game_id")

        if not game_id:
            return AgentResult(
                success=False,
                error="game_id required for big winner check",
                steps_taken=steps
            )

        # Find big winners
        result = await self.call_tool(
            "engagement_scorer",
            action="find_big_winners",
            game_id=game_id
        )
        steps.append({"step": "find_big_winners", "result": result})

        if not result.get("success"):
            return AgentResult(
                success=False,
                error=result.get("error"),
                steps_taken=steps
            )

        big_winners = result.get("data", {}).get("big_winners", [])
        game_title = result.get("data", {}).get("game_title", "Poker Night")
        group_id = result.get("data", {}).get("group_id")
        celebrations_sent = 0

        for winner in big_winners:
            user_id = winner["user_id"]
            name = winner.get("user_name", "Player")
            net = winner["net_result"]

            # Personal celebration to the winner
            notif_result = await self.call_tool(
                "notification_sender",
                user_ids=[user_id],
                title="Big Win!",
                message=(
                    f"You crushed it at {game_title}! "
                    f"+${net:.2f} profit. That's a performance worth bragging about!"
                ),
                notification_type="engagement",
                data={
                    "nudge_type": "big_winner",
                    "game_id": game_id,
                    "net_result": net
                }
            )
            steps.append({"step": f"celebrate_winner_{user_id}", "result": notif_result})
            celebrations_sent += 1

        return AgentResult(
            success=True,
            data={
                "big_winners": big_winners,
                "celebrations_sent": celebrations_sent,
                "game_id": game_id
            },
            message=f"Found {len(big_winners)} big winners, sent {celebrations_sent} celebrations",
            steps_taken=steps
        )

    # ==================== Engagement Digest ====================

    async def _send_engagement_digest(self, context: Dict, steps: List) -> AgentResult:
        """
        Send a weekly engagement digest to group hosts.
        Includes: group score, active/inactive members, recent highlights.
        """
        group_id = context.get("group_id")

        if not group_id:
            return AgentResult(
                success=False,
                error="group_id required for engagement digest",
                steps_taken=steps
            )

        # Get engagement report
        report_result = await self.call_tool(
            "engagement_scorer",
            action="get_engagement_report",
            group_id=group_id
        )
        steps.append({"step": "get_engagement_report", "result": report_result})

        if not report_result.get("success"):
            return AgentResult(
                success=False,
                error=report_result.get("error"),
                steps_taken=steps
            )

        report = report_result.get("data", {})
        group_score = report.get("group_score", {})
        inactive_data = report.get("inactive_users", {})
        inactive_count = inactive_data.get("count", 0) if inactive_data else 0

        # Build digest message
        score = group_score.get("score", 0)
        level = group_score.get("level", "unknown")
        total_games = group_score.get("total_games", 0)
        games_per_month = group_score.get("games_per_month", 0)
        member_count = group_score.get("member_count", 0)
        days_since = group_score.get("days_since_last_game")

        digest_lines = [
            f"Engagement Score: {score}/100 ({level})",
            f"Total Games: {total_games} | This Month: {games_per_month}",
            f"Members: {member_count} | Inactive (30d): {inactive_count}",
        ]

        if days_since is not None:
            digest_lines.append(f"Days Since Last Game: {days_since}")

        digest_message = "Weekly Group Health Report:\n" + "\n".join(digest_lines)

        # Send to group admins
        admins = await self._get_group_admins(group_id)
        if admins:
            notif_result = await self.call_tool(
                "notification_sender",
                user_ids=admins,
                title="Weekly Engagement Digest",
                message=digest_message,
                notification_type="engagement",
                data={
                    "nudge_type": "engagement_digest",
                    "group_id": group_id,
                    "score": score,
                    "level": level
                }
            )
            steps.append({"step": "send_digest", "result": notif_result})

        return AgentResult(
            success=True,
            data={
                "group_id": group_id,
                "digest": digest_message,
                "score": score,
                "level": level,
                "recipients": len(admins)
            },
            message=f"Engagement digest sent to {len(admins)} admins (score: {score}/100)",
            steps_taken=steps
        )

    # ==================== Single Nudges ====================

    async def _nudge_inactive_group(self, context: Dict, steps: List) -> AgentResult:
        """Send a targeted nudge to a specific inactive group."""
        group_id = context.get("group_id")
        if not group_id:
            return AgentResult(
                success=False,
                error="group_id required",
                steps_taken=steps
            )

        # Score the group
        score_result = await self.call_tool(
            "engagement_scorer",
            action="score_group",
            group_id=group_id
        )
        steps.append({"step": "score_group", "result": score_result})

        if not score_result.get("success"):
            return AgentResult(success=False, error=score_result.get("error"), steps_taken=steps)

        data = score_result.get("data", {})
        days_since = data.get("days_since_last_game")
        group_name = context.get("group_name", "Your poker group")

        if days_since is not None and days_since < 7:
            return AgentResult(
                success=True,
                data={"skipped": True, "reason": "group_recently_active"},
                message=f"Group played {days_since} days ago, no nudge needed",
                steps_taken=steps
            )

        message = (
            f"It's been {days_since or 'a while'} days since {group_name}'s last game. "
            f"How about getting the crew together this weekend?"
        )

        admins = await self._get_group_admins(group_id)
        if admins:
            notif_result = await self.call_tool(
                "notification_sender",
                user_ids=admins,
                title="Time for another game?",
                message=message,
                notification_type="engagement",
                data={
                    "nudge_type": "group_nudge",
                    "group_id": group_id,
                    "days_inactive": days_since
                }
            )
            steps.append({"step": "send_nudge", "result": notif_result})
            await self._log_nudge(group_id, None, "group_nudge", message)

        return AgentResult(
            success=True,
            data={"group_id": group_id, "days_inactive": days_since},
            message=f"Nudge sent to group admins (inactive {days_since} days)",
            steps_taken=steps
        )

    async def _nudge_inactive_user(self, context: Dict, steps: List) -> AgentResult:
        """Send a targeted nudge to a specific inactive user."""
        user_id = context.get("user_id")
        group_id = context.get("group_id")

        if not user_id:
            return AgentResult(success=False, error="user_id required", steps_taken=steps)

        # Score the user
        score_result = await self.call_tool(
            "engagement_scorer",
            action="score_user",
            user_id=user_id,
            group_id=group_id
        )
        steps.append({"step": "score_user", "result": score_result})

        if not score_result.get("success"):
            return AgentResult(success=False, error=score_result.get("error"), steps_taken=steps)

        data = score_result.get("data", {})
        days_since = data.get("days_since_last_game")

        if days_since is not None and days_since < 14:
            return AgentResult(
                success=True,
                data={"skipped": True, "reason": "user_recently_active"},
                message=f"User played {days_since} days ago, no nudge needed",
                steps_taken=steps
            )

        message = (
            f"It's been {days_since or 'a while'} days since your last game. "
            f"Your poker crew misses you! Jump back in for the next one."
        )

        notif_result = await self.call_tool(
            "notification_sender",
            user_ids=[user_id],
            title="We miss you at the table!",
            message=message,
            notification_type="engagement",
            data={
                "nudge_type": "user_nudge",
                "user_id": user_id,
                "days_inactive": days_since
            }
        )
        steps.append({"step": "send_nudge", "result": notif_result})
        await self._log_nudge(group_id, user_id, "user_nudge", message)

        return AgentResult(
            success=True,
            data={"user_id": user_id, "days_inactive": days_since},
            message=f"Nudge sent to user (inactive {days_since} days)",
            steps_taken=steps
        )

    # ==================== Post-Game Check ====================

    async def _post_game_engagement_check(self, context: Dict, steps: List) -> AgentResult:
        """
        Run all post-game engagement checks:
        1. Check for milestones
        2. Celebrate big winners
        """
        game_id = context.get("game_id")
        group_id = context.get("group_id")
        player_ids = context.get("player_ids", [])

        results = {}

        # 1. Check milestones
        milestone_result = await self._check_milestones(
            {"game_id": game_id, "group_id": group_id, "player_ids": player_ids},
            steps
        )
        results["milestones"] = {
            "found": len(milestone_result.data.get("milestones_found", [])) if milestone_result.data else 0,
            "celebrated": milestone_result.data.get("celebrations_sent", 0) if milestone_result.data else 0
        }

        # 2. Celebrate big winners
        winner_result = await self._celebrate_big_winner(
            {"game_id": game_id},
            steps
        )
        results["big_winners"] = {
            "found": len(winner_result.data.get("big_winners", [])) if winner_result.data else 0,
            "celebrated": winner_result.data.get("celebrations_sent", 0) if winner_result.data else 0
        }

        return AgentResult(
            success=True,
            data=results,
            message=(
                f"Post-game engagement: "
                f"{results['milestones']['found']} milestones, "
                f"{results['big_winners']['found']} big winners"
            ),
            steps_taken=steps
        )

    # ==================== Full Engagement Check ====================

    async def _run_full_engagement_check(self, context: Dict, steps: List) -> AgentResult:
        """
        Run all engagement checks (called by the scheduler).
        1. Check inactive groups
        2. Check inactive users per group
        """
        results = {}

        # 1. Check inactive groups
        group_result = await self._check_inactive_groups(context, steps)
        results["inactive_groups"] = {
            "found": group_result.data.get("inactive_groups_found", 0) if group_result.data else 0,
            "nudged": group_result.data.get("nudges_sent", 0) if group_result.data else 0
        }

        # 2. Check inactive users across all groups
        if self.db:
            groups = await self.db.groups.find(
                {},
                {"_id": 0, "group_id": 1}
            ).to_list(100)

            total_inactive_users = 0
            total_user_nudges = 0

            for group in groups:
                user_result = await self._check_inactive_users(
                    {"group_id": group["group_id"], "inactive_days": 30},
                    steps
                )
                if user_result.data:
                    total_inactive_users += user_result.data.get("inactive_users_found", 0)
                    total_user_nudges += user_result.data.get("nudges_sent", 0)

            results["inactive_users"] = {
                "found": total_inactive_users,
                "nudged": total_user_nudges,
                "groups_checked": len(groups)
            }

        return AgentResult(
            success=True,
            data=results,
            message=(
                f"Full engagement check complete: "
                f"{results['inactive_groups']['found']} inactive groups, "
                f"{results.get('inactive_users', {}).get('found', 0)} inactive users"
            ),
            steps_taken=steps
        )

    # ==================== Helper Methods ====================

    async def _can_send_nudge(
        self,
        target_id: str,
        nudge_type: str,
        cooldown_days: int = 7
    ) -> bool:
        """Check if we can send a nudge (respects cooldown to prevent spam)."""
        if not self.db:
            return True

        cutoff = datetime.now(timezone.utc) - timedelta(days=cooldown_days)

        recent_nudge = await self.db.engagement_nudges_log.find_one({
            "target_id": target_id,
            "nudge_type": nudge_type,
            "sent_at": {"$gte": cutoff.isoformat()}
        })

        return recent_nudge is None

    async def _log_nudge(
        self,
        group_id: Optional[str],
        user_id: Optional[str],
        nudge_type: str,
        message: str
    ):
        """Log a sent nudge for cooldown tracking."""
        if not self.db:
            return

        target_id = group_id or user_id or "global"
        await self.db.engagement_nudges_log.insert_one({
            "target_id": target_id,
            "group_id": group_id,
            "user_id": user_id,
            "nudge_type": nudge_type,
            "message": message,
            "sent_at": datetime.now(timezone.utc).isoformat()
        })

    async def _get_group_admins(self, group_id: str) -> List[str]:
        """Get admin user IDs for a group."""
        if not self.db:
            return []

        admins = await self.db.group_members.find(
            {"group_id": group_id, "role": "admin"},
            {"_id": 0, "user_id": 1}
        ).to_list(10)

        return [a["user_id"] for a in admins]

    async def _get_group_member_ids(self, group_id: str) -> List[str]:
        """Get all member user IDs for a group."""
        if not self.db:
            return []

        members = await self.db.group_members.find(
            {"group_id": group_id},
            {"_id": 0, "user_id": 1}
        ).to_list(200)

        return [m["user_id"] for m in members]

    async def _get_recent_group_games(self, group_id: str, days: int = 30) -> List[Dict]:
        """Get recent games for a group."""
        if not self.db:
            return []

        cutoff = datetime.now(timezone.utc) - timedelta(days=days)

        games = await self.db.game_nights.find(
            {
                "group_id": group_id,
                "status": {"$in": ["ended", "settled"]},
                "created_at": {"$gte": cutoff.isoformat()}
            },
            {"_id": 0, "game_id": 1, "title": 1, "created_at": 1}
        ).to_list(50)

        return games

    def _ordinal(self, n: int) -> str:
        """Convert number to ordinal string."""
        if 11 <= (n % 100) <= 13:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return f"{n}{suffix}"
