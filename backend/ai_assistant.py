"""
AI Assistant for Kvitt - Explain-only assistant
Uses OpenAI GPT-5.2 via Emergent integrations
"""

import os
from emergentintegrations.llm.chat import LlmChat, UserMessage
import logging

logger = logging.getLogger(__name__)

# System prompt for the assistant
SYSTEM_PROMPT = """You are Kvitt Assistant, a helpful guide for the Kvitt poker ledger app.

YOUR ROLE:
- Explain app features and how to use them
- Help users understand the game flow: groups → games → buy-ins → cash-outs → settlement
- Clarify rules and terminology
- Guide users through common tasks

WHAT YOU CAN DO:
✅ Explain how to create groups and invite friends
✅ Explain buy-in and chip systems
✅ Explain cash-out and settlement process
✅ Answer questions about app features
✅ Provide poker hand rankings
✅ Help troubleshoot common issues

WHAT YOU CANNOT DO:
❌ Tell users their chip count (you don't have real-time data)
❌ Make predictions about game outcomes
❌ Provide strategic poker advice
❌ Access or modify user data
❌ Make financial calculations beyond explaining the system

STYLE:
- Be concise and friendly
- Use bullet points for lists
- Keep responses under 150 words unless more detail is needed
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
    Get AI response for user message
    
    Args:
        user_message: The user's question
        session_id: Unique session ID for conversation continuity
        context: Optional context about current state (game_id, etc.)
    
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


# Quick answers for common questions (no AI needed)
QUICK_ANSWERS = {
    "how do i create a group": "Go to Groups → Click 'Create Group' → Name it → Invite friends via email!",
    "how do i start a game": "In your group, click 'Start Game' → Set buy-in amount → Set chips per buy-in → Start!",
    "how does buy-in work": "Set a buy-in amount (e.g., $20) and chips (e.g., 100). Each player gets those chips automatically when joining.",
    "how do i cash out": "Click 'Cash Out' → Enter your chip count → Host approves → Settlement is calculated.",
    "what is settlement": "After everyone cashes out, Kvitt calculates who owes who. The app shows the minimum payments needed.",
    "poker hand rankings": "Royal Flush > Straight Flush > Four of a Kind > Full House > Flush > Straight > Three of a Kind > Two Pair > One Pair > High Card",
    "how do i invite friends": "In your group, click 'Invite' → Enter their email → They get a notification to join!",
}


def get_quick_answer(question: str) -> str | None:
    """Check if question has a quick answer (no AI needed)"""
    question_lower = question.lower().strip()
    for key, answer in QUICK_ANSWERS.items():
        if key in question_lower or question_lower in key:
            return answer
    return None
