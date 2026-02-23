"""
Feedback Classifier Tool (v2)

Uses Claude (Haiku for speed/cost) to classify user feedback into actionable
categories and assign priority. Falls back to keyword matching when Claude
is unavailable.

v2 upgrades:
- confidence score (0.0-1.0) on every classification
- evidence_keywords: which words/phrases triggered the classification
- rules-based severity minimums (AI picks category; rules enforce floor)
- model metadata: model, prompt_version for audit/regression tracking
- content_hash for duplicate detection
- summary field always populated
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone
import json
import re
import hashlib
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)

# Current prompt version — bump when changing the system prompt
PROMPT_VERSION = "v2.0"

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

# Rules-based severity minimums by category.
# AI can raise severity above this, but never lower it.
SEVERITY_MINIMUMS = {
    "settlement_issue": "high",
    "payment_issue": "high",
    "access_issue": "medium",
    "bug": "medium",
    "notification_issue": "medium",
    "ux_issue": "low",
    "feature_request": "low",
    "complaint": "low",
    "praise": "low",
    "other": "low",
}

# Keyword rules that force minimum severity (overrides AI)
SEVERITY_KEYWORD_OVERRIDES = {
    "critical": [
        "lost money", "charged twice", "double charged", "money gone",
        "security", "hack", "unauthorized", "data leak", "crash on startup",
        "can't login", "locked out"
    ],
    "high": [
        "wrong amount", "settlement wrong", "payment missing", "can't access",
        "broken", "doesn't work", "error", "failed", "can't cash out"
    ],
}

SEVERITY_ORDER = {"critical": 4, "high": 3, "medium": 2, "low": 1}


def _max_severity(a: str, b: str) -> str:
    """Return the higher severity."""
    return a if SEVERITY_ORDER.get(a, 0) >= SEVERITY_ORDER.get(b, 0) else b


class FeedbackClassifierTool(BaseTool):
    """
    Classifies feedback using Claude (Haiku) with keyword fallback.

    v2 features:
    - confidence score on every classification
    - evidence_keywords showing what matched
    - rules-based severity minimums (category→floor, keyword overrides)
    - model + prompt_version metadata for audit
    - content_hash for duplicate detection
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
            "Classify user feedback into categories, assign priority with rules-based "
            "severity floors, detect auto-fixable patterns, extract tags, and provide "
            "confidence scores using AI or keyword fallback"
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
        Then applies rules-based severity minimums.
        """
        if not content:
            return ToolResult(success=False, error="Content is required")

        context = context or {}

        # Generate content hash for duplicate detection
        content_hash = hashlib.sha256(content.strip().lower().encode()).hexdigest()[:16]

        # Step 1: Check for auto-fixable patterns (fast, always runs)
        auto_fix = self._detect_auto_fix(content)

        # Step 2: Try Claude classification
        classification = None
        if self.llm_client and self.llm_client.is_available:
            classification = await self._classify_with_claude(content, feedback_type, context)

        # Step 3: Fall back to keyword classification
        if not classification:
            classification = self._classify_with_keywords(content, feedback_type)

        # Step 4: Apply rules-based severity minimums
        classification = self._apply_severity_rules(classification, content)

        # Step 5: Merge auto-fix detection
        if auto_fix:
            classification["auto_fixable"] = True
            classification["auto_fix_type"] = auto_fix
        else:
            classification.setdefault("auto_fixable", False)
            classification.setdefault("auto_fix_type", None)

        # Step 6: Add metadata
        classification["content_hash"] = content_hash
        classification["prompt_version"] = PROMPT_VERSION
        classification["classified_at"] = datetime.now(timezone.utc).isoformat()

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
  "confidence": <0.0 to 1.0 — how confident are you in this classification>,
  "sentiment": "<one of: positive, neutral, negative>",
  "tags": ["<relevant tag 1>", "<relevant tag 2>"],
  "evidence_keywords": ["<word or phrase from the text that led to this classification>"],
  "summary": "<1-sentence summary of the issue>",
  "reasoning": "<1-sentence explanation of why you chose this category and severity>"
}

Severity guide:
- critical: Data loss, money errors, security issues, can't login
- high: Broken features, settlement/payment problems, access denied
- medium: UX issues, missing features, confusing flows
- low: Minor complaints, cosmetic issues, nice-to-haves

Confidence guide:
- 0.9-1.0: Very clear, unambiguous feedback
- 0.7-0.9: Likely correct, some ambiguity
- 0.5-0.7: Best guess, could be multiple categories
- Below 0.5: Unclear, may need human review"""

            user_msg = f"Feedback: {content}"
            if feedback_type:
                user_msg += f"\nUser-provided type: {feedback_type}"
            if context:
                ctx_str = json.dumps({k: v for k, v in context.items() if v}, default=str)
                user_msg += f"\nContext: {ctx_str}"

            model = "claude-haiku-4-5-20251001"
            response = await self.llm_client.async_client.messages.create(
                model=model,
                max_tokens=400,
                system=system_prompt,
                messages=[{"role": "user", "content": user_msg}]
            )

            text = response.content[0].text.strip()

            # Parse JSON from response
            try:
                result = json.loads(text)
            except json.JSONDecodeError:
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

            # Ensure confidence is a valid float
            try:
                result["confidence"] = max(0.0, min(1.0, float(result.get("confidence", 0.8))))
            except (ValueError, TypeError):
                result["confidence"] = 0.8

            # Ensure lists
            result.setdefault("evidence_keywords", [])
            result.setdefault("tags", [])
            result.setdefault("reasoning", "")
            result.setdefault("summary", content[:100])

            result["classification_method"] = "claude_haiku"
            result["model"] = model
            return result

        except Exception as e:
            logger.error(f"Claude classification error: {e}")
            return None

    def _classify_with_keywords(
        self,
        content: str,
        feedback_type: str = None
    ) -> Dict:
        """Keyword-based fallback classification with confidence and evidence."""
        content_lower = content.lower()
        evidence = []

        # Category detection
        category = "other"
        confidence = 0.4  # base confidence for keyword matching

        if feedback_type:
            category = feedback_type
            confidence = 0.5

        category_rules = [
            (["bug", "error", "crash", "broken", "doesn't work", "not working", "failed"], "bug"),
            (["settlement", "settle", "chips", "cash out", "cashout"], "settlement_issue"),
            (["notification", "alert", "notify", "push notification"], "notification_issue"),
            (["payment", "venmo", "zelle", "stripe", "paid but"], "payment_issue"),
            (["can't join", "access denied", "permission", "can't see"], "access_issue"),
            (["feature", "wish", "would be nice", "suggestion", "request"], "feature_request"),
            (["confus", "hard to", "difficult", "unclear", "interface"], "ux_issue"),
            (["love", "great", "awesome", "amazing", "thank"], "praise"),
            (["hate", "terrible", "worst", "awful", "annoying", "frustrat"], "complaint"),
        ]

        for keywords, cat in category_rules:
            for kw in keywords:
                if kw in content_lower:
                    category = cat
                    evidence.append(kw)
                    confidence = min(0.7, confidence + 0.1)
                    break

        # Severity detection
        severity = "medium"
        if any(kw in content_lower for kw in [
            "money", "lost", "wrong amount", "security", "data", "crash"
        ]):
            severity = "critical"
            evidence.extend([kw for kw in ["money", "lost", "wrong amount", "security", "crash"]
                           if kw in content_lower])
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
        tag_keywords = {
            "settlement": ["settlement", "settle"],
            "payment": ["payment", "paid", "venmo", "zelle", "stripe"],
            "notification": ["notification", "alert"],
            "mobile": ["mobile", "app", "phone", "ios", "android"],
            "web": ["web", "browser", "desktop"],
            "game": ["game", "poker", "hand"],
        }
        for tag, kws in tag_keywords.items():
            if any(kw in content_lower for kw in kws):
                tags.append(tag)

        return {
            "category": category,
            "severity": severity,
            "confidence": round(confidence, 2),
            "sentiment": sentiment,
            "tags": tags,
            "evidence_keywords": list(set(evidence)),
            "summary": content[:100] + ("..." if len(content) > 100 else ""),
            "reasoning": f"Keyword match: found {', '.join(evidence[:3]) if evidence else 'no strong keywords'}",
            "classification_method": "keyword_fallback",
            "model": None,
        }

    def _apply_severity_rules(self, classification: Dict, content: str) -> Dict:
        """
        Apply rules-based severity minimums.
        AI picks category; rules enforce a floor severity.
        """
        content_lower = content.lower()
        category = classification.get("category", "other")
        ai_severity = classification.get("severity", "medium")

        # Rule 1: Category-based minimum severity
        category_min = SEVERITY_MINIMUMS.get(category, "low")
        effective_severity = _max_severity(ai_severity, category_min)

        # Rule 2: Keyword overrides (critical keywords force critical, etc.)
        for sev, keywords in SEVERITY_KEYWORD_OVERRIDES.items():
            for kw in keywords:
                if kw in content_lower:
                    effective_severity = _max_severity(effective_severity, sev)
                    if sev != ai_severity:
                        classification.setdefault("severity_overrides", []).append({
                            "rule": f"keyword_override_{sev}",
                            "keyword": kw,
                            "original": ai_severity,
                            "applied": effective_severity
                        })
                    break

        # Track if rules changed severity
        if effective_severity != ai_severity:
            classification["severity_original"] = ai_severity
            classification["severity_rule_applied"] = True

        classification["severity"] = effective_severity
        return classification

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
