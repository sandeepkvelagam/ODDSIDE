"""
Host Update Service

Sends structured private updates to the group host about group activity,
game planning status, and AI actions — via both notifications and a
dedicated host_updates collection.

Updates are NOT posted in group chat. They go to:
1. host_updates collection (queryable feed)
2. Push notification via Expo (if enabled)
3. In-app notification (notifications collection)
"""

import logging
import uuid
from typing import Dict, List, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class HostUpdateService:
    """
    Keeps the host informed about group activity through a private channel.

    Update types:
    - rsvp_update: "3 people confirmed for Saturday's game"
    - poll_update: "Poll results: Saturday 7pm wins (5 votes)"
    - game_reminder: "Game in 2 hours — 4 confirmed, 2 no-shows"
    - settlement_status: "2 payments still outstanding from last game"
    - suggestion_sent: "AI suggested a game for this weekend"
    - member_activity: "Jake hasn't played in 30 days"
    - ai_action: "AI created a poll in the group chat"
    """

    def __init__(self, db=None):
        self.db = db

    async def send_update(
        self,
        group_id: str,
        host_id: str,
        update_type: str,
        title: str,
        message: str,
        data: Dict = None,
        priority: str = "normal",  # low, normal, high, urgent
        send_push: bool = False,
    ) -> Dict:
        """
        Send a structured update to the host.

        Stores in host_updates collection + creates a notification.
        Optionally sends push notification for high-priority updates.
        """
        if not self.db:
            logger.warning("HostUpdateService: no database connection")
            return {"error": "no database"}

        update_id = f"hup_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        update_doc = {
            "update_id": update_id,
            "group_id": group_id,
            "host_id": host_id,
            "type": update_type,
            "title": title,
            "message": message,
            "data": data or {},
            "priority": priority,
            "read": False,
            "created_at": now,
        }

        # Store in host_updates collection
        await self.db.host_updates.insert_one(update_doc)

        # Create in-app notification
        notification = {
            "notification_id": f"ntf_{uuid.uuid4().hex[:12]}",
            "user_id": host_id,
            "type": f"host_{update_type}",
            "title": title,
            "message": message,
            "data": {
                "group_id": group_id,
                "update_id": update_id,
                **(data or {})
            },
            "read": False,
            "created_at": now,
        }
        await self.db.notifications.insert_one(notification)

        # Send push notification for high-priority updates
        if send_push or priority in ("high", "urgent"):
            await self._send_push(host_id, title, message, data)

        # Emit via WebSocket to host
        try:
            from websocket_manager import emit_to_user
            await emit_to_user(host_id, "host_update", {
                "update_id": update_id,
                "group_id": group_id,
                "type": update_type,
                "title": title,
                "message": message,
                "priority": priority,
            })
        except Exception as e:
            logger.debug(f"WebSocket emit failed for host update: {e}")

        logger.info(f"Host update sent: {update_type} → {host_id[:8]}... ({priority})")
        return {"update_id": update_id}

    # ==================== Convenience Methods ====================

    async def notify_rsvp_update(
        self, group_id: str, host_id: str,
        confirmed: int, declined: int, pending: int,
        maybe: int = 0, game_title: str = "the game"
    ):
        """Notify host about RSVP status changes."""
        total = confirmed + declined + pending + maybe
        parts = [f"{confirmed} confirmed", f"{declined} declined"]
        if maybe > 0:
            parts.append(f"{maybe} maybe")
        parts.append(f"{pending} pending")
        message = f"{', '.join(parts)} out of {total} invited"
        await self.send_update(
            group_id=group_id,
            host_id=host_id,
            update_type="rsvp_update",
            title=f"RSVP Update: {game_title}",
            message=message,
            data={"confirmed": confirmed, "declined": declined, "maybe": maybe, "pending": pending},
            priority="normal" if pending > 0 else "low",
        )

    async def notify_poll_result(
        self, group_id: str, host_id: str,
        winning_option: str, vote_count: int, poll_id: str
    ):
        """Notify host when a poll is resolved."""
        await self.send_update(
            group_id=group_id,
            host_id=host_id,
            update_type="poll_update",
            title="Poll Resolved",
            message=f"'{winning_option}' wins with {vote_count} vote(s). Want me to create the game?",
            data={"poll_id": poll_id, "winning_option": winning_option},
            priority="high",
        )

    async def notify_settlement_status(
        self, group_id: str, host_id: str,
        game_id: str, outstanding: int, total_owed: float
    ):
        """Notify host about outstanding settlements."""
        await self.send_update(
            group_id=group_id,
            host_id=host_id,
            update_type="settlement_status",
            title="Outstanding Settlements",
            message=f"{outstanding} payment(s) still pending (${total_owed:.2f} total)",
            data={"game_id": game_id, "outstanding": outstanding, "total_owed": total_owed},
            priority="normal",
        )

    async def notify_game_reminder(
        self, group_id: str, host_id: str,
        game_id: str, hours_until: int, confirmed: int, no_response: int
    ):
        """Notify host about upcoming game status."""
        message = f"Game in {hours_until} hours — {confirmed} confirmed"
        if no_response > 0:
            message += f", {no_response} haven't responded"
        await self.send_update(
            group_id=group_id,
            host_id=host_id,
            update_type="game_reminder",
            title="Upcoming Game",
            message=message,
            data={"game_id": game_id, "hours_until": hours_until},
            priority="high" if hours_until <= 2 else "normal",
            send_push=hours_until <= 2,
        )

    async def notify_ai_action(
        self, group_id: str, host_id: str,
        action: str, description: str, data: Dict = None
    ):
        """Notify host about an AI action taken in the group."""
        await self.send_update(
            group_id=group_id,
            host_id=host_id,
            update_type="ai_action",
            title=f"AI Action: {action}",
            message=description,
            data=data or {},
            priority="low",
        )

    async def notify_member_inactive(
        self, group_id: str, host_id: str,
        member_name: str, days_inactive: int
    ):
        """Notify host about inactive members."""
        await self.send_update(
            group_id=group_id,
            host_id=host_id,
            update_type="member_activity",
            title="Inactive Member",
            message=f"{member_name} hasn't played in {days_inactive} days",
            priority="low",
        )

    # ==================== Helper Methods ====================

    async def get_host_updates(
        self, group_id: str, host_id: str, limit: int = 20, unread_only: bool = False
    ) -> List[Dict]:
        """Get host updates feed."""
        if not self.db:
            return []

        query = {"group_id": group_id, "host_id": host_id}
        if unread_only:
            query["read"] = False

        updates = await self.db.host_updates.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(limit)
        return updates

    async def mark_read(self, update_id: str, host_id: str):
        """Mark a host update as read."""
        if self.db:
            await self.db.host_updates.update_one(
                {"update_id": update_id, "host_id": host_id},
                {"$set": {"read": True}}
            )

    async def mark_all_read(self, group_id: str, host_id: str):
        """Mark all updates for a group as read."""
        if self.db:
            await self.db.host_updates.update_many(
                {"group_id": group_id, "host_id": host_id, "read": False},
                {"$set": {"read": True}}
            )

    async def _send_push(self, user_id: str, title: str, message: str, data: Dict = None):
        """Send push notification via Expo."""
        try:
            if not self.db:
                return
            # Look up user's push token
            user = await self.db.users.find_one(
                {"user_id": user_id},
                {"_id": 0, "push_token": 1}
            )
            push_token = user.get("push_token") if user else None
            if not push_token:
                return

            # Use the existing push notification function
            from server import send_push_notification_to_user
            await send_push_notification_to_user(
                user_id=user_id,
                title=title,
                body=message,
                data=data or {}
            )
        except Exception as e:
            logger.debug(f"Push notification failed: {e}")
