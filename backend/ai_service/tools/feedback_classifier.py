"""
Feedback Classifier Tool

Uses Claude (Haiku for speed/cost) to classify user feedback into actionable
categories and assign priority. Falls back to keyword matching when Claude
is unavailable.

Classification outputs:
- category: bug, feature_request, ux_issue, complaint, praise, settlement_issue,
            notification_issue, payment_issue, access_issue, other
- severity: critical, high, medium, low
- auto_fixable: bool — whether a known auto-fix pattern matches
- auto_fix_type: settlement_recheck, resend_notification, reconcile_payment,
                 fix_permissions, None
- sentiment: positive, neutral, negative
- tags: list of extracted tags
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone
import json
import re
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)

# Known auto-fixable patterns (keyword → fix type mapping)
AUTO_FIX_PATTERNS = {
    "settlement_recheck": [
        "settlement wrong", "settlement incorrect", "settlement error",
        "wrong amount", "settle wrong", "bad settlement", "incorrect settlement",
        "settlement didn't work", "chips don't add up", "chip count wrong",
        "cash out wrong", "cashout wrong"
    ],
    "resend_notification": [
        "didn't get notification", "no notification", "missing notification",
        "notification not received", "didn't receive", "never got notified",
        "alert didn't come", "push notification missing"
    ],
    "reconcile_payment": [
        "payment not tracked", "payment missing", "payment not showing",
        "paid but not showing", "already paid", "payment not recorded",
        "stripe not working", "payment issue", "didn't record my payment"
    ],
    "fix_permissions": [
        "can't join", "cannot join", "unable to join", "won't let me join",
        "access denied", "no access", "can't see the game", "not in group",
        "can't find the group", "permission denied"
    ]
}


class FeedbackClassifierTool(BaseTool):
    """
    Classifies feedback using Claude (Haiku) with keyword fallback.

    Features:
    - AI-powered classification with Claude Haiku
    - Keyword fallback when Claude is unavailable
    - Auto-fix pattern detection
    - Severity assessment
    - Sentiment analysis
    - Tag extraction
    """

    def __init__(self, db=None, llm_client=None):
        self.db = db
        self.llm_client = llm_client

    @property
    def name(self) -> str:
        return "feedback_classifier"

    @property
    def description(self) -> str:
        return (
            "Classify user feedback into categories, assign priority, detect "
            "auto-fixable patterns, and extract tags using AI or keyword fallback"
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform",
                    "enum": ["classify", "batch_classify"]
                },
                "content": {
                    "type": "string",
                    "description": "Feedback text to classify"
                },
                "feedback_type": {
                    "type": "string",
                    "description": "User-provided type (optional, used as hint)"
                },
                "context": {
                    "type": "object",
                    "description": "Additional context (game_id, error details, etc.)"
                },
                "feedback_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of feedback IDs for batch classification"
                }
            },
            "required": ["action"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute classifier action."""
        action = kwargs.get("action")

        if action == "classify":
            return await self._classify(
                content=kwargs.get("content", ""),
                feedback_type=kwargs.get("feedback_type"),
                context=kwargs.get("context", {})
            )
        elif action == "batch_classify":
            return await self._batch_classify(
                feedback_ids=kwargs.get("feedback_ids", [])
            )
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    async def _classify(
        self,
        content: str,
        feedback_type: str = None,
        context: Dict = None
    ) -> ToolResult:
        """
        Classify a single piece of feedback.
        Tries Claude Haiku first, falls back to keywords.
        """
        if not content:
            return ToolResult(success=False, error="Content is required")

        context = context or {}

        # Step 1: Check for auto-fixable patterns (fast, always runs)
        auto_fix = self._detect_auto_fix(content)

        # Step 2: Try Claude classification
        classification = None
        if self.llm_client and self.llm_client.is_available:
            classification = await self._classify_with_claude(content, feedback_type, context)

        # Step 3: Fall back to keyword classification
        if not classification:
            classification = self._classify_with_keywords(content, feedback_type)

        # Merge auto-fix detection
        if auto_fix:
            classification["auto_fixable"] = True
            classification["auto_fix_type"] = auto_fix
        else:
            classification.setdefault("auto_fixable", False)
            classification.setdefault("auto_fix_type", None)

        return ToolResult(
            success=True,
            data=classification
        )

    async def _classify_with_claude(
        self,
        content: str,
        feedback_type: str = None,
        context: Dict = None
    ) -> Optional[Dict]:
        """Use Claude Haiku for fast, cheap classification."""
        try:
            system_prompt = """You are a feedback classifier for ODDSIDE, a poker game app.

Classify the user feedback and return ONLY valid JSON (no markdown, no explanation):

{
  "category": "<one of: bug, feature_request, ux_issue, complaint, praise, settlement_issue, notification_issue, payment_issue, access_issue, other>",
  "severity": "<one of: critical, high, medium, low>",
  "sentiment": "<one of: positive, neutral, negative>",
  "tags": ["<relevant tag 1>", "<relevant tag 2>"],
  "summary": "<1-sentence summary of the issue>"
}

Severity guide:
- critical: Data loss, money errors, security issues
- high: Broken features, settlement/payment problems
- medium: UX issues, missing features, confusing flows
- low: Minor complaints, cosmetic issues, nice-to-haves"""

            user_msg = f"Feedback: {content}"
            if feedback_type:
                user_msg += f"\nUser-provided type: {feedback_type}"
            if context:
                ctx_str = json.dumps({k: v for k, v in context.items() if v}, default=str)
                user_msg += f"\nContext: {ctx_str}"

            # Use Haiku for fast/cheap classification
            response = await self.llm_client.async_client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=300,
                system=system_prompt,
                messages=[{"role": "user", "content": user_msg}]
            )

            text = response.content[0].text.strip()

            # Parse JSON from response
            try:
                result = json.loads(text)
            except json.JSONDecodeError:
                # Try extracting JSON from response
                match = re.search(r'\{.*\}', text, re.DOTALL)
                if match:
                    result = json.loads(match.group())
                else:
                    return None

            # Validate required fields
            valid_categories = [
                "bug", "feature_request", "ux_issue", "complaint", "praise",
                "settlement_issue", "notification_issue", "payment_issue",
                "access_issue", "other"
            ]
            if result.get("category") not in valid_categories:
                result["category"] = "other"

            valid_severities = ["critical", "high", "medium", "low"]
            if result.get("severity") not in valid_severities:
                result["severity"] = "medium"

            result["classification_method"] = "claude_haiku"
            return result

        except Exception as e:
            logger.error(f"Claude classification error: {e}")
            return None

    def _classify_with_keywords(
        self,
        content: str,
        feedback_type: str = None
    ) -> Dict:
        """Keyword-based fallback classification."""
        content_lower = content.lower()

        # Category detection
        category = "other"
        if feedback_type:
            category = feedback_type

        if any(kw in content_lower for kw in [
            "bug", "error", "crash", "broken", "doesn't work", "not working", "failed"
        ]):
            category = "bug"
        elif any(kw in content_lower for kw in [
            "settlement", "settle", "chips", "cash out", "cashout"
        ]):
            category = "settlement_issue"
        elif any(kw in content_lower for kw in [
            "notification", "alert", "notify", "push"
        ]):
            category = "notification_issue"
        elif any(kw in content_lower for kw in [
            "payment", "pay", "venmo", "zelle", "stripe", "paid"
        ]):
            category = "payment_issue"
        elif any(kw in content_lower for kw in [
            "join", "access", "permission", "invite", "can't see"
        ]):
            category = "access_issue"
        elif any(kw in content_lower for kw in [
            "feature", "add", "wish", "would be nice", "suggestion", "request"
        ]):
            category = "feature_request"
        elif any(kw in content_lower for kw in [
            "confus", "hard to", "difficult", "unclear", "ux", "interface"
        ]):
            category = "ux_issue"
        elif any(kw in content_lower for kw in [
            "love", "great", "awesome", "amazing", "thank"
        ]):
            category = "praise"
        elif any(kw in content_lower for kw in [
            "hate", "terrible", "worst", "awful", "annoying", "frustrat"
        ]):
            category = "complaint"

        # Severity detection
        severity = "medium"
        if any(kw in content_lower for kw in [
            "money", "lost", "wrong amount", "security", "data", "crash"
        ]):
            severity = "critical"
        elif any(kw in content_lower for kw in [
            "broken", "doesn't work", "can't", "error", "failed", "settlement"
        ]):
            severity = "high"
        elif any(kw in content_lower for kw in [
            "minor", "small", "cosmetic", "typo", "nice to have"
        ]):
            severity = "low"

        # Sentiment detection
        sentiment = "neutral"
        if any(kw in content_lower for kw in [
            "love", "great", "awesome", "amazing", "thank", "excellent", "perfect"
        ]):
            sentiment = "positive"
        elif any(kw in content_lower for kw in [
            "hate", "terrible", "worst", "awful", "frustrat", "annoying",
            "angry", "disappointed", "broken"
        ]):
            sentiment = "negative"

        # Tag extraction
        tags = []
        if "settlement" in content_lower:
            tags.append("settlement")
        if "payment" in content_lower or "pay" in content_lower:
            tags.append("payment")
        if "notification" in content_lower:
            tags.append("notification")
        if "mobile" in content_lower or "app" in content_lower:
            tags.append("mobile")
        if "web" in content_lower or "browser" in content_lower:
            tags.append("web")

        return {
            "category": category,
            "severity": severity,
            "sentiment": sentiment,
            "tags": tags,
            "summary": content[:100] + ("..." if len(content) > 100 else ""),
            "classification_method": "keyword_fallback"
        }

    def _detect_auto_fix(self, content: str) -> Optional[str]:
        """Detect if the feedback matches a known auto-fixable pattern."""
        content_lower = content.lower()

        for fix_type, patterns in AUTO_FIX_PATTERNS.items():
            for pattern in patterns:
                if pattern in content_lower:
                    return fix_type

        return None

    async def _batch_classify(self, feedback_ids: List[str]) -> ToolResult:
        """Classify multiple feedback entries from the database."""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        if not feedback_ids:
            return ToolResult(success=False, error="No feedback IDs provided")

        try:
            classified = 0
            failed = 0

            for fid in feedback_ids:
                entry = await self.db.feedback.find_one(
                    {"feedback_id": fid},
                    {"_id": 0}
                )
                if not entry:
                    failed += 1
                    continue

                result = await self._classify(
                    content=entry.get("content", ""),
                    feedback_type=entry.get("feedback_type"),
                    context=entry.get("context", {})
                )

                if result.success:
                    classification = result.data
                    await self.db.feedback.update_one(
                        {"feedback_id": fid},
                        {"$set": {
                            "classification": classification,
                            "priority": classification.get("severity"),
                            "status": "classified",
                            "classified_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    classified += 1
                else:
                    failed += 1

            return ToolResult(
                success=True,
                data={
                    "classified": classified,
                    "failed": failed,
                    "total": len(feedback_ids)
                },
                message=f"Classified {classified}/{len(feedback_ids)} feedback entries"
            )

        except Exception as e:
            logger.error(f"Error in batch classification: {e}")
            return ToolResult(success=False, error=str(e))
