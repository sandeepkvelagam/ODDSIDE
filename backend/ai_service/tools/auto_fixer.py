"""
Auto Fixer Tool (v2)

Two-tier fix system:
A) Verify-only (safe, default): Read-only diagnostics — always allowed
   - settlement_recheck: Verify chip totals and ledger consistency
   - resend_notification: Check delivery logs and resend unread
   - reconcile_payment_preview: Find matches without writing
   - fix_permissions_diagnose: Check membership/access without changing

B) Mutations (requires confirmation + host/admin role):
   - reconcile_payment_apply: Actually mark ledger entries as paid
   - fix_permissions_apply: Send invites or modify access

Each operation is logged in auto_fix_log for audit trail.
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class AutoFixerTool(BaseTool):
    """
    Two-tier auto-fix system: verify (read-only) + mutate (writes data).

    Verify operations are always safe to run. Mutate operations require
    explicit confirmation and are gated by FeedbackPolicyTool.
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
            "Two-tier auto-fix system for user-reported issues. "
            "Verify tier: read-only settlement checks, notification status, payment matching, "
            "permission diagnosis. Mutate tier: apply payment reconciliation, fix permissions "
            "(requires confirmation)."
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Fix operation to perform",
                    "enum": [
                        "settlement_recheck",
                        "resend_notification",
                        "reconcile_payment_preview",
                        "reconcile_payment_apply",
                        "fix_permissions_diagnose",
                        "fix_permissions_apply",
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
                "confirmed": {
                    "type": "boolean",
                    "description": "Explicit confirmation for mutate-tier operations"
                },
                "preview_data": {
                    "type": "object",
                    "description": "Data from preview step to apply in mutation"
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
            # Smart routing: map legacy fix_type to safe default (verify tier)
            fix_type = kwargs.get("fix_type")
            if not fix_type:
                return ToolResult(success=False, error="fix_type required for auto_fix")
            safe_mapping = {
                "settlement_recheck": "settlement_recheck",
                "resend_notification": "resend_notification",
                "reconcile_payment": "reconcile_payment_preview",
                "fix_permissions": "fix_permissions_diagnose",
            }
            action = safe_mapping.get(fix_type, fix_type)

        # ==================== VERIFY TIER (read-only, safe) ====================

        if action == "settlement_recheck":
            return await self._verify_settlement(
                game_id=kwargs.get("game_id"),
                user_id=kwargs.get("user_id"),
                feedback_id=kwargs.get("feedback_id")
            )
        elif action == "resend_notification":
            return await self._verify_and_resend_notification(
                user_id=kwargs.get("user_id"),
                feedback_id=kwargs.get("feedback_id"),
                context=kwargs.get("context", {})
            )
        elif action == "reconcile_payment_preview":
            return await self._reconcile_payment_preview(
                user_id=kwargs.get("user_id"),
                game_id=kwargs.get("game_id"),
                group_id=kwargs.get("group_id"),
                feedback_id=kwargs.get("feedback_id")
            )
        elif action == "fix_permissions_diagnose":
            return await self._permissions_diagnose(
                user_id=kwargs.get("user_id"),
                group_id=kwargs.get("group_id"),
                game_id=kwargs.get("game_id"),
                feedback_id=kwargs.get("feedback_id")
            )

        # ==================== MUTATE TIER (writes data, needs confirmation) ====================
        # Safety guards: never auto-mutate on critical severity or high-value disputes

        elif action == "reconcile_payment_apply":
            if not kwargs.get("confirmed"):
                return ToolResult(
                    success=False,
                    error="reconcile_payment_apply requires confirmed=true. "
                          "Run reconcile_payment_preview first, then apply with confirmation."
                )
            # High-value threshold: block auto-mutation for disputes > $100
            high_value_block = await self._check_high_value_threshold(
                kwargs.get("game_id"), kwargs.get("feedback_id")
            )
            if high_value_block:
                return high_value_block

            return await self._reconcile_payment_apply(
                user_id=kwargs.get("user_id"),
                game_id=kwargs.get("game_id"),
                group_id=kwargs.get("group_id"),
                feedback_id=kwargs.get("feedback_id"),
                preview_data=kwargs.get("preview_data", {})
            )
        elif action == "fix_permissions_apply":
            if not kwargs.get("confirmed"):
                return ToolResult(
                    success=False,
                    error="fix_permissions_apply requires confirmed=true. "
                          "Run fix_permissions_diagnose first, then apply with confirmation."
                )
            return await self._permissions_apply(
                user_id=kwargs.get("user_id"),
                group_id=kwargs.get("group_id"),
                game_id=kwargs.get("game_id"),
                feedback_id=kwargs.get("feedback_id")
            )
        else:
            return ToolResult(success=False, error=f"Unknown fix type: {action}")

    # ==================== VERIFY: Settlement Recheck ====================

    async def _verify_settlement(
        self,
        game_id: str = None,
        user_id: str = None,
        feedback_id: str = None
    ) -> ToolResult:
        """
        VERIFY-ONLY: Re-check settlement for a game without modifying anything.
        Reports findings to user and host.
        """
        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        try:
            # Find the game
            game = None
            if game_id:
                game = await self.db.game_nights.find_one({"game_id": game_id})
            elif user_id:
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
                    data={"fix_type": "settlement_recheck", "tier": "verify"}
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

            result = {
                "fix_type": "settlement_recheck",
                "tier": "verify",
                "game_id": game_id,
                "game_title": game.get("title", "Poker Night"),
                "total_buy_in": total_buy_in,
                "total_cash_out": total_cash_out,
                "chip_discrepancy": discrepancy,
                "ledger_entries_count": len(ledger_entries),
                "ledger_total": ledger_total,
                "issues_found": [],
                "actions_taken": [],
                "player_breakdown": []
            }

            # Check for chip discrepancy
            if abs(discrepancy) > 0.01:
                result["issues_found"].append(
                    f"Chip discrepancy: buy-ins (${total_buy_in}) != "
                    f"cash-outs (${total_cash_out}), difference: ${discrepancy}"
                )

            # Check each player for ledger coverage
            players_with_results = set()
            for entry in ledger_entries:
                players_with_results.add(entry.get("from_user_id"))
                players_with_results.add(entry.get("to_user_id"))

            for player in players:
                pid = player.get("user_id")
                buy_in = player.get("total_buy_in", 0)
                cash_out = player.get("cash_out", 0)
                net = cash_out - buy_in

                result["player_breakdown"].append({
                    "user_id": pid,
                    "buy_in": buy_in,
                    "cash_out": cash_out,
                    "net": net,
                    "has_ledger_entry": pid in players_with_results
                })

                if abs(net) > 0.01 and pid not in players_with_results:
                    result["issues_found"].append(
                        f"Player {pid} has net ${net} but no ledger entry"
                    )

            # Log the verification
            await self._log_fix_attempt(
                fix_type="settlement_recheck",
                game_id=game_id,
                user_id=user_id,
                feedback_id=feedback_id,
                result=result
            )

            # Notify based on findings
            if not result["issues_found"]:
                result["actions_taken"].append("Settlement verified — no issues found")
                if user_id:
                    await self._notify_user(
                        user_id=user_id,
                        title="Settlement Verified",
                        message="We checked your settlement and everything looks correct. "
                               "If you still have concerns, please provide more details."
                    )
            else:
                result["actions_taken"].append("Issues detected — flagged for host review")
                host_id = game.get("host_id")
                if host_id:
                    issues_text = "; ".join(result["issues_found"][:2])
                    await self._notify_user(
                        user_id=host_id,
                        title="Settlement Recheck Required",
                        message=f"A player flagged a settlement issue for "
                               f"{game.get('title', 'a game')}. Issues: {issues_text}"
                    )

            return ToolResult(
                success=True,
                data=result,
                message=f"Settlement recheck: {len(result['issues_found'])} issue(s) found"
            )

        except Exception as e:
            logger.error(f"Settlement recheck error: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== VERIFY + LOW-RISK: Resend Notification ====================

    async def _verify_and_resend_notification(
        self,
        user_id: str = None,
        feedback_id: str = None,
        context: Dict = None
    ) -> ToolResult:
        """
        Check notification delivery logs and resend the most recent unread.
        This is a low-risk verify operation (resending doesn't mutate core data).
        """
        if self.db is None or not user_id:
            return ToolResult(success=False, error="Database or user_id not available")

        context = context or {}

        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

            notifications = await self.db.notifications.find({
                "user_id": user_id,
                "created_at": {"$gte": cutoff}
            }).sort("created_at", -1).to_list(20)

            result = {
                "fix_type": "resend_notification",
                "tier": "verify",
                "user_id": user_id,
                "delivery_log": {
                    "total_recent": len(notifications),
                    "unread": 0,
                    "read": 0,
                },
                "resent": 0,
                "actions_taken": [],
                "user_message": ""
            }

            if not notifications:
                result["actions_taken"].append(
                    "No recent notifications found for user (last 7 days)"
                )
                result["user_message"] = (
                    "We checked delivery logs for the last 7 days and found no "
                    "notifications for you. This may indicate a delivery issue. "
                    "Please check your notification settings in the app."
                )
                await self._notify_user(
                    user_id=user_id,
                    title="Notification Check Complete",
                    message=result["user_message"]
                )

                await self._log_fix_attempt(
                    fix_type="resend_notification",
                    user_id=user_id,
                    feedback_id=feedback_id,
                    result=result
                )
                return ToolResult(success=True, data=result)

            # Count read vs unread
            unread = [n for n in notifications if not n.get("read")]
            read = [n for n in notifications if n.get("read")]
            result["delivery_log"]["unread"] = len(unread)
            result["delivery_log"]["read"] = len(read)

            # Resend the most recent unread notification
            notification_tool = None
            if self.tool_registry:
                notification_tool = self.tool_registry.get("notification_sender")

            if notification_tool and unread:
                latest = unread[0]
                await notification_tool.execute(
                    user_ids=[user_id],
                    title=f"[Resent] {latest.get('title', 'Notification')}",
                    message=latest.get("message", ""),
                    notification_type=latest.get("type", "general"),
                    data={"resent": True, "original_id": str(latest.get("_id", ""))}
                )
                result["resent"] = 1
                result["actions_taken"].append(
                    f"Resent notification: {latest.get('title', 'Notification')}"
                )
                result["user_message"] = (
                    f"We checked delivery logs for the last 7 days. "
                    f"Found {len(notifications)} notifications ({len(unread)} unread). "
                    f"We resent your most recent unread notification. "
                    f"If you still don't see it, check your notification settings."
                )
            elif not unread:
                result["actions_taken"].append(
                    f"All {len(notifications)} recent notifications were read"
                )
                result["user_message"] = (
                    f"We checked delivery logs for the last 7 days. "
                    f"All {len(notifications)} notifications show as delivered and read. "
                    f"The issue may have been a temporary delay."
                )
            else:
                result["actions_taken"].append(
                    f"Found {len(unread)} unread notifications but notification sender unavailable"
                )
                result["user_message"] = (
                    f"We found {len(unread)} unread notifications. "
                    f"Please check your notification settings in the app."
                )

            await self._notify_user(
                user_id=user_id,
                title="Notification Check Complete",
                message=result["user_message"]
            )

            await self._log_fix_attempt(
                fix_type="resend_notification",
                user_id=user_id,
                feedback_id=feedback_id,
                result=result
            )

            return ToolResult(
                success=True,
                data=result,
                message=f"Notification check: {len(notifications)} found, {result['resent']} resent"
            )

        except Exception as e:
            logger.error(f"Notification fix error: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== VERIFY: Payment Reconciliation Preview ====================

    async def _reconcile_payment_preview(
        self,
        user_id: str = None,
        game_id: str = None,
        group_id: str = None,
        feedback_id: str = None
    ) -> ToolResult:
        """
        VERIFY-ONLY: Find payment matches without writing anything.
        Returns what would be reconciled if apply is called.
        """
        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        try:
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

            result = {
                "fix_type": "reconcile_payment_preview",
                "tier": "verify",
                "user_id": user_id,
                "pending_entries": len(pending_entries),
                "matches_found": [],
                "unmatched_pending": [],
                "actions_taken": [],
                "can_apply": False
            }

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
                    for entry in pending_entries:
                        if (entry.get("from_user_id") == log.get("payer_id") and
                                entry.get("to_user_id") == log.get("payee_id") and
                                abs(entry.get("amount", 0) - log.get("amount", 0)) < 0.01):
                            result["matches_found"].append({
                                "ledger_id": str(entry.get("_id", "")),
                                "payment_log_id": str(log.get("_id", "")),
                                "from_user": entry.get("from_user_id"),
                                "to_user": entry.get("to_user_id"),
                                "amount": entry.get("amount", 0),
                                "confidence": "high"  # exact amount match
                            })
                            break

            # Identify unmatched pending entries
            matched_ledger_ids = {m["ledger_id"] for m in result["matches_found"]}
            for entry in pending_entries:
                eid = str(entry.get("_id", ""))
                if eid not in matched_ledger_ids:
                    result["unmatched_pending"].append({
                        "ledger_id": eid,
                        "from_user": entry.get("from_user_id"),
                        "to_user": entry.get("to_user_id"),
                        "amount": entry.get("amount", 0),
                    })

            if result["matches_found"]:
                result["can_apply"] = True
                total = sum(m["amount"] for m in result["matches_found"])
                result["actions_taken"].append(
                    f"Found {len(result['matches_found'])} reconcilable payment(s) "
                    f"totaling ${total:.2f}. "
                    f"Use reconcile_payment_apply with confirmed=true to apply."
                )
            else:
                result["actions_taken"].append(
                    f"No auto-reconcilable payments found. "
                    f"{len(pending_entries)} pending entries require manual review."
                )

            await self._log_fix_attempt(
                fix_type="reconcile_payment_preview",
                game_id=game_id,
                user_id=user_id,
                feedback_id=feedback_id,
                result=result
            )

            return ToolResult(
                success=True,
                data=result,
                message=f"Payment preview: {len(result['matches_found'])} matches, "
                       f"{len(result['unmatched_pending'])} unmatched"
            )

        except Exception as e:
            logger.error(f"Payment reconciliation preview error: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== MUTATE: Payment Reconciliation Apply ====================

    async def _reconcile_payment_apply(
        self,
        user_id: str = None,
        game_id: str = None,
        group_id: str = None,
        feedback_id: str = None,
        preview_data: Dict = None
    ) -> ToolResult:
        """
        MUTATE: Actually mark matched ledger entries as paid.
        Requires confirmed=true and host/admin role (enforced by policy).
        """
        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        try:
            # Re-run matching to ensure freshness
            preview_result = await self._reconcile_payment_preview(
                user_id=user_id,
                game_id=game_id,
                group_id=group_id,
                feedback_id=feedback_id
            )

            if not preview_result.success:
                return preview_result

            matches = preview_result.data.get("matches_found", [])
            if not matches:
                return ToolResult(
                    success=True,
                    data={"reconciled": 0, "tier": "mutate"},
                    message="No matches to apply"
                )

            reconciled = 0
            now = datetime.now(timezone.utc)

            for match in matches:
                try:
                    from bson import ObjectId
                    ledger_oid = ObjectId(match["ledger_id"])
                    payment_oid = ObjectId(match["payment_log_id"])

                    await self.db.ledger_entries.update_one(
                        {"_id": ledger_oid},
                        {"$set": {
                            "status": "paid",
                            "paid_at": now,
                            "auto_reconciled": True,
                            "reconciled_by": "feedback_auto_fixer",
                            "feedback_id": feedback_id
                        }}
                    )
                    await self.db.payment_logs.update_one(
                        {"_id": payment_oid},
                        {"$set": {"reconciled": True, "reconciled_at": now.isoformat()}}
                    )
                    reconciled += 1
                except Exception as e:
                    logger.error(f"Failed to reconcile match: {e}")

            result = {
                "fix_type": "reconcile_payment_apply",
                "tier": "mutate",
                "reconciled": reconciled,
                "total_matches": len(matches),
                "actions_taken": [
                    f"Applied {reconciled}/{len(matches)} payment reconciliation(s)"
                ]
            }

            # Notify user
            if user_id and reconciled > 0:
                await self._notify_user(
                    user_id=user_id,
                    title="Payments Reconciled",
                    message=f"We found and reconciled {reconciled} payment(s) "
                           "that weren't properly recorded. Your balance has been updated."
                )

            await self._log_fix_attempt(
                fix_type="reconcile_payment_apply",
                game_id=game_id,
                user_id=user_id,
                feedback_id=feedback_id,
                result=result
            )

            return ToolResult(
                success=True,
                data=result,
                message=f"Payment reconciliation applied: {reconciled} entry(ies) updated"
            )

        except Exception as e:
            logger.error(f"Payment reconciliation apply error: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== VERIFY: Permission Diagnosis ====================

    async def _permissions_diagnose(
        self,
        user_id: str = None,
        group_id: str = None,
        game_id: str = None,
        feedback_id: str = None
    ) -> ToolResult:
        """
        VERIFY-ONLY: Diagnose permission/access issues without changing anything.
        """
        if self.db is None or not user_id:
            return ToolResult(success=False, error="Database or user_id not available")

        try:
            result = {
                "fix_type": "fix_permissions_diagnose",
                "tier": "verify",
                "user_id": user_id,
                "issues_found": [],
                "actions_available": [],
                "diagnosis": {}
            }

            # Check group membership
            if group_id:
                membership = await self.db.group_members.find_one({
                    "group_id": group_id,
                    "user_id": user_id
                })

                if not membership:
                    invite = await self.db.group_invites.find_one({
                        "group_id": group_id,
                        "invitee_id": user_id,
                        "status": "pending"
                    })

                    if invite:
                        result["issues_found"].append("Pending invite exists but not accepted")
                        result["actions_available"].append("resend_invite")
                        result["diagnosis"]["group_membership"] = "pending_invite"
                    else:
                        result["issues_found"].append("Not a member of this group")
                        result["actions_available"].append("needs_admin_invite")
                        result["diagnosis"]["group_membership"] = "not_member"
                else:
                    result["diagnosis"]["group_membership"] = "confirmed"
                    result["diagnosis"]["group_role"] = membership.get("role", "member")

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
                            result["issues_found"].append(
                                f"Not a member of the game's group ({game_group_id})"
                            )
                            result["diagnosis"]["game_group_membership"] = "not_member"
                        else:
                            result["diagnosis"]["game_group_membership"] = "confirmed"

                    player_in_game = any(
                        p.get("user_id") == user_id for p in game.get("players", [])
                    )
                    if not player_in_game:
                        result["issues_found"].append("Not a player in this game")
                        result["actions_available"].append("needs_host_add")
                        result["diagnosis"]["game_player"] = "not_in_game"
                    else:
                        result["diagnosis"]["game_player"] = "confirmed"

            await self._log_fix_attempt(
                fix_type="fix_permissions_diagnose",
                game_id=game_id,
                user_id=user_id,
                feedback_id=feedback_id,
                result=result
            )

            return ToolResult(
                success=True,
                data=result,
                message=f"Permission diagnosis: {len(result['issues_found'])} issue(s), "
                       f"{len(result['actions_available'])} action(s) available"
            )

        except Exception as e:
            logger.error(f"Permission diagnosis error: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== MUTATE: Permission Fix Apply ====================

    async def _permissions_apply(
        self,
        user_id: str = None,
        group_id: str = None,
        game_id: str = None,
        feedback_id: str = None
    ) -> ToolResult:
        """
        MUTATE: Apply permission fixes (resend invites, notify admins).
        Requires confirmed=true and host/admin role.
        """
        if self.db is None or not user_id:
            return ToolResult(success=False, error="Database or user_id not available")

        try:
            # First run diagnosis to see what's fixable
            diag = await self._permissions_diagnose(
                user_id=user_id,
                group_id=group_id,
                game_id=game_id
            )

            if not diag.success:
                return diag

            actions_available = diag.data.get("actions_available", [])
            actions_taken = []

            if "resend_invite" in actions_available and group_id:
                # Resend the invite notification
                await self._notify_user(
                    user_id=user_id,
                    title="Group Invite Reminder",
                    message="You have a pending group invite. Accept it to join the group and access games."
                )
                actions_taken.append("Resent group invite notification")

            if "needs_admin_invite" in actions_available and group_id:
                # Notify group admins
                admins = await self.db.group_members.find(
                    {"group_id": group_id, "role": "admin"},
                    {"_id": 0, "user_id": 1}
                ).to_list(5)
                for admin in admins:
                    await self._notify_user(
                        user_id=admin["user_id"],
                        title="Access Request",
                        message=f"A user is requesting access to your group. "
                               "Please check your group settings to invite them."
                    )
                actions_taken.append(f"Notified {len(admins)} admin(s) about access request")

            if "needs_host_add" in actions_available and game_id:
                game = await self.db.game_nights.find_one({"game_id": game_id})
                if game and game.get("host_id"):
                    await self._notify_user(
                        user_id=game["host_id"],
                        title="Player Access Request",
                        message=f"A player is reporting they can't access the game "
                               f"'{game.get('title', 'Poker Night')}'. "
                               "Please check if they need to be added."
                    )
                    actions_taken.append("Notified host about player access issue")

            result = {
                "fix_type": "fix_permissions_apply",
                "tier": "mutate",
                "actions_taken": actions_taken,
                "issues_found": diag.data.get("issues_found", [])
            }

            await self._log_fix_attempt(
                fix_type="fix_permissions_apply",
                game_id=game_id,
                user_id=user_id,
                feedback_id=feedback_id,
                result=result
            )

            return ToolResult(
                success=True,
                data=result,
                message=f"Permission fix applied: {len(actions_taken)} action(s) taken"
            )

        except Exception as e:
            logger.error(f"Permission apply error: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Safety Guards ====================

    # Money always needs stricter rules. This threshold blocks auto-mutation
    # for payment disputes involving real funds above this amount.
    HIGH_VALUE_THRESHOLD = 100  # USD

    async def _check_high_value_threshold(
        self, game_id: str = None, feedback_id: str = None
    ) -> Optional[ToolResult]:
        """
        Block auto-mutation for high-value disputes.

        Returns ToolResult (blocked) or None (allowed).
        Checks:
        1. If feedback involves critical severity → always block mutation
        2. If game has total pot > HIGH_VALUE_THRESHOLD → block mutation
        """
        if self.db is None:
            return None

        # Check 1: Critical severity feedback → never auto-mutate
        if feedback_id:
            feedback = await self.db.feedback.find_one(
                {"feedback_id": feedback_id},
                {"_id": 0, "priority": 1, "classification": 1}
            )
            if feedback:
                priority = feedback.get("priority")
                severity = (feedback.get("classification") or {}).get("severity")
                if priority == "critical" or severity == "critical":
                    await self._log_fix_attempt(
                        fix_type="blocked_critical_severity",
                        feedback_id=feedback_id,
                        result={"blocked": True, "reason": "critical_severity"}
                    )
                    return ToolResult(
                        success=False,
                        error="Auto-mutation blocked: critical severity issues require "
                              "manual review. This has been escalated to a team member.",
                        data={"blocked": True, "reason": "critical_severity"}
                    )

        # Check 2: High-value game → block mutation
        if game_id:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "players": 1}
            )
            if game:
                total_pot = sum(
                    p.get("total_buy_in", 0) for p in game.get("players", [])
                )
                if total_pot > self.HIGH_VALUE_THRESHOLD:
                    await self._log_fix_attempt(
                        fix_type="blocked_high_value",
                        game_id=game_id,
                        feedback_id=feedback_id,
                        result={
                            "blocked": True,
                            "reason": "high_value",
                            "total_pot": total_pot,
                            "threshold": self.HIGH_VALUE_THRESHOLD
                        }
                    )
                    return ToolResult(
                        success=False,
                        error=f"Auto-mutation blocked: game total (${total_pot:.0f}) "
                              f"exceeds ${self.HIGH_VALUE_THRESHOLD} threshold. "
                              f"Payment disputes above this amount require manual review.",
                        data={
                            "blocked": True,
                            "reason": "high_value",
                            "total_pot": total_pot,
                        }
                    )

        return None  # No block — proceed

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
        if self.db is None:
            return

        try:
            await self.db.auto_fix_log.insert_one({
                "fix_type": fix_type,
                "tier": (result or {}).get("tier", "verify"),
                "game_id": game_id,
                "user_id": user_id,
                "feedback_id": feedback_id,
                "result": result or {},
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        except Exception as e:
            logger.error(f"Error logging fix attempt: {e}")
