"""
Feedback Agent

Autonomous agent that collects, classifies, and acts on user feedback.
Uses the pipeline: Collect → Classify → Auto-Fix → Track → Notify.

Trigger Types:
1. User submits feedback (in-app form, bug report) → classify + auto-fix
2. Post-game survey (1-5 stars + comment) → collect + flag low ratings
3. Batch processing → classify unclassified, analyze trends
4. Auto-fix attempt → try known fix patterns, notify user
5. Trend analysis → weekly feedback digest for team

Architecture:
- FeedbackCollectorTool: Store/retrieve feedback and surveys
- FeedbackClassifierTool: AI classification (Claude Haiku) + keyword fallback
- AutoFixerTool: Settlement recheck, notification resend, payment reconciliation
- NotificationSenderTool: Notify users of resolutions
- feedback collection: MongoDB feedback entries
- feedback_surveys collection: Post-game survey ratings
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseAgent, AgentResult

logger = logging.getLogger(__name__)


class FeedbackAgent(BaseAgent):
    """
    Agent for collecting, classifying, and acting on user feedback.

    Uses the Collect → Classify → Auto-Fix → Track → Notify pipeline
    to handle feedback autonomously.
    """

    @property
    def name(self) -> str:
        return "feedback"

    @property
    def description(self) -> str:
        return (
            "collecting, classifying, and acting on user feedback including "
            "bug reports, post-game surveys, feature requests, and auto-fixing "
            "known issues like settlement errors and missing notifications"
        )

    @property
    def capabilities(self) -> List[str]:
        return [
            "Accept and store user feedback (bugs, features, complaints, praise)",
            "Collect post-game survey responses (1-5 star rating + comment)",
            "Classify feedback with AI (category, severity, sentiment, tags)",
            "Detect and attempt auto-fixes for known patterns",
            "Auto-fix: settlement recheck when users report wrong amounts",
            "Auto-fix: resend missing notifications",
            "Auto-fix: reconcile untracked payments",
            "Auto-fix: check and resolve permission/access issues",
            "Generate feedback trend reports (top issues, avg rating, volume)",
            "Notify users when their feedback has been addressed",
            "Batch classify unprocessed feedback entries",
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "feedback_collector",
            "feedback_classifier",
            "auto_fixer",
            "notification_sender",
        ]

    @property
    def input_schema(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "user_input": {
                    "type": "string",
                    "description": "The feedback request"
                },
                "action": {
                    "type": "string",
                    "description": "Specific feedback action to perform",
                    "enum": [
                        "submit_feedback",
                        "submit_survey",
                        "process_feedback",
                        "attempt_auto_fix",
                        "get_trends",
                        "get_unresolved",
                        "batch_classify",
                        "trigger_post_game_survey",
                        "process_job"
                    ]
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID"
                },
                "feedback_type": {
                    "type": "string",
                    "description": "Type of feedback"
                },
                "content": {
                    "type": "string",
                    "description": "Feedback text content"
                },
                "rating": {
                    "type": "integer",
                    "description": "Survey rating 1-5"
                },
                "context": {
                    "type": "object",
                    "description": "Additional context"
                }
            },
            "required": ["user_input"]
        }

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """Execute feedback tasks through the full pipeline."""
        context = context or {}
        steps_taken = []

        try:
            action = context.get("action") or self._parse_action(user_input)

            if action == "submit_feedback":
                return await self._handle_submit_feedback(context, steps_taken)
            elif action == "submit_survey":
                return await self._handle_submit_survey(context, steps_taken)
            elif action == "process_feedback":
                return await self._process_single_feedback(context, steps_taken)
            elif action == "attempt_auto_fix":
                return await self._attempt_auto_fix(context, steps_taken)
            elif action == "get_trends":
                return await self._get_feedback_trends(context, steps_taken)
            elif action == "get_unresolved":
                return await self._get_unresolved_feedback(context, steps_taken)
            elif action == "batch_classify":
                return await self._batch_classify_feedback(context, steps_taken)
            elif action == "trigger_post_game_survey":
                return await self._trigger_post_game_survey(context, steps_taken)
            elif action == "process_job":
                return await self._process_job(context, steps_taken)
            else:
                return AgentResult(
                    success=False,
                    error="Unknown feedback action",
                    message="Available actions: submit_feedback, submit_survey, "
                            "process_feedback, attempt_auto_fix, get_trends, "
                            "get_unresolved, batch_classify, trigger_post_game_survey, "
                            "process_job",
                    steps_taken=steps_taken
                )

        except Exception as e:
            logger.error(f"FeedbackAgent error: {e}")
            return AgentResult(
                success=False,
                error=str(e),
                steps_taken=steps_taken
            )

    def _format_unresolved_message(self, count: int, type_counts: Dict) -> str:
        """Format the unresolved feedback summary message."""
        msg = f"{count} unresolved feedback entries"
        if type_counts:
            parts = ", ".join(f"{k}={v}" for k, v in type_counts.items())
            msg += f" ({parts})"
        return msg

    def _parse_action(self, user_input: str) -> str:
        """Parse action from natural language input."""
        input_lower = user_input.lower()

        if any(kw in input_lower for kw in ["submit feedback", "report bug", "report issue", "file feedback"]):
            return "submit_feedback"
        if any(kw in input_lower for kw in ["survey", "rate game", "rating"]):
            return "submit_survey"
        if any(kw in input_lower for kw in ["auto fix", "auto-fix", "fix it", "resolve"]):
            return "attempt_auto_fix"
        if any(kw in input_lower for kw in ["trend", "trends", "feedback report", "feedback summary"]):
            return "get_trends"
        if any(kw in input_lower for kw in ["unresolved", "open feedback", "pending feedback"]):
            return "get_unresolved"
        if any(kw in input_lower for kw in ["classify", "batch", "process all"]):
            return "batch_classify"
        if any(kw in input_lower for kw in ["feedback", "issue", "problem", "bug", "broken"]):
            return "submit_feedback"

        return "get_trends"

    # ==================== Submit Feedback (Full Pipeline) ====================

    async def _handle_submit_feedback(self, context: Dict, steps: List) -> AgentResult:
        """
        Full pipeline: Collect → Classify → Auto-Fix (if applicable) → Notify.
        """
        user_id = context.get("user_id")
        content = context.get("content", "")
        feedback_type = context.get("feedback_type", "other")
        group_id = context.get("group_id")
        game_id = context.get("game_id")
        extra_context = context.get("context", {})

        if not user_id or not content:
            return AgentResult(
                success=False,
                error="user_id and content are required",
                steps_taken=steps
            )

        # Step 1: COLLECT — store the feedback
        collect_result = await self.call_tool(
            "feedback_collector",
            action="submit_feedback",
            user_id=user_id,
            feedback_type=feedback_type,
            content=content,
            group_id=group_id,
            game_id=game_id,
            context=extra_context
        )
        steps.append({"step": "collect", "result": collect_result})

        if not collect_result.get("success"):
            return AgentResult(
                success=False,
                error=collect_result.get("error", "Failed to store feedback"),
                steps_taken=steps
            )

        feedback_id = collect_result.get("data", {}).get("feedback_id")

        # Step 2: CLASSIFY — categorize with AI
        classify_result = await self.call_tool(
            "feedback_classifier",
            action="classify",
            content=content,
            feedback_type=feedback_type,
            context=extra_context
        )
        steps.append({"step": "classify", "result": classify_result})

        classification = classify_result.get("data", {})

        # Update feedback entry with classification
        if self.db and feedback_id and classification:
            await self.db.feedback.update_one(
                {"feedback_id": feedback_id},
                {"$set": {
                    "classification": classification,
                    "priority": classification.get("severity"),
                    "tags": list(set(
                        context.get("tags", []) + classification.get("tags", [])
                    )),
                    "status": "classified",
                    "classified_at": datetime.now(timezone.utc).isoformat()
                }}
            )

        # Step 3: AUTO-FIX — if the classifier found a fixable pattern
        auto_fix_result = None
        if classification.get("auto_fixable") and classification.get("auto_fix_type"):
            auto_fix_result = await self.call_tool(
                "auto_fixer",
                action="auto_fix",
                fix_type=classification["auto_fix_type"],
                user_id=user_id,
                group_id=group_id,
                game_id=game_id,
                feedback_id=feedback_id,
                context=extra_context
            )
            steps.append({"step": "auto_fix", "result": auto_fix_result})

            # Update feedback with auto-fix result
            if self.db and feedback_id:
                fix_success = auto_fix_result.get("success", False)
                await self.db.feedback.update_one(
                    {"feedback_id": feedback_id},
                    {"$set": {
                        "auto_fix_attempted": True,
                        "auto_fix_result": auto_fix_result.get("data"),
                        "status": "auto_fixed" if fix_success else "classified"
                    }}
                )

        # Step 4: ACKNOWLEDGE — send confirmation to user
        ack_message = "Thanks for your feedback! We've received it"
        if classification.get("auto_fixable"):
            if auto_fix_result and auto_fix_result.get("success"):
                fix_data = auto_fix_result.get("data", {})
                actions = fix_data.get("actions_taken", [])
                if actions:
                    ack_message += f" and automatically checked: {actions[0]}"
                else:
                    ack_message += " and attempted an automatic resolution"
            else:
                ack_message += " and we're looking into it"
        else:
            severity = classification.get("severity", "medium")
            if severity in ("critical", "high"):
                ack_message += " and it's been flagged as high priority"
            else:
                ack_message += " and it's been added to our review queue"
        ack_message += "."

        await self.call_tool(
            "notification_sender",
            user_ids=[user_id],
            title="Feedback Received",
            message=ack_message,
            notification_type="general",
            data={
                "feedback_id": feedback_id,
                "source": "feedback_agent"
            }
        )
        steps.append({"step": "acknowledge", "message": ack_message})

        return AgentResult(
            success=True,
            data={
                "feedback_id": feedback_id,
                "classification": classification,
                "auto_fix_attempted": classification.get("auto_fixable", False),
                "auto_fix_result": auto_fix_result.get("data") if auto_fix_result else None,
            },
            message=f"Feedback processed: {classification.get('category', 'other')} "
                    f"({classification.get('severity', 'medium')}) "
                    f"{'— auto-fix attempted' if classification.get('auto_fixable') else ''}",
            steps_taken=steps
        )

    # ==================== Submit Survey ====================

    async def _handle_submit_survey(self, context: Dict, steps: List) -> AgentResult:
        """Handle post-game survey submission."""
        user_id = context.get("user_id")
        game_id = context.get("game_id")
        group_id = context.get("group_id")
        rating = context.get("rating")
        comment = context.get("content", "")

        if not user_id or not game_id or rating is None:
            return AgentResult(
                success=False,
                error="user_id, game_id, and rating are required",
                steps_taken=steps
            )

        # Store the survey
        survey_result = await self.call_tool(
            "feedback_collector",
            action="submit_survey",
            user_id=user_id,
            game_id=game_id,
            group_id=group_id,
            rating=rating,
            content=comment
        )
        steps.append({"step": "submit_survey", "result": survey_result})

        if not survey_result.get("success"):
            return AgentResult(
                success=False,
                error=survey_result.get("error"),
                steps_taken=steps
            )

        data = survey_result.get("data", {})

        # If low rating with comment, classify the comment
        if rating <= 2 and comment:
            classify_result = await self.call_tool(
                "feedback_classifier",
                action="classify",
                content=comment,
                feedback_type="complaint",
                context={"source": "post_game_survey", "rating": rating, "game_id": game_id}
            )
            steps.append({"step": "classify_low_rating", "result": classify_result})

        return AgentResult(
            success=True,
            data={
                "survey_id": data.get("survey_id"),
                "rating": rating,
                "low_rating_flagged": data.get("low_rating_flagged", False)
            },
            message=f"Survey submitted: {rating}/5"
                    f"{' (low rating flagged)' if rating <= 2 else ''}",
            steps_taken=steps
        )

    # ==================== Process Single Feedback ====================

    async def _process_single_feedback(self, context: Dict, steps: List) -> AgentResult:
        """
        Process an existing feedback entry through classify + auto-fix.
        Used for re-processing or manual triggers.
        """
        feedback_id = context.get("feedback_id")
        if not feedback_id or not self.db:
            return AgentResult(
                success=False,
                error="feedback_id and database required",
                steps_taken=steps
            )

        entry = await self.db.feedback.find_one(
            {"feedback_id": feedback_id}, {"_id": 0}
        )
        if not entry:
            return AgentResult(
                success=False,
                error="Feedback not found",
                steps_taken=steps
            )

        # Classify
        classify_result = await self.call_tool(
            "feedback_classifier",
            action="classify",
            content=entry.get("content", ""),
            feedback_type=entry.get("feedback_type"),
            context=entry.get("context", {})
        )
        steps.append({"step": "classify", "result": classify_result})

        classification = classify_result.get("data", {})

        # Update
        await self.db.feedback.update_one(
            {"feedback_id": feedback_id},
            {"$set": {
                "classification": classification,
                "priority": classification.get("severity"),
                "status": "classified",
                "classified_at": datetime.now(timezone.utc).isoformat()
            }}
        )

        # Auto-fix if applicable
        auto_fix_result = None
        if classification.get("auto_fixable"):
            auto_fix_result = await self.call_tool(
                "auto_fixer",
                action="auto_fix",
                fix_type=classification["auto_fix_type"],
                user_id=entry.get("user_id"),
                group_id=entry.get("group_id"),
                game_id=entry.get("game_id"),
                feedback_id=feedback_id
            )
            steps.append({"step": "auto_fix", "result": auto_fix_result})

            if auto_fix_result.get("success"):
                await self.db.feedback.update_one(
                    {"feedback_id": feedback_id},
                    {"$set": {
                        "auto_fix_attempted": True,
                        "auto_fix_result": auto_fix_result.get("data"),
                        "status": "auto_fixed"
                    }}
                )

        return AgentResult(
            success=True,
            data={
                "feedback_id": feedback_id,
                "classification": classification,
                "auto_fix_attempted": classification.get("auto_fixable", False),
                "auto_fix_result": auto_fix_result.get("data") if auto_fix_result else None
            },
            message=f"Processed: {classification.get('category')} ({classification.get('severity')})",
            steps_taken=steps
        )

    # ==================== Auto-Fix Attempt ====================

    async def _attempt_auto_fix(self, context: Dict, steps: List) -> AgentResult:
        """Attempt an auto-fix for a specific feedback entry or pattern."""
        feedback_id = context.get("feedback_id")
        fix_type = context.get("fix_type")
        user_id = context.get("user_id")
        game_id = context.get("game_id")
        group_id = context.get("group_id")

        # If feedback_id provided, get the fix type from the classification
        if feedback_id and self.db:
            entry = await self.db.feedback.find_one(
                {"feedback_id": feedback_id}, {"_id": 0}
            )
            if entry:
                classification = entry.get("classification", {})
                fix_type = fix_type or classification.get("auto_fix_type")
                user_id = user_id or entry.get("user_id")
                game_id = game_id or entry.get("game_id")
                group_id = group_id or entry.get("group_id")

        if not fix_type:
            return AgentResult(
                success=False,
                error="No auto-fix type determined. Classify the feedback first.",
                steps_taken=steps
            )

        result = await self.call_tool(
            "auto_fixer",
            action="auto_fix",
            fix_type=fix_type,
            user_id=user_id,
            game_id=game_id,
            group_id=group_id,
            feedback_id=feedback_id
        )
        steps.append({"step": "auto_fix", "result": result})

        # Update feedback if we have an ID
        if feedback_id and self.db and result.get("success"):
            await self.db.feedback.update_one(
                {"feedback_id": feedback_id},
                {"$set": {
                    "auto_fix_attempted": True,
                    "auto_fix_result": result.get("data"),
                    "status": "auto_fixed"
                }}
            )

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message=result.get("message", f"Auto-fix {fix_type}: {'success' if result.get('success') else 'failed'}"),
            steps_taken=steps
        )

    # ==================== Trends Report ====================

    async def _get_feedback_trends(self, context: Dict, steps: List) -> AgentResult:
        """Get feedback trends and generate a summary report."""
        group_id = context.get("group_id")
        days = context.get("days", 30)

        trends_result = await self.call_tool(
            "feedback_collector",
            action="get_trends",
            group_id=group_id,
            days=days
        )
        steps.append({"step": "get_trends", "result": trends_result})

        if not trends_result.get("success"):
            return AgentResult(
                success=False,
                error=trends_result.get("error"),
                steps_taken=steps
            )

        data = trends_result.get("data", {})

        # Build summary message
        total = data.get("total_feedback", 0)
        avg_rating = data.get("avg_survey_rating", 0)
        by_type = data.get("by_type", {})
        by_status = data.get("by_status", {})
        top_tags = data.get("top_tags", [])

        lines = [f"Feedback Report ({days} days):"]
        lines.append(f"  Total feedback: {total}")
        lines.append(f"  Avg survey rating: {avg_rating}/5")

        if by_type:
            lines.append(f"  By type: {', '.join(f'{k}={v}' for k, v in sorted(by_type.items(), key=lambda x: x[1], reverse=True))}")

        if by_status:
            unresolved = by_status.get("new", 0) + by_status.get("classified", 0)
            resolved = by_status.get("resolved", 0) + by_status.get("auto_fixed", 0)
            lines.append(f"  Unresolved: {unresolved} | Resolved: {resolved}")

        if top_tags:
            lines.append(f"  Top issues: {', '.join(f'{tag}({count})' for tag, count in top_tags[:5])}")

        summary = "\n".join(lines)

        return AgentResult(
            success=True,
            data=data,
            message=summary,
            steps_taken=steps
        )

    # ==================== Unresolved Feedback ====================

    async def _get_unresolved_feedback(self, context: Dict, steps: List) -> AgentResult:
        """Get all unresolved feedback, optionally filtered."""
        group_id = context.get("group_id")
        feedback_type = context.get("feedback_type")

        result = await self.call_tool(
            "feedback_collector",
            action="get_unresolved",
            group_id=group_id,
            feedback_type=feedback_type
        )
        steps.append({"step": "get_unresolved", "result": result})

        if not result.get("success"):
            return AgentResult(
                success=False,
                error=result.get("error"),
                steps_taken=steps
            )

        data = result.get("data", {})
        count = data.get("count", 0)

        # Summarize by type
        unresolved = data.get("unresolved", [])
        type_counts = {}
        severity_counts = {}
        for fb in unresolved:
            ft = fb.get("feedback_type", "other")
            type_counts[ft] = type_counts.get(ft, 0) + 1
            sev = fb.get("priority") or fb.get("classification", {}).get("severity", "unknown")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        return AgentResult(
            success=True,
            data={
                "unresolved": unresolved,
                "count": count,
                "by_type": type_counts,
                "by_severity": severity_counts
            },
            message=self._format_unresolved_message(count, type_counts),
            steps_taken=steps
        )

    # ==================== Batch Classify ====================

    async def _batch_classify_feedback(self, context: Dict, steps: List) -> AgentResult:
        """Classify all unclassified feedback entries."""
        if not self.db:
            return AgentResult(
                success=False,
                error="Database not available",
                steps_taken=steps
            )

        # Find unclassified entries
        entries = await self.db.feedback.find(
            {"status": "new", "classification": None},
            {"_id": 0, "feedback_id": 1}
        ).to_list(50)

        if not entries:
            return AgentResult(
                success=True,
                data={"classified": 0, "total": 0},
                message="No unclassified feedback to process",
                steps_taken=steps
            )

        feedback_ids = [e["feedback_id"] for e in entries]

        result = await self.call_tool(
            "feedback_classifier",
            action="batch_classify",
            feedback_ids=feedback_ids
        )
        steps.append({"step": "batch_classify", "result": result})

        # Now try auto-fix on any that are auto-fixable
        auto_fixes = 0
        if result.get("success"):
            for fid in feedback_ids:
                entry = await self.db.feedback.find_one(
                    {"feedback_id": fid}, {"_id": 0}
                )
                if entry:
                    classification = entry.get("classification", {})
                    if classification.get("auto_fixable") and not entry.get("auto_fix_attempted"):
                        fix_result = await self.call_tool(
                            "auto_fixer",
                            action="auto_fix",
                            fix_type=classification["auto_fix_type"],
                            user_id=entry.get("user_id"),
                            game_id=entry.get("game_id"),
                            group_id=entry.get("group_id"),
                            feedback_id=fid
                        )
                        if fix_result.get("success"):
                            auto_fixes += 1
                            await self.db.feedback.update_one(
                                {"feedback_id": fid},
                                {"$set": {
                                    "auto_fix_attempted": True,
                                    "auto_fix_result": fix_result.get("data"),
                                    "status": "auto_fixed"
                                }}
                            )

        data = result.get("data", {})
        return AgentResult(
            success=True,
            data={
                "classified": data.get("classified", 0),
                "auto_fixed": auto_fixes,
                "total": len(feedback_ids)
            },
            message=f"Batch processed: {data.get('classified', 0)} classified, {auto_fixes} auto-fixed",
            steps_taken=steps
        )

    # ==================== Post-Game Survey Trigger ====================

    async def _trigger_post_game_survey(self, context: Dict, steps: List) -> AgentResult:
        """
        Send post-game survey prompts to all players after a game ends.
        Triggered by EventListenerService on game_ended.
        """
        game_id = context.get("game_id")
        group_id = context.get("group_id")
        player_ids = context.get("player_ids", [])

        if not game_id:
            return AgentResult(
                success=False,
                error="game_id required",
                steps_taken=steps
            )

        # Get player IDs from game if not provided
        if not player_ids and self.db:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "players": 1, "title": 1, "group_id": 1}
            )
            if game:
                player_ids = [
                    p.get("user_id") for p in game.get("players", [])
                    if p.get("user_id")
                ]
                if not group_id:
                    group_id = game.get("group_id")

        if not player_ids:
            return AgentResult(
                success=True,
                data={"sent": 0},
                message="No players to survey",
                steps_taken=steps
            )

        # Send survey prompt notification to each player
        notif_result = await self.call_tool(
            "notification_sender",
            user_ids=player_ids,
            title="How was your game?",
            message="Rate your experience! Tap to leave a quick rating (1-5 stars).",
            notification_type="general",
            data={
                "type": "post_game_survey",
                "game_id": game_id,
                "group_id": group_id,
                "action": "open_survey"
            }
        )
        steps.append({"step": "send_survey_prompts", "result": notif_result})

        return AgentResult(
            success=True,
            data={
                "sent": len(player_ids),
                "game_id": game_id,
                "player_ids": player_ids
            },
            message=f"Survey prompts sent to {len(player_ids)} players",
            steps_taken=steps
        )

    # ==================== Job Queue Processing ====================

    async def _process_job(self, context: Dict, steps: List) -> AgentResult:
        """
        Process a single feedback job from the scheduler.
        Job types: batch_classify, send_survey, trends_report
        """
        job = context.get("job", {})
        job_type = job.get("job_type", context.get("job_type"))

        if job_type == "batch_classify":
            return await self._batch_classify_feedback(context, steps)
        elif job_type == "send_survey":
            return await self._trigger_post_game_survey(context, steps)
        elif job_type == "trends_report":
            return await self._get_feedback_trends(
                {"days": 7, **context},
                steps
            )
        else:
            return AgentResult(
                success=False,
                error=f"Unknown job type: {job_type}",
                steps_taken=steps
            )
