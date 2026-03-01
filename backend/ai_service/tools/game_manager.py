"""
Game Manager Tool

Manages poker game lifecycle: creation, invites, status updates, settlements.
"""

from typing import List, Dict, Optional
from .base import BaseTool, ToolResult
from datetime import datetime
import uuid


class GameManagerTool(BaseTool):
    """
    Manages poker game operations.

    Capabilities:
    - Create new games
    - Invite players
    - Start/end games
    - Manage buy-ins and cash-outs
    - Generate settlements
    """

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "game_manager"

    @property
    def description(self) -> str:
        return """Manages poker game operations including creating games, inviting players,
        starting/ending games, managing buy-ins, and generating settlements.
        Use this for any game management tasks."""

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": [
                        "create_game",
                        "invite_players",
                        "start_game",
                        "end_game",
                        "get_game_status",
                        "get_player_stats",
                        "generate_settlement_preview"
                    ],
                    "description": "The game management action to perform"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID (required for most actions except create)"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID (required for create_game)"
                },
                "host_id": {
                    "type": "string",
                    "description": "Host user ID (required for create_game)"
                },
                "player_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of player user IDs to invite"
                },
                "game_config": {
                    "type": "object",
                    "description": "Game configuration (buy_in_amount, chips_per_buy_in, etc.)",
                    "properties": {
                        "title": {"type": "string"},
                        "scheduled_time": {"type": "string", "format": "date-time"},
                        "buy_in_amount": {"type": "number"},
                        "chips_per_buy_in": {"type": "integer"},
                        "max_players": {"type": "integer"}
                    }
                }
            },
            "required": ["action"]
        }

    async def execute(
        self,
        action: str,
        game_id: str = None,
        group_id: str = None,
        host_id: str = None,
        player_ids: List[str] = None,
        game_config: Dict = None
    ) -> ToolResult:
        """Execute game management action"""
        try:
            if action == "create_game":
                return await self._create_game(group_id, host_id, game_config)
            elif action == "invite_players":
                return await self._invite_players(game_id, player_ids)
            elif action == "start_game":
                return await self._start_game(game_id)
            elif action == "end_game":
                return await self._end_game(game_id)
            elif action == "get_game_status":
                return await self._get_game_status(game_id)
            elif action == "get_player_stats":
                return await self._get_player_stats(game_id)
            elif action == "generate_settlement_preview":
                return await self._generate_settlement_preview(game_id)
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

    async def _create_game(self, group_id: str, host_id: str, config: Dict = None) -> ToolResult:
        """Create a new game"""
        if not group_id or not host_id:
            return ToolResult(
                success=False,
                error="group_id and host_id are required"
            )

        config = config or {}
        game = {
            "game_id": str(uuid.uuid4()),
            "group_id": group_id,
            "host_id": host_id,
            "title": config.get("title", "Poker Night"),
            "status": "scheduled",
            "buy_in_amount": config.get("buy_in_amount", 20),
            "chips_per_buy_in": config.get("chips_per_buy_in", 20),
            "max_players": config.get("max_players", 10),
            "scheduled_time": config.get("scheduled_time"),
            "created_at": datetime.utcnow(),
            "players": []
        }

        if self.db is not None:
            await self.db.game_nights.insert_one(game)

        return ToolResult(
            success=True,
            data={"game_id": game["game_id"], "game": game},
            message=f"Game '{game['title']}' created successfully"
        )

    async def _invite_players(self, game_id: str, player_ids: List[str]) -> ToolResult:
        """Invite players to a game"""
        if not game_id or not player_ids:
            return ToolResult(
                success=False,
                error="game_id and player_ids are required"
            )

        invited = []
        for player_id in player_ids:
            player_entry = {
                "user_id": player_id,
                "rsvp_status": "invited",
                "invited_at": datetime.utcnow()
            }
            invited.append(player_entry)

            if self.db is not None:
                await self.db.game_nights.update_one(
                    {"game_id": game_id},
                    {"$push": {"players": player_entry}}
                )

        return ToolResult(
            success=True,
            data={"invited_count": len(invited), "players": invited},
            message=f"Invited {len(invited)} players to the game"
        )

    async def _get_game_status(self, game_id: str) -> ToolResult:
        """Get current game status"""
        if not game_id:
            return ToolResult(
                success=False,
                error="game_id is required"
            )

        if self.db is not None:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0}
            )
            if game:
                return ToolResult(
                    success=True,
                    data=game,
                    message=f"Game status: {game.get('status', 'unknown')}"
                )

        return ToolResult(
            success=False,
            error="Game not found"
        )

    async def _start_game(self, game_id: str) -> ToolResult:
        """Start a game"""
        if not game_id:
            return ToolResult(
                success=False,
                error="game_id is required"
            )

        if self.db is not None:
            result = await self.db.game_nights.update_one(
                {"game_id": game_id, "status": "scheduled"},
                {
                    "$set": {
                        "status": "active",
                        "started_at": datetime.utcnow()
                    }
                }
            )
            if result.modified_count > 0:
                return ToolResult(
                    success=True,
                    data={"game_id": game_id, "status": "active"},
                    message="Game started successfully"
                )

        return ToolResult(
            success=False,
            error="Could not start game"
        )

    async def _end_game(self, game_id: str) -> ToolResult:
        """End a game"""
        if not game_id:
            return ToolResult(
                success=False,
                error="game_id is required"
            )

        if self.db is not None:
            result = await self.db.game_nights.update_one(
                {"game_id": game_id, "status": "active"},
                {
                    "$set": {
                        "status": "ended",
                        "ended_at": datetime.utcnow()
                    }
                }
            )
            if result.modified_count > 0:
                return ToolResult(
                    success=True,
                    data={"game_id": game_id, "status": "ended"},
                    message="Game ended successfully"
                )

        return ToolResult(
            success=False,
            error="Could not end game"
        )

    async def _get_player_stats(self, game_id: str) -> ToolResult:
        """Get player statistics for a game"""
        if not game_id:
            return ToolResult(
                success=False,
                error="game_id is required"
            )

        if self.db is not None:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "players": 1}
            )
            if game:
                players = game.get("players", [])
                stats = {
                    "total_players": len(players),
                    "total_buy_ins": sum(p.get("total_buy_in", 0) for p in players),
                    "total_chips": sum(p.get("total_chips", 0) for p in players),
                    "cashed_out": len([p for p in players if p.get("cashed_out")]),
                    "players": players
                }
                return ToolResult(
                    success=True,
                    data=stats,
                    message=f"Stats for {len(players)} players"
                )

        return ToolResult(
            success=False,
            error="Game not found"
        )

    async def _generate_settlement_preview(self, game_id: str) -> ToolResult:
        """Generate a settlement preview without committing"""
        if not game_id:
            return ToolResult(
                success=False,
                error="game_id is required"
            )

        if self.db is not None:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0}
            )
            if game:
                players = game.get("players", [])
                chip_value = game.get("chip_value", 1)

                settlements = []
                for player in players:
                    chips_returned = player.get("chips_returned", 0)
                    total_buy_in = player.get("total_buy_in", 0)
                    cash_out = chips_returned * chip_value
                    net_result = cash_out - total_buy_in

                    settlements.append({
                        "user_id": player.get("user_id"),
                        "total_buy_in": total_buy_in,
                        "chips_returned": chips_returned,
                        "cash_out": cash_out,
                        "net_result": net_result
                    })

                # Sort by net result
                settlements.sort(key=lambda x: x["net_result"], reverse=True)

                return ToolResult(
                    success=True,
                    data={
                        "settlements": settlements,
                        "chip_value": chip_value,
                        "total_pot": sum(s["total_buy_in"] for s in settlements)
                    },
                    message="Settlement preview generated"
                )

        return ToolResult(
            success=False,
            error="Game not found"
        )
