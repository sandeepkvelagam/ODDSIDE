"""
Auto Fixer Tool

Attempts to automatically resolve known feedback patterns by
delegating to existing tools (settlement recalculation, notification
resend, payment reconciliation, permission fixes).

Each fix is logged so the user can be notified of the resolution.
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class AutoFixerTool(BaseTool):
    """
    Applies known fixes for common user-reported issues.

    Supported fix types:
    - settlement_recheck: Re-run settlement calculation for a game
    - resend_notification: Check delivery status and resend notification
    - reconcile_payment: Cross-check ledger entries and reconcile
    - fix_permissions: Check membership/permissions and fix access
    """

    def __init__(self, db=None, tool_registry=None):
        self.db = db
        self.tool_registry = tool_registry

    @property
    def name(self) -> str:
        return "auto_fixer"

    @property
    def description(self) -> str:
        return (
            "Attempt to automatically fix known issues reported through user feedback: "
            "settlement rechecks, notification resends, payment reconciliation, and permission fixes"
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Fix type to attempt",
                    "enum": [
                        "settlement_recheck",
                        "resend_notification",
                        "reconcile_payment",
                        "fix_permissions",
                        "auto_fix"
                    ]
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID reporting the issue"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID related to the issue"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID related to the issue"
                },
                "feedback_id": {
                    "type": "string",
                    "description": "Feedback ID that triggered the fix"
                },
                "fix_type": {
                    "type": "string",
                    "description": "Auto-fix type from classifier"
                },
                "context": {
                    "type": "object",
                    "description": "Additional context for the fix"
                }
            },
            "required": ["action"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute auto-fix action."""
        action = kwargs.get("action")

        if action == "auto_fix":
            # Delegate to the right fix based on fix_type
            fix_type = kwargs.get("fix_type")
            if not fix_type:
                return ToolResult(success=False, error="fix_type required for auto_fix")
            action = fix_type

        if action == "settlement_recheck":
            return await self._fix_settlement(
                game_id=kwargs.get("game_id"),
                user_id=kwargs.get("user_id"),
                feedback_id=kwargs.get("feedback_id")
            )
        elif action == "resend_notification":
            return await self._fix_notification(
                user_id=kwargs.get("user_id"),
                context=kwargs.get("context", {})
            )
        elif action == "reconcile_payment":
            return await self._fix_payment(
                user_id=kwargs.get("user_id"),
                game_id=kwargs.get("game_id"),
                group_id=kwargs.get("group_id"),
                feedback_id=kwargs.get("feedback_id")
            )
        elif action == "fix_permissions":
            return await self._fix_permissions(
                user_id=kwargs.get("user_id"),
                group_id=kwargs.get("group_id"),
                game_id=kwargs.get("game_id")
            )
        else:
            return ToolResult(success=False, error=f"Unknown fix type: {action}")

    async def _fix_settlement(
        self,
        game_id: str = None,
        user_id: str = None,
        feedback_id: str = None
    ) -> ToolResult:
        """
        Re-check settlement for a game.

        Steps:
        1. Find the game (by game_id or user's most recent game)
        2. Verify chip totals match
        3. Recalculate settlements if mismatch found
        4. Log the fix attempt
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            # Find the game
            game = None
            if game_id:
                game = await self.db.game_nights.find_one({"game_id": game_id})
            elif user_id:
                # Find user's most recent settled game
                game = await self.db.game_nights.find_one(
                    {
                        "players.user_id": user_id,
                        "status": {"$in": ["ended", "settled"]}
                    },
                    sort=[("created_at", -1)]
                )

            if not game:
                return ToolResult(
                    success=False,
                    error="No game found to recheck",
                    data={"fix_type": "settlement_recheck", "attempted": True}
                )

            game_id = game.get("game_id")
            players = game.get("players", [])

            # Verify chip totals
            total_buy_in = sum(p.get("total_buy_in", 0) for p in players)
            total_cash_out = sum(p.get("cash_out", 0) for p in players)
            discrepancy = total_cash_out - total_buy_in

            # Check existing ledger entries
            ledger_entries = await self.db.ledger_entries.find(
                {"game_id": game_id}
            ).to_list(50)

            ledger_total = sum(e.get("amount", 0) for e in ledger_entries)

            fix_result = {
                "fix_type": "settlement_recheck",
                "game_id": game_id,
                "total_buy_in": total_buy_in,
                "total_cash_out": total_cash_out,
                "chip_discrepancy": discrepancy,
                "ledger_entries": len(ledger_entries),
                "ledger_total": ledger_total,
                "issues_found": [],
                "actions_taken": []
            }

            # Check for issues
            if abs(discrepancy) > 0.01:
                fix_result["issues_found"].append(
                    f"Chip discrepancy: buy-ins (${total_buy_in}) != cash-outs (${total_cash_out}), "
                    f"difference: ${discrepancy}"
                )

            # Check for players with cash_out but no ledger entry
            players_with_results = set()
            for entry in ledger_entries:
                players_with_results.add(entry.get("from_user_id"))
                players_with_results.add(entry.get("to_user_id"))

            for player in players:
                pid = player.get("user_id")
                net = player.get("cash_out", 0) - player.get("total_buy_in", 0)
                if abs(net) > 0.01 and pid not in players_with_results:
                    fix_result["issues_found"].append(
                        f"Player {pid} has net ${net} but no ledger entry"
                    )

            # Log the recheck
            await self._log_fix_attempt(
                fix_type="settlement_recheck",
                game_id=game_id,
                user_id=user_id,
                feedback_id=feedback_id,
                result=fix_result
            )

            if not fix_result["issues_found"]:
                fix_result["actions_taken"].append("Settlement verified — no issues found")
                # Notify user that settlement was correct
                await self._notify_user(
                    user_id=user_id,
                    title="Settlement Verified",
                    message="We rechecked your settlement and everything looks correct. "
                           "If you still have concerns, please provide more details."
                )
            else:
                fix_result["actions_taken"].append("Issues detected — flagged for host review")
                # Notify host about the discrepancy
                host_id = game.get("host_id")
                if host_id:
                    issues_text = "; ".join(fix_result["issues_found"][:2])
                    await self._notify_user(
                        user_id=host_id,
                        title="Settlement Recheck Required",
                        message=f"A player flagged a settlement issue for {game.get('title', 'a game')}. "
                               f"Issues: {issues_text}"
                    )

            return ToolResult(
                success=True,
                data=fix_result,
                message=f"Settlement recheck: {len(fix_result['issues_found'])} issue(s) found"
            )

        except Exception as e:
            logger.error(f"Settlement recheck error: {e}")
            return ToolResult(success=False, error=str(e))

    async def _fix_notification(
        self,
        user_id: str = None,
        context: Dict = None
    ) -> ToolResult:
        """
        Check notification delivery status and resend if needed.

        Steps:
        1. Find recent undelivered notifications for the user
        2. Attempt to resend them
        3. Log the fix
        """
        if not self.db or not user_id:
            return ToolResult(success=False, error="Database or user_id not available")

        context = context or {}

        try:
            # Find recent notifications for this user
            from datetime import timedelta
            cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

            notifications = await self.db.notifications.find({
                "user_id": user_id,
                "created_at": {"$gte": cutoff}
            }).sort("created_at", -1).to_list(20)

            fix_result = {
                "fix_type": "resend_notification",
                "user_id": user_id,
                "notifications_found": len(notifications),
                "resent": 0,
                "actions_taken": []
            }

            if not notifications:
                fix_result["actions_taken"].append("No recent notifications found for user")
                return ToolResult(
                    success=True,
                    data=fix_result,
                    message="No recent notifications found — may be a delivery issue"
                )

            # Find unread notifications and resend
            notification_tool = None
            if self.tool_registry:
                notification_tool = self.tool_registry.get("notification_sender")

            unread = [n for n in notifications if not n.get("read")]
            fix_result["unread_count"] = len(unread)

            if notification_tool and unread:
                # Resend the most recent unread notification
                latest = unread[0]
                await notification_tool.execute(
                    user_ids=[user_id],
                    title=f"[Resent] {latest.get('title', 'Notification')}",
                    message=latest.get("message", ""),
                    notification_type=latest.get("type", "general"),
                    data={"resent": True, "original_id": str(latest.get("_id", ""))}
                )
                fix_result["resent"] = 1
                fix_result["actions_taken"].append(
                    f"Resent notification: {latest.get('title', 'Notification')}"
                )

            if not unread:
                fix_result["actions_taken"].append(
                    "All recent notifications were read — issue may be a timing/delay problem"
                )

            return ToolResult(
                success=True,
                data=fix_result,
                message=f"Notification fix: resent {fix_result['resent']} notification(s)"
            )

        except Exception as e:
            logger.error(f"Notification fix error: {e}")
            return ToolResult(success=False, error=str(e))

    async def _fix_payment(
        self,
        user_id: str = None,
        game_id: str = None,
        group_id: str = None,
        feedback_id: str = None
    ) -> ToolResult:
        """
        Reconcile payment records for a user.

        Steps:
        1. Check ledger entries for the user/game
        2. Look for any matching Stripe payments not yet reconciled
        3. Flag discrepancies for host review
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            # Build query for ledger entries
            query = {"status": "pending"}
            if user_id:
                query["$or"] = [
                    {"from_user_id": user_id},
                    {"to_user_id": user_id}
                ]
            if game_id:
                query["game_id"] = game_id
            if group_id:
                query["group_id"] = group_id

            pending_entries = await self.db.ledger_entries.find(query).to_list(50)

            fix_result = {
                "fix_type": "reconcile_payment",
                "user_id": user_id,
                "pending_entries": len(pending_entries),
                "reconciled": 0,
                "flagged": 0,
                "actions_taken": []
            }

            # Check for any paid-but-not-recorded entries in payment logs
            if user_id:
                payment_logs = await self.db.payment_logs.find({
                    "$or": [
                        {"payer_id": user_id},
                        {"payee_id": user_id}
                    ],
                    "status": "completed",
                    "reconciled": {"$ne": True}
                }).to_list(20)

                for log in payment_logs:
                    # Try to match with a pending ledger entry
                    matching_entry = None
                    for entry in pending_entries:
                        if (entry.get("from_user_id") == log.get("payer_id") and
                                entry.get("to_user_id") == log.get("payee_id") and
                                abs(entry.get("amount", 0) - log.get("amount", 0)) < 0.01):
                            matching_entry = entry
                            break

                    if matching_entry:
                        # Auto-reconcile: mark ledger entry as paid
                        from bson import ObjectId
                        await self.db.ledger_entries.update_one(
                            {"_id": matching_entry["_id"]},
                            {"$set": {
                                "status": "paid",
                                "paid_at": datetime.now(timezone.utc),
                                "auto_reconciled": True
                            }}
                        )
                        await self.db.payment_logs.update_one(
                            {"_id": log["_id"]},
                            {"$set": {"reconciled": True}}
                        )
                        fix_result["reconciled"] += 1
                        fix_result["actions_taken"].append(
                            f"Auto-reconciled payment of ${log.get('amount', 0)}"
                        )

            if fix_result["reconciled"] == 0 and pending_entries:
                fix_result["actions_taken"].append(
                    f"No auto-reconcilable payments found. {len(pending_entries)} pending entries flagged for review."
                )
                fix_result["flagged"] = len(pending_entries)

            # Notify user of result
            if user_id and fix_result["reconciled"] > 0:
                await self._notify_user(
                    user_id=user_id,
                    title="Payment Updated",
                    message=f"We found and reconciled {fix_result['reconciled']} payment(s) "
                           "that weren't properly recorded. Your balance has been updated."
                )

            # Log the fix
            await self._log_fix_attempt(
                fix_type="reconcile_payment",
                game_id=game_id,
                user_id=user_id,
                feedback_id=feedback_id,
                result=fix_result
            )

            return ToolResult(
                success=True,
                data=fix_result,
                message=f"Payment reconciliation: {fix_result['reconciled']} reconciled, {fix_result['flagged']} flagged"
            )

        except Exception as e:
            logger.error(f"Payment reconciliation error: {e}")
            return ToolResult(success=False, error=str(e))

    async def _fix_permissions(
        self,
        user_id: str = None,
        group_id: str = None,
        game_id: str = None
    ) -> ToolResult:
        """
        Check and fix user access/permission issues.

        Steps:
        1. Check if user is a member of the group
        2. Check if there's a pending invite
        3. Check game-specific permissions
        4. Attempt to fix or provide clear guidance
        """
        if not self.db or not user_id:
            return ToolResult(success=False, error="Database or user_id not available")

        try:
            fix_result = {
                "fix_type": "fix_permissions",
                "user_id": user_id,
                "issues_found": [],
                "actions_taken": []
            }

            # Check group membership
            if group_id:
                membership = await self.db.group_members.find_one({
                    "group_id": group_id,
                    "user_id": user_id
                })

                if not membership:
                    # Check for pending invite
                    invite = await self.db.group_invites.find_one({
                        "group_id": group_id,
                        "invitee_id": user_id,
                        "status": "pending"
                    })

                    if invite:
                        fix_result["issues_found"].append("Pending invite exists but not accepted")
                        fix_result["actions_taken"].append("Resending invite notification")
                        await self._notify_user(
                            user_id=user_id,
                            title="Group Invite Reminder",
                            message="You have a pending group invite. Accept it to join the group."
                        )
                    else:
                        fix_result["issues_found"].append("Not a member of this group")
                        fix_result["actions_taken"].append(
                            "User needs to be invited by a group admin"
                        )
                else:
                    fix_result["actions_taken"].append("Group membership confirmed")

            # Check game access
            if game_id:
                game = await self.db.game_nights.find_one({"game_id": game_id})
                if game:
                    game_group_id = game.get("group_id")
                    if game_group_id:
                        member = await self.db.group_members.find_one({
                            "group_id": game_group_id,
                            "user_id": user_id
                        })
                        if not member:
                            fix_result["issues_found"].append(
                                f"Not a member of the game's group ({game_group_id})"
                            )
                        else:
                            fix_result["actions_taken"].append("Game group membership confirmed")

                    # Check if player is in the game
                    player_in_game = any(
                        p.get("user_id") == user_id for p in game.get("players", [])
                    )
                    if not player_in_game:
                        fix_result["issues_found"].append("Not a player in this game")
                        fix_result["actions_taken"].append(
                            "User may need to be added to the game by the host"
                        )
                    else:
                        fix_result["actions_taken"].append("Player in game confirmed")

            has_issues = len(fix_result["issues_found"]) > 0
            return ToolResult(
                success=True,
                data=fix_result,
                message=f"Permission check: {len(fix_result['issues_found'])} issue(s) found"
            )

        except Exception as e:
            logger.error(f"Permission fix error: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Helpers ====================

    async def _notify_user(self, user_id: str, title: str, message: str):
        """Send a notification to a user via the notification tool."""
        if not self.tool_registry:
            return

        notification_tool = self.tool_registry.get("notification_sender")
        if notification_tool:
            try:
                await notification_tool.execute(
                    user_ids=[user_id],
                    title=title,
                    message=message,
                    notification_type="general",
                    data={"source": "auto_fixer"}
                )
            except Exception as e:
                logger.error(f"Auto-fixer notification error: {e}")

    async def _log_fix_attempt(
        self,
        fix_type: str,
        game_id: str = None,
        user_id: str = None,
        feedback_id: str = None,
        result: Dict = None
    ):
        """Log an auto-fix attempt for audit trail."""
        if not self.db:
            return

        try:
            await self.db.auto_fix_log.insert_one({
                "fix_type": fix_type,
                "game_id": game_id,
                "user_id": user_id,
                "feedback_id": feedback_id,
                "result": result or {},
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Error logging fix attempt: {e}")
