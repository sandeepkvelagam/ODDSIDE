"""
Feedback Agent (v2)

Autonomous agent that collects, classifies, and acts on user feedback.
Uses the pipeline: Collect -> Classify -> Policy -> Fix(verify+apply) -> Log -> Notify.

v2 upgrades:
- Policy gating (FeedbackPolicyTool) before any auto-fix
- Verify-tier operations by default; mutate only with confirmation + role
- SLA deadlines set after classification
- Events audit trail on every state transition
- Duplicate detection and content_hash awareness
- Observability-ready trends (auto-fix rates, resolution times, reopen rate)

Trigger Types:
1. User submits feedback (in-app form, bug report) -> classify + policy + fix
2. Post-game survey (1-5 stars + comment) -> collect + flag low ratings
3. Batch processing -> classify unclassified, analyze trends
4. Auto-fix attempt -> policy check -> verify-tier fix -> notify user
5. Trend analysis -> weekly feedback digest with metrics

Architecture:
- FeedbackCollectorTool: Store/retrieve feedback, PII redaction, duplicate detection
- FeedbackClassifierTool: AI classification (Claude Haiku) + keyword fallback + rules
- FeedbackPolicyTool: Gating layer (role, cooldown, retry limit, group settings)
- AutoFixerTool: Two-tier: verify (read-only) + mutate (writes, needs confirmation)
- NotificationSenderTool: Notify users of resolutions
- feedback collection: MongoDB feedback entries with events audit trail
- feedback_surveys collection: Post-game survey ratings
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseAgent, AgentResult

logger = logging.getLogger(__name__)

# SLA durations by severity (mirrors feedback_collector.py)
SLA_DURATIONS = {
    "critical": timedelta(hours=24),
    "high": timedelta(days=3),
    "medium": timedelta(days=7),
    "low": timedelta(days=14),
}


class FeedbackAgent(BaseAgent):
    """
    Agent for collecting, classifying, and acting on user feedback (v2).

    Uses the Collect -> Classify -> Policy -> Fix(verify+apply) -> Log -> Notify
    pipeline to handle feedback autonomously.
    """

    @property
    def name(self) -> str:
        return "feedback"

    @property
    def description(self) -> str:
        return (
            "collecting, classifying, and acting on user feedback including "
            "bug reports, post-game surveys, feature requests, and auto-fixing "
            "known issues like settlement errors and missing notifications. "
            "Policy-gated auto-fixes with verify/mutate tiers."
        )

    @property
    def capabilities(self) -> List[str]:
        return [
            "Accept and store user feedback with PII redaction and duplicate detection",
            "Collect post-game survey responses (1-5 star rating + comment) with anti-spam",
            "Classify feedback with AI (category, severity, sentiment, confidence, evidence)",
            "Apply rules-based severity minimums after classification",
            "Check auto-fix policy (role, cooldown, retry limit) before any fix",
            "Auto-fix (verify tier): settlement recheck, notification resend",
            "Auto-fix (verify tier): payment reconciliation preview, permission diagnosis",
            "Auto-fix (mutate tier): payment reconciliation apply, permission fix apply",
            "Set SLA deadlines based on severity after classification",
            "Track events audit trail on every state transition",
            "Generate feedback trend reports with observability metrics",
            "Notify users when their feedback has been addressed",
            "Batch classify unprocessed feedback entries with policy-gated auto-fix",
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "feedback_collector",
            "feedback_classifier",
            "feedback_policy",
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
        """Execute feedback tasks through the v2 pipeline."""
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

    # ==================== Submit Feedback (Full v2 Pipeline) ====================

    async def _handle_submit_feedback(self, context: Dict, steps: List) -> AgentResult:
        """
        Full v2 pipeline: Collect -> Classify -> Policy -> Fix(verify) -> Log -> Notify.
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

        # Step 1: COLLECT — store the feedback (PII redacted, dedup checked)
        collect_result = await self.call_tool(
            "feedback_collector",
            action="submit_feedback",
            user_id=user_id,
            feedback_type=feedback_type,
            content=content,
            group_id=group_id,
            game_id=game_id,
            context=extra_context,
            context_refs={"group_id": group_id, "game_id": game_id}
        )
        steps.append({"step": "collect", "result": collect_result})

        if not collect_result.get("success"):
            return AgentResult(
                success=False,
                error=collect_result.get("error", "Failed to store feedback"),
                steps_taken=steps
            )

        collect_data = collect_result.get("data", {})
        feedback_id = collect_data.get("feedback_id")

        # If duplicate detected, skip further processing
        if collect_data.get("duplicate"):
            return AgentResult(
                success=True,
                data={
                    "feedback_id": feedback_id,
                    "duplicate": True,
                    "original_feedback_id": collect_data.get("original_feedback_id"),
                },
                message="Duplicate feedback detected — linked to existing entry",
                steps_taken=steps
            )

        # Step 2: CLASSIFY — categorize with AI (confidence, evidence, severity rules)
        classify_result = await self.call_tool(
            "feedback_classifier",
            action="classify",
            content=content,
            feedback_type=feedback_type,
            context=extra_context
        )
        steps.append({"step": "classify", "result": classify_result})

        classification = classify_result.get("data", {})

        # Step 3: UPDATE — persist classification + set SLA
        if self.db and feedback_id and classification:
            severity = classification.get("severity", "medium")
            sla_duration = SLA_DURATIONS.get(severity, timedelta(days=7))
            sla_due_at = (datetime.now(timezone.utc) + sla_duration).isoformat()

            await self.db.feedback.update_one(
                {"feedback_id": feedback_id},
                {
                    "$set": {
                        "classification": classification,
                        "priority": severity,
                        "tags": list(set(
                            context.get("tags", []) + classification.get("tags", [])
                        )),
                        "status": "classified",
                        "classified_at": datetime.now(timezone.utc).isoformat(),
                        "sla_due_at": sla_due_at,
                    },
                    "$push": {"events": {
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "actor": "system",
                        "action": "classified",
                        "details": {
                            "category": classification.get("category"),
                            "severity": severity,
                            "confidence": classification.get("confidence"),
                            "method": classification.get("classification_method"),
                            "sla_due_at": sla_due_at,
                        }
                    }}
                }
            )

        # Step 4: POLICY + FIX — if classifier found a fixable pattern
        auto_fix_result = None
        policy_decision = None
        if classification.get("auto_fixable") and classification.get("auto_fix_type"):
            fix_type = classification["auto_fix_type"]

            # Step 4a: POLICY CHECK — is this fix allowed?
            policy_result = await self.call_tool(
                "feedback_policy",
                action="check_policy",
                fix_type=fix_type,
                user_id=user_id,
                group_id=group_id,
                feedback_id=feedback_id,
                feedback_owner_id=user_id  # submitter is the owner
            )
            steps.append({"step": "policy_check", "result": policy_result})
            policy_decision = policy_result.get("data", {})

            if policy_decision.get("allowed"):
                # Step 4b: FIX (verify tier) — safe, read-only operation
                auto_fix_result = await self.call_tool(
                    "auto_fixer",
                    action="auto_fix",
                    fix_type=fix_type,
                    user_id=user_id,
                    group_id=group_id,
                    game_id=game_id,
                    feedback_id=feedback_id,
                    context=extra_context
                )
                steps.append({"step": "auto_fix_verify", "result": auto_fix_result})

                # Step 4c: LOG — update feedback with fix result
                if self.db and feedback_id:
                    fix_success = auto_fix_result.get("success", False)
                    fix_data = auto_fix_result.get("data", {})
                    new_status = "auto_fixed" if fix_success else "classified"

                    await self.db.feedback.update_one(
                        {"feedback_id": feedback_id},
                        {
                            "$set": {
                                "auto_fix_attempted": True,
                                "auto_fix_result": fix_data,
                                "status": new_status,
                            },
                            "$push": {"events": {
                                "ts": datetime.now(timezone.utc).isoformat(),
                                "actor": "system",
                                "action": "auto_fix_attempted",
                                "details": {
                                    "fix_type": fix_type,
                                    "tier": fix_data.get("tier", "verify"),
                                    "success": fix_success,
                                    "policy_decision": {
                                        "allowed": True,
                                        "tier": policy_decision.get("tier"),
                                    }
                                }
                            }}
                        }
                    )
            else:
                # Policy blocked the fix — log the denial
                if self.db and feedback_id:
                    await self.db.feedback.update_one(
                        {"feedback_id": feedback_id},
                        {"$push": {"events": {
                            "ts": datetime.now(timezone.utc).isoformat(),
                            "actor": "system",
                            "action": "auto_fix_blocked",
                            "details": {
                                "fix_type": fix_type,
                                "blocked_reason": policy_decision.get("blocked_reason"),
                                "checks_failed": policy_decision.get("checks_failed", []),
                            }
                        }}}
                    )

        # Step 5: NOTIFY — send acknowledgment to user
        ack_message = self._build_ack_message(
            classification, auto_fix_result, policy_decision
        )

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
                "policy_decision": {
                    "allowed": policy_decision.get("allowed"),
                    "tier": policy_decision.get("tier"),
                } if policy_decision else None,
            },
            message=self._build_result_message(classification, auto_fix_result, policy_decision),
            steps_taken=steps
        )

    def _build_ack_message(
        self,
        classification: Dict,
        auto_fix_result: Optional[Dict],
        policy_decision: Optional[Dict]
    ) -> str:
        """Build the user acknowledgment message."""
        msg = "Thanks for your feedback! We've received it"

        if classification.get("auto_fixable"):
            if policy_decision and not policy_decision.get("allowed"):
                msg += " and we're looking into it"
            elif auto_fix_result and auto_fix_result.get("success"):
                fix_data = auto_fix_result.get("data", {})
                user_message = fix_data.get("user_message")
                if user_message:
                    msg += f". {user_message}"
                    return msg
                actions = fix_data.get("actions_taken", [])
                if actions:
                    msg += f" and automatically checked: {actions[0]}"
                else:
                    msg += " and attempted an automatic resolution"
            else:
                msg += " and we're looking into it"
        else:
            severity = classification.get("severity", "medium")
            if severity in ("critical", "high"):
                msg += " and it's been flagged as high priority"
            else:
                msg += " and it's been added to our review queue"

        msg += "."
        return msg

    def _build_result_message(
        self,
        classification: Dict,
        auto_fix_result: Optional[Dict],
        policy_decision: Optional[Dict]
    ) -> str:
        """Build the pipeline result message."""
        category = classification.get("category", "other")
        severity = classification.get("severity", "medium")
        confidence = classification.get("confidence", 0)

        parts = [f"Feedback processed: {category} ({severity}, conf={confidence:.2f})"]

        if classification.get("auto_fixable"):
            if policy_decision and not policy_decision.get("allowed"):
                parts.append(f"fix blocked: {policy_decision.get('blocked_reason', 'policy')}")
            elif auto_fix_result and auto_fix_result.get("success"):
                parts.append("auto-fix succeeded")
            elif auto_fix_result:
                parts.append("auto-fix attempted")

        return " -- ".join(parts)

    # ==================== Submit Survey ====================

    async def _handle_submit_survey(self, context: Dict, steps: List) -> AgentResult:
        """Handle post-game survey submission (anti-spam handled by collector)."""
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

        # Store the survey (collector handles dedup, cooldown, PII redaction)
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

        # If low rating with comment, classify the comment for routing
        if rating <= 2 and comment and not data.get("duplicate") and not data.get("skipped"):
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
                "low_rating_flagged": data.get("low_rating_flagged", False),
                "skipped": data.get("skipped", False),
                "duplicate": data.get("duplicate", False),
            },
            message=self._build_survey_message(rating, data),
            steps_taken=steps
        )

    def _build_survey_message(self, rating: int, data: Dict) -> str:
        """Build survey result message."""
        if data.get("duplicate"):
            return "Survey already submitted for this game"
        if data.get("skipped"):
            return f"Survey skipped ({data.get('reason', 'cooldown')})"
        msg = f"Survey submitted: {rating}/5"
        if rating <= 2:
            msg += " (low rating flagged)"
        return msg

    # ==================== Process Single Feedback ====================

    async def _process_single_feedback(self, context: Dict, steps: List) -> AgentResult:
        """
        Process an existing feedback entry through classify + policy + fix.
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
        severity = classification.get("severity", "medium")
        sla_duration = SLA_DURATIONS.get(severity, timedelta(days=7))
        sla_due_at = (datetime.now(timezone.utc) + sla_duration).isoformat()

        # Update with classification + SLA
        await self.db.feedback.update_one(
            {"feedback_id": feedback_id},
            {
                "$set": {
                    "classification": classification,
                    "priority": severity,
                    "status": "classified",
                    "classified_at": datetime.now(timezone.utc).isoformat(),
                    "sla_due_at": sla_due_at,
                },
                "$push": {"events": {
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "actor": "system",
                    "action": "reclassified",
                    "details": {
                        "category": classification.get("category"),
                        "severity": severity,
                        "confidence": classification.get("confidence"),
                    }
                }}
            }
        )

        # Policy-gated auto-fix
        auto_fix_result = None
        if classification.get("auto_fixable"):
            fix_type = classification["auto_fix_type"]
            user_id = entry.get("user_id")

            # Policy check
            policy_result = await self.call_tool(
                "feedback_policy",
                action="check_policy",
                fix_type=fix_type,
                user_id=user_id,
                group_id=entry.get("group_id"),
                feedback_id=feedback_id,
                feedback_owner_id=user_id
            )
            steps.append({"step": "policy_check", "result": policy_result})

            policy_data = policy_result.get("data", {})
            if policy_data.get("allowed"):
                auto_fix_result = await self.call_tool(
                    "auto_fixer",
                    action="auto_fix",
                    fix_type=fix_type,
                    user_id=user_id,
                    game_id=entry.get("game_id"),
                    group_id=entry.get("group_id"),
                    feedback_id=feedback_id
                )
                steps.append({"step": "auto_fix", "result": auto_fix_result})

                fix_success = auto_fix_result.get("success", False)
                await self.db.feedback.update_one(
                    {"feedback_id": feedback_id},
                    {
                        "$set": {
                            "auto_fix_attempted": True,
                            "auto_fix_result": auto_fix_result.get("data"),
                            "status": "auto_fixed" if fix_success else "classified",
                        },
                        "$push": {"events": {
                            "ts": datetime.now(timezone.utc).isoformat(),
                            "actor": "system",
                            "action": "auto_fix_attempted",
                            "details": {
                                "fix_type": fix_type,
                                "success": fix_success,
                            }
                        }}
                    }
                )

        return AgentResult(
            success=True,
            data={
                "feedback_id": feedback_id,
                "classification": classification,
                "auto_fix_attempted": classification.get("auto_fixable", False),
                "auto_fix_result": auto_fix_result.get("data") if auto_fix_result else None
            },
            message=f"Processed: {classification.get('category')} ({severity})",
            steps_taken=steps
        )

    # ==================== Auto-Fix Attempt (Policy-Gated) ====================

    async def _attempt_auto_fix(self, context: Dict, steps: List) -> AgentResult:
        """Attempt a policy-gated auto-fix for a specific feedback entry or pattern."""
        feedback_id = context.get("feedback_id")
        fix_type = context.get("fix_type")
        user_id = context.get("user_id")
        game_id = context.get("game_id")
        group_id = context.get("group_id")
        confirmed = context.get("confirmed", False)
        feedback_owner_id = user_id

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
                feedback_owner_id = entry.get("user_id")

        if not fix_type:
            return AgentResult(
                success=False,
                error="No auto-fix type determined. Classify the feedback first.",
                steps_taken=steps
            )

        # Step 1: POLICY CHECK
        policy_result = await self.call_tool(
            "feedback_policy",
            action="check_policy",
            fix_type=fix_type,
            user_id=user_id,
            group_id=group_id,
            feedback_id=feedback_id,
            feedback_owner_id=feedback_owner_id
        )
        steps.append({"step": "policy_check", "result": policy_result})

        policy_data = policy_result.get("data", {})
        if not policy_data.get("allowed"):
            return AgentResult(
                success=False,
                error=f"Fix blocked by policy: {policy_data.get('blocked_reason')}",
                data={"policy_decision": policy_data},
                steps_taken=steps
            )

        # Step 2: Check if mutation needs confirmation
        if policy_data.get("requires_confirmation") and not confirmed:
            return AgentResult(
                success=True,
                data={
                    "requires_confirmation": True,
                    "tier": policy_data.get("tier"),
                    "fix_type": fix_type,
                    "message": "This fix requires explicit confirmation. "
                               "Re-submit with confirmed=true to proceed."
                },
                message=f"Fix '{fix_type}' requires confirmation (mutate tier)",
                steps_taken=steps
            )

        # Step 3: EXECUTE FIX
        fix_kwargs = {
            "action": fix_type if fix_type in (
                "settlement_recheck", "resend_notification",
                "reconcile_payment_preview", "reconcile_payment_apply",
                "fix_permissions_diagnose", "fix_permissions_apply"
            ) else "auto_fix",
            "fix_type": fix_type,
            "user_id": user_id,
            "game_id": game_id,
            "group_id": group_id,
            "feedback_id": feedback_id,
        }
        if confirmed:
            fix_kwargs["confirmed"] = True

        result = await self.call_tool("auto_fixer", **fix_kwargs)
        steps.append({"step": "auto_fix", "result": result})

        # Step 4: LOG — update feedback
        if feedback_id and self.db and result.get("success"):
            await self.db.feedback.update_one(
                {"feedback_id": feedback_id},
                {
                    "$set": {
                        "auto_fix_attempted": True,
                        "auto_fix_result": result.get("data"),
                        "status": "auto_fixed",
                    },
                    "$push": {"events": {
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "actor": user_id or "system",
                        "action": "auto_fix_applied",
                        "details": {
                            "fix_type": fix_type,
                            "tier": policy_data.get("tier"),
                            "confirmed": confirmed,
                        }
                    }}
                }
            )

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message=result.get("message", f"Auto-fix {fix_type}: {'success' if result.get('success') else 'failed'}"),
            steps_taken=steps
        )

    # ==================== Trends Report ====================

    async def _get_feedback_trends(self, context: Dict, steps: List) -> AgentResult:
        """Get feedback trends with observability metrics."""
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
        metrics = data.get("metrics", {})

        lines = [f"Feedback Report ({days} days):"]
        lines.append(f"  Total feedback: {total}")
        lines.append(f"  Avg survey rating: {avg_rating}/5")

        if by_type:
            type_str = ", ".join(
                f"{k}={v}" for k, v in sorted(by_type.items(), key=lambda x: x[1], reverse=True)
            )
            lines.append(f"  By type: {type_str}")

        if by_status:
            unresolved = by_status.get("new", 0) + by_status.get("classified", 0)
            resolved = by_status.get("resolved", 0) + by_status.get("auto_fixed", 0)
            lines.append(f"  Unresolved: {unresolved} | Resolved: {resolved}")

        if top_tags:
            tags_str = ", ".join(f"{tag}({count})" for tag, count in top_tags[:5])
            lines.append(f"  Top issues: {tags_str}")

        # Observability metrics
        if metrics:
            lines.append("  Metrics:")
            if metrics.get("auto_fix_attempt_rate"):
                lines.append(f"    Auto-fix rate: {metrics['auto_fix_attempt_rate']}%")
            if metrics.get("auto_fix_success_rate"):
                lines.append(f"    Auto-fix success: {metrics['auto_fix_success_rate']}%")
            if metrics.get("avg_resolution_hours") is not None:
                lines.append(f"    Avg resolution: {metrics['avg_resolution_hours']}h")
            if metrics.get("reopen_rate"):
                lines.append(f"    Reopen rate: {metrics['reopen_rate']}%")

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
        sla_breached = data.get("sla_breached", 0)

        # Summarize by type and severity
        unresolved = data.get("unresolved", [])
        type_counts = {}
        severity_counts = {}
        for fb in unresolved:
            ft = fb.get("feedback_type", "other")
            type_counts[ft] = type_counts.get(ft, 0) + 1
            sev = fb.get("priority") or fb.get("classification", {}).get("severity", "unknown")
            severity_counts[sev] = severity_counts.get(sev, 0) + 1

        msg = self._format_unresolved_message(count, type_counts)
        if sla_breached:
            msg += f" ({sla_breached} SLA breached)"

        return AgentResult(
            success=True,
            data={
                "unresolved": unresolved,
                "count": count,
                "by_type": type_counts,
                "by_severity": severity_counts,
                "sla_breached": sla_breached,
            },
            message=msg,
            steps_taken=steps
        )

    # ==================== Batch Classify (with Policy-Gated Fix) ====================

    async def _batch_classify_feedback(self, context: Dict, steps: List) -> AgentResult:
        """Classify all unclassified feedback entries with policy-gated auto-fix."""
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

        # Now try policy-gated auto-fix on any that are auto-fixable
        auto_fixes = 0
        policy_blocked = 0
        if result.get("success"):
            for fid in feedback_ids:
                entry = await self.db.feedback.find_one(
                    {"feedback_id": fid}, {"_id": 0}
                )
                if not entry:
                    continue

                classification = entry.get("classification", {})
                if not classification.get("auto_fixable") or entry.get("auto_fix_attempted"):
                    continue

                fix_type = classification.get("auto_fix_type")
                user_id = entry.get("user_id")

                # Policy check before fix
                policy_result = await self.call_tool(
                    "feedback_policy",
                    action="check_policy",
                    fix_type=fix_type,
                    user_id=user_id,
                    group_id=entry.get("group_id"),
                    feedback_id=fid,
                    feedback_owner_id=user_id
                )

                policy_data = policy_result.get("data", {})
                if not policy_data.get("allowed"):
                    policy_blocked += 1
                    continue

                # Only verify-tier in batch (no confirmation)
                if policy_data.get("requires_confirmation"):
                    policy_blocked += 1
                    continue

                fix_result = await self.call_tool(
                    "auto_fixer",
                    action="auto_fix",
                    fix_type=fix_type,
                    user_id=user_id,
                    game_id=entry.get("game_id"),
                    group_id=entry.get("group_id"),
                    feedback_id=fid
                )

                if fix_result.get("success"):
                    auto_fixes += 1
                    await self.db.feedback.update_one(
                        {"feedback_id": fid},
                        {
                            "$set": {
                                "auto_fix_attempted": True,
                                "auto_fix_result": fix_result.get("data"),
                                "status": "auto_fixed",
                            },
                            "$push": {"events": {
                                "ts": datetime.now(timezone.utc).isoformat(),
                                "actor": "system",
                                "action": "batch_auto_fix",
                                "details": {"fix_type": fix_type}
                            }}
                        }
                    )

        data = result.get("data", {})
        return AgentResult(
            success=True,
            data={
                "classified": data.get("classified", 0),
                "auto_fixed": auto_fixes,
                "policy_blocked": policy_blocked,
                "total": len(feedback_ids)
            },
            message=f"Batch processed: {data.get('classified', 0)} classified, "
                    f"{auto_fixes} auto-fixed, {policy_blocked} policy-blocked",
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
