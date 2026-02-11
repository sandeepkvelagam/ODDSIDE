"""
Notification Sender Tool

Sends push notifications, in-app notifications, and manages notification preferences.
"""

from typing import List, Dict, Optional
from .base import BaseTool, ToolResult
from datetime import datetime
import uuid


class NotificationSenderTool(BaseTool):
    """
    Sends notifications to users via various channels.

    Supports:
    - In-app notifications (stored in database)
    - Push notifications (via Firebase/Expo)
    - Email notifications
    """

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "notification_sender"

    @property
    def description(self) -> str:
        return """Sends notifications to one or more users.
        Can send in-app notifications, push notifications, or emails.
        Use this to notify users about game invites, game starting, settlements, etc."""

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "user_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of user IDs to notify"
                },
                "title": {
                    "type": "string",
                    "description": "Notification title"
                },
                "message": {
                    "type": "string",
                    "description": "Notification message body"
                },
                "notification_type": {
                    "type": "string",
                    "enum": ["game_invite", "game_starting", "game_ended", "settlement", "buy_in_request", "cash_out", "reminder", "general"],
                    "description": "Type of notification for categorization"
                },
                "channels": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": ["in_app", "push", "email"]
                    },
                    "description": "Channels to send notification through",
                    "default": ["in_app"]
                },
                "data": {
                    "type": "object",
                    "description": "Additional data payload (e.g., game_id, group_id)"
                },
                "scheduled_for": {
                    "type": "string",
                    "format": "date-time",
                    "description": "Optional: Schedule notification for later"
                }
            },
            "required": ["user_ids", "title", "message", "notification_type"]
        }

    async def execute(
        self,
        user_ids: List[str],
        title: str,
        message: str,
        notification_type: str,
        channels: List[str] = None,
        data: Dict = None,
        scheduled_for: str = None
    ) -> ToolResult:
        """Send notifications to users"""
        try:
            if not channels:
                channels = ["in_app"]

            if not user_ids:
                return ToolResult(
                    success=False,
                    error="No user IDs provided"
                )

            sent_count = 0
            failed_count = 0
            results = []

            for user_id in user_ids:
                notification = {
                    "notification_id": str(uuid.uuid4()),
                    "user_id": user_id,
                    "title": title,
                    "message": message,
                    "type": notification_type,
                    "data": data or {},
                    "channels": channels,
                    "read": False,
                    "created_at": datetime.utcnow(),
                    "scheduled_for": scheduled_for
                }

                # Store in-app notification
                if "in_app" in channels and self.db:
                    try:
                        await self.db.notifications.insert_one(notification)
                        sent_count += 1
                        results.append({
                            "user_id": user_id,
                            "status": "sent",
                            "channel": "in_app"
                        })
                    except Exception as e:
                        failed_count += 1
                        results.append({
                            "user_id": user_id,
                            "status": "failed",
                            "error": str(e)
                        })

                # TODO: Implement push notification via Firebase/Expo
                if "push" in channels:
                    # Placeholder for push notification implementation
                    results.append({
                        "user_id": user_id,
                        "status": "pending",
                        "channel": "push",
                        "note": "Push notifications not yet implemented"
                    })

                # TODO: Implement email notification
                if "email" in channels:
                    results.append({
                        "user_id": user_id,
                        "status": "pending",
                        "channel": "email",
                        "note": "Email notifications not yet implemented"
                    })

            return ToolResult(
                success=sent_count > 0,
                data={
                    "sent_count": sent_count,
                    "failed_count": failed_count,
                    "total_users": len(user_ids),
                    "results": results
                },
                message=f"Sent {sent_count} notifications, {failed_count} failed"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e)
            )
