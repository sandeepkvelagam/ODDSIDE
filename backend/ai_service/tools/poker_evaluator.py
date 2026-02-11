"""
Poker Hand Evaluator Tool

Deterministically evaluates poker hands using code (not LLM).
"""

from typing import List, Dict
from .base import BaseTool, ToolResult

# Import the evaluator from the main module
import sys
sys.path.append('..')
from poker_evaluator import evaluate_hand, get_action_suggestion, get_hand_strength


class PokerEvaluatorTool(BaseTool):
    """
    Evaluates poker hands and provides strategy suggestions.

    Uses deterministic code for 100% accurate hand evaluation.
    """

    @property
    def name(self) -> str:
        return "poker_evaluator"

    @property
    def description(self) -> str:
        return """Evaluates a poker hand and provides strategy suggestions.
        Takes hole cards (2 cards in player's hand) and community cards (3-5 shared cards).
        Returns the exact hand type (flush, full house, etc.) and recommended action."""

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "hole_cards": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Player's 2 hole cards, e.g. ['A of spades', 'K of hearts']",
                    "minItems": 2,
                    "maxItems": 2
                },
                "community_cards": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Community cards (3-5), e.g. ['Q of hearts', 'J of diamonds', '10 of clubs']",
                    "minItems": 3,
                    "maxItems": 5
                },
                "stage": {
                    "type": "string",
                    "enum": ["Flop", "Turn", "River"],
                    "description": "Current betting stage"
                }
            },
            "required": ["hole_cards", "community_cards"]
        }

    async def execute(
        self,
        hole_cards: List[str],
        community_cards: List[str],
        stage: str = None
    ) -> ToolResult:
        """Evaluate the poker hand"""
        try:
            # Validate inputs
            if len(hole_cards) != 2:
                return ToolResult(
                    success=False,
                    error="Must provide exactly 2 hole cards"
                )

            if len(community_cards) < 3:
                return ToolResult(
                    success=False,
                    error="Must provide at least 3 community cards"
                )

            # Determine stage if not provided
            if not stage:
                if len(community_cards) == 3:
                    stage = "Flop"
                elif len(community_cards) == 4:
                    stage = "Turn"
                else:
                    stage = "River"

            # Evaluate the hand
            evaluation = evaluate_hand(hole_cards, community_cards)

            if "error" in evaluation:
                return ToolResult(
                    success=False,
                    error=evaluation["error"]
                )

            # Get action suggestion
            suggestion = get_action_suggestion(evaluation, stage)

            return ToolResult(
                success=True,
                data={
                    "hand_name": evaluation["hand_name"],
                    "description": evaluation["description"],
                    "strength": get_hand_strength(evaluation["hand_rank"]),
                    "action": suggestion["action"],
                    "potential": suggestion["potential"],
                    "reasoning": suggestion["reasoning"],
                    "stage": stage
                },
                message=f"Hand evaluated: {evaluation['hand_name']}"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e)
            )
