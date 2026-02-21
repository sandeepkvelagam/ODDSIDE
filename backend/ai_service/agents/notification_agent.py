"""
Notification Agent

Handles intelligent notification decisions and delivery.
"""

from typing import Dict, List
from .base import BaseAgent, AgentResult


class NotificationAgent(BaseAgent):
    """
    Agent for managing notifications and communications.

    Decides when, what, and how to notify users based on context.
    """

    @property
    def name(self) -> str:
        return "notification"

    @property
    def description(self) -> str:
        return "managing notifications, reminders, and user communications"

    @property
    def capabilities(self) -> List[str]:
        return [
            "Send in-app notifications",
            "Send push notifications",
            "Send email notifications",
            "Schedule reminders",
            "Notify about game events",
            "Send settlement notifications"
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "notification_sender",
            "email_sender",
            "scheduler"
        ]

    @property
    def input_schema(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "user_input": {
                    "type": "string",
                    "description": "The notification request, e.g. 'Send a reminder about the game tonight'"
                },
                "user_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of user IDs to notify"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID if the notification is about a specific game"
                },
                "title": {
                    "type": "string",
                    "description": "Notification title"
                },
                "message": {
                    "type": "string",
                    "description": "Notification message body"
                },
                "event_type": {
                    "type": "string",
                    "description": "Type of game event: game_starting, settlement, reminder, general"
                }
            },
            "required": ["user_input"]
        }

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """Execute notification tasks"""
        context = context or {}
        steps_taken = []

        try:
            intent = self._parse_intent(user_input, context)

            if intent["action"] == "notify_game_event":
                return await self._notify_game_event(intent, context, steps_taken)
            elif intent["action"] == "send_reminder":
                return await self._send_reminder(intent, context, steps_taken)
            elif intent["action"] == "notify_settlement":
                return await self._notify_settlement(intent, context, steps_taken)
            elif intent["action"] == "broadcast":
                return await self._broadcast_message(intent, context, steps_taken)
            else:
                # Default: send a simple notification
                return await self._send_simple_notification(context, steps_taken)

        except Exception as e:
            return AgentResult(
                success=False,
                error=str(e),
                steps_taken=steps_taken
            )

    def _parse_intent(self, user_input: str, context: Dict) -> Dict:
        """Parse notification intent"""
        input_lower = user_input.lower()

        if "settlement" in input_lower:
            return {"action": "notify_settlement"}
        elif "reminder" in input_lower:
            return {"action": "send_reminder"}
        elif any(kw in input_lower for kw in ["game start", "game end", "buy-in", "cash out"]):
            return {"action": "notify_game_event"}
        elif "broadcast" in input_lower or "everyone" in input_lower:
            return {"action": "broadcast"}

        return {"action": "simple"}

    async def _notify_game_event(self, intent: Dict, context: Dict, steps: List) -> AgentResult:
        """Notify users about a game event"""
        game_id = context.get("game_id")
        event_type = context.get("event_type", "game_update")
        user_ids = context.get("user_ids", [])
        message = context.get("message", "Game update")

        if not user_ids:
            return AgentResult(
                success=False,
                error="No users to notify",
                steps_taken=steps
            )

        result = await self.call_tool(
            "notification_sender",
            user_ids=user_ids,
            title=f"Game Update",
            message=message,
            notification_type=event_type,
            channels=["in_app", "push"],
            data={"game_id": game_id}
        )
        steps.append({"step": "send_notification", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message=f"Notified {len(user_ids)} users about {event_type}",
            steps_taken=steps
        )

    async def _send_reminder(self, intent: Dict, context: Dict, steps: List) -> AgentResult:
        """Send reminder notifications"""
        game_id = context.get("game_id")
        user_ids = context.get("user_ids", [])
        message = context.get("message", "Reminder: Your game is starting soon!")

        result = await self.call_tool(
            "notification_sender",
            user_ids=user_ids,
            title="Game Reminder",
            message=message,
            notification_type="reminder",
            channels=["in_app", "push"],
            data={"game_id": game_id}
        )
        steps.append({"step": "send_reminder", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message="Reminder sent",
            steps_taken=steps
        )

    async def _notify_settlement(self, intent: Dict, context: Dict, steps: List) -> AgentResult:
        """Notify users about game settlement"""
        game_id = context.get("game_id")
        players = context.get("players", [])

        for player in players:
            user_id = player.get("user_id")
            net_result = player.get("net_result", 0)

            if net_result >= 0:
                message = f"🎉 You won ${abs(net_result):.2f}!"
            else:
                message = f"You lost ${abs(net_result):.2f}. Better luck next time!"

            result = await self.call_tool(
                "notification_sender",
                user_ids=[user_id],
                title="Game Settlement",
                message=message,
                notification_type="settlement",
                channels=["in_app", "push", "email"],
                data={
                    "game_id": game_id,
                    "net_result": net_result
                }
            )
            steps.append({"step": f"notify_{user_id}", "result": result})

        return AgentResult(
            success=True,
            data={"players_notified": len(players)},
            message=f"Settlement notifications sent to {len(players)} players",
            steps_taken=steps
        )

    async def _broadcast_message(self, intent: Dict, context: Dict, steps: List) -> AgentResult:
        """Broadcast message to all specified users"""
        user_ids = context.get("user_ids", [])
        title = context.get("title", "Announcement")
        message = context.get("message", "")

        if not message:
            return AgentResult(
                success=False,
                error="No message provided",
                steps_taken=steps
            )

        result = await self.call_tool(
            "notification_sender",
            user_ids=user_ids,
            title=title,
            message=message,
            notification_type="general",
            channels=["in_app"]
        )
        steps.append({"step": "broadcast", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message=f"Broadcast sent to {len(user_ids)} users",
            steps_taken=steps
        )

    async def _send_simple_notification(self, context: Dict, steps: List) -> AgentResult:
        """Send a simple notification"""
        user_ids = context.get("user_ids", [])
        title = context.get("title", "Notification")
        message = context.get("message", "You have a new notification")

        result = await self.call_tool(
            "notification_sender",
            user_ids=user_ids,
            title=title,
            message=message,
            notification_type="general"
        )
        steps.append({"step": "send_notification", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message="Notification sent",
            steps_taken=steps
        )
