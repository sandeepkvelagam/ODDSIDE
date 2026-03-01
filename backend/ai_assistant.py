"""
AI Assistant for Kvitt - Fallback assistant
Uses OpenAI GPT-5.2 via Emergent integrations.
This is the Tier 2 fallback path when the Claude orchestrator is unavailable.
"""

import os
import json
from emergentintegrations.llm.chat import LlmChat, UserMessage
import logging

logger = logging.getLogger(__name__)

# System prompt for the assistant
SYSTEM_PROMPT = """You are Kvitt Assistant, a helpful and conversational guide for the Kvitt poker ledger app.

YOUR ROLE:
- Explain app features and how to use them
- Help users understand the game flow: groups → games → buy-ins → cash-outs → settlement
- Clarify rules and terminology
- Guide users through common tasks
- Answer questions about the user's own data when provided

WHAT YOU CAN DO:
✅ Explain how to create groups and invite friends
✅ Explain buy-in and chip systems
✅ Explain cash-out and settlement process
✅ Answer questions about app features
✅ Provide poker hand rankings
✅ Help troubleshoot common issues
✅ When user data is provided below, answer questions about their groups, games, stats, and settlements

WHAT YOU CANNOT DO:
❌ Make predictions about game outcomes
❌ Provide strategic poker advice
❌ Modify user data or take actions
❌ Make financial calculations beyond explaining the system

STYLE:
- Be concise and friendly
- Use bullet points for lists
- Keep responses under 150 words unless more detail is needed
- Be conversational — reference what was discussed before when relevant
- If unsure, say so and suggest checking the app

APP FLOW SUMMARY:
1. Create a Group → Invite friends
2. Start a Game → Set buy-in amount and chips per buy-in
3. Players join → Auto-receive chips
4. During game → Players can request rebuys
5. Cash out → Enter chip count, host approves
6. Settle → App calculates who owes who
7. Mark payments → Track who has paid"""


async def get_ai_response(user_message: str, session_id: str, context: dict = None) -> str:
    """
    Get AI response for user message (fallback path).

    Args:
        user_message: The user's question
        session_id: Unique session ID for conversation continuity
        context: Optional context about current state (game_id, user_data, etc.)

    Returns:
        AI response string
    """
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return "AI assistant is not configured. Please contact support."

        # Build context-aware system message
        system_msg = SYSTEM_PROMPT
        if context:
            if context.get('current_page'):
                system_msg += f"\n\nUser is currently on: {context['current_page']}"
            if context.get('user_role'):
                system_msg += f"\nUser role: {context['user_role']}"
            if context.get('user_data'):
                system_msg += f"\n\nUSER'S ACTUAL DATA:\n{json.dumps(context['user_data'], default=str, indent=2)}"

        chat = LlmChat(
            api_key=api_key,
            session_id=session_id,
            system_message=system_msg
        ).with_model("openai", "gpt-5.2")

        message = UserMessage(text=user_message)
        response = await chat.send_message(message)

        return response

    except Exception as e:
        logger.error(f"AI assistant error: {e}")
        return "I'm having trouble connecting. Please try again or check the help guide."


# Enriched quick answers — each has text, navigation, and follow-ups (no AI needed)
QUICK_ANSWERS = {
    "how do i create a group": {
        "text": (
            "Groups are the core of Kvitt — add your friends and organize game nights in one place.\n\n"
            "To create one:\n"
            "• Go to the Groups tab\n"
            "• Tap 'Create Group'\n"
            "• Name it and set defaults (buy-in, chips)\n"
            "• Invite friends by email or share the link\n\n"
            "Once set up, you can start scheduling games right away!"
        ),
        "navigation": {"screen": "Groups"},
        "follow_ups": ["How do I start a game?", "How does buy-in work?", "Show my groups"],
    },
    "how do i start a game": {
        "text": (
            "Starting a game kicks off a poker night for your group.\n\n"
            "Here's how:\n"
            "• Open your group\n"
            "• Tap 'Start Game'\n"
            "• Set the buy-in amount and chips per buy-in\n"
            "• Players join and automatically receive their chips\n\n"
            "As host, you'll manage buy-ins, rebuys, and cash-outs during the game."
        ),
        "navigation": {"screen": "GameNight"},
        "follow_ups": ["How does buy-in work?", "How do I cash out?", "Any active games?"],
    },
    "how does buy-in work": {
        "text": (
            "Buy-in is the entry fee for each game — it sets how much each player puts in and how many chips they get.\n\n"
            "How it works:\n"
            "• Host sets a buy-in amount (e.g., $20) and chips per buy-in (e.g., 100)\n"
            "• When a player joins, they're automatically given their chips\n"
            "• Players can request rebuys during the game if they run out\n\n"
            "The buy-in amount is used later to calculate settlements."
        ),
        "navigation": {"screen": "GameNight"},
        "follow_ups": ["How do I cash out?", "What is settlement?", "Any active games?"],
    },
    "how do i cash out": {
        "text": (
            "Cashing out converts your chips back to a dollar amount at the end of the game.\n\n"
            "To cash out:\n"
            "• Tap 'Cash Out' in your active game\n"
            "• Enter your final chip count\n"
            "• The host approves your cash-out\n"
            "• Kvitt calculates your net result\n\n"
            "Once everyone has cashed out, settlement kicks in automatically."
        ),
        "navigation": {"screen": "GameNight"},
        "follow_ups": ["What is settlement?", "Who owes me money?", "Show my recent games"],
    },
    "what is settlement": {
        "text": (
            "Settlement is how Kvitt figures out who owes who after a game ends.\n\n"
            "How it works:\n"
            "• After everyone cashes out, Kvitt compares buy-ins vs cash-outs\n"
            "• It calculates the minimum number of payments needed\n"
            "• You'll see exactly who owes who and how much\n"
            "• Mark payments as done right in the app\n\n"
            "No more awkward Venmo math!"
        ),
        "navigation": {"screen": "SettlementHistory"},
        "follow_ups": ["Who owes me money?", "What do I owe?", "Show my recent games"],
    },
    "poker hand rankings": {
        "text": (
            "Here's the complete poker hand ranking from strongest to weakest:\n\n"
            "1. Royal Flush — A, K, Q, J, 10 (same suit)\n"
            "2. Straight Flush — 5 cards in sequence (same suit)\n"
            "3. Four of a Kind — 4 cards of the same rank\n"
            "4. Full House — 3 of a kind + a pair\n"
            "5. Flush — 5 cards of the same suit\n"
            "6. Straight — 5 cards in sequence\n"
            "7. Three of a Kind — 3 cards of the same rank\n"
            "8. Two Pair — 2 different pairs\n"
            "9. One Pair — 2 cards of the same rank\n"
            "10. High Card — Highest card wins"
        ),
        "navigation": None,
        "follow_ups": ["How do I start a game?", "How does buy-in work?", "What are my stats?"],
    },
    "how do i invite friends": {
        "text": (
            "Growing your group is easy — invite friends and start playing together.\n\n"
            "To invite:\n"
            "• Open your group\n"
            "• Tap 'Invite'\n"
            "• Enter their email or share the invite link\n"
            "• They'll get a notification and can join instantly\n\n"
            "You can invite as many friends as your group allows!"
        ),
        "navigation": {"screen": "Groups"},
        "follow_ups": ["How do I start a game?", "Show my groups", "How does buy-in work?"],
    },
}


def get_quick_answer(question: str) -> dict | None:
    """Check if question has a quick answer. Returns enriched dict or None."""
    question_lower = question.lower().strip()
    for key, answer in QUICK_ANSWERS.items():
        if key in question_lower or question_lower in key:
            return answer
    return None
