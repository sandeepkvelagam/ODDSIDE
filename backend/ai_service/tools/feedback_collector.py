"""
Feedback Collector Tool (v2)

Stores, retrieves, and manages user feedback submissions.

v2 upgrades:
- Expanded lifecycle: new → classified → needs_user_info → needs_host_action →
  in_progress → auto_fixed → resolved → wont_fix → duplicate
- context_refs: structured pointers (group_id, game_id, settlement_id, etc.)
- PII redaction: regex scrub before storage
- Duplicate detection: content_hash dedup within 7 days per group
- Events audit trail: append-only event log on each feedback entry
- Owner/SLA tracking: owner_type, owner_id, sla_due_at, resolution_code
- Observability metrics: auto_fix rates, resolution times, reopen tracking
- Survey anti-spam: cooldown, sampling, mode settings

Collections used:
- feedback: Individual feedback submissions
- feedback_surveys: Post-game survey results (star rating + comment)
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import re
import hashlib
import random
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


# PII patterns to redact before storage
PII_PATTERNS = [
    (re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b'), '[CARD_REDACTED]'),
    (re.compile(r'\b\d{3}-\d{2}-\d{4}\b'), '[SSN_REDACTED]'),
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), '[EMAIL_REDACTED]'),
    (re.compile(r'\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'), '[PHONE_REDACTED]'),
    (re.compile(r'\b\d{5,}(?:[-\s]\d{4,})?\b'), '[ACCOUNT_REDACTED]'),
]

# Valid feedback statuses
VALID_STATUSES = [
    "new",              # Just submitted, not yet classified
    "classified",       # AI/keyword classification applied
    "needs_user_info",  # Need more info from the reporter
    "needs_host_action",# Requires host/admin intervention
    "in_progress",      # Being worked on
    "auto_fixed",       # Auto-fixer attempted and succeeded
    "resolved",         # Issue resolved (manual or auto)
    "wont_fix",         # Decided not to fix
    "duplicate",        # Duplicate of another entry
]

# SLA durations by severity
SLA_DURATIONS = {
    "critical": timedelta(hours=24),
    "high": timedelta(days=3),
    "medium": timedelta(days=7),
    "low": timedelta(days=14),
}

# Resolution codes
VALID_RESOLUTION_CODES = [
    "auto_fixed", "manual_fix", "duplicate", "user_error",
    "known_issue", "wont_fix", "cannot_reproduce"
]


def _redact_pii(text: str) -> str:
    """Scrub PII from text before storage."""
    for pattern, replacement in PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def _content_hash(text: str) -> str:
    """Generate a hash of content for duplicate detection."""
    normalized = re.sub(r'\s+', ' ', text.strip().lower())
    return hashlib.sha256(normalized.encode()).hexdigest()[:16]


class FeedbackCollectorTool(BaseTool):
    """
    Tool for collecting and managing user feedback (v2).

    v2 features:
    - PII redaction on all stored text
    - Duplicate detection (content_hash within 7 days per group)
    - Expanded status lifecycle with owner/SLA tracking
    - Append-only events audit trail
    - context_refs for reliable lookups
    - Observability metrics in trends
    - Survey anti-spam (cooldown, sampling, mode)
    """

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "feedback_collector"

    @property
    def description(self) -> str:
        return (
            "Collect, store, and retrieve user feedback including post-game surveys, "
            "bug reports, feature requests, and general feedback. Includes PII redaction, "
            "duplicate detection, SLA tracking, and observability metrics."
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
                        "submit_feedback",
                        "submit_survey",
                        "get_feedback",
                        "get_surveys",
                        "get_trends",
                        "mark_resolved",
                        "update_status",
                        "get_unresolved",
                        "add_event"
                    ]
                },
                "user_id": {"type": "string"},
                "group_id": {"type": "string"},
                "game_id": {"type": "string"},
                "feedback_type": {
                    "type": "string",
                    "enum": ["bug", "feature_request", "ux_issue", "complaint", "praise", "other"]
                },
                "content": {"type": "string"},
                "rating": {"type": "integer"},
                "tags": {"type": "array", "items": {"type": "string"}},
                "feedback_id": {"type": "string"},
                "days": {"type": "integer"},
                "context": {"type": "object"},
                "context_refs": {
                    "type": "object",
                    "description": "Structured references: {group_id, game_id, settlement_id, notification_id, payment_id}"
                },
                "status": {"type": "string"},
                "resolution_code": {"type": "string"},
                "owner_type": {"type": "string", "enum": ["system", "host", "support", "dev"]},
                "owner_id": {"type": "string"},
                "linked_feedback_id": {"type": "string"},
                "event_type": {"type": "string"},
                "event_details": {"type": "object"},
            },
            "required": ["action"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute feedback collector action."""
        action = kwargs.get("action")

        if action == "submit_feedback":
            return await self._submit_feedback(
                user_id=kwargs.get("user_id"),
                feedback_type=kwargs.get("feedback_type", "other"),
                content=kwargs.get("content", ""),
                group_id=kwargs.get("group_id"),
                game_id=kwargs.get("game_id"),
                tags=kwargs.get("tags", []),
                context=kwargs.get("context", {}),
                context_refs=kwargs.get("context_refs", {})
            )
        elif action == "submit_survey":
            return await self._submit_survey(
                user_id=kwargs.get("user_id"),
                game_id=kwargs.get("game_id"),
                group_id=kwargs.get("group_id"),
                rating=kwargs.get("rating"),
                content=kwargs.get("content", "")
            )
        elif action == "get_feedback":
            return await self._get_feedback(
                user_id=kwargs.get("user_id"),
                group_id=kwargs.get("group_id"),
                feedback_type=kwargs.get("feedback_type"),
                days=kwargs.get("days", 30)
            )
        elif action == "get_surveys":
            return await self._get_surveys(
                game_id=kwargs.get("game_id"),
                group_id=kwargs.get("group_id"),
                days=kwargs.get("days", 30)
            )
        elif action == "get_trends":
            return await self._get_trends(
                group_id=kwargs.get("group_id"),
                days=kwargs.get("days", 30)
            )
        elif action == "mark_resolved":
            return await self._mark_resolved(
                feedback_id=kwargs.get("feedback_id"),
                resolution_code=kwargs.get("resolution_code", "manual_fix"),
                actor_id=kwargs.get("user_id")
            )
        elif action == "update_status":
            return await self._update_status(
                feedback_id=kwargs.get("feedback_id"),
                status=kwargs.get("status"),
                actor_id=kwargs.get("user_id"),
                owner_type=kwargs.get("owner_type"),
                owner_id=kwargs.get("owner_id"),
                linked_feedback_id=kwargs.get("linked_feedback_id")
            )
        elif action == "get_unresolved":
            return await self._get_unresolved(
                group_id=kwargs.get("group_id"),
                feedback_type=kwargs.get("feedback_type")
            )
        elif action == "add_event":
            return await self._add_event(
                feedback_id=kwargs.get("feedback_id"),
                event_type=kwargs.get("event_type", "note"),
                actor_id=kwargs.get("user_id"),
                details=kwargs.get("event_details", {})
            )
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    # ==================== Submit Feedback ====================

    async def _submit_feedback(
        self,
        user_id: str,
        feedback_type: str,
        content: str,
        group_id: str = None,
        game_id: str = None,
        tags: List[str] = None,
        context: Dict = None,
        context_refs: Dict = None
    ) -> ToolResult:
        """Store a feedback submission with PII redaction and duplicate detection."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        if not user_id or not content:
            return ToolResult(success=False, error="user_id and content are required")

        try:
            now = datetime.now(timezone.utc)
            now_iso = now.isoformat()

            # PII redaction
            redacted_content = _redact_pii(content)
            content_hash_val = _content_hash(content)

            # Duplicate detection: same content_hash within 7 days for same group
            duplicate_cutoff = (now - timedelta(days=7)).isoformat()
            duplicate = await self.db.feedback.find_one({
                "content_hash": content_hash_val,
                "group_id": group_id,
                "created_at": {"$gte": duplicate_cutoff}
            })

            if duplicate:
                dup_id = duplicate.get("feedback_id")
                # Link as duplicate instead of creating new
                await self._add_event(
                    feedback_id=dup_id,
                    event_type="duplicate_attempt",
                    actor_id=user_id,
                    details={"content_hash": content_hash_val}
                )
                return ToolResult(
                    success=True,
                    data={
                        "feedback_id": dup_id,
                        "duplicate": True,
                        "original_feedback_id": dup_id
                    },
                    message="Duplicate feedback detected — linked to existing entry"
                )

            feedback_id = f"fb_{uuid.uuid4().hex[:12]}"

            # Build context_refs (structured pointers)
            refs = context_refs or {}
            if group_id:
                refs.setdefault("group_id", group_id)
            if game_id:
                refs.setdefault("game_id", game_id)

            doc = {
                "feedback_id": feedback_id,
                "user_id": user_id,
                "feedback_type": feedback_type,
                "content": redacted_content,
                "content_hash": content_hash_val,
                "group_id": group_id,
                "game_id": game_id,
                "tags": tags or [],
                "context": context or {},
                "context_refs": refs,

                # Lifecycle
                "status": "new",
                "classification": None,
                "priority": None,

                # Owner/SLA
                "owner_type": "system",
                "owner_id": None,
                "sla_due_at": None,  # set after classification assigns severity

                # Auto-fix tracking
                "auto_fix_attempted": False,
                "auto_fix_result": None,

                # Resolution
                "resolution_code": None,
                "linked_feedback_id": None,  # for duplicate chains
                "resolved_at": None,

                # Audit trail (append-only events)
                "events": [
                    {
                        "ts": now_iso,
                        "actor": user_id,
                        "action": "created",
                        "details": {"feedback_type": feedback_type}
                    }
                ],

                "created_at": now_iso,
            }

            await self.db.feedback.insert_one(doc)

            return ToolResult(
                success=True,
                data={
                    "feedback_id": feedback_id,
                    "feedback_type": feedback_type,
                    "status": "new",
                    "pii_redacted": redacted_content != content
                },
                message=f"Feedback submitted ({feedback_type})"
            )

        except Exception as e:
            logger.error(f"Error submitting feedback: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Submit Survey ====================

    async def _submit_survey(
        self,
        user_id: str,
        game_id: str,
        group_id: str = None,
        rating: int = None,
        content: str = ""
    ) -> ToolResult:
        """Store a post-game survey with anti-spam checks."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        if not user_id or not game_id or rating is None:
            return ToolResult(success=False, error="user_id, game_id, and rating are required")

        if not (1 <= rating <= 5):
            return ToolResult(success=False, error="Rating must be between 1 and 5")

        try:
            now = datetime.now(timezone.utc)
            now_iso = now.isoformat()

            # Check for duplicate survey (same user + game)
            existing = await self.db.feedback_surveys.find_one({
                "user_id": user_id,
                "game_id": game_id
            })
            if existing:
                return ToolResult(
                    success=True,
                    data={"survey_id": existing.get("survey_id"), "duplicate": True},
                    message="Survey already submitted for this game"
                )

            # Anti-spam: check survey cooldown for this user
            settings = {}
            if group_id:
                settings = await self.db.engagement_settings.find_one(
                    {"group_id": group_id}, {"_id": 0}
                ) or {}

            cooldown_days = settings.get("survey_cooldown_days", 0)
            if cooldown_days > 0:
                cooldown_cutoff = (now - timedelta(days=cooldown_days)).isoformat()
                recent_survey = await self.db.feedback_surveys.find_one({
                    "user_id": user_id,
                    "created_at": {"$gte": cooldown_cutoff}
                })
                if recent_survey:
                    return ToolResult(
                        success=True,
                        data={"skipped": True, "reason": "cooldown"},
                        message=f"Survey skipped — user surveyed within {cooldown_days} days"
                    )

            survey_id = f"srv_{uuid.uuid4().hex[:12]}"
            redacted_comment = _redact_pii(content) if content else ""

            doc = {
                "survey_id": survey_id,
                "user_id": user_id,
                "game_id": game_id,
                "group_id": group_id,
                "rating": rating,
                "comment": redacted_comment,
                "created_at": now_iso,
            }

            await self.db.feedback_surveys.insert_one(doc)

            # If rating is low (1-2), auto-create a feedback entry for follow-up
            if rating <= 2:
                await self._submit_feedback(
                    user_id=user_id,
                    feedback_type="complaint",
                    content=redacted_comment or f"Low survey rating ({rating}/5) after game",
                    group_id=group_id,
                    game_id=game_id,
                    tags=["auto_from_survey", f"rating_{rating}"],
                    context={"source": "post_game_survey", "rating": rating},
                    context_refs={"game_id": game_id, "group_id": group_id}
                )

            return ToolResult(
                success=True,
                data={
                    "survey_id": survey_id,
                    "rating": rating,
                    "low_rating_flagged": rating <= 2
                },
                message=f"Survey submitted: {rating}/5 stars"
            )

        except Exception as e:
            logger.error(f"Error submitting survey: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Get Feedback ====================

    async def _get_feedback(
        self,
        user_id: str = None,
        group_id: str = None,
        feedback_type: str = None,
        days: int = 30
    ) -> ToolResult:
        """Retrieve feedback with filters."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            query = {"created_at": {"$gte": cutoff}}

            if user_id:
                query["user_id"] = user_id
            if group_id:
                query["group_id"] = group_id
            if feedback_type:
                query["feedback_type"] = feedback_type

            entries = await self.db.feedback.find(
                query, {"_id": 0}
            ).sort("created_at", -1).to_list(100)

            return ToolResult(
                success=True,
                data={
                    "feedback": entries,
                    "count": len(entries),
                    "period_days": days
                }
            )

        except Exception as e:
            logger.error(f"Error getting feedback: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Get Surveys ====================

    async def _get_surveys(
        self,
        game_id: str = None,
        group_id: str = None,
        days: int = 30
    ) -> ToolResult:
        """Retrieve survey responses with aggregates."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            query = {"created_at": {"$gte": cutoff}}

            if game_id:
                query["game_id"] = game_id
            if group_id:
                query["group_id"] = group_id

            surveys = await self.db.feedback_surveys.find(
                query, {"_id": 0}
            ).sort("created_at", -1).to_list(200)

            if surveys:
                ratings = [s["rating"] for s in surveys]
                avg_rating = sum(ratings) / len(ratings)
                distribution = {i: ratings.count(i) for i in range(1, 6)}
            else:
                avg_rating = 0
                distribution = {i: 0 for i in range(1, 6)}

            return ToolResult(
                success=True,
                data={
                    "surveys": surveys,
                    "count": len(surveys),
                    "avg_rating": round(avg_rating, 2),
                    "rating_distribution": distribution,
                    "period_days": days
                }
            )

        except Exception as e:
            logger.error(f"Error getting surveys: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Get Trends (with observability metrics) ====================

    async def _get_trends(
        self,
        group_id: str = None,
        days: int = 30
    ) -> ToolResult:
        """Get feedback trends with observability metrics."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            query = {"created_at": {"$gte": cutoff}}
            if group_id:
                query["group_id"] = group_id

            all_feedback = await self.db.feedback.find(
                query, {"_id": 0, "feedback_type": 1, "status": 1, "priority": 1,
                        "tags": 1, "auto_fix_attempted": 1, "auto_fix_result": 1,
                        "created_at": 1, "resolved_at": 1, "resolution_code": 1}
            ).to_list(500)

            type_counts = {}
            status_counts = {}
            priority_counts = {}
            tag_counts = {}
            auto_fix_attempted = 0
            auto_fix_succeeded = 0
            resolution_times = []
            resolution_code_counts = {}

            for fb in all_feedback:
                ft = fb.get("feedback_type", "other")
                type_counts[ft] = type_counts.get(ft, 0) + 1

                st = fb.get("status", "new")
                status_counts[st] = status_counts.get(st, 0) + 1

                pr = fb.get("priority")
                if pr:
                    priority_counts[pr] = priority_counts.get(pr, 0) + 1

                for tag in fb.get("tags", []):
                    tag_counts[tag] = tag_counts.get(tag, 0) + 1

                if fb.get("auto_fix_attempted"):
                    auto_fix_attempted += 1
                    fix_result = fb.get("auto_fix_result", {})
                    if fix_result and (fix_result.get("reconciled", 0) > 0 or
                                      fix_result.get("resent", 0) > 0 or
                                      not fix_result.get("issues_found")):
                        auto_fix_succeeded += 1

                rc = fb.get("resolution_code")
                if rc:
                    resolution_code_counts[rc] = resolution_code_counts.get(rc, 0) + 1

                if fb.get("resolved_at") and fb.get("created_at"):
                    try:
                        created = datetime.fromisoformat(fb["created_at"])
                        resolved = datetime.fromisoformat(fb["resolved_at"])
                        resolution_times.append((resolved - created).total_seconds() / 3600)
                    except (ValueError, TypeError):
                        pass

            # Survey metrics
            survey_query = {"created_at": {"$gte": cutoff}}
            if group_id:
                survey_query["group_id"] = group_id
            surveys = await self.db.feedback_surveys.find(
                survey_query, {"_id": 0, "rating": 1}
            ).to_list(500)
            avg_rating = 0
            if surveys:
                avg_rating = sum(s["rating"] for s in surveys) / len(surveys)

            # Auto-fix log metrics
            fix_log_query = {"created_at": {"$gte": cutoff}}
            fix_logs = await self.db.auto_fix_log.find(
                fix_log_query, {"_id": 0, "fix_type": 1, "tier": 1}
            ).to_list(200)
            fix_type_counts = {}
            for log in fix_logs:
                ft = log.get("fix_type", "unknown")
                fix_type_counts[ft] = fix_type_counts.get(ft, 0) + 1

            # Reopen detection: feedback resolved then new complaint within 48h
            reopen_count = 0
            resolved_entries = [
                fb for fb in all_feedback
                if fb.get("status") in ("resolved", "auto_fixed") and fb.get("resolved_at")
            ]
            for resolved in resolved_entries:
                try:
                    resolved_at = datetime.fromisoformat(resolved["resolved_at"])
                    reopen_window = (resolved_at + timedelta(hours=48)).isoformat()
                    reopened = await self.db.feedback.find_one({
                        "user_id": resolved.get("user_id"),
                        "group_id": resolved.get("group_id"),
                        "created_at": {"$gte": resolved["resolved_at"], "$lte": reopen_window},
                        "feedback_type": {"$in": ["bug", "complaint", "settlement_issue", "payment_issue"]}
                    })
                    if reopened:
                        reopen_count += 1
                except (ValueError, TypeError):
                    pass

            top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]

            # Compute averages
            avg_resolution_hours = (
                round(sum(resolution_times) / len(resolution_times), 1)
                if resolution_times else None
            )
            auto_fix_rate = (
                round(auto_fix_attempted / len(all_feedback) * 100, 1)
                if all_feedback else 0
            )
            auto_fix_success_rate = (
                round(auto_fix_succeeded / auto_fix_attempted * 100, 1)
                if auto_fix_attempted else 0
            )
            reopen_rate = (
                round(reopen_count / len(resolved_entries) * 100, 1)
                if resolved_entries else 0
            )

            return ToolResult(
                success=True,
                data={
                    "period_days": days,
                    "total_feedback": len(all_feedback),
                    "total_surveys": len(surveys),
                    "avg_survey_rating": round(avg_rating, 2),
                    "by_type": type_counts,
                    "by_status": status_counts,
                    "by_priority": priority_counts,
                    "by_resolution_code": resolution_code_counts,
                    "top_tags": top_tags,
                    # Observability metrics
                    "metrics": {
                        "auto_fix_attempt_rate": auto_fix_rate,
                        "auto_fix_success_rate": auto_fix_success_rate,
                        "avg_resolution_hours": avg_resolution_hours,
                        "reopen_rate": reopen_rate,
                        "reopen_count": reopen_count,
                        "fix_attempts_by_type": fix_type_counts,
                    }
                }
            )

        except Exception as e:
            logger.error(f"Error getting feedback trends: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Mark Resolved ====================

    async def _mark_resolved(
        self,
        feedback_id: str,
        resolution_code: str = "manual_fix",
        actor_id: str = None
    ) -> ToolResult:
        """Mark a feedback entry as resolved with resolution code."""
        if not self.db or not feedback_id:
            return ToolResult(success=False, error="Database or feedback_id not available")

        if resolution_code and resolution_code not in VALID_RESOLUTION_CODES:
            return ToolResult(success=False, error=f"Invalid resolution_code: {resolution_code}")

        try:
            now = datetime.now(timezone.utc).isoformat()
            event = {
                "ts": now,
                "actor": actor_id or "system",
                "action": "resolved",
                "details": {"resolution_code": resolution_code}
            }

            result = await self.db.feedback.update_one(
                {"feedback_id": feedback_id},
                {
                    "$set": {
                        "status": "resolved",
                        "resolved_at": now,
                        "resolution_code": resolution_code
                    },
                    "$push": {"events": event}
                }
            )

            if result.modified_count == 0:
                return ToolResult(success=False, error="Feedback not found")

            return ToolResult(
                success=True,
                data={"feedback_id": feedback_id, "status": "resolved",
                      "resolution_code": resolution_code},
                message="Feedback marked as resolved"
            )

        except Exception as e:
            logger.error(f"Error marking feedback resolved: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Update Status ====================

    async def _update_status(
        self,
        feedback_id: str,
        status: str = None,
        actor_id: str = None,
        owner_type: str = None,
        owner_id: str = None,
        linked_feedback_id: str = None
    ) -> ToolResult:
        """Update feedback status, ownership, or link duplicates."""
        if not self.db or not feedback_id:
            return ToolResult(success=False, error="Database or feedback_id not available")

        try:
            now = datetime.now(timezone.utc).isoformat()
            updates = {}
            event_details = {}

            if status:
                if status not in VALID_STATUSES:
                    return ToolResult(success=False, error=f"Invalid status: {status}")
                updates["status"] = status
                event_details["new_status"] = status

            if owner_type:
                updates["owner_type"] = owner_type
                event_details["owner_type"] = owner_type
            if owner_id:
                updates["owner_id"] = owner_id
                event_details["owner_id"] = owner_id

            if linked_feedback_id:
                updates["linked_feedback_id"] = linked_feedback_id
                updates["status"] = "duplicate"
                event_details["linked_to"] = linked_feedback_id

            if not updates:
                return ToolResult(success=False, error="No updates provided")

            event = {
                "ts": now,
                "actor": actor_id or "system",
                "action": "status_updated",
                "details": event_details
            }

            result = await self.db.feedback.update_one(
                {"feedback_id": feedback_id},
                {
                    "$set": updates,
                    "$push": {"events": event}
                }
            )

            if result.modified_count == 0:
                return ToolResult(success=False, error="Feedback not found")

            return ToolResult(
                success=True,
                data={"feedback_id": feedback_id, **updates},
                message=f"Feedback updated: {', '.join(f'{k}={v}' for k, v in updates.items())}"
            )

        except Exception as e:
            logger.error(f"Error updating feedback: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Add Event ====================

    async def _add_event(
        self,
        feedback_id: str,
        event_type: str = "note",
        actor_id: str = None,
        details: Dict = None
    ) -> ToolResult:
        """Append an event to a feedback entry's audit trail."""
        if not self.db or not feedback_id:
            return ToolResult(success=False, error="Database or feedback_id not available")

        try:
            event = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "actor": actor_id or "system",
                "action": event_type,
                "details": details or {}
            }

            result = await self.db.feedback.update_one(
                {"feedback_id": feedback_id},
                {"$push": {"events": event}}
            )

            if result.modified_count == 0:
                return ToolResult(success=False, error="Feedback not found")

            return ToolResult(
                success=True,
                data={"feedback_id": feedback_id, "event": event},
                message=f"Event '{event_type}' added to feedback"
            )

        except Exception as e:
            logger.error(f"Error adding event: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Get Unresolved ====================

    async def _get_unresolved(
        self,
        group_id: str = None,
        feedback_type: str = None
    ) -> ToolResult:
        """Get all unresolved feedback entries."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            terminal_statuses = ["resolved", "wont_fix", "duplicate"]
            query = {"status": {"$nin": terminal_statuses}}
            if group_id:
                query["group_id"] = group_id
            if feedback_type:
                query["feedback_type"] = feedback_type

            entries = await self.db.feedback.find(
                query, {"_id": 0}
            ).sort("created_at", -1).to_list(100)

            # Check for SLA breaches
            now = datetime.now(timezone.utc)
            sla_breached = 0
            for entry in entries:
                sla_due = entry.get("sla_due_at")
                if sla_due:
                    try:
                        due = datetime.fromisoformat(sla_due)
                        if now > due:
                            sla_breached += 1
                    except (ValueError, TypeError):
                        pass

            return ToolResult(
                success=True,
                data={
                    "unresolved": entries,
                    "count": len(entries),
                    "sla_breached": sla_breached
                }
            )

        except Exception as e:
            logger.error(f"Error getting unresolved feedback: {e}")
            return ToolResult(success=False, error=str(e))
