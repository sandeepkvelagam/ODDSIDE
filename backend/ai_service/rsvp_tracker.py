"""
RSVP Tracker Service

Tracks game RSVPs, detects stale polls, re-proposes times,
and suggests backup players when someone declines.

Workflow:
1. Game created → track RSVP status per player
2. Player confirms/declines → update tracking, notify host
3. If someone declines → suggest backup players from group
4. Poll expires with no winner → re-propose with new options
5. Game approaches with missing RSVPs → send reminders
"""

import logging
import uuid
from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


class RSVPTrackerService:
    """
    Tracks RSVPs, handles declines with backup suggestions,
    and re-proposes times when polls stall.
    """

    # How long to wait before re-proposing
    STALE_POLL_HOURS = 24
    # Minimum responses before considering re-proposal
    MIN_RESPONSES_FOR_RESOLVE = 3

    def __init__(self, db=None, host_update_service=None):
        self.db = db
        self.host_update_service = host_update_service

    # ==================== RSVP Tracking ====================

    async def track_rsvp(
        self, game_id: str, player_id: str, response: str, group_id: str = None
    ) -> Dict:
        """
        Track an RSVP response for a game.

        Args:
            game_id: The game being RSVPed to
            player_id: The player responding
            response: "confirmed", "declined", or "maybe"
            group_id: The group (for host notifications)
        """
        if self.db is None:
            return {"error": "no database"}

        # Update player RSVP in game
        await self.db.game_nights.update_one(
            {"game_id": game_id, "players.user_id": player_id},
            {"$set": {"players.$.rsvp_status": response}}
        )

        # Get game info
        game = await self.db.game_nights.find_one(
            {"game_id": game_id},
            {"_id": 0, "group_id": 1, "title": 1, "players": 1}
        )
        if not game:
            return {"error": "game not found"}

        group_id = group_id or game.get("group_id")
        players = game.get("players", [])

        # Calculate RSVP stats
        stats = self._calc_rsvp_stats(players)

        # Notify host
        if self.host_update_service and group_id:
            host = await self._get_group_host(group_id)
            if host:
                await self.host_update_service.notify_rsvp_update(
                    group_id=group_id,
                    host_id=host,
                    confirmed=stats["confirmed"],
                    declined=stats["declined"],
                    pending=stats["pending"],
                    maybe=stats["maybe"],
                    game_title=game.get("title", "Game Night")
                )

        # If someone declined, suggest backup players
        if response == "declined":
            backups = await self.suggest_backup_players(group_id, game_id)
            if backups and self.host_update_service:
                host = await self._get_group_host(group_id)
                if host:
                    names = [b["name"] for b in backups[:3]]
                    player_name = await self._get_player_name(player_id)
                    await self.host_update_service.send_update(
                        group_id=group_id,
                        host_id=host,
                        update_type="backup_suggestion",
                        title=f"{player_name} Can't Make It",
                        message=f"Want me to invite {', '.join(names)} as backup?",
                        data={"declined_player": player_id, "backup_ids": [b["user_id"] for b in backups[:3]]},
                        priority="normal"
                    )

        return {"status": "tracked", "stats": stats}

    # ==================== Backup Player Suggestions ====================

    async def suggest_backup_players(
        self, group_id: str, game_id: str, max_suggestions: int = 3
    ) -> List[Dict]:
        """
        Suggest backup players from the group who aren't already in the game.

        Prioritizes by:
        1. Most games played (active members)
        2. Not recently invited and declined
        3. Not the host
        """
        if self.db is None:
            return []

        # Get current game players
        game = await self.db.game_nights.find_one(
            {"game_id": game_id},
            {"_id": 0, "players": 1}
        )
        if not game:
            return []

        current_player_ids = set(p["user_id"] for p in game.get("players", []))

        # Get all group members not in the game
        members = await self.db.group_members.find(
            {"group_id": group_id, "user_id": {"$nin": list(current_player_ids)}, "status": "active"},
            {"_id": 0, "user_id": 1}
        ).to_list(50)

        if not members:
            return []

        candidate_ids = [m["user_id"] for m in members]

        # Score candidates by game participation
        scored = []
        for uid in candidate_ids:
            # Count recent games
            game_count = await self.db.players.count_documents({
                "user_id": uid,
                "group_id": group_id
            })

            user = await self.db.users.find_one(
                {"user_id": uid},
                {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
            )
            if user:
                scored.append({
                    "user_id": uid,
                    "name": user.get("name", "Unknown"),
                    "picture": user.get("picture"),
                    "games_played": game_count,
                })

        # Sort by most active
        scored.sort(key=lambda x: x["games_played"], reverse=True)
        return scored[:max_suggestions]

    # ==================== Poll Re-proposal ====================

    async def check_stale_polls(self, group_id: str) -> List[Dict]:
        """
        Check for stale polls (active but with few responses after threshold).
        Returns list of polls that need re-proposal.
        """
        if self.db is None:
            return []

        threshold = datetime.now(timezone.utc) - timedelta(hours=self.STALE_POLL_HOURS)

        # Find active polls created before threshold
        stale_polls = await self.db.polls.find({
            "group_id": group_id,
            "status": "active",
            "created_at": {"$lt": threshold.isoformat()}
        }, {"_id": 0}).to_list(10)

        needs_reproposal = []
        for poll in stale_polls:
            total_votes = sum(len(opt.get("votes", [])) for opt in poll.get("options", []))
            if total_votes < self.MIN_RESPONSES_FOR_RESOLVE:
                needs_reproposal.append(poll)

        return needs_reproposal

    async def repropose_poll(self, group_id: str, old_poll_id: str) -> Optional[Dict]:
        """
        Close a stale poll and create a new one with adjusted options.
        Posts a message in group chat about the re-proposal.
        """
        if self.db is None:
            return None

        # Close the old poll
        old_poll = await self.db.polls.find_one({"poll_id": old_poll_id}, {"_id": 0})
        if not old_poll:
            return None

        await self.db.polls.update_one(
            {"poll_id": old_poll_id},
            {"$set": {"status": "closed", "closed_at": datetime.now(timezone.utc).isoformat()}}
        )

        # Generate new options based on SmartScheduler
        try:
            from .smart_scheduler import SmartSchedulerService
            from .context_provider import ContextProvider

            ctx_provider = ContextProvider(db=self.db)
            external_context = await ctx_provider.get_context(group_id=group_id)

            scheduler = SmartSchedulerService(db=self.db, context_provider=ctx_provider)
            suggestions = await scheduler.suggest_times(
                group_id=group_id,
                num_suggestions=4,
                external_context=external_context
            )

            new_options = []
            for s in suggestions:
                new_options.append({
                    "option_id": f"opt_{uuid.uuid4().hex[:8]}",
                    "label": s.get("label", s.get("day_label", "TBD")),
                    "votes": []
                })
        except Exception as e:
            logger.error(f"Smart scheduler failed for re-proposal: {e}")
            # Fallback: shift original options by a week
            new_options = []
            for opt in old_poll.get("options", []):
                new_options.append({
                    "option_id": f"opt_{uuid.uuid4().hex[:8]}",
                    "label": f"{opt['label']} (next week)",
                    "votes": []
                })

        if not new_options:
            return None

        # Create new poll
        new_poll_id = f"poll_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        new_poll = {
            "poll_id": new_poll_id,
            "group_id": group_id,
            "created_by": "ai_assistant",
            "type": "availability",
            "question": "Previous poll didn't get enough responses. When works better?",
            "options": new_options,
            "status": "active",
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=48)).isoformat(),
            "winning_option": None,
            "message_id": None,
            "game_id": None,
            "created_at": now,
            "closed_at": None,
        }
        await self.db.polls.insert_one(new_poll)

        # Post re-proposal message in group chat
        option_labels = [opt["label"] for opt in new_options]
        msg_content = (
            f"The last poll didn't get enough votes, so let's try again! "
            f"New options:\n" + "\n".join(f"  {i+1}. {lbl}" for i, lbl in enumerate(option_labels))
        )

        msg_id = f"gmsg_{uuid.uuid4().hex[:12]}"
        msg_doc = {
            "message_id": msg_id,
            "group_id": group_id,
            "user_id": "ai_assistant",
            "content": msg_content,
            "type": "ai",
            "reply_to": None,
            "metadata": {"poll_id": new_poll_id, "reproposal_of": old_poll_id},
            "created_at": now,
            "edited_at": None,
            "deleted": False,
        }
        await self.db.group_messages.insert_one(msg_doc)

        # Update poll with message_id
        await self.db.polls.update_one(
            {"poll_id": new_poll_id},
            {"$set": {"message_id": msg_id}}
        )

        # Broadcast
        try:
            from websocket_manager import emit_group_message
            await emit_group_message(group_id, {
                **msg_doc,
                "user": {"user_id": "ai_assistant", "name": "ODDSIDE", "picture": None},
                "poll": new_poll
            })
        except Exception as e:
            logger.debug(f"WebSocket emit failed: {e}")

        # Notify host
        if self.host_update_service:
            host = await self._get_group_host(group_id)
            if host:
                await self.host_update_service.notify_ai_action(
                    group_id=group_id,
                    host_id=host,
                    action="Poll Re-proposed",
                    description="Previous poll had low engagement. Created new poll with updated time options.",
                    data={"old_poll_id": old_poll_id, "new_poll_id": new_poll_id}
                )

        return new_poll

    # ==================== Reminder Logic ====================

    async def send_rsvp_reminders(self, game_id: str) -> int:
        """
        Send reminders to players who haven't RSVPed.
        Returns number of reminders sent.
        """
        if self.db is None:
            return 0

        game = await self.db.game_nights.find_one(
            {"game_id": game_id},
            {"_id": 0, "players": 1, "title": 1, "group_id": 1}
        )
        if not game:
            return 0

        pending_players = [
            p for p in game.get("players", [])
            if p.get("rsvp_status") in ("invited", "pending", None)
        ]

        if not pending_players:
            return 0

        # Send notification to each pending player
        for player in pending_players:
            notification = {
                "notification_id": f"ntf_{uuid.uuid4().hex[:12]}",
                "user_id": player["user_id"],
                "type": "rsvp_reminder",
                "title": f"RSVP Reminder: {game.get('title', 'Game Night')}",
                "message": "Are you in? The group is waiting on your response!",
                "data": {"game_id": game_id},
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await self.db.notifications.insert_one(notification)

        return len(pending_players)

    # ==================== Helpers ====================

    def _calc_rsvp_stats(self, players: List[Dict]) -> Dict:
        """Calculate RSVP statistics."""
        confirmed = sum(1 for p in players if p.get("rsvp_status") == "confirmed")
        declined = sum(1 for p in players if p.get("rsvp_status") == "declined")
        maybe = sum(1 for p in players if p.get("rsvp_status") == "maybe")
        pending = len(players) - confirmed - declined - maybe
        return {
            "confirmed": confirmed,
            "declined": declined,
            "maybe": maybe,
            "pending": pending,
            "total": len(players)
        }

    async def _get_group_host(self, group_id: str) -> Optional[str]:
        """Get the group admin/host user_id."""
        if self.db is None:
            return None
        admin = await self.db.group_members.find_one(
            {"group_id": group_id, "role": "admin"},
            {"_id": 0, "user_id": 1}
        )
        return admin["user_id"] if admin else None

    async def _get_player_name(self, user_id: str) -> str:
        """Get a player's display name."""
        if self.db is None:
            return "A player"
        user = await self.db.users.find_one(
            {"user_id": user_id},
            {"_id": 0, "name": 1}
        )
        return user.get("name", "A player") if user else "A player"
