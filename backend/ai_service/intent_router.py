"""
Intent Router — Local intent classification for the Kvitt AI Assistant.

No LLM call. Uses keyword pattern matching with weighted scoring to
classify user messages into intents with confidence levels.

Tier 0 intents (requires_llm=False) are answered from DB + templates.
Tier 2 intents (requires_llm=True) are routed to the orchestrator/Claude.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
import re


@dataclass
class IntentResult:
    intent: str
    confidence: float
    requires_llm: bool
    required_data: List[str] = field(default_factory=list)
    params: Dict = field(default_factory=dict)


# Each intent definition: keywords (with weights), whether LLM is needed, and required data
INTENT_DEFINITIONS = {
    # --- Tier 0: No LLM needed ---
    "GROUPS_COUNT": {
        "patterns": [
            (r"\bhow many groups\b", 0.95),
            (r"\bnumber of groups\b", 0.90),
            (r"\bgroups? (count|total)\b", 0.85),
            (r"\bam i (in|part of)\b.*\bgroup", 0.85),
            (r"\bhow many.+groups?\b", 0.80),
        ],
        "requires_llm": False,
        "required_data": ["groups"],
    },
    "GROUPS_LIST": {
        "patterns": [
            (r"\b(show|list|see|what are|tell me) my groups\b", 0.90),
            (r"\bmy groups\b", 0.80),
            (r"\bwhat groups\b", 0.80),
            (r"\bwhich groups\b", 0.80),
            (r"\bgroups i('m| am) (in|part of)\b", 0.85),
        ],
        "requires_llm": False,
        "required_data": ["groups"],
    },
    "ACTIVE_GAMES": {
        "patterns": [
            (r"\b(any |are there )?active games?\b", 0.90),
            (r"\bcurrent games?\b", 0.85),
            (r"\bgames? (going on|running|in progress|happening)\b", 0.85),
            (r"\bongoing games?\b", 0.85),
            (r"\blive games?\b", 0.80),
        ],
        "requires_llm": False,
        "required_data": ["games"],
    },
    "UPCOMING_GAMES": {
        "patterns": [
            (r"\b(any |are there )?upcoming games?\b", 0.90),
            (r"\bgames? (this|next) (week|weekend)\b", 0.90),
            (r"\bgames? (planned|scheduled)\b", 0.90),
            (r"\bwhen('s| is) (the )?next game\b", 0.90),
            (r"\bnext game\b", 0.80),
            (r"\bgames? (today|tonight|tomorrow)\b", 0.90),
            (r"\bany games? coming up\b", 0.85),
        ],
        "requires_llm": False,
        "required_data": ["games"],
    },
    "RECENT_GAMES": {
        "patterns": [
            (r"\b(recent|last|latest|past) games?\b", 0.90),
            (r"\bgame history\b", 0.85),
            (r"\bprevious games?\b", 0.85),
            (r"\bgames? (i )?played\b", 0.80),
        ],
        "requires_llm": False,
        "required_data": ["games"],
    },
    "WHO_OWES_ME": {
        "patterns": [
            (r"\bwho owes me\b", 0.95),
            (r"\bowed to me\b", 0.90),
            (r"\bpending payments? to me\b", 0.90),
            (r"\bmoney (owed|due) to me\b", 0.90),
            (r"\banyone owe me\b", 0.85),
            (r"\bwhat('s| is) owed to me\b", 0.90),
        ],
        "requires_llm": False,
        "required_data": ["ledger"],
    },
    "WHAT_I_OWE": {
        "patterns": [
            (r"\bwhat do i owe\b", 0.95),
            (r"\bhow much do i owe\b", 0.95),
            (r"\bmy (debts?|outstanding)\b", 0.85),
            (r"\bdo i owe (anyone|anybody|someone)\b", 0.90),
            (r"\bi owe\b", 0.70),
            (r"\bmy pending payments?\b", 0.85),
        ],
        "requires_llm": False,
        "required_data": ["ledger"],
    },
    "MY_STATS": {
        "patterns": [
            (r"\bmy (stats?|statistics|profile)\b", 0.90),
            (r"\bmy level\b", 0.85),
            (r"\bmy badges?\b", 0.85),
            (r"\bwhat level am i\b", 0.90),
            (r"\bshow (me )?my (stats|profile|level)\b", 0.90),
            (r"\bhow (am i|do i) doing\b", 0.75),
        ],
        "requires_llm": False,
        "required_data": ["profile"],
    },
    "MY_RECORD": {
        "patterns": [
            (r"\bmy (win|loss|record)\b", 0.85),
            (r"\btotal (profit|loss|winnings|earnings)\b", 0.90),
            (r"\bhow much have i (won|lost|made|earned)\b", 0.90),
            (r"\bmy (winnings|losses|profit|earnings)\b", 0.90),
            (r"\bam i (up|down|winning|losing)\b", 0.80),
            (r"\bnet (profit|result)\b", 0.80),
        ],
        "requires_llm": False,
        "required_data": ["profile"],
    },
    "HOW_TO": {
        "patterns": [
            (r"\bhow (do|can|to) i\b", 0.80),
            (r"\bhow does .+ work\b", 0.80),
            (r"\bwhat is (a |the )?(settlement|buy.?in|cash.?out|chip)\b", 0.85),
            (r"\bexplain\b.*(settlement|buy.?in|cash.?out|chip|game)", 0.80),
            (r"\bpoker hand rankings?\b", 0.95),
        ],
        "requires_llm": False,
        "required_data": [],
    },

    # --- Tier 2: LLM needed ---
    "PLAN_GAME": {
        "patterns": [
            (r"\b(plan|suggest|recommend|find).+(game|time|date|day)\b", 0.85),
            (r"\bbest (time|day|date) (for|to)\b", 0.80),
            (r"\bwhen should we (play|have a game)\b", 0.85),
            (r"\bschedule a game\b", 0.85),
        ],
        "requires_llm": True,
        "required_data": [],
    },
    "CREATE_GAME": {
        "patterns": [
            (r"\b(create|start|setup|set up|new) (a )?(game|poker night)\b", 0.90),
            (r"\blet'?s play\b", 0.70),
        ],
        "requires_llm": True,
        "required_data": [],
    },
    "SUMMARIZE": {
        "patterns": [
            (r"\b(summarize|summary|recap|overview)\b", 0.80),
            (r"\bwhat happened\b", 0.70),
        ],
        "requires_llm": True,
        "required_data": [],
    },
    "SEND_REMINDER": {
        "patterns": [
            (r"\b(send|push) (a )?reminder\b", 0.90),
            (r"\bremind (everyone|them|players)\b", 0.85),
            (r"\bnotify\b", 0.70),
        ],
        "requires_llm": True,
        "required_data": [],
    },
}


class IntentRouter:
    """
    Local intent classification using keyword pattern matching.
    No LLM call required.
    """

    def classify(
        self,
        message: str,
        context: Optional[Dict] = None,
        history: Optional[List[Dict]] = None,
    ) -> IntentResult:
        """
        Classify a user message into an intent.

        Args:
            message: The user's message text
            context: Optional context (current_page, etc.)
            history: Optional conversation history

        Returns:
            IntentResult with intent, confidence, requires_llm, etc.
        """
        message_lower = message.lower().strip()

        # Score each intent
        best_intent = None
        best_confidence = 0.0

        for intent_name, definition in INTENT_DEFINITIONS.items():
            confidence = self._score_intent(message_lower, definition["patterns"])
            if confidence > best_confidence:
                best_confidence = confidence
                best_intent = intent_name

        # If no intent matched well, default to GENERAL
        if best_intent is None or best_confidence < 0.5:
            return IntentResult(
                intent="GENERAL",
                confidence=0.3,
                requires_llm=True,
                required_data=[],
            )

        definition = INTENT_DEFINITIONS[best_intent]

        # Extract params if applicable
        params = self._extract_params(message_lower, best_intent, context)

        return IntentResult(
            intent=best_intent,
            confidence=best_confidence,
            requires_llm=definition["requires_llm"],
            required_data=definition["required_data"],
            params=params,
        )

    def _score_intent(self, message: str, patterns: list) -> float:
        """Score how well a message matches an intent's patterns."""
        max_score = 0.0
        for pattern, weight in patterns:
            if re.search(pattern, message, re.IGNORECASE):
                max_score = max(max_score, weight)
        return max_score

    def _extract_params(self, message: str, intent: str, context: Optional[Dict]) -> Dict:
        """Extract relevant parameters from the message based on intent."""
        params = {}

        # Time-related extraction for game queries
        if intent in ("UPCOMING_GAMES", "RECENT_GAMES", "ACTIVE_GAMES"):
            if re.search(r"\btoday\b", message):
                params["time_filter"] = "today"
            elif re.search(r"\btomorrow\b", message):
                params["time_filter"] = "tomorrow"
            elif re.search(r"\bthis week\b", message):
                params["time_filter"] = "this_week"
            elif re.search(r"\bnext week\b", message):
                params["time_filter"] = "next_week"
            elif re.search(r"\bthis weekend\b", message):
                params["time_filter"] = "this_weekend"

        # Group name extraction
        group_match = re.search(r"\bin (?:the )?[\"']?([A-Za-z0-9 ]+?)[\"']? group\b", message)
        if group_match:
            params["group_name"] = group_match.group(1).strip()

        # Pass through current page from context
        if context and context.get("current_page"):
            params["current_page"] = context["current_page"]

        # Store original message for HOW_TO so FastAnswerEngine can try QUICK_ANSWERS
        if intent == "HOW_TO":
            params["original_message"] = message

        return params
