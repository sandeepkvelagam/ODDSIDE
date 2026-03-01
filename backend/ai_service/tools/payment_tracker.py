"""
Payment Tracker Tool

Tracks outstanding payments, sends reminders, and manages payment workflows
after game settlements.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class PaymentTrackerTool(BaseTool):
    """
    Tool for tracking and managing post-game payments.

    Features:
    - Track outstanding payments by user/group
    - Send payment reminders (1d, 3d, 7d)
    - Escalate overdue payments to host
    - Generate payment links
    - Mark payments as complete
    """

    @property
    def name(self) -> str:
        return "payment_tracker"

    @property
    def description(self) -> str:
        return "Track and manage outstanding payments after game settlements"

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform",
                    "enum": [
                        "get_outstanding",
                        "get_user_balances",
                        "send_reminder",
                        "send_bulk_reminders",
                        "escalate_to_host",
                        "mark_paid",
                        "get_payment_stats",
                        "schedule_reminders"
                    ]
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID"
                },
                "ledger_id": {
                    "type": "string",
                    "description": "Ledger entry ID"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID"
                }
            },
            "required": ["action"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute payment tracker action"""
        action = kwargs.get("action")

        if action == "get_outstanding":
            return await self._get_outstanding(
                kwargs.get("user_id"),
                kwargs.get("group_id")
            )
        elif action == "get_user_balances":
            return await self._get_user_balances(kwargs.get("user_id"))
        elif action == "send_reminder":
            return await self._send_reminder(kwargs.get("ledger_id"))
        elif action == "send_bulk_reminders":
            return await self._send_bulk_reminders(
                kwargs.get("game_id"),
                kwargs.get("group_id")
            )
        elif action == "escalate_to_host":
            return await self._escalate_to_host(kwargs.get("ledger_id"))
        elif action == "mark_paid":
            return await self._mark_paid(kwargs.get("ledger_id"))
        elif action == "get_payment_stats":
            return await self._get_payment_stats(
                kwargs.get("group_id"),
                kwargs.get("user_id")
            )
        elif action == "schedule_reminders":
            return await self._schedule_reminders(kwargs.get("game_id"))
        else:
            return ToolResult(
                success=False,
                error=f"Unknown action: {action}"
            )

    async def _get_outstanding(
        self,
        user_id: str = None,
        group_id: str = None
    ) -> ToolResult:
        """
        Get outstanding payments for a user or group.

        Returns:
            ToolResult with list of outstanding payments
        """
        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        try:
            query = {"status": "pending"}

            if user_id:
                # User owes someone
                query["from_user_id"] = user_id
            if group_id:
                query["group_id"] = group_id

            entries = await self.db.ledger_entries.find(query).to_list(length=100)

            # Enrich with user names
            outstanding = []
            total_amount = 0

            for entry in entries:
                from_user = await self.db.users.find_one({"user_id": entry.get("from_user_id")})
                to_user = await self.db.users.find_one({"user_id": entry.get("to_user_id")})

                amount = entry.get("amount", 0)
                total_amount += amount

                # Calculate days overdue
                created_at = entry.get("created_at")
                days_pending = (datetime.utcnow() - created_at).days if created_at else 0

                outstanding.append({
                    "ledger_id": str(entry.get("_id")),
                    "from_user": {
                        "user_id": entry.get("from_user_id"),
                        "name": from_user.get("name") if from_user else "Unknown",
                        "email": from_user.get("email") if from_user else None
                    },
                    "to_user": {
                        "user_id": entry.get("to_user_id"),
                        "name": to_user.get("name") if to_user else "Unknown",
                        "email": to_user.get("email") if to_user else None
                    },
                    "amount": amount,
                    "game_id": entry.get("game_id"),
                    "group_id": entry.get("group_id"),
                    "created_at": created_at.isoformat() if created_at else None,
                    "days_pending": days_pending,
                    "is_overdue": days_pending > 7,
                    "reminder_count": entry.get("reminder_count", 0)
                })

            # Sort by days pending (most overdue first)
            outstanding.sort(key=lambda x: x["days_pending"], reverse=True)

            return ToolResult(
                success=True,
                data={
                    "outstanding": outstanding,
                    "total_amount": round(total_amount, 2),
                    "count": len(outstanding),
                    "overdue_count": len([o for o in outstanding if o["is_overdue"]])
                }
            )

        except Exception as e:
            logger.error(f"Error getting outstanding payments: {e}")
            return ToolResult(success=False, error=str(e))

    async def _get_user_balances(self, user_id: str) -> ToolResult:
        """
        Get complete balance summary for a user.

        Returns:
            ToolResult with amounts owed and amounts owed to user
        """
        if self.db is None or not user_id:
            return ToolResult(success=False, error="Database or user_id not available")

        try:
            # What user owes to others
            owes_entries = await self.db.ledger_entries.find({
                "from_user_id": user_id,
                "status": "pending"
            }).to_list(length=100)

            # What others owe to user
            owed_entries = await self.db.ledger_entries.find({
                "to_user_id": user_id,
                "status": "pending"
            }).to_list(length=100)

            # Calculate totals
            total_owes = sum(e.get("amount", 0) for e in owes_entries)
            total_owed = sum(e.get("amount", 0) for e in owed_entries)

            # Group by person
            owes_by_person = {}
            for entry in owes_entries:
                to_id = entry.get("to_user_id")
                if to_id not in owes_by_person:
                    to_user = await self.db.users.find_one({"user_id": to_id})
                    owes_by_person[to_id] = {
                        "user_id": to_id,
                        "name": to_user.get("name") if to_user else "Unknown",
                        "amount": 0
                    }
                owes_by_person[to_id]["amount"] += entry.get("amount", 0)

            owed_by_person = {}
            for entry in owed_entries:
                from_id = entry.get("from_user_id")
                if from_id not in owed_by_person:
                    from_user = await self.db.users.find_one({"user_id": from_id})
                    owed_by_person[from_id] = {
                        "user_id": from_id,
                        "name": from_user.get("name") if from_user else "Unknown",
                        "amount": 0
                    }
                owed_by_person[from_id]["amount"] += entry.get("amount", 0)

            return ToolResult(
                success=True,
                data={
                    "user_id": user_id,
                    "summary": {
                        "total_owes": round(total_owes, 2),
                        "total_owed": round(total_owed, 2),
                        "net_balance": round(total_owed - total_owes, 2)
                    },
                    "owes": list(owes_by_person.values()),
                    "owed_by": list(owed_by_person.values())
                }
            )

        except Exception as e:
            logger.error(f"Error getting user balances: {e}")
            return ToolResult(success=False, error=str(e))

    async def _send_reminder(self, ledger_id: str) -> ToolResult:
        """
        Send a payment reminder for a specific ledger entry.

        Returns:
            ToolResult with reminder status
        """
        if self.db is None or not ledger_id:
            return ToolResult(success=False, error="Database or ledger_id not available")

        try:
            from bson import ObjectId

            entry = await self.db.ledger_entries.find_one({"_id": ObjectId(ledger_id)})
            if not entry:
                return ToolResult(success=False, error="Ledger entry not found")

            if entry.get("status") != "pending":
                return ToolResult(
                    success=False,
                    error="Payment already completed"
                )

            # Get user info
            from_user = await self.db.users.find_one({"user_id": entry.get("from_user_id")})
            to_user = await self.db.users.find_one({"user_id": entry.get("to_user_id")})

            from_name = from_user.get("name") if from_user else "Someone"
            to_name = to_user.get("name") if to_user else "Someone"
            amount = entry.get("amount", 0)

            # Get notification tool
            notification_tool = None
            if hasattr(self, 'tool_registry') and self.tool_registry:
                notification_tool = self.tool_registry.get("notification_sender")

            if notification_tool:
                # Send reminder to the person who owes
                await notification_tool.execute(
                    user_ids=[entry.get("from_user_id")],
                    title="Payment Reminder",
                    message=f"You owe ${amount:.2f} to {to_name}. Please settle up!",
                    notification_type="reminder",
                    data={
                        "ledger_id": ledger_id,
                        "amount": amount,
                        "to_user_id": entry.get("to_user_id")
                    }
                )

            # Update reminder count
            reminder_count = entry.get("reminder_count", 0) + 1
            await self.db.ledger_entries.update_one(
                {"_id": ObjectId(ledger_id)},
                {
                    "$set": {
                        "reminder_count": reminder_count,
                        "last_reminder_at": datetime.utcnow()
                    }
                }
            )

            return ToolResult(
                success=True,
                data={
                    "ledger_id": ledger_id,
                    "reminder_sent_to": from_name,
                    "amount": amount,
                    "reminder_count": reminder_count
                },
                message=f"Reminder sent to {from_name} for ${amount:.2f}"
            )

        except Exception as e:
            logger.error(f"Error sending reminder: {e}")
            return ToolResult(success=False, error=str(e))

    async def _send_bulk_reminders(
        self,
        game_id: str = None,
        group_id: str = None
    ) -> ToolResult:
        """
        Send reminders for all outstanding payments in a game or group.

        Returns:
            ToolResult with count of reminders sent
        """
        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        try:
            query = {"status": "pending"}
            if game_id:
                query["game_id"] = game_id
            if group_id:
                query["group_id"] = group_id

            entries = await self.db.ledger_entries.find(query).to_list(length=100)

            sent_count = 0
            failed_count = 0

            for entry in entries:
                ledger_id = str(entry.get("_id"))
                result = await self._send_reminder(ledger_id)
                if result.success:
                    sent_count += 1
                else:
                    failed_count += 1

            return ToolResult(
                success=True,
                data={
                    "reminders_sent": sent_count,
                    "failed": failed_count,
                    "total": len(entries)
                },
                message=f"Sent {sent_count} payment reminders"
            )

        except Exception as e:
            logger.error(f"Error sending bulk reminders: {e}")
            return ToolResult(success=False, error=str(e))

    async def _escalate_to_host(self, ledger_id: str) -> ToolResult:
        """
        Escalate an overdue payment to the host.

        Returns:
            ToolResult with escalation status
        """
        if self.db is None or not ledger_id:
            return ToolResult(success=False, error="Database or ledger_id not available")

        try:
            from bson import ObjectId

            entry = await self.db.ledger_entries.find_one({"_id": ObjectId(ledger_id)})
            if not entry:
                return ToolResult(success=False, error="Ledger entry not found")

            # Get game to find host
            game = await self.db.game_nights.find_one({"game_id": entry.get("game_id")})
            if not game:
                return ToolResult(success=False, error="Game not found")

            host_id = game.get("host_id")
            if not host_id:
                return ToolResult(success=False, error="Host not found")

            # Get user info
            from_user = await self.db.users.find_one({"user_id": entry.get("from_user_id")})
            to_user = await self.db.users.find_one({"user_id": entry.get("to_user_id")})

            from_name = from_user.get("name") if from_user else "Unknown"
            to_name = to_user.get("name") if to_user else "Unknown"
            amount = entry.get("amount", 0)
            days_pending = (datetime.utcnow() - entry.get("created_at", datetime.utcnow())).days

            # Get notification tool
            notification_tool = None
            if hasattr(self, 'tool_registry') and self.tool_registry:
                notification_tool = self.tool_registry.get("notification_sender")

            if notification_tool:
                await notification_tool.execute(
                    user_ids=[host_id],
                    title="Overdue Payment Alert",
                    message=f"{from_name} owes ${amount:.2f} to {to_name} ({days_pending} days overdue). You may want to follow up.",
                    notification_type="general",
                    data={
                        "ledger_id": ledger_id,
                        "amount": amount,
                        "from_user_id": entry.get("from_user_id"),
                        "to_user_id": entry.get("to_user_id"),
                        "days_overdue": days_pending
                    }
                )

            # Mark as escalated
            await self.db.ledger_entries.update_one(
                {"_id": ObjectId(ledger_id)},
                {
                    "$set": {
                        "escalated_at": datetime.utcnow(),
                        "escalated_to_host": True
                    }
                }
            )

            return ToolResult(
                success=True,
                data={
                    "ledger_id": ledger_id,
                    "escalated_to": host_id,
                    "amount": amount,
                    "days_overdue": days_pending
                },
                message=f"Escalated to host: ${amount:.2f} payment {days_pending} days overdue"
            )

        except Exception as e:
            logger.error(f"Error escalating to host: {e}")
            return ToolResult(success=False, error=str(e))

    async def _mark_paid(self, ledger_id: str) -> ToolResult:
        """
        Mark a payment as completed.

        Returns:
            ToolResult with updated payment status
        """
        if self.db is None or not ledger_id:
            return ToolResult(success=False, error="Database or ledger_id not available")

        try:
            from bson import ObjectId

            entry = await self.db.ledger_entries.find_one({"_id": ObjectId(ledger_id)})
            if not entry:
                return ToolResult(success=False, error="Ledger entry not found")

            if entry.get("status") == "paid":
                return ToolResult(
                    success=True,
                    data={"ledger_id": ledger_id, "status": "paid"},
                    message="Payment was already marked as paid"
                )

            # Update status
            await self.db.ledger_entries.update_one(
                {"_id": ObjectId(ledger_id)},
                {
                    "$set": {
                        "status": "paid",
                        "paid_at": datetime.utcnow()
                    }
                }
            )

            # Get user info for notification
            from_user = await self.db.users.find_one({"user_id": entry.get("from_user_id")})
            to_user = await self.db.users.find_one({"user_id": entry.get("to_user_id")})
            amount = entry.get("amount", 0)

            # Notify recipient
            notification_tool = None
            if hasattr(self, 'tool_registry') and self.tool_registry:
                notification_tool = self.tool_registry.get("notification_sender")

            if notification_tool and to_user:
                from_name = from_user.get("name") if from_user else "Someone"
                await notification_tool.execute(
                    user_ids=[entry.get("to_user_id")],
                    title="Payment Received",
                    message=f"{from_name} has paid ${amount:.2f}",
                    notification_type="settlement",
                    data={"ledger_id": ledger_id, "amount": amount}
                )

            return ToolResult(
                success=True,
                data={
                    "ledger_id": ledger_id,
                    "status": "paid",
                    "amount": amount
                },
                message=f"Payment of ${amount:.2f} marked as completed"
            )

        except Exception as e:
            logger.error(f"Error marking payment as paid: {e}")
            return ToolResult(success=False, error=str(e))

    async def _get_payment_stats(
        self,
        group_id: str = None,
        user_id: str = None
    ) -> ToolResult:
        """
        Get payment statistics for a group or user.

        Returns:
            ToolResult with payment statistics
        """
        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        try:
            # Build query
            query_pending = {"status": "pending"}
            query_paid = {"status": "paid"}

            if group_id:
                query_pending["group_id"] = group_id
                query_paid["group_id"] = group_id
            if user_id:
                query_pending["$or"] = [
                    {"from_user_id": user_id},
                    {"to_user_id": user_id}
                ]
                query_paid["$or"] = [
                    {"from_user_id": user_id},
                    {"to_user_id": user_id}
                ]

            # Get entries
            pending_entries = await self.db.ledger_entries.find(query_pending).to_list(length=1000)
            paid_entries = await self.db.ledger_entries.find(query_paid).to_list(length=1000)

            # Calculate stats
            total_pending = sum(e.get("amount", 0) for e in pending_entries)
            total_paid = sum(e.get("amount", 0) for e in paid_entries)

            # Calculate average payment time
            payment_times = []
            for entry in paid_entries:
                created = entry.get("created_at")
                paid = entry.get("paid_at")
                if created and paid:
                    days = (paid - created).days
                    payment_times.append(days)

            avg_payment_days = sum(payment_times) / len(payment_times) if payment_times else 0

            # Overdue count
            overdue_count = 0
            for entry in pending_entries:
                created = entry.get("created_at")
                if created and (datetime.utcnow() - created).days > 7:
                    overdue_count += 1

            return ToolResult(
                success=True,
                data={
                    "pending": {
                        "count": len(pending_entries),
                        "total_amount": round(total_pending, 2),
                        "overdue_count": overdue_count
                    },
                    "completed": {
                        "count": len(paid_entries),
                        "total_amount": round(total_paid, 2),
                        "avg_payment_days": round(avg_payment_days, 1)
                    },
                    "payment_rate": round(
                        (len(paid_entries) / (len(paid_entries) + len(pending_entries))) * 100, 1
                    ) if (paid_entries or pending_entries) else 100
                }
            )

        except Exception as e:
            logger.error(f"Error getting payment stats: {e}")
            return ToolResult(success=False, error=str(e))

    async def _schedule_reminders(self, game_id: str) -> ToolResult:
        """
        Schedule automatic payment reminders for a game.
        Schedules reminders at 1 day, 3 days, and 7 days.

        Returns:
            ToolResult with scheduled reminder info
        """
        if self.db is None or not game_id:
            return ToolResult(success=False, error="Database or game_id not available")

        try:
            # Get pending payments for game
            entries = await self.db.ledger_entries.find({
                "game_id": game_id,
                "status": "pending"
            }).to_list(length=100)

            if not entries:
                return ToolResult(
                    success=True,
                    data={"scheduled": 0},
                    message="No pending payments to schedule reminders for"
                )

            # Create reminder schedule
            now = datetime.utcnow()
            reminder_schedule = [
                {"days": 1, "type": "gentle"},
                {"days": 3, "type": "reminder"},
                {"days": 7, "type": "urgent"}
            ]

            schedules_created = 0

            for entry in entries:
                ledger_id = str(entry.get("_id"))

                for reminder in reminder_schedule:
                    remind_at = now + timedelta(days=reminder["days"])

                    # Store scheduled reminder
                    await self.db.scheduled_reminders.insert_one({
                        "ledger_id": ledger_id,
                        "game_id": game_id,
                        "scheduled_for": remind_at,
                        "reminder_type": reminder["type"],
                        "status": "pending",
                        "created_at": now
                    })
                    schedules_created += 1

            return ToolResult(
                success=True,
                data={
                    "scheduled": schedules_created,
                    "payments": len(entries),
                    "reminder_days": [1, 3, 7]
                },
                message=f"Scheduled {schedules_created} reminders for {len(entries)} payments"
            )

        except Exception as e:
            logger.error(f"Error scheduling reminders: {e}")
            return ToolResult(success=False, error=str(e))
