"""
Claude Client

Integration with Anthropic's Claude API for natural language understanding
and tool-use orchestration in the ODDSIDE AI service.
"""

import os
import json
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)

# Try to import anthropic, but don't fail if not installed
try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("anthropic package not installed. Claude features will be disabled.")


# Model tiers for cost optimization
ROUTING_MODEL = "claude-haiku-4-5-20251001"  # Fast, cheap for routing decisions
REASONING_MODEL = "claude-sonnet-4-20250514"  # For complex reasoning


class ClaudeClient:
    """
    Client for interacting with Claude API.

    Used for:
    - Tool-use orchestration (routing requests to the right tool/agent)
    - Intent classification from natural language
    - Generating recommendations for host decisions
    - Creating natural language game summaries
    - Understanding complex host commands
    """

    def __init__(self, api_key: str = None, model: str = None):
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        self.model = model or os.getenv("CLAUDE_MODEL", REASONING_MODEL)
        self.client = None
        self.async_client = None

        if ANTHROPIC_AVAILABLE and self.api_key:
            self.client = anthropic.Anthropic(api_key=self.api_key)
            self.async_client = anthropic.AsyncAnthropic(api_key=self.api_key)

    @property
    def is_available(self) -> bool:
        """Check if Claude client is available"""
        return self.client is not None and self.async_client is not None

    async def route_with_tools(
        self,
        user_input: str,
        context: Dict,
        tools: List[Dict],
        model: str = None
    ) -> Dict:
        """
        Use Claude's tool-use API to intelligently route a request.

        Claude sees all available tools/agents and decides which one(s) to call
        based on the user's natural language input and context.

        Args:
            user_input: The user's natural language request
            context: Additional context (game_id, group_id, user_id, etc.)
            tools: List of Anthropic tool schemas (from tools + agents)
            model: Override model (defaults to ROUTING_MODEL for speed)

        Returns:
            Dict with:
                - tool_calls: List of {name, input} dicts Claude wants to execute
                - text_response: Any text Claude returned (for general responses)
                - stop_reason: Why Claude stopped ("tool_use" or "end_turn")
        """
        if not self.is_available:
            return {"tool_calls": [], "text_response": None, "stop_reason": "unavailable"}

        model = model or ROUTING_MODEL

        system_prompt = """You are the ODDSIDE poker game assistant orchestrator.

Your job is to understand the user's request and call the right tool or agent to handle it.

RULES:
- Always call a tool if the request matches one. Do NOT respond with text if a tool fits.
- If the request is about game creation, scheduling, or invites, use agent_game_setup.
- If the request is about notifications, reminders, or alerts, use agent_notification.
- If the request is about reports, stats, leaderboards, or analytics, use agent_analytics.
- If the request is about host decisions (approve/reject), game monitoring, settlements, or payment reminders, use agent_host_persona.
- If the request is about evaluating a poker hand, use poker_evaluator.
- If the request is about tracking/managing payments, use payment_tracker.
- For general questions or help, respond with helpful text (don't call a tool).
- Pass through all context parameters (game_id, group_id, user_id, etc.) from the context to the tool.
- Set user_input to a clean version of what the user asked."""

        # Build the user message with context
        user_message = f"User request: {user_input}"
        if context:
            # Filter out None values for cleaner context
            ctx_display = {k: v for k, v in context.items() if v is not None}
            if ctx_display:
                user_message += f"\n\nContext: {json.dumps(ctx_display, default=str)}"

        try:
            response = await self.async_client.messages.create(
                model=model,
                max_tokens=1024,
                system=system_prompt,
                tools=tools,
                messages=[{"role": "user", "content": user_message}]
            )

            tool_calls = []
            text_response = None

            for block in response.content:
                if block.type == "tool_use":
                    tool_calls.append({
                        "id": block.id,
                        "name": block.name,
                        "input": block.input
                    })
                elif block.type == "text":
                    text_response = block.text

            return {
                "tool_calls": tool_calls,
                "text_response": text_response,
                "stop_reason": response.stop_reason
            }

        except Exception as e:
            logger.error(f"Claude tool-use routing error: {e}")
            return {"tool_calls": [], "text_response": None, "stop_reason": "error", "error": str(e)}

    async def classify_intent(self, user_input: str, context: Dict = None) -> Dict:
        """
        Use Claude to understand the host's intent from natural language.

        Args:
            user_input: The host's natural language request
            context: Additional context (game state, etc.)

        Returns:
            Dict with action, confidence, and parameters
        """
        if not self.is_available:
            return self._fallback_classify_intent(user_input)

        context = context or {}
        system_prompt = """You are a poker game assistant AI. Classify the host's intent into one of these actions:

Actions:
- approve_decision: Host wants to approve a pending request
- reject_decision: Host wants to reject a pending request
- get_pending: Host wants to see pending decisions
- suggest_game: Host wants game configuration suggestions
- monitor_game: Host wants to check game status
- end_game: Host wants to end the game
- send_reminders: Host wants to send payment reminders
- generate_summary: Host wants a game summary
- general_help: Host needs help or information

Return JSON with:
{
  "action": "action_name",
  "confidence": 0.0-1.0,
  "parameters": {...extracted parameters...},
  "clarification_needed": true/false
}

Context about current game state may be provided."""

        user_message = f"Host says: {user_input}"
        if context:
            user_message += f"\n\nContext: {context}"

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}]
            )

            # Parse the response
            text = response.content[0].text
            import json
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                # Try to extract JSON from response
                import re
                json_match = re.search(r'\{.*\}', text, re.DOTALL)
                if json_match:
                    return json.loads(json_match.group())
                return {"action": "general_help", "confidence": 0.5}

        except Exception as e:
            logger.error(f"Claude intent classification error: {e}")
            return self._fallback_classify_intent(user_input)

    async def generate_recommendation(
        self,
        decision_type: str,
        player_data: Dict,
        game_data: Dict = None
    ) -> str:
        """
        Generate an AI recommendation for a host decision.

        Args:
            decision_type: Type of decision (join_request, buy_in, cash_out)
            player_data: Information about the player
            game_data: Current game state

        Returns:
            Recommendation string (e.g., "APPROVE: Reliable player")
        """
        if not self.is_available:
            return self._fallback_recommendation(decision_type, player_data)

        system_prompt = """You are helping a poker game host make decisions about player requests.
Generate a brief recommendation (under 50 words) with format:
[STATUS]: [reason]

Status can be: APPROVE, CAUTION, or DECLINE
Be concise and helpful."""

        context = f"""Decision Type: {decision_type}

Player Info:
- Games played: {player_data.get('games_played', 0)}
- Payment rate: {player_data.get('payment_rate', 'unknown')}%
- Outstanding debt: ${player_data.get('outstanding_debt', 0)}
- Member since: {player_data.get('member_since', 'unknown')}

Request Details: {player_data.get('request_details', 'N/A')}"""

        if game_data:
            context += f"""

Game Info:
- Buy-in amount: ${game_data.get('buy_in_amount', 20)}
- Current players: {game_data.get('player_count', 0)}
- Game status: {game_data.get('status', 'active')}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=100,
                system=system_prompt,
                messages=[{"role": "user", "content": context}]
            )
            return response.content[0].text.strip()

        except Exception as e:
            logger.error(f"Claude recommendation error: {e}")
            return self._fallback_recommendation(decision_type, player_data)

    async def generate_game_summary(self, game_data: Dict) -> str:
        """
        Generate a natural language game summary.

        Args:
            game_data: Complete game data including players, transactions, etc.

        Returns:
            Markdown-formatted game summary
        """
        if not self.is_available:
            return self._fallback_summary(game_data)

        system_prompt = """You are creating a fun, engaging summary of a poker game night.
Include:
- Game highlights and duration
- Notable wins/losses
- Any interesting statistics
- Keep it positive and fun (it's a friendly game!)

Use markdown formatting. Keep it under 200 words."""

        game_info = f"""Game: {game_data.get('title', 'Poker Night')}
Duration: {game_data.get('duration_minutes', 0)} minutes
Total Pot: ${game_data.get('total_pot', 0)}
Players: {game_data.get('player_count', 0)}

Results:
"""
        for player in game_data.get('settlements', []):
            result = player.get('net_result', 0)
            emoji = '🏆' if result > 0 else '📉' if result < 0 else '➖'
            game_info += f"- {player.get('name', 'Player')}: {'+' if result > 0 else ''}${result} {emoji}\n"

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=400,
                system=system_prompt,
                messages=[{"role": "user", "content": game_info}]
            )
            return response.content[0].text.strip()

        except Exception as e:
            logger.error(f"Claude summary error: {e}")
            return self._fallback_summary(game_data)

    async def parse_natural_command(self, command: str, available_actions: List[str]) -> Dict:
        """
        Parse a natural language command into structured action.

        Args:
            command: Natural language command from host
            available_actions: List of available action names

        Returns:
            Dict with action and extracted parameters
        """
        if not self.is_available:
            return {"action": None, "params": {}}

        system_prompt = f"""Parse the host's command into a structured action.

Available actions: {', '.join(available_actions)}

Return JSON:
{{
  "action": "action_name or null if unclear",
  "params": {{...extracted parameters...}},
  "needs_clarification": true/false,
  "clarification_question": "question if unclear"
}}"""

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                system=system_prompt,
                messages=[{"role": "user", "content": command}]
            )

            import json
            try:
                return json.loads(response.content[0].text)
            except:
                return {"action": None, "params": {}, "needs_clarification": True}

        except Exception as e:
            logger.error(f"Claude parse error: {e}")
            return {"action": None, "params": {}}

    # ==================== Fallback Methods ====================

    def _fallback_classify_intent(self, user_input: str) -> Dict:
        """Fallback keyword-based intent classification"""
        input_lower = user_input.lower()

        if any(kw in input_lower for kw in ["approve", "accept", "ok", "yes"]):
            return {"action": "approve_decision", "confidence": 0.7}
        if any(kw in input_lower for kw in ["reject", "decline", "no"]):
            return {"action": "reject_decision", "confidence": 0.7}
        if any(kw in input_lower for kw in ["pending", "queue", "waiting"]):
            return {"action": "get_pending", "confidence": 0.7}
        if any(kw in input_lower for kw in ["suggest", "recommend"]):
            return {"action": "suggest_game", "confidence": 0.6}
        if any(kw in input_lower for kw in ["status", "check", "how"]):
            return {"action": "monitor_game", "confidence": 0.6}
        if any(kw in input_lower for kw in ["end", "finish", "close"]):
            return {"action": "end_game", "confidence": 0.7}
        if any(kw in input_lower for kw in ["remind", "payment", "owe"]):
            return {"action": "send_reminders", "confidence": 0.7}
        if any(kw in input_lower for kw in ["summary", "recap"]):
            return {"action": "generate_summary", "confidence": 0.7}

        return {"action": "general_help", "confidence": 0.5}

    def _fallback_recommendation(self, decision_type: str, player_data: Dict) -> str:
        """Fallback rule-based recommendation"""
        outstanding = player_data.get('outstanding_debt', 0)
        games_played = player_data.get('games_played', 0)

        if outstanding > 0:
            return f"CAUTION: Player has ${outstanding} outstanding debt"
        if games_played > 10:
            return "APPROVE: Reliable player with good history"
        if games_played > 0:
            return f"OK: Player has played {games_played} games"
        return "NEW: First-time player, no history"

    def _fallback_summary(self, game_data: Dict) -> str:
        """Fallback template-based summary"""
        title = game_data.get('title', 'Poker Night')
        duration = game_data.get('duration_minutes', 0)
        total_pot = game_data.get('total_pot', 0)
        players = game_data.get('player_count', 0)

        summary = f"""## {title} Summary

**Duration:** {duration} minutes
**Total Pot:** ${total_pot}
**Players:** {players}

### Results
"""
        settlements = game_data.get('settlements', [])
        if settlements:
            # Sort by net result
            sorted_results = sorted(settlements, key=lambda x: x.get('net_result', 0), reverse=True)
            for i, player in enumerate(sorted_results):
                result = player.get('net_result', 0)
                prefix = '🥇' if i == 0 and result > 0 else '🥈' if i == 1 and result > 0 else '🥉' if i == 2 and result > 0 else ''
                summary += f"{prefix} **{player.get('name', 'Player')}**: {'+' if result > 0 else ''}${result}\n"

        summary += "\n---\n*Thanks for playing!*"
        return summary


# Global singleton
_claude_client: Optional[ClaudeClient] = None


def get_claude_client() -> ClaudeClient:
    """Get the global Claude client instance"""
    global _claude_client
    if _claude_client is None:
        _claude_client = ClaudeClient()
    return _claude_client
