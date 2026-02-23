"""
Engagement Agent (v2)

Autonomous agent that keeps users and groups active with intelligent nudges.
Uses the full pipeline: Detect → Policy → Plan → Execute → Measure.

Trigger Types:
1. Group inactive 14+ days → "Time for another game night?"
2. User hasn't played 30 days → "Your group played without you!"
3. After Nth game milestone → Celebration notification
4. Big winner event → Privacy-safe celebration
5. Group milestone (10th/50th/100th) → All-time stats celebration
6. Alternate celebrations → closest_finish, comeback, most_consistent, host_appreciation
7. Weekly engagement digest → Activity summary for hosts

Architecture:
- EngagementScorerTool: Compute scores + reasons + recommendations
- EngagementPolicyTool: Allow/deny + channel/tone gating
- EngagementPlannerTool: Create message plans with template variables
- NotificationSenderTool: Execute delivery
- engagement_events collection: Outcome tracking
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseAgent, AgentResult

logger = logging.getLogger(__name__)


class EngagementAgent(BaseAgent):
    """
    Agent for re-engaging inactive users and celebrating milestones.

    Uses the Detect → Policy → Plan → Execute → Measure pipeline
    to send personalized, policy-gated nudges.
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
            "Privacy-safe winner celebrations (amounts optional)",
            "Alternate celebrations (closest finish, comeback, host appreciation)",
            "Generate weekly engagement digests for hosts",
            "Score user and group engagement with explainable breakdowns",
            "Policy-gated delivery (quiet hours, caps, mute, risk flags)",
            "Outcome tracking (nudge → game conversion rate)",
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "engagement_scorer",
            "engagement_policy",
            "engagement_planner",
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
                    "description": "The engagement request"
                },
                "action": {
                    "type": "string",
                    "description": "Specific engagement action to perform",
                    "enum": [
                        "check_inactive_groups",
                        "check_inactive_users",
                        "check_milestones",
                        "celebrate_big_winner",
                        "celebrate_alternate",
                        "send_engagement_digest",
                        "nudge_group",
                        "nudge_user",
                        "run_full_check",
                        "process_job",
                        "post_game_check"
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
        """Execute engagement tasks through the full pipeline."""
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
            elif action == "celebrate_alternate":
                return await self._celebrate_alternate(context, steps_taken)
            elif action == "send_engagement_digest":
                return await self._send_engagement_digest(context, steps_taken)
            elif action == "nudge_group":
                return await self._nudge_inactive_group(context, steps_taken)
            elif action == "nudge_user":
                return await self._nudge_inactive_user(context, steps_taken)
            elif action == "run_full_check":
                return await self._run_full_engagement_check(context, steps_taken)
            elif action == "process_job":
                return await self._process_job(context, steps_taken)
            elif action == "post_game_check":
                return await self._post_game_engagement_check(context, steps_taken)
            else:
                return AgentResult(
                    success=False,
                    error="Unknown engagement action",
                    message="Available actions: check_inactive_groups, check_inactive_users, "
                            "check_milestones, celebrate_big_winner, celebrate_alternate, "
                            "send_engagement_digest, nudge_group, nudge_user, "
                            "run_full_check, process_job, post_game_check",
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
        if any(kw in input_lower for kw in ["comeback", "closest", "consistent", "host appreciation"]):
            return "celebrate_alternate"
        if any(kw in input_lower for kw in ["digest", "weekly", "summary", "report"]):
            return "send_engagement_digest"
        if any(kw in input_lower for kw in ["nudge group", "re-engage group"]):
            return "nudge_group"
        if any(kw in input_lower for kw in ["nudge user", "re-engage user"]):
            return "nudge_user"
        if any(kw in input_lower for kw in ["full check", "run all", "check all"]):
            return "run_full_check"
        if any(kw in input_lower for kw in ["process job", "job"]):
            return "process_job"

        return "run_full_check"

    # ==================== Core Pipeline: _execute_nudge ====================

    async def _execute_nudge(
        self,
        finding: Dict,
        plan_action: str,
        recipient_ids: List[str],
        group_id: str = None,
        steps: List = None,
        extra_plan_kwargs: Dict = None,
    ) -> Dict:
        """
        Full Detect → Policy → Plan → Execute → Measure pipeline.

        Returns dict with: sent (bool), plan, policy_result, blocked_reason
        """
        steps = steps or []
        extra_plan_kwargs = extra_plan_kwargs or {}

        # Step 1: PLAN — create the message plan
        plan_result = await self.call_tool(
            "engagement_planner",
            action=plan_action,
            finding=finding,
            **extra_plan_kwargs,
        )
        steps.append({"step": "plan", "result": plan_result})

        if not plan_result.get("success"):
            return {"sent": False, "blocked_reason": f"plan_failed:{plan_result.get('error')}"}

        plan = plan_result.get("data", {})
        category = plan.get("category", "inactive_group")

        # Step 2: POLICY — check each recipient
        sent_count = 0
        blocked_count = 0

        for recipient_id in recipient_ids:
            policy_result = await self.call_tool(
                "engagement_policy",
                action="check_policy",
                recipient_type=plan.get("recipient_type", "user"),
                recipient_id=recipient_id,
                group_id=group_id,
                category=category,
                context=finding,
            )
            steps.append({"step": f"policy_{recipient_id}", "result": policy_result})

            policy_data = policy_result.get("data", {})
            if not policy_data.get("allowed", False):
                blocked_count += 1
                steps.append({
                    "step": f"blocked_{recipient_id}",
                    "reason": policy_data.get("blocked_reason", "unknown")
                })
                continue

            # Apply tone from policy
            tone = policy_data.get("tone", plan.get("tone", "neutral"))
            allowed_channels = policy_data.get("allowed_channels", ["push", "in_app"])

            # Step 3: EXECUTE — send the notification
            notif_result = await self.call_tool(
                "notification_sender",
                user_ids=[recipient_id],
                title=plan.get("title", "Engagement"),
                message=plan.get("body", ""),
                notification_type="engagement",
                channels=allowed_channels,
                data={
                    "nudge_type": category,
                    "plan_id": plan.get("plan_id"),
                    "group_id": group_id,
                    "tone": tone,
                    **plan.get("metadata", {}),
                }
            )
            steps.append({"step": f"send_{recipient_id}", "result": notif_result})

            # Step 4: MEASURE — log for outcome tracking
            await self._log_nudge_event(
                recipient_id=recipient_id,
                group_id=group_id,
                category=category,
                plan=plan,
                tone=tone,
                channels=allowed_channels,
            )
            sent_count += 1

        return {
            "sent": sent_count > 0,
            "sent_count": sent_count,
            "blocked_count": blocked_count,
            "plan": plan,
        }

    # ==================== Inactive Group Nudges ====================

    async def _check_inactive_groups(self, context: Dict, steps: List) -> AgentResult:
        """Find inactive groups and send policy-gated nudges."""
        inactive_days = context.get("inactive_days", 14)

        # DETECT
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
        nudges_blocked = 0

        for group in inactive_groups:
            group_id = group["group_id"]
            admins = await self._get_group_admins(group_id)
            if not admins:
                continue

            result = await self._execute_nudge(
                finding=group,
                plan_action="plan_inactive_group_nudge",
                recipient_ids=admins,
                group_id=group_id,
                steps=steps,
            )
            nudges_sent += result.get("sent_count", 0)
            nudges_blocked += result.get("blocked_count", 0)

        return AgentResult(
            success=True,
            data={
                "inactive_groups_found": len(inactive_groups),
                "nudges_sent": nudges_sent,
                "nudges_blocked": nudges_blocked,
                "threshold_days": inactive_days
            },
            message=f"Found {len(inactive_groups)} inactive groups, sent {nudges_sent} nudges ({nudges_blocked} blocked by policy)",
            steps_taken=steps
        )

    # ==================== Inactive User Nudges ====================

    async def _check_inactive_users(self, context: Dict, steps: List) -> AgentResult:
        """Find inactive users and send policy-gated nudges."""
        group_id = context.get("group_id")
        inactive_days = context.get("inactive_days", 30)

        # DETECT
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
        nudges_blocked = 0

        for user in inactive_users:
            user_id = user["user_id"]

            # Enrich finding with FOMO data
            games_missed = 0
            if group_id:
                recent_games = await self._get_recent_group_games(group_id, days=30)
                games_missed = len(recent_games)

            finding = {**user, "group_id": group_id, "games_missed": games_missed}

            result = await self._execute_nudge(
                finding=finding,
                plan_action="plan_inactive_user_nudge",
                recipient_ids=[user_id],
                group_id=group_id,
                steps=steps,
            )
            nudges_sent += result.get("sent_count", 0)
            nudges_blocked += result.get("blocked_count", 0)

        return AgentResult(
            success=True,
            data={
                "inactive_users_found": len(inactive_users),
                "nudges_sent": nudges_sent,
                "nudges_blocked": nudges_blocked,
                "threshold_days": inactive_days,
                "group_id": group_id
            },
            message=f"Found {len(inactive_users)} inactive users, sent {nudges_sent} nudges ({nudges_blocked} blocked)",
            steps_taken=steps
        )

    # ==================== Milestone Celebrations ====================

    async def _check_milestones(self, context: Dict, steps: List) -> AgentResult:
        """Check and celebrate milestones after a game ends."""
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

        # Send celebrations through pipeline
        celebrations_sent = 0
        celebrations_blocked = 0

        for milestone in milestones_found:
            finding = {**milestone, "group_id": group_id}

            if milestone["type"] == "user_milestone":
                recipients = [milestone["user_id"]]
            else:
                recipients = await self._get_group_member_ids(
                    milestone.get("group_id", group_id)
                )

            result = await self._execute_nudge(
                finding=finding,
                plan_action="plan_milestone_celebration",
                recipient_ids=recipients,
                group_id=group_id,
                steps=steps,
            )
            celebrations_sent += result.get("sent_count", 0)
            celebrations_blocked += result.get("blocked_count", 0)

        return AgentResult(
            success=True,
            data={
                "milestones_found": milestones_found,
                "celebrations_sent": celebrations_sent,
                "celebrations_blocked": celebrations_blocked
            },
            message=f"Found {len(milestones_found)} milestones, sent {celebrations_sent} celebrations",
            steps_taken=steps
        )

    # ==================== Big Winner Celebration (Privacy-Safe) ====================

    async def _celebrate_big_winner(self, context: Dict, steps: List) -> AgentResult:
        """Celebrate big winners after a game ends (privacy-safe by default)."""
        game_id = context.get("game_id")

        if not game_id:
            return AgentResult(
                success=False,
                error="game_id required for big winner check",
                steps_taken=steps
            )

        # DETECT
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
        celebrations_blocked = 0

        for winner in big_winners:
            finding = {
                **winner,
                "game_id": game_id,
                "game_title": game_title,
                "group_id": group_id,
            }

            pipeline_result = await self._execute_nudge(
                finding=finding,
                plan_action="plan_winner_celebration",
                recipient_ids=[winner["user_id"]],
                group_id=group_id,
                steps=steps,
            )
            celebrations_sent += pipeline_result.get("sent_count", 0)
            celebrations_blocked += pipeline_result.get("blocked_count", 0)

        return AgentResult(
            success=True,
            data={
                "big_winners": big_winners,
                "celebrations_sent": celebrations_sent,
                "celebrations_blocked": celebrations_blocked,
                "game_id": game_id
            },
            message=f"Found {len(big_winners)} big winners, sent {celebrations_sent} celebrations",
            steps_taken=steps
        )

    # ==================== Alternate Celebrations ====================

    async def _celebrate_alternate(self, context: Dict, steps: List) -> AgentResult:
        """Handle alternate celebration types: closest_finish, comeback, etc."""
        celebration_type = context.get("celebration_type", "closest_finish")
        finding = context.get("finding", {})
        group_id = context.get("group_id") or finding.get("group_id")
        recipient_ids = context.get("recipient_ids", [])

        if not recipient_ids:
            if group_id:
                recipient_ids = await self._get_group_member_ids(group_id)
            else:
                return AgentResult(
                    success=False,
                    error="recipient_ids or group_id required",
                    steps_taken=steps
                )

        result = await self._execute_nudge(
            finding=finding,
            plan_action="plan_alternate_celebration",
            recipient_ids=recipient_ids,
            group_id=group_id,
            steps=steps,
            extra_plan_kwargs={"celebration_type": celebration_type},
        )

        return AgentResult(
            success=True,
            data={
                "celebration_type": celebration_type,
                "sent_count": result.get("sent_count", 0),
                "blocked_count": result.get("blocked_count", 0),
            },
            message=f"Alternate celebration ({celebration_type}): sent {result.get('sent_count', 0)}",
            steps_taken=steps
        )

    # ==================== Engagement Digest ====================

    async def _send_engagement_digest(self, context: Dict, steps: List) -> AgentResult:
        """Send a weekly engagement digest to group hosts."""
        group_id = context.get("group_id")

        if not group_id:
            return AgentResult(
                success=False,
                error="group_id required for engagement digest",
                steps_taken=steps
            )

        # Get engagement report (includes outcomes now)
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
        outcomes = report.get("outcomes", {})

        # Build digest with outcomes
        score = group_score.get("score", 0)
        level = group_score.get("level", "unknown")
        total_games = group_score.get("total_games", 0)
        games_per_month = group_score.get("games_per_month", 0)
        member_count = group_score.get("member_count", 0)
        days_since = group_score.get("days_since_last_game")

        # Include score breakdown (new explainability)
        components = group_score.get("components", {})
        reasons = group_score.get("reasons", [])
        recommendations = group_score.get("recommendations", [])

        digest_lines = [
            f"Engagement Score: {score}/100 ({level})",
            f"Total Games: {total_games} | This Month: {games_per_month}",
            f"Members: {member_count} | Inactive (30d): {inactive_count}",
        ]

        if days_since is not None:
            digest_lines.append(f"Days Since Last Game: {days_since}")

        # Add reasons
        if reasons:
            digest_lines.append(f"\nKey Insights:")
            for r in reasons[:3]:
                digest_lines.append(f"  - {r}")

        # Add outcomes if available
        if outcomes.get("nudges_sent", 0) > 0:
            conv_rate = outcomes.get("conversion_rate")
            conv_str = f"{int(conv_rate * 100)}%" if conv_rate is not None else "N/A"
            digest_lines.append(f"\nNudge Effectiveness (30d):")
            digest_lines.append(f"  Nudges sent: {outcomes['nudges_sent']}")
            digest_lines.append(f"  Games started after nudge: {outcomes.get('games_after_nudge', 0)} ({conv_str})")

        # Add recommendations
        if recommendations:
            digest_lines.append(f"\nRecommended Actions:")
            for rec in recommendations[:2]:
                digest_lines.append(f"  - {rec.get('reason', rec.get('action', ''))}")

        digest_content = "Weekly Group Health Report:\n" + "\n".join(digest_lines)

        # Send via pipeline
        admins = await self._get_group_admins(group_id)
        if not admins:
            return AgentResult(
                success=True,
                data={"skipped": True, "reason": "no_admins"},
                message="No admins found for digest",
                steps_taken=steps
            )

        finding = {
            "group_id": group_id,
            "digest_content": digest_content,
            "admin_ids": admins,
        }

        pipeline_result = await self._execute_nudge(
            finding=finding,
            plan_action="plan_digest",
            recipient_ids=admins,
            group_id=group_id,
            steps=steps,
        )

        return AgentResult(
            success=True,
            data={
                "group_id": group_id,
                "digest": digest_content,
                "score": score,
                "level": level,
                "recipients": pipeline_result.get("sent_count", 0),
                "blocked": pipeline_result.get("blocked_count", 0),
            },
            message=f"Engagement digest sent to {pipeline_result.get('sent_count', 0)} admins (score: {score}/100)",
            steps_taken=steps
        )

    # ==================== Single Nudges ====================

    async def _nudge_inactive_group(self, context: Dict, steps: List) -> AgentResult:
        """Send a targeted nudge to a specific inactive group via pipeline."""
        group_id = context.get("group_id")
        if not group_id:
            return AgentResult(success=False, error="group_id required", steps_taken=steps)

        # Score the group (with explainability)
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

        if days_since is not None and days_since < 7:
            return AgentResult(
                success=True,
                data={"skipped": True, "reason": "group_recently_active"},
                message=f"Group played {days_since} days ago, no nudge needed",
                steps_taken=steps
            )

        admins = await self._get_group_admins(group_id)
        if not admins:
            return AgentResult(
                success=True,
                data={"skipped": True, "reason": "no_admins"},
                steps_taken=steps
            )

        finding = {
            "group_id": group_id,
            "group_name": context.get("group_name", "Your poker group"),
            "days_inactive": days_since,
            "member_count": data.get("member_count", 0),
        }

        pipeline_result = await self._execute_nudge(
            finding=finding,
            plan_action="plan_inactive_group_nudge",
            recipient_ids=admins,
            group_id=group_id,
            steps=steps,
        )

        return AgentResult(
            success=True,
            data={
                "group_id": group_id,
                "days_inactive": days_since,
                "sent": pipeline_result.get("sent_count", 0),
                "blocked": pipeline_result.get("blocked_count", 0),
                "score_breakdown": data.get("components"),
                "reasons": data.get("reasons"),
            },
            message=f"Nudge sent to {pipeline_result.get('sent_count', 0)} admins (inactive {days_since} days)",
            steps_taken=steps
        )

    async def _nudge_inactive_user(self, context: Dict, steps: List) -> AgentResult:
        """Send a targeted nudge to a specific inactive user via pipeline."""
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

        # FOMO enrichment
        games_missed = 0
        if group_id:
            recent_games = await self._get_recent_group_games(group_id, days=30)
            games_missed = len(recent_games)

        finding = {
            "user_id": user_id,
            "group_id": group_id,
            "days_inactive": days_since,
            "games_missed": games_missed,
        }

        pipeline_result = await self._execute_nudge(
            finding=finding,
            plan_action="plan_inactive_user_nudge",
            recipient_ids=[user_id],
            group_id=group_id,
            steps=steps,
        )

        return AgentResult(
            success=True,
            data={
                "user_id": user_id,
                "days_inactive": days_since,
                "sent": pipeline_result.get("sent_count", 0),
                "blocked": pipeline_result.get("blocked_count", 0),
                "score_breakdown": data.get("components"),
                "reasons": data.get("reasons"),
            },
            message=f"Nudge {'sent' if pipeline_result.get('sent_count', 0) > 0 else 'blocked'} (inactive {days_since} days)",
            steps_taken=steps
        )

    # ==================== Post-Game Check ====================

    async def _post_game_engagement_check(self, context: Dict, steps: List) -> AgentResult:
        """Run all post-game engagement checks: milestones + big winners."""
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
            "celebrated": milestone_result.data.get("celebrations_sent", 0) if milestone_result.data else 0,
            "blocked": milestone_result.data.get("celebrations_blocked", 0) if milestone_result.data else 0,
        }

        # 2. Celebrate big winners (privacy-safe)
        winner_result = await self._celebrate_big_winner(
            {"game_id": game_id},
            steps
        )
        results["big_winners"] = {
            "found": len(winner_result.data.get("big_winners", [])) if winner_result.data else 0,
            "celebrated": winner_result.data.get("celebrations_sent", 0) if winner_result.data else 0,
            "blocked": winner_result.data.get("celebrations_blocked", 0) if winner_result.data else 0,
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

    # ==================== Full Engagement Check (Targeted) ====================

    async def _run_full_engagement_check(self, context: Dict, steps: List) -> AgentResult:
        """
        Run targeted engagement checks (replaces the old sweep-all-groups approach).
        Only processes near-threshold entities instead of scanning everything.
        """
        results = {}

        # 1. Check inactive groups (near threshold: 12-20 days if threshold is 14)
        group_result = await self._check_inactive_groups(context, steps)
        results["inactive_groups"] = {
            "found": group_result.data.get("inactive_groups_found", 0) if group_result.data else 0,
            "nudged": group_result.data.get("nudges_sent", 0) if group_result.data else 0,
            "blocked": group_result.data.get("nudges_blocked", 0) if group_result.data else 0,
        }

        # 2. Check inactive users per group
        if self.db:
            groups = await self.db.groups.find(
                {},
                {"_id": 0, "group_id": 1}
            ).to_list(100)

            total_inactive_users = 0
            total_user_nudges = 0
            total_user_blocked = 0

            for group in groups:
                user_result = await self._check_inactive_users(
                    {"group_id": group["group_id"], "inactive_days": 30},
                    steps
                )
                if user_result.data:
                    total_inactive_users += user_result.data.get("inactive_users_found", 0)
                    total_user_nudges += user_result.data.get("nudges_sent", 0)
                    total_user_blocked += user_result.data.get("nudges_blocked", 0)

            results["inactive_users"] = {
                "found": total_inactive_users,
                "nudged": total_user_nudges,
                "blocked": total_user_blocked,
                "groups_checked": len(groups)
            }

        return AgentResult(
            success=True,
            data=results,
            message=(
                f"Full engagement check: "
                f"{results['inactive_groups']['found']} inactive groups, "
                f"{results.get('inactive_users', {}).get('found', 0)} inactive users"
            ),
            steps_taken=steps
        )

    # ==================== Job Queue Processing ====================

    async def _process_job(self, context: Dict, steps: List) -> AgentResult:
        """
        Process a single engagement job from the queue.
        Jobs are created by EngagementScheduler and contain:
        - job_type, group_id, run_at, priority
        """
        job = context.get("job", {})
        job_type = job.get("job_type", context.get("job_type"))
        group_id = job.get("group_id", context.get("group_id"))
        user_id = job.get("user_id", context.get("user_id"))

        if job_type == "group_check":
            return await self._nudge_inactive_group(
                {"group_id": group_id, **job},
                steps
            )
        elif job_type == "user_check":
            return await self._nudge_inactive_user(
                {"user_id": user_id, "group_id": group_id, **job},
                steps
            )
        elif job_type == "digest":
            return await self._send_engagement_digest(
                {"group_id": group_id},
                steps
            )
        elif job_type == "post_game":
            return await self._post_game_engagement_check(context, steps)
        else:
            return AgentResult(
                success=False,
                error=f"Unknown job type: {job_type}",
                steps_taken=steps
            )

    # ==================== Outcome Tracking ====================

    async def _log_nudge_event(
        self,
        recipient_id: str,
        group_id: Optional[str],
        category: str,
        plan: Dict,
        tone: str,
        channels: List[str],
    ):
        """Log nudge event for outcome tracking and cooldown management."""
        if not self.db:
            return

        now = datetime.now(timezone.utc).isoformat()

        # Log to engagement_nudges_log (for cooldown checks)
        await self.db.engagement_nudges_log.insert_one({
            "target_id": recipient_id,
            "group_id": group_id,
            "user_id": recipient_id,
            "nudge_type": category,
            "plan_id": plan.get("plan_id"),
            "template_key": plan.get("template_key"),
            "message": plan.get("body", ""),
            "tone": tone,
            "channels": channels,
            "sent_at": now,
            "resolved": False,  # Set to True when user takes action
        })

        # Log to engagement_events (for outcome tracking)
        await self.db.engagement_events.insert_one({
            "event_type": "nudge_sent",
            "recipient_type": plan.get("recipient_type", "user"),
            "recipient_id": recipient_id,
            "group_id": group_id,
            "category": category,
            "plan_id": plan.get("plan_id"),
            "template_key": plan.get("template_key"),
            "tone": tone,
            "channels": channels,
            "created_at": now,
            # Outcome fields — populated later by event handlers
            "delivered_at": None,
            "opened_at": None,
            "clicked_at": None,
            "game_started_within_48h": None,
            "game_started_within_7d": None,
            "muted_at": None,
        })

    async def record_outcome(
        self,
        plan_id: str,
        outcome_type: str,
        data: Dict = None
    ):
        """
        Record an outcome for a previously sent nudge.
        Called by event handlers when we detect a positive/negative signal.

        outcome_type: delivered, opened, clicked, game_started, muted
        """
        if not self.db:
            return

        now = datetime.now(timezone.utc).isoformat()
        update = {}

        if outcome_type == "delivered":
            update["delivered_at"] = now
        elif outcome_type == "opened":
            update["opened_at"] = now
        elif outcome_type == "clicked":
            update["clicked_at"] = now
        elif outcome_type == "game_started":
            # Check if within 48h or 7d of nudge
            event = await self.db.engagement_events.find_one(
                {"plan_id": plan_id, "event_type": "nudge_sent"},
                {"_id": 0, "created_at": 1}
            )
            if event:
                sent_at = datetime.fromisoformat(event["created_at"].replace("Z", "+00:00"))
                now_dt = datetime.now(timezone.utc)
                hours_since = (now_dt - sent_at).total_seconds() / 3600
                update["game_started_within_48h"] = hours_since <= 48
                update["game_started_within_7d"] = hours_since <= 168

            # Also log a separate conversion event
            group_id = data.get("group_id") if data else None
            await self.db.engagement_events.insert_one({
                "event_type": "game_started_after_nudge",
                "plan_id": plan_id,
                "group_id": group_id,
                "created_at": now,
            })

            # Resolve the nudge in the cooldown log
            await self.db.engagement_nudges_log.update_one(
                {"plan_id": plan_id},
                {"$set": {"resolved": True}}
            )
        elif outcome_type == "muted":
            update["muted_at"] = now
            group_id = data.get("group_id") if data else None
            await self.db.engagement_events.insert_one({
                "event_type": "nudge_muted",
                "plan_id": plan_id,
                "group_id": group_id,
                "created_at": now,
            })

        if update:
            await self.db.engagement_events.update_one(
                {"plan_id": plan_id, "event_type": "nudge_sent"},
                {"$set": update}
            )

    # ==================== Helper Methods ====================

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
