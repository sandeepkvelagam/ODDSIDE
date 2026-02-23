"""
Feedback Collector Tool

Stores, retrieves, and manages user feedback submissions.
Supports multiple feedback types: post-game surveys, bug reports,
feature requests, and general feedback.

Collections used:
- feedback: Individual feedback submissions
- feedback_surveys: Post-game survey results (star rating + comment)
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import uuid
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class FeedbackCollectorTool(BaseTool):
    """
    Tool for collecting and managing user feedback.

    Features:
    - Submit feedback (bug, feature_request, ux_issue, complaint, praise)
    - Submit post-game survey (1-5 stars + optional comment)
    - Retrieve feedback by user, group, type, or time range
    - Get feedback trends and aggregates
    - Mark feedback as resolved / actioned
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
            "bug reports, feature requests, and general feedback"
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
                        "get_unresolved"
                    ]
                },
                "user_id": {
                    "type": "string",
                    "description": "User submitting or queried"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group related to feedback"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game related to feedback"
                },
                "feedback_type": {
                    "type": "string",
                    "description": "Type of feedback",
                    "enum": ["bug", "feature_request", "ux_issue", "complaint", "praise", "other"]
                },
                "content": {
                    "type": "string",
                    "description": "Feedback text content"
                },
                "rating": {
                    "type": "integer",
                    "description": "Star rating 1-5 for surveys"
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Tags for categorization"
                },
                "feedback_id": {
                    "type": "string",
                    "description": "Feedback ID for updates"
                },
                "days": {
                    "type": "integer",
                    "description": "Number of days to look back (default 30)"
                },
                "context": {
                    "type": "object",
                    "description": "Additional context (screen, error details, etc.)"
                }
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
                context=kwargs.get("context", {})
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
                feedback_id=kwargs.get("feedback_id")
            )
        elif action == "get_unresolved":
            return await self._get_unresolved(
                group_id=kwargs.get("group_id"),
                feedback_type=kwargs.get("feedback_type")
            )
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    async def _submit_feedback(
        self,
        user_id: str,
        feedback_type: str,
        content: str,
        group_id: str = None,
        game_id: str = None,
        tags: List[str] = None,
        context: Dict = None
    ) -> ToolResult:
        """Store a feedback submission."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        if not user_id or not content:
            return ToolResult(success=False, error="user_id and content are required")

        try:
            now = datetime.now(timezone.utc).isoformat()
            feedback_id = f"fb_{uuid.uuid4().hex[:12]}"

            doc = {
                "feedback_id": feedback_id,
                "user_id": user_id,
                "feedback_type": feedback_type,
                "content": content,
                "group_id": group_id,
                "game_id": game_id,
                "tags": tags or [],
                "context": context or {},
                "status": "new",  # new, classified, auto_fixed, actioned, resolved
                "classification": None,  # filled by classifier
                "priority": None,  # filled by classifier
                "auto_fix_attempted": False,
                "auto_fix_result": None,
                "resolved_at": None,
                "created_at": now,
            }

            await self.db.feedback.insert_one(doc)

            return ToolResult(
                success=True,
                data={
                    "feedback_id": feedback_id,
                    "feedback_type": feedback_type,
                    "status": "new"
                },
                message=f"Feedback submitted ({feedback_type})"
            )

        except Exception as e:
            logger.error(f"Error submitting feedback: {e}")
            return ToolResult(success=False, error=str(e))

    async def _submit_survey(
        self,
        user_id: str,
        game_id: str,
        group_id: str = None,
        rating: int = None,
        content: str = ""
    ) -> ToolResult:
        """Store a post-game survey response."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        if not user_id or not game_id or rating is None:
            return ToolResult(success=False, error="user_id, game_id, and rating are required")

        if not (1 <= rating <= 5):
            return ToolResult(success=False, error="Rating must be between 1 and 5")

        try:
            now = datetime.now(timezone.utc).isoformat()
            survey_id = f"srv_{uuid.uuid4().hex[:12]}"

            # Check for duplicate survey
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

            doc = {
                "survey_id": survey_id,
                "user_id": user_id,
                "game_id": game_id,
                "group_id": group_id,
                "rating": rating,
                "comment": content,
                "created_at": now,
            }

            await self.db.feedback_surveys.insert_one(doc)

            # If rating is low (1-2), auto-create a feedback entry for follow-up
            if rating <= 2:
                await self._submit_feedback(
                    user_id=user_id,
                    feedback_type="complaint",
                    content=content or f"Low survey rating ({rating}/5) after game",
                    group_id=group_id,
                    game_id=game_id,
                    tags=["auto_from_survey", f"rating_{rating}"],
                    context={"source": "post_game_survey", "rating": rating}
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

            # Calculate aggregates
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

    async def _get_trends(
        self,
        group_id: str = None,
        days: int = 30
    ) -> ToolResult:
        """Get feedback trends and aggregates over a period."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            query = {"created_at": {"$gte": cutoff}}
            if group_id:
                query["group_id"] = group_id

            # Feedback type breakdown
            all_feedback = await self.db.feedback.find(
                query, {"_id": 0, "feedback_type": 1, "status": 1, "priority": 1, "tags": 1}
            ).to_list(500)

            type_counts = {}
            status_counts = {}
            priority_counts = {}
            tag_counts = {}

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

            # Survey trend
            survey_query = {"created_at": {"$gte": cutoff}}
            if group_id:
                survey_query["group_id"] = group_id

            surveys = await self.db.feedback_surveys.find(
                survey_query, {"_id": 0, "rating": 1}
            ).to_list(500)

            avg_rating = 0
            if surveys:
                avg_rating = sum(s["rating"] for s in surveys) / len(surveys)

            # Top issues (most common tags)
            top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]

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
                    "top_tags": top_tags,
                }
            )

        except Exception as e:
            logger.error(f"Error getting feedback trends: {e}")
            return ToolResult(success=False, error=str(e))

    async def _mark_resolved(self, feedback_id: str) -> ToolResult:
        """Mark a feedback entry as resolved."""
        if not self.db or not feedback_id:
            return ToolResult(success=False, error="Database or feedback_id not available")

        try:
            now = datetime.now(timezone.utc).isoformat()
            result = await self.db.feedback.update_one(
                {"feedback_id": feedback_id},
                {"$set": {"status": "resolved", "resolved_at": now}}
            )

            if result.modified_count == 0:
                return ToolResult(success=False, error="Feedback not found")

            return ToolResult(
                success=True,
                data={"feedback_id": feedback_id, "status": "resolved"},
                message="Feedback marked as resolved"
            )

        except Exception as e:
            logger.error(f"Error marking feedback resolved: {e}")
            return ToolResult(success=False, error=str(e))

    async def _get_unresolved(
        self,
        group_id: str = None,
        feedback_type: str = None
    ) -> ToolResult:
        """Get all unresolved feedback entries."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            query = {"status": {"$nin": ["resolved"]}}
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
                    "unresolved": entries,
                    "count": len(entries)
                }
            )

        except Exception as e:
            logger.error(f"Error getting unresolved feedback: {e}")
            return ToolResult(success=False, error=str(e))
