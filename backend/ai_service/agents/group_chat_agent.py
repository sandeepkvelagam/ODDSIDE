"""
Group Chat Agent

AI group member that participates in group chat conversations naturally.
Generates contextual responses, suggests games, and helps organize events.
"""

from typing import Dict, List, Optional
from .base import BaseAgent, AgentResult


class GroupChatAgent(BaseAgent):
    """
    AI group member that participates in group chat like a real person.

    Personality: Casual, fun, poker-enthusiast. Like a friend who's
    always down for a game and helps organize.

    This agent:
    - Generates contextual responses via Claude
    - Posts messages as the "Kvitt" group member
    - Manages conversation memory (last N messages)
    - Is throttled: max 1 message per 5 min per group
    - Can trigger actions (create polls, send invites, suggest games)
    """

    AI_USER_ID = "ai_assistant"
    AI_DISPLAY_NAME = "Kvitt"

    @property
    def name(self) -> str:
        return "group_chat"

    @property
    def description(self) -> str:
        return "AI group member that participates in group chat conversations naturally"

    @property
    def capabilities(self) -> List[str]:
        return [
            "Participate in group conversations naturally",
            "Suggest game times based on group patterns and external context",
            "Poll members for availability",
            "Send game invites and reminders",
            "Track RSVPs and re-propose times",
            "Keep host updated on group activity",
            "Detect holidays, long weekends, and weather events",
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "game_manager",
            "scheduler",
            "notification_sender",
            "smart_config",
            "payment_tracker",
        ]

    @property
    def input_schema(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "user_input": {
                    "type": "string",
                    "description": "The message content from the group chat"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID where the message was posted"
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID of the person who sent the message"
                },
                "message_history": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Recent message history for context (last 20 messages)"
                },
                "group_context": {
                    "type": "object",
                    "description": "Group metadata: member count, last game date, etc."
                },
                "external_context": {
                    "type": "object",
                    "description": "External context: upcoming holidays, weather, etc."
                }
            },
            "required": ["user_input", "group_id"]
        }

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """
        Generate a response for a group chat message.

        Returns an AgentResult with:
        - message: The AI's response text to post in chat
        - data.action: Optional action to take (create_poll, suggest_game, etc.)
        - data.should_respond: Whether to actually post the response
        """
        context = context or {}
        steps_taken = []

        try:
            group_id = context.get("group_id")
            message_history = context.get("message_history", [])
            group_context = context.get("group_context", {})
            external_context = context.get("external_context", {})

            # Build the prompt for Claude
            system_prompt = self._build_system_prompt(group_context, external_context)
            conversation = self._build_conversation(message_history, user_input)

            steps_taken.append({"step": "build_prompt", "messages_in_context": len(message_history)})

            # Generate response via Claude
            if self.llm_client and self.llm_client.is_available:
                response = await self._generate_claude_response(
                    system_prompt, conversation, context
                )
                steps_taken.append({"step": "claude_response", "success": True})
            else:
                response = self._generate_fallback_response(user_input, context)
                steps_taken.append({"step": "fallback_response"})

            return AgentResult(
                success=True,
                data={
                    "response_text": response.get("text", ""),
                    "action": response.get("action"),
                    "action_params": response.get("action_params", {}),
                    "should_respond": response.get("should_respond", True),
                    "group_id": group_id,
                },
                message=response.get("text", ""),
                steps_taken=steps_taken
            )

        except Exception as e:
            return AgentResult(
                success=False,
                error=str(e),
                steps_taken=steps_taken
            )

    def _build_system_prompt(self, group_context: Dict, external_context: Dict) -> str:
        """Build the system prompt with group and external context."""
        group_name = group_context.get("group_name", "the group")
        member_count = group_context.get("member_count", 0)
        last_game_date = group_context.get("last_game_date", "unknown")
        days_since_last_game = group_context.get("days_since_last_game")
        regular_day = group_context.get("regular_game_day", "Friday")

        prompt = f"""You are Kvitt, a group member in a poker friend group called "{group_name}".

PERSONALITY:
- Witty teammate with warm host energy — never preachy or corporate
- Short, punchy, "in the chat" language (1-3 sentences max)
- Casual: "hey", "nice", "let's do it", "sounds good", "who's in?"
- Use poker references naturally, not forced
- Never use bullet points, numbered lists, or formal formatting in chat
- Don't over-explain — keep it chill and fun

GUARDRAILS:
- If someone gets heated, de-escalate warmly: "let's keep it chill — I can help sort this out"
- If someone shares sensitive info (card numbers, passwords), gently redirect: "heads-up: avoid sharing sensitive info in chat — I can help without it"
- Firm but polite — never escalate conflict, never take sides

SUMMARIES:
- When asked to summarize, recap, or "what did we decide", post a brief natural recap
- Format: "Quick recap — Decision: [X]. Attending: [names]. Open items: [Y]. Next up: [Z]."
- Keep it to 3-5 lines, written naturally, no bullet formatting

SCHEDULING:
- When scheduling comes up, suggest 3-4 time slots based on the group's usual patterns
- Regular game day is {regular_day}, so lean toward that
- Ask before creating a poll: "Want me to spin up a quick poll with these options?"

GROUP CONTEXT:
- Members: {member_count}
- Last game: {last_game_date}
- Regular game day: {regular_day}"""

        if days_since_last_game and days_since_last_game > 14:
            prompt += f"\n- It's been {days_since_last_game} days since the last game — might be time to suggest one!"

        # Add external context
        if external_context:
            holidays = external_context.get("upcoming_holidays", [])
            weather = external_context.get("weather_forecast", {})
            long_weekends = external_context.get("long_weekends", [])

            if holidays:
                prompt += f"\n\nUPCOMING HOLIDAYS: {', '.join(h.get('name', '') for h in holidays[:3])}"
            if long_weekends:
                prompt += f"\nLONG WEEKENDS COMING: {', '.join(str(lw) for lw in long_weekends[:2])}"
            if weather.get("bad_weather_days"):
                prompt += f"\nBAD WEATHER AHEAD: {weather.get('summary', 'Stormy days coming')} — great excuse for a home game!"

        prompt += """

RULES:
- Only respond about poker, games, scheduling, or when directly addressed
- If someone asks about scheduling → suggest times and offer to create a poll
- If asked about payments/settlements → offer to check status
- If the conversation is unrelated to games, stay quiet (respond with empty text)
- NEVER reveal that you're an AI or mention being a bot
- If someone directly mentions you (@Kvitt or "hey kvitt"), always respond
- Keep responses SHORT — you're in a group chat, not writing an essay"""

        return prompt

    def _build_conversation(self, message_history: List[Dict], current_message: str) -> List[Dict]:
        """Build conversation messages from history for Claude."""
        messages = []

        for msg in message_history[-20:]:  # Last 20 messages
            sender = msg.get("user", {}).get("name", "Someone")
            content = msg.get("content", "")
            msg_type = msg.get("type", "user")

            if msg_type == "ai":
                messages.append({
                    "role": "assistant",
                    "content": content
                })
            else:
                messages.append({
                    "role": "user",
                    "content": f"{sender}: {content}"
                })

        # Ensure the first message is from user role (required by Claude API)
        if messages and messages[0]["role"] == "assistant":
            messages.insert(0, {
                "role": "user",
                "content": "[conversation history]"
            })

        # Ensure the last message is from user role (required by Claude)
        if not messages or messages[-1]["role"] == "assistant":
            messages.append({
                "role": "user",
                "content": current_message
            })

        return messages

    async def _generate_claude_response(
        self, system_prompt: str, conversation: List[Dict], context: Dict
    ) -> Dict:
        """Generate a response using Claude."""
        try:
            response = await self.llm_client.async_client.messages.create(
                model="claude-haiku-4-5-20251001",  # Fast + cheap for chat
                max_tokens=200,
                system=system_prompt,
                messages=conversation
            )

            text = response.content[0].text.strip() if response.content else ""

            # Detect if the AI wants to take an action
            action = None
            action_params = {}

            text_lower = text.lower()
            if "create a poll" in text_lower or ("poll" in text_lower and "?" in text):
                action = "create_poll"
            elif "set up a game" in text_lower or "create the game" in text_lower:
                action = "suggest_game"
                action_params = {"group_id": context.get("group_id")}

            return {
                "text": text,
                "action": action,
                "action_params": action_params,
                "should_respond": bool(text)
            }

        except Exception as e:
            return self._generate_fallback_response("", context)

    def _generate_fallback_response(self, user_input: str, context: Dict) -> Dict:
        """Generate a simple fallback response without Claude."""
        input_lower = user_input.lower()

        if any(kw in input_lower for kw in ["game", "play", "poker", "friday", "saturday"]):
            return {
                "text": "Sounds like game night might be in the works! Who's in?",
                "action": None,
                "should_respond": True
            }
        elif any(kw in input_lower for kw in ["kvitt", "hey kvitt", "oddside", "hey odd", "@ odd"]):
            return {
                "text": "Hey! What's up? Need help setting something up?",
                "action": None,
                "should_respond": True
            }
        elif any(kw in input_lower for kw in ["owe", "pay", "settle", "venmo"]):
            return {
                "text": "Need me to check who owes what? I can pull up the latest settlements.",
                "action": None,
                "should_respond": True
            }

        return {
            "text": "",
            "action": None,
            "should_respond": False
        }
