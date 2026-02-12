"""
Host Decision Tool

Manages the decision queue for hosts to approve/reject game actions.
This enables the Host Persona to queue decisions that require host approval
while continuing autonomous operations for other tasks.
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from .base import BaseTool, ToolResult
import uuid


class HostDecisionTool(BaseTool):
    """
    Manages host decision queue for game approvals.

    Capabilities:
    - Queue decisions for host approval (join requests, buy-ins, cash-outs)
    - Get pending decisions for a host
    - Approve/reject decisions
    - Auto-expire old decisions
    - Bulk approve decisions
    """

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "host_decision"

    @property
    def description(self) -> str:
        return """Manages the host decision queue for game approvals.
        Use this to queue decisions that need host approval, check pending decisions,
        and process approvals/rejections. Supports join requests, buy-ins, cash-outs,
        and game end confirmations."""

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": [
                        "queue_decision",
                        "get_pending",
                        "approve",
                        "reject",
                        "bulk_approve",
                        "expire_old"
                    ],
                    "description": "The decision management action to perform"
                },
                "host_id": {
                    "type": "string",
                    "description": "Host user ID"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID for the decision"
                },
                "decision_id": {
                    "type": "string",
                    "description": "Specific decision ID (for approve/reject)"
                },
                "decision_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of decision IDs for bulk operations"
                },
                "decision_type": {
                    "type": "string",
                    "enum": ["join_request", "buy_in", "cash_out", "end_game", "chip_correction"],
                    "description": "Type of decision"
                },
                "context": {
                    "type": "object",
                    "description": "Decision context (player_id, amount, chips, etc.)"
                },
                "recommendation": {
                    "type": "string",
                    "description": "AI recommendation for the host"
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for rejection"
                },
                "expires_minutes": {
                    "type": "integer",
                    "description": "Minutes until decision expires (default: 30)",
                    "default": 30
                }
            },
            "required": ["action"]
        }

    async def execute(
        self,
        action: str,
        host_id: str = None,
        game_id: str = None,
        decision_id: str = None,
        decision_ids: List[str] = None,
        decision_type: str = None,
        context: Dict = None,
        recommendation: str = None,
        reason: str = None,
        expires_minutes: int = 30
    ) -> ToolResult:
        """Execute host decision action"""
        try:
            if action == "queue_decision":
                return await self._queue_decision(
                    host_id, game_id, decision_type, context, recommendation, expires_minutes
                )
            elif action == "get_pending":
                return await self._get_pending(host_id, game_id)
            elif action == "approve":
                return await self._approve(decision_id)
            elif action == "reject":
                return await self._reject(decision_id, reason)
            elif action == "bulk_approve":
                return await self._bulk_approve(decision_ids)
            elif action == "expire_old":
                return await self._expire_old()
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

    async def _queue_decision(
        self,
        host_id: str,
        game_id: str,
        decision_type: str,
        context: Dict,
        recommendation: str,
        expires_minutes: int
    ) -> ToolResult:
        """Queue a decision for host approval"""
        if not host_id or not game_id or not decision_type:
            return ToolResult(
                success=False,
                error="host_id, game_id, and decision_type are required"
            )

        context = context or {}
        decision = {
            "decision_id": str(uuid.uuid4()),
            "host_id": host_id,
            "game_id": game_id,
            "decision_type": decision_type,
            "context": context,
            "recommendation": recommendation,
            "status": "pending",
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(minutes=expires_minutes)
        }

        # Add player info to context for display
        if context.get("player_id") and self.db:
            player = await self.db.users.find_one(
                {"user_id": context["player_id"]},
                {"_id": 0, "name": 1, "email": 1}
            )
            if player:
                decision["player_name"] = player.get("name") or player.get("email", "Unknown")

        if self.db:
            await self.db.host_decisions.insert_one(decision)

            # Also create a notification for the host
            notification = {
                "notification_id": str(uuid.uuid4()),
                "user_id": host_id,
                "title": self._get_notification_title(decision_type),
                "message": self._get_notification_message(decision_type, context, decision.get("player_name")),
                "type": "host_decision",
                "data": {
                    "decision_id": decision["decision_id"],
                    "decision_type": decision_type,
                    "game_id": game_id,
                    "recommendation": recommendation
                },
                "read": False,
                "created_at": datetime.utcnow()
            }
            await self.db.notifications.insert_one(notification)

        return ToolResult(
            success=True,
            data={
                "decision_id": decision["decision_id"],
                "decision_type": decision_type,
                "expires_at": decision["expires_at"].isoformat()
            },
            message=f"Decision queued for host approval: {decision_type}"
        )

    async def _get_pending(self, host_id: str = None, game_id: str = None) -> ToolResult:
        """Get pending decisions for a host or game"""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        query = {"status": "pending", "expires_at": {"$gt": datetime.utcnow()}}
        if host_id:
            query["host_id"] = host_id
        if game_id:
            query["game_id"] = game_id

        decisions = await self.db.host_decisions.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).to_list(50)

        # Group by type for easier display
        grouped = {
            "join_request": [],
            "buy_in": [],
            "cash_out": [],
            "end_game": [],
            "chip_correction": []
        }
        for d in decisions:
            dtype = d.get("decision_type", "other")
            if dtype in grouped:
                grouped[dtype].append(d)

        return ToolResult(
            success=True,
            data={
                "decisions": decisions,
                "grouped": grouped,
                "total": len(decisions)
            },
            message=f"Found {len(decisions)} pending decisions"
        )

    async def _approve(self, decision_id: str) -> ToolResult:
        """Approve a decision"""
        if not decision_id:
            return ToolResult(success=False, error="decision_id is required")

        if not self.db:
            return ToolResult(success=False, error="Database not available")

        # Get the decision
        decision = await self.db.host_decisions.find_one(
            {"decision_id": decision_id, "status": "pending"}
        )

        if not decision:
            return ToolResult(success=False, error="Decision not found or already processed")

        # Update status
        await self.db.host_decisions.update_one(
            {"decision_id": decision_id},
            {
                "$set": {
                    "status": "approved",
                    "processed_at": datetime.utcnow()
                }
            }
        )

        # Execute the approved action
        result = await self._execute_approved_action(decision)

        return ToolResult(
            success=True,
            data={
                "decision_id": decision_id,
                "decision_type": decision.get("decision_type"),
                "action_result": result
            },
            message=f"Decision approved: {decision.get('decision_type')}"
        )

    async def _reject(self, decision_id: str, reason: str = None) -> ToolResult:
        """Reject a decision"""
        if not decision_id:
            return ToolResult(success=False, error="decision_id is required")

        if not self.db:
            return ToolResult(success=False, error="Database not available")

        decision = await self.db.host_decisions.find_one(
            {"decision_id": decision_id, "status": "pending"}
        )

        if not decision:
            return ToolResult(success=False, error="Decision not found or already processed")

        await self.db.host_decisions.update_one(
            {"decision_id": decision_id},
            {
                "$set": {
                    "status": "rejected",
                    "rejection_reason": reason,
                    "processed_at": datetime.utcnow()
                }
            }
        )

        # Notify the player of rejection
        player_id = decision.get("context", {}).get("player_id")
        if player_id:
            notification = {
                "notification_id": str(uuid.uuid4()),
                "user_id": player_id,
                "title": f"Request Declined",
                "message": self._get_rejection_message(decision.get("decision_type"), reason),
                "type": "request_rejected",
                "data": {
                    "decision_type": decision.get("decision_type"),
                    "game_id": decision.get("game_id"),
                    "reason": reason
                },
                "read": False,
                "created_at": datetime.utcnow()
            }
            await self.db.notifications.insert_one(notification)

        return ToolResult(
            success=True,
            data={"decision_id": decision_id, "reason": reason},
            message=f"Decision rejected: {decision.get('decision_type')}"
        )

    async def _bulk_approve(self, decision_ids: List[str]) -> ToolResult:
        """Approve multiple decisions at once"""
        if not decision_ids:
            return ToolResult(success=False, error="decision_ids are required")

        approved = []
        failed = []

        for did in decision_ids:
            result = await self._approve(did)
            if result.success:
                approved.append(did)
            else:
                failed.append({"decision_id": did, "error": result.error})

        return ToolResult(
            success=len(failed) == 0,
            data={
                "approved": approved,
                "failed": failed,
                "total_approved": len(approved),
                "total_failed": len(failed)
            },
            message=f"Bulk approved {len(approved)} decisions, {len(failed)} failed"
        )

    async def _expire_old(self) -> ToolResult:
        """Expire old pending decisions"""
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        result = await self.db.host_decisions.update_many(
            {
                "status": "pending",
                "expires_at": {"$lt": datetime.utcnow()}
            },
            {
                "$set": {
                    "status": "expired",
                    "processed_at": datetime.utcnow()
                }
            }
        )

        return ToolResult(
            success=True,
            data={"expired_count": result.modified_count},
            message=f"Expired {result.modified_count} old decisions"
        )

    async def _execute_approved_action(self, decision: Dict) -> Dict:
        """Execute the action for an approved decision"""
        decision_type = decision.get("decision_type")
        context = decision.get("context", {})
        game_id = decision.get("game_id")

        if not self.db:
            return {"success": False, "error": "Database not available"}

        if decision_type == "join_request":
            # Add player to game
            player_entry = {
                "user_id": context.get("player_id"),
                "status": "active",
                "chips": 0,
                "total_buy_in": 0,
                "joined_at": datetime.utcnow()
            }
            await self.db.game_nights.update_one(
                {"game_id": game_id},
                {"$push": {"players": player_entry}}
            )
            return {"action": "player_added", "player_id": context.get("player_id")}

        elif decision_type == "buy_in":
            # Process buy-in
            amount = context.get("amount", 0)
            chips = context.get("chips", 0)
            player_id = context.get("player_id")

            await self.db.game_nights.update_one(
                {"game_id": game_id, "players.user_id": player_id},
                {
                    "$inc": {
                        "players.$.chips": chips,
                        "players.$.total_buy_in": amount
                    }
                }
            )
            return {"action": "buy_in_processed", "amount": amount, "chips": chips}

        elif decision_type == "cash_out":
            # Process cash-out
            chips = context.get("chips", 0)
            player_id = context.get("player_id")

            # Get game to calculate cash value
            game = await self.db.game_nights.find_one({"game_id": game_id})
            chip_value = game.get("chip_value", 1) if game else 1
            cash_amount = chips * chip_value

            await self.db.game_nights.update_one(
                {"game_id": game_id, "players.user_id": player_id},
                {
                    "$set": {
                        "players.$.chips": 0,
                        "players.$.cashed_out": True,
                        "players.$.chips_returned": chips,
                        "players.$.cash_out_amount": cash_amount,
                        "players.$.cashed_out_at": datetime.utcnow()
                    }
                }
            )
            return {"action": "cash_out_processed", "chips": chips, "amount": cash_amount}

        elif decision_type == "end_game":
            # End the game
            await self.db.game_nights.update_one(
                {"game_id": game_id},
                {
                    "$set": {
                        "status": "ended",
                        "ended_at": datetime.utcnow()
                    }
                }
            )
            return {"action": "game_ended"}

        elif decision_type == "chip_correction":
            # Apply chip correction
            player_id = context.get("player_id")
            new_chips = context.get("new_chips", 0)

            await self.db.game_nights.update_one(
                {"game_id": game_id, "players.user_id": player_id},
                {"$set": {"players.$.chips": new_chips}}
            )
            return {"action": "chips_corrected", "new_chips": new_chips}

        return {"action": "unknown", "decision_type": decision_type}

    def _get_notification_title(self, decision_type: str) -> str:
        """Get notification title for decision type"""
        titles = {
            "join_request": "Join Request",
            "buy_in": "Buy-In Request",
            "cash_out": "Cash-Out Request",
            "end_game": "End Game Request",
            "chip_correction": "Chip Correction Needed"
        }
        return titles.get(decision_type, "Host Decision Needed")

    def _get_notification_message(self, decision_type: str, context: Dict, player_name: str = None) -> str:
        """Get notification message for decision type"""
        player = player_name or "A player"

        if decision_type == "join_request":
            return f"{player} wants to join the game"
        elif decision_type == "buy_in":
            amount = context.get("amount", 0)
            return f"{player} requested ${amount} buy-in"
        elif decision_type == "cash_out":
            chips = context.get("chips", 0)
            return f"{player} wants to cash out {chips} chips"
        elif decision_type == "end_game":
            return "Game end requested"
        elif decision_type == "chip_correction":
            return f"Chip correction needed for {player}"

        return "Action requires your approval"

    def _get_rejection_message(self, decision_type: str, reason: str = None) -> str:
        """Get rejection message for player notification"""
        base = {
            "join_request": "Your join request was declined",
            "buy_in": "Your buy-in request was declined",
            "cash_out": "Your cash-out request was declined"
        }.get(decision_type, "Your request was declined")

        if reason:
            return f"{base}: {reason}"
        return base
