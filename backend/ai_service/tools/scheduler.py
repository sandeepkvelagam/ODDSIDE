"""
Scheduler Tool

Manages game scheduling, RSVPs, reminders, and calendar integration.
"""

from typing import List, Dict, Optional
from .base import BaseTool, ToolResult
from datetime import datetime, timedelta
import uuid


class SchedulerTool(BaseTool):
    """
    Manages scheduling and reminders for poker games.

    Capabilities:
    - Schedule games
    - Send RSVP requests
    - Manage player availability
    - Set up automated reminders
    - Find optimal game times based on player availability
    """

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "scheduler"

    @property
    def description(self) -> str:
        return """Manages game scheduling and reminders.
        Can schedule games, collect RSVPs, set reminders, and find optimal times.
        Use this for any scheduling-related tasks."""

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": [
                        "schedule_game",
                        "send_rsvp_request",
                        "get_rsvp_status",
                        "set_reminder",
                        "find_optimal_time",
                        "get_upcoming_games"
                    ],
                    "description": "The scheduling action to perform"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID for game-specific actions"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID for group-level actions"
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID for user-specific actions"
                },
                "scheduled_time": {
                    "type": "string",
                    "format": "date-time",
                    "description": "Scheduled date/time for the game"
                },
                "reminder_minutes_before": {
                    "type": "integer",
                    "description": "Minutes before game to send reminder",
                    "default": 60
                },
                "available_times": {
                    "type": "array",
                    "items": {"type": "string", "format": "date-time"},
                    "description": "List of available times for scheduling"
                }
            },
            "required": ["action"]
        }

    async def execute(
        self,
        action: str,
        game_id: str = None,
        group_id: str = None,
        user_id: str = None,
        scheduled_time: str = None,
        reminder_minutes_before: int = 60,
        available_times: List[str] = None
    ) -> ToolResult:
        """Execute scheduling action"""
        try:
            if action == "schedule_game":
                return await self._schedule_game(game_id, scheduled_time)
            elif action == "send_rsvp_request":
                return await self._send_rsvp_request(game_id)
            elif action == "get_rsvp_status":
                return await self._get_rsvp_status(game_id)
            elif action == "set_reminder":
                return await self._set_reminder(game_id, reminder_minutes_before)
            elif action == "find_optimal_time":
                return await self._find_optimal_time(group_id, available_times)
            elif action == "get_upcoming_games":
                return await self._get_upcoming_games(group_id, user_id)
            else:
                return ToolResult(
                    success=False,
                    error=f"Unknown action: {action}"
                )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e)
            )

    async def _schedule_game(self, game_id: str, scheduled_time: str) -> ToolResult:
        """Schedule a game for a specific time"""
        if not game_id or not scheduled_time:
            return ToolResult(
                success=False,
                error="game_id and scheduled_time are required"
            )

        if self.db:
            result = await self.db.game_nights.update_one(
                {"game_id": game_id},
                {"$set": {"scheduled_time": scheduled_time}}
            )
            if result.modified_count > 0:
                return ToolResult(
                    success=True,
                    data={"game_id": game_id, "scheduled_time": scheduled_time},
                    message=f"Game scheduled for {scheduled_time}"
                )

        return ToolResult(
            success=False,
            error="Could not schedule game"
        )

    async def _send_rsvp_request(self, game_id: str) -> ToolResult:
        """Send RSVP requests to all invited players"""
        if not game_id:
            return ToolResult(
                success=False,
                error="game_id is required"
            )

        if self.db:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "players": 1, "title": 1, "scheduled_time": 1}
            )
            if game:
                players = game.get("players", [])
                pending_rsvp = [p for p in players if p.get("rsvp_status") == "invited"]

                # Create notifications for pending RSVPs
                for player in pending_rsvp:
                    notification = {
                        "notification_id": str(uuid.uuid4()),
                        "user_id": player["user_id"],
                        "title": f"RSVP: {game.get('title', 'Poker Night')}",
                        "message": f"You're invited! Game scheduled for {game.get('scheduled_time', 'TBD')}",
                        "type": "rsvp_request",
                        "data": {"game_id": game_id},
                        "read": False,
                        "created_at": datetime.utcnow()
                    }
                    await self.db.notifications.insert_one(notification)

                return ToolResult(
                    success=True,
                    data={"sent_to": len(pending_rsvp)},
                    message=f"RSVP requests sent to {len(pending_rsvp)} players"
                )

        return ToolResult(
            success=False,
            error="Game not found"
        )

    async def _get_rsvp_status(self, game_id: str) -> ToolResult:
        """Get RSVP status for all players"""
        if not game_id:
            return ToolResult(
                success=False,
                error="game_id is required"
            )

        if self.db:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "players": 1}
            )
            if game:
                players = game.get("players", [])
                status = {
                    "confirmed": len([p for p in players if p.get("rsvp_status") == "confirmed"]),
                    "declined": len([p for p in players if p.get("rsvp_status") == "declined"]),
                    "pending": len([p for p in players if p.get("rsvp_status") in ["invited", "pending"]]),
                    "total": len(players),
                    "players": players
                }
                return ToolResult(
                    success=True,
                    data=status,
                    message=f"{status['confirmed']} confirmed, {status['pending']} pending"
                )

        return ToolResult(
            success=False,
            error="Game not found"
        )

    async def _set_reminder(self, game_id: str, minutes_before: int) -> ToolResult:
        """Set up a reminder for a game"""
        if not game_id:
            return ToolResult(
                success=False,
                error="game_id is required"
            )

        if self.db:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "scheduled_time": 1, "players": 1}
            )
            if game and game.get("scheduled_time"):
                scheduled = datetime.fromisoformat(game["scheduled_time"].replace("Z", "+00:00"))
                reminder_time = scheduled - timedelta(minutes=minutes_before)

                reminder = {
                    "reminder_id": str(uuid.uuid4()),
                    "game_id": game_id,
                    "scheduled_for": reminder_time,
                    "minutes_before": minutes_before,
                    "sent": False,
                    "created_at": datetime.utcnow()
                }
                await self.db.reminders.insert_one(reminder)

                return ToolResult(
                    success=True,
                    data={"reminder_time": reminder_time.isoformat(), "minutes_before": minutes_before},
                    message=f"Reminder set for {minutes_before} minutes before game"
                )

        return ToolResult(
            success=False,
            error="Could not set reminder"
        )

    async def _find_optimal_time(self, group_id: str, available_times: List[str]) -> ToolResult:
        """Find optimal time based on player availability"""
        # This would integrate with calendar APIs in a full implementation
        return ToolResult(
            success=True,
            data={
                "suggested_times": available_times[:3] if available_times else [],
                "note": "Calendar integration not yet implemented"
            },
            message="Suggested times based on availability"
        )

    async def _get_upcoming_games(self, group_id: str = None, user_id: str = None) -> ToolResult:
        """Get upcoming games for a group or user"""
        if not self.db:
            return ToolResult(
                success=False,
                error="Database not available"
            )

        query = {"status": "scheduled", "scheduled_time": {"$gte": datetime.utcnow()}}
        if group_id:
            query["group_id"] = group_id
        if user_id:
            query["players.user_id"] = user_id

        games = await self.db.game_nights.find(
            query,
            {"_id": 0}
        ).sort("scheduled_time", 1).limit(10).to_list(10)

        return ToolResult(
            success=True,
            data={"games": games, "count": len(games)},
            message=f"Found {len(games)} upcoming games"
        )
