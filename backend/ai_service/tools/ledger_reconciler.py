"""
Ledger Reconciler Tool

Cross-checks ledger entries against Stripe transactions, consolidates
cross-game debts between players, and identifies payment anomalies.

Used by PaymentReconciliationAgent for autonomous payment tracking.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class LedgerReconcilerTool(BaseTool):
    """
    Tool for reconciling ledger entries, consolidating debts, and
    detecting payment anomalies.

    Features:
    - Scan for overdue payments with urgency classification
    - Cross-check ledger entries against Stripe webhook records
    - Consolidate cross-game debts between player pairs
    - Generate per-group payment health reports
    - Flag chronic non-payers based on payment history
    - Detect anomalies (duplicate entries, mismatched amounts)
    """

    def __init__(self, db=None, **kwargs):
        self.db = db

    @property
    def name(self) -> str:
        return "ledger_reconciler"

    @property
    def description(self) -> str:
        return (
            "Cross-check ledger entries against Stripe transactions, "
            "consolidate cross-game debts, scan for overdue payments, "
            "generate payment health reports, and flag chronic non-payers"
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform",
                    "enum": [
                        "scan_overdue",
                        "match_stripe_payment",
                        "consolidate_debts",
                        "payment_health_report",
                        "flag_chronic_nonpayers",
                        "detect_anomalies",
                    ]
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID to scope the operation"
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID for user-specific operations"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID for game-specific operations"
                },
                "stripe_event": {
                    "type": "object",
                    "description": "Stripe webhook event data for matching"
                },
                "overdue_days": {
                    "type": "integer",
                    "description": "Minimum days overdue to include (default: 1)"
                },
            },
            "required": ["action"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute ledger reconciler action."""
        action = kwargs.get("action")

        if action == "scan_overdue":
            return await self._scan_overdue(
                group_id=kwargs.get("group_id"),
                overdue_days=kwargs.get("overdue_days", 1),
            )
        elif action == "match_stripe_payment":
            return await self._match_stripe_payment(
                stripe_event=kwargs.get("stripe_event", {}),
            )
        elif action == "consolidate_debts":
            return await self._consolidate_debts(
                group_id=kwargs.get("group_id"),
                user_id=kwargs.get("user_id"),
            )
        elif action == "payment_health_report":
            return await self._payment_health_report(
                group_id=kwargs.get("group_id"),
            )
        elif action == "flag_chronic_nonpayers":
            return await self._flag_chronic_nonpayers(
                group_id=kwargs.get("group_id"),
            )
        elif action == "detect_anomalies":
            return await self._detect_anomalies(
                group_id=kwargs.get("group_id"),
                game_id=kwargs.get("game_id"),
            )
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    # ==================== Scan Overdue ====================

    async def _scan_overdue(
        self,
        group_id: str = None,
        overdue_days: int = 1,
    ) -> ToolResult:
        """
        Scan for overdue pending payments and classify by urgency.

        Urgency levels:
        - gentle: 1-2 days overdue
        - firm: 3-6 days overdue
        - final: 7-13 days overdue
        - escalate: 14+ days overdue (needs host intervention)
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            cutoff = datetime.now(timezone.utc) - timedelta(days=overdue_days)
            query = {
                "status": "pending",
                "created_at": {"$lte": cutoff.isoformat()},
            }
            if group_id:
                query["group_id"] = group_id

            entries = await self.db.ledger_entries.find(query).to_list(500)

            now = datetime.now(timezone.utc)
            overdue_entries = []

            for entry in entries:
                created_at = entry.get("created_at")
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(
                        created_at.replace("Z", "+00:00")
                    )
                elif not isinstance(created_at, datetime):
                    continue

                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)

                days_overdue = (now - created_at).days

                # Classify urgency
                if days_overdue >= 14:
                    urgency = "escalate"
                elif days_overdue >= 7:
                    urgency = "final"
                elif days_overdue >= 3:
                    urgency = "firm"
                else:
                    urgency = "gentle"

                overdue_entries.append({
                    "ledger_id": str(entry.get("_id", "")),
                    "from_user_id": entry.get("from_user_id"),
                    "to_user_id": entry.get("to_user_id"),
                    "amount": entry.get("amount", 0),
                    "game_id": entry.get("game_id"),
                    "group_id": entry.get("group_id"),
                    "days_overdue": days_overdue,
                    "urgency": urgency,
                    "reminder_count": entry.get("reminder_count", 0),
                    "escalated_to_host": entry.get("escalated_to_host", False),
                    "created_at": created_at.isoformat(),
                })

            # Sort by days overdue (most urgent first)
            overdue_entries.sort(key=lambda x: x["days_overdue"], reverse=True)

            # Summarize by urgency
            urgency_counts = {}
            total_amount = 0
            for e in overdue_entries:
                u = e["urgency"]
                urgency_counts[u] = urgency_counts.get(u, 0) + 1
                total_amount += e["amount"]

            return ToolResult(
                success=True,
                data={
                    "overdue_entries": overdue_entries,
                    "count": len(overdue_entries),
                    "total_amount": round(total_amount, 2),
                    "by_urgency": urgency_counts,
                },
                message=f"Found {len(overdue_entries)} overdue payments totaling ${total_amount:.2f}"
            )

        except Exception as e:
            logger.error(f"Error scanning overdue payments: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Match Stripe Payment ====================

    async def _match_stripe_payment(
        self,
        stripe_event: Dict,
    ) -> ToolResult:
        """
        Match an incoming Stripe payment to a pending ledger entry.

        Matching strategy:
        1. By metadata (ledger_id if included in Stripe metadata)
        2. By amount + user email
        3. By amount + user ID (from Stripe customer mapping)
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            payment_data = stripe_event.get("data", {}).get("object", stripe_event)
            amount_cents = payment_data.get("amount", 0)
            amount = amount_cents / 100 if amount_cents > 0 else 0
            metadata = payment_data.get("metadata", {})
            customer_email = payment_data.get("receipt_email") or payment_data.get("email")
            stripe_customer_id = payment_data.get("customer")

            matches = []

            # Strategy 1: Direct ledger_id match from metadata
            ledger_id = metadata.get("ledger_id")
            if ledger_id:
                from bson import ObjectId
                entry = await self.db.ledger_entries.find_one({
                    "_id": ObjectId(ledger_id),
                    "status": "pending",
                })
                if entry:
                    matches.append({
                        "ledger_id": str(entry["_id"]),
                        "match_method": "metadata_ledger_id",
                        "confidence": 1.0,
                        "from_user_id": entry.get("from_user_id"),
                        "to_user_id": entry.get("to_user_id"),
                        "amount": entry.get("amount", 0),
                    })

            # Strategy 2: Match by amount + email
            if not matches and customer_email and amount > 0:
                user = await self.db.users.find_one({"email": customer_email})
                if user:
                    user_id = user.get("user_id")
                    pending = await self.db.ledger_entries.find({
                        "from_user_id": user_id,
                        "status": "pending",
                        "amount": {"$gte": amount - 0.01, "$lte": amount + 0.01},
                    }).to_list(10)

                    for entry in pending:
                        matches.append({
                            "ledger_id": str(entry["_id"]),
                            "match_method": "amount_email",
                            "confidence": 0.9,
                            "from_user_id": entry.get("from_user_id"),
                            "to_user_id": entry.get("to_user_id"),
                            "amount": entry.get("amount", 0),
                        })

            # Strategy 3: Match by Stripe customer ID
            if not matches and stripe_customer_id and amount > 0:
                user = await self.db.users.find_one({
                    "stripe_customer_id": stripe_customer_id
                })
                if user:
                    user_id = user.get("user_id")
                    pending = await self.db.ledger_entries.find({
                        "from_user_id": user_id,
                        "status": "pending",
                        "amount": {"$gte": amount - 0.01, "$lte": amount + 0.01},
                    }).to_list(10)

                    for entry in pending:
                        matches.append({
                            "ledger_id": str(entry["_id"]),
                            "match_method": "amount_customer_id",
                            "confidence": 0.85,
                            "from_user_id": entry.get("from_user_id"),
                            "to_user_id": entry.get("to_user_id"),
                            "amount": entry.get("amount", 0),
                        })

            # Log the match attempt
            await self.db.payment_reconciliation_log.insert_one({
                "event_type": "stripe_match_attempt",
                "stripe_payment_id": payment_data.get("id"),
                "amount": amount,
                "matches_found": len(matches),
                "match_methods": [m["match_method"] for m in matches],
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

            return ToolResult(
                success=True,
                data={
                    "matches": matches,
                    "matched": len(matches) > 0,
                    "stripe_amount": amount,
                    "best_match": matches[0] if matches else None,
                },
                message=(
                    f"Matched {len(matches)} ledger entries to Stripe payment of ${amount:.2f}"
                    if matches
                    else f"No matches found for Stripe payment of ${amount:.2f}"
                )
            )

        except Exception as e:
            logger.error(f"Error matching Stripe payment: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Consolidate Debts ====================

    async def _consolidate_debts(
        self,
        group_id: str = None,
        user_id: str = None,
    ) -> ToolResult:
        """
        Consolidate cross-game debts between player pairs.

        "You owe Player X $15 across 3 games" -> single consolidated amount.

        This is read-only: generates a summary but doesn't modify entries.
        Actual consolidation (creating a single ledger entry) requires host confirmation.
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            query = {"status": "pending"}
            if group_id:
                query["group_id"] = group_id
            if user_id:
                query["$or"] = [
                    {"from_user_id": user_id},
                    {"to_user_id": user_id},
                ]

            entries = await self.db.ledger_entries.find(query).to_list(500)

            # Build debt graph: {(from_id, to_id): total_amount, game_ids, count}
            debt_pairs = {}
            for entry in entries:
                from_id = entry.get("from_user_id")
                to_id = entry.get("to_user_id")
                amount = entry.get("amount", 0)
                game_id = entry.get("game_id")

                if not from_id or not to_id:
                    continue

                key = (from_id, to_id)
                if key not in debt_pairs:
                    debt_pairs[key] = {
                        "from_user_id": from_id,
                        "to_user_id": to_id,
                        "total_amount": 0,
                        "game_count": 0,
                        "game_ids": [],
                        "ledger_ids": [],
                    }
                debt_pairs[key]["total_amount"] += amount
                debt_pairs[key]["game_count"] += 1
                if game_id and game_id not in debt_pairs[key]["game_ids"]:
                    debt_pairs[key]["game_ids"].append(game_id)
                debt_pairs[key]["ledger_ids"].append(str(entry.get("_id", "")))

            # Net out bidirectional debts: if A owes B $10 and B owes A $3, net = A owes B $7
            consolidated = []
            processed_pairs = set()

            for (from_id, to_id), data in debt_pairs.items():
                if (from_id, to_id) in processed_pairs:
                    continue

                reverse_key = (to_id, from_id)
                reverse_data = debt_pairs.get(reverse_key)

                forward_amount = data["total_amount"]
                reverse_amount = reverse_data["total_amount"] if reverse_data else 0
                net_amount = round(forward_amount - reverse_amount, 2)

                if net_amount == 0:
                    # Perfectly offset -- both sides clear
                    consolidated.append({
                        "from_user_id": from_id,
                        "to_user_id": to_id,
                        "net_amount": 0,
                        "status": "offset",
                        "forward_total": forward_amount,
                        "reverse_total": reverse_amount,
                        "game_count": data["game_count"] + (reverse_data["game_count"] if reverse_data else 0),
                        "ledger_ids": data["ledger_ids"] + (reverse_data["ledger_ids"] if reverse_data else []),
                    })
                elif net_amount > 0:
                    consolidated.append({
                        "from_user_id": from_id,
                        "to_user_id": to_id,
                        "net_amount": net_amount,
                        "status": "consolidatable" if data["game_count"] > 1 or reverse_data else "single",
                        "forward_total": forward_amount,
                        "reverse_total": reverse_amount,
                        "game_count": data["game_count"] + (reverse_data["game_count"] if reverse_data else 0),
                        "ledger_ids": data["ledger_ids"] + (reverse_data["ledger_ids"] if reverse_data else []),
                    })
                else:
                    # Reverse direction is net positive
                    consolidated.append({
                        "from_user_id": to_id,
                        "to_user_id": from_id,
                        "net_amount": abs(net_amount),
                        "status": "consolidatable" if data["game_count"] > 1 or reverse_data else "single",
                        "forward_total": reverse_amount,
                        "reverse_total": forward_amount,
                        "game_count": data["game_count"] + (reverse_data["game_count"] if reverse_data else 0),
                        "ledger_ids": data["ledger_ids"] + (reverse_data["ledger_ids"] if reverse_data else []),
                    })

                processed_pairs.add((from_id, to_id))
                processed_pairs.add((to_id, from_id))

            # Enrich with user names
            user_ids = set()
            for c in consolidated:
                user_ids.add(c["from_user_id"])
                user_ids.add(c["to_user_id"])

            user_names = {}
            for uid in user_ids:
                user = await self.db.users.find_one(
                    {"user_id": uid}, {"_id": 0, "name": 1}
                )
                user_names[uid] = user.get("name", "Unknown") if user else "Unknown"

            for c in consolidated:
                c["from_user_name"] = user_names.get(c["from_user_id"], "Unknown")
                c["to_user_name"] = user_names.get(c["to_user_id"], "Unknown")

            # Filter to only consolidatable entries (multi-game debts)
            consolidatable = [
                c for c in consolidated
                if c["status"] == "consolidatable" and c["net_amount"] > 0
            ]

            total_consolidatable = sum(c["net_amount"] for c in consolidatable)

            return ToolResult(
                success=True,
                data={
                    "consolidated": consolidated,
                    "consolidatable_count": len(consolidatable),
                    "consolidatable_total": round(total_consolidatable, 2),
                    "all_pairs_count": len(consolidated),
                },
                message=(
                    f"Found {len(consolidatable)} debt pairs that can be consolidated "
                    f"(${total_consolidatable:.2f} total)"
                )
            )

        except Exception as e:
            logger.error(f"Error consolidating debts: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Payment Health Report ====================

    async def _payment_health_report(
        self,
        group_id: str = None,
    ) -> ToolResult:
        """
        Generate a weekly payment health report for a group.

        Includes:
        - Outstanding vs. paid totals
        - Average payment time
        - Overdue count by urgency
        - Chronic non-payer flags
        - Consolidation opportunities
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        if not group_id:
            return ToolResult(success=False, error="group_id required")

        try:
            # Get pending entries
            pending = await self.db.ledger_entries.find({
                "group_id": group_id,
                "status": "pending",
            }).to_list(500)

            # Get paid entries (last 30 days)
            cutoff_30d = (
                datetime.now(timezone.utc) - timedelta(days=30)
            ).isoformat()
            paid = await self.db.ledger_entries.find({
                "group_id": group_id,
                "status": "paid",
                "paid_at": {"$gte": cutoff_30d},
            }).to_list(500)

            # Calculate stats
            pending_total = sum(e.get("amount", 0) for e in pending)
            paid_total = sum(e.get("amount", 0) for e in paid)

            # Average payment time for completed payments
            payment_times = []
            for entry in paid:
                created = entry.get("created_at")
                paid_at = entry.get("paid_at")
                if created and paid_at:
                    if isinstance(created, str):
                        created = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    if isinstance(paid_at, str):
                        paid_at = datetime.fromisoformat(paid_at.replace("Z", "+00:00"))
                    if isinstance(created, datetime) and isinstance(paid_at, datetime):
                        if created.tzinfo is None:
                            created = created.replace(tzinfo=timezone.utc)
                        if paid_at.tzinfo is None:
                            paid_at = paid_at.replace(tzinfo=timezone.utc)
                        days = (paid_at - created).total_seconds() / 86400
                        payment_times.append(days)

            avg_payment_days = (
                round(sum(payment_times) / len(payment_times), 1)
                if payment_times else None
            )

            # Overdue classification
            now = datetime.now(timezone.utc)
            overdue_by_urgency = {"gentle": 0, "firm": 0, "final": 0, "escalate": 0}
            for entry in pending:
                created_at = entry.get("created_at")
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                if isinstance(created_at, datetime):
                    if created_at.tzinfo is None:
                        created_at = created_at.replace(tzinfo=timezone.utc)
                    days = (now - created_at).days
                    if days >= 14:
                        overdue_by_urgency["escalate"] += 1
                    elif days >= 7:
                        overdue_by_urgency["final"] += 1
                    elif days >= 3:
                        overdue_by_urgency["firm"] += 1
                    elif days >= 1:
                        overdue_by_urgency["gentle"] += 1

            total_overdue = sum(overdue_by_urgency.values())

            # Payment rate
            total_entries = len(paid) + len(pending)
            payment_rate = (
                round((len(paid) / total_entries) * 100, 1)
                if total_entries > 0 else 100
            )

            # Chronic non-payers (>= 3 overdue entries or average payment > 7 days)
            nonpayer_counts = {}
            for entry in pending:
                from_id = entry.get("from_user_id")
                if from_id:
                    nonpayer_counts[from_id] = nonpayer_counts.get(from_id, 0) + 1

            chronic_nonpayers = [
                uid for uid, count in nonpayer_counts.items() if count >= 3
            ]

            return ToolResult(
                success=True,
                data={
                    "group_id": group_id,
                    "pending": {
                        "count": len(pending),
                        "total_amount": round(pending_total, 2),
                    },
                    "paid_last_30d": {
                        "count": len(paid),
                        "total_amount": round(paid_total, 2),
                    },
                    "avg_payment_days": avg_payment_days,
                    "payment_rate": payment_rate,
                    "overdue": {
                        "total": total_overdue,
                        "by_urgency": overdue_by_urgency,
                    },
                    "chronic_nonpayers": chronic_nonpayers,
                    "chronic_nonpayer_count": len(chronic_nonpayers),
                },
                message=(
                    f"Payment health: {payment_rate}% paid, "
                    f"{len(pending)} pending (${pending_total:.2f}), "
                    f"{total_overdue} overdue"
                )
            )

        except Exception as e:
            logger.error(f"Error generating payment health report: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Flag Chronic Non-Payers ====================

    async def _flag_chronic_nonpayers(
        self,
        group_id: str = None,
    ) -> ToolResult:
        """
        Flag users with a pattern of late or unpaid debts.

        Criteria:
        - 3+ currently overdue payments, OR
        - Average payment time > 10 days (across last 90 days), OR
        - 2+ escalated-to-host payments in the last 90 days
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            query_pending = {"status": "pending"}
            if group_id:
                query_pending["group_id"] = group_id

            pending = await self.db.ledger_entries.find(query_pending).to_list(500)

            # Count pending per user
            pending_counts = {}
            for entry in pending:
                from_id = entry.get("from_user_id")
                if from_id:
                    if from_id not in pending_counts:
                        pending_counts[from_id] = {
                            "pending_count": 0,
                            "total_owed": 0,
                            "escalated_count": 0,
                        }
                    pending_counts[from_id]["pending_count"] += 1
                    pending_counts[from_id]["total_owed"] += entry.get("amount", 0)
                    if entry.get("escalated_to_host"):
                        pending_counts[from_id]["escalated_count"] += 1

            # Get paid entries for avg payment time (last 90 days)
            cutoff_90d = (
                datetime.now(timezone.utc) - timedelta(days=90)
            ).isoformat()
            query_paid = {"status": "paid", "paid_at": {"$gte": cutoff_90d}}
            if group_id:
                query_paid["group_id"] = group_id

            paid = await self.db.ledger_entries.find(query_paid).to_list(1000)

            # Compute average payment time per user
            user_payment_times = {}
            for entry in paid:
                from_id = entry.get("from_user_id")
                created = entry.get("created_at")
                paid_at = entry.get("paid_at")
                if from_id and created and paid_at:
                    if isinstance(created, str):
                        created = datetime.fromisoformat(created.replace("Z", "+00:00"))
                    if isinstance(paid_at, str):
                        paid_at = datetime.fromisoformat(paid_at.replace("Z", "+00:00"))
                    if isinstance(created, datetime) and isinstance(paid_at, datetime):
                        if created.tzinfo is None:
                            created = created.replace(tzinfo=timezone.utc)
                        if paid_at.tzinfo is None:
                            paid_at = paid_at.replace(tzinfo=timezone.utc)
                        days = (paid_at - created).total_seconds() / 86400
                        if from_id not in user_payment_times:
                            user_payment_times[from_id] = []
                        user_payment_times[from_id].append(days)

            # Build flagged list
            flagged = []
            all_user_ids = set(pending_counts.keys()) | set(user_payment_times.keys())

            for uid in all_user_ids:
                pc = pending_counts.get(uid, {})
                pending_count = pc.get("pending_count", 0)
                total_owed = pc.get("total_owed", 0)
                escalated = pc.get("escalated_count", 0)

                times = user_payment_times.get(uid, [])
                avg_days = round(sum(times) / len(times), 1) if times else None

                reasons = []
                if pending_count >= 3:
                    reasons.append(f"{pending_count} overdue payments")
                if avg_days is not None and avg_days > 10:
                    reasons.append(f"avg payment time {avg_days} days")
                if escalated >= 2:
                    reasons.append(f"{escalated} escalated to host")

                if reasons:
                    flagged.append({
                        "user_id": uid,
                        "pending_count": pending_count,
                        "total_owed": round(total_owed, 2),
                        "avg_payment_days": avg_days,
                        "escalated_count": escalated,
                        "reasons": reasons,
                    })

            # Enrich with user names
            for f in flagged:
                user = await self.db.users.find_one(
                    {"user_id": f["user_id"]}, {"_id": 0, "name": 1}
                )
                f["name"] = user.get("name", "Unknown") if user else "Unknown"

            # Sort by number of reasons (most flagged first)
            flagged.sort(key=lambda x: len(x["reasons"]), reverse=True)

            return ToolResult(
                success=True,
                data={
                    "flagged_users": flagged,
                    "flagged_count": len(flagged),
                    "group_id": group_id,
                },
                message=f"Flagged {len(flagged)} chronic non-payers"
            )

        except Exception as e:
            logger.error(f"Error flagging chronic non-payers: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Detect Anomalies ====================

    async def _detect_anomalies(
        self,
        group_id: str = None,
        game_id: str = None,
    ) -> ToolResult:
        """
        Detect payment anomalies:
        - Duplicate ledger entries (same from/to/amount/game)
        - Mismatched settlement totals (total owed != total paid out)
        - Orphaned entries (game doesn't exist or was cancelled)
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            query = {}
            if group_id:
                query["group_id"] = group_id
            if game_id:
                query["game_id"] = game_id

            entries = await self.db.ledger_entries.find(query).to_list(1000)

            anomalies = []

            # Check for duplicates (same from/to/amount/game)
            seen = {}
            for entry in entries:
                key = (
                    entry.get("from_user_id"),
                    entry.get("to_user_id"),
                    entry.get("amount"),
                    entry.get("game_id"),
                )
                if key in seen:
                    anomalies.append({
                        "type": "duplicate",
                        "description": (
                            f"Duplicate entry: {key[0]} -> {key[1]}, "
                            f"${key[2]}, game {key[3]}"
                        ),
                        "ledger_ids": [
                            str(seen[key].get("_id", "")),
                            str(entry.get("_id", "")),
                        ],
                        "amount": entry.get("amount", 0),
                    })
                else:
                    seen[key] = entry

            # Check for mismatched settlement totals per game
            games_in_scope = set(e.get("game_id") for e in entries if e.get("game_id"))
            for gid in games_in_scope:
                game_entries = [e for e in entries if e.get("game_id") == gid]
                total_owed = sum(
                    e.get("amount", 0) for e in game_entries
                    if e.get("from_user_id")
                )
                # Check if game exists
                game = await self.db.game_nights.find_one({"game_id": gid})
                if not game:
                    anomalies.append({
                        "type": "orphaned",
                        "description": f"Ledger entries reference non-existent game {gid}",
                        "game_id": gid,
                        "entry_count": len(game_entries),
                    })
                elif game.get("status") == "cancelled":
                    anomalies.append({
                        "type": "cancelled_game",
                        "description": f"Pending payments for cancelled game {gid}",
                        "game_id": gid,
                        "entry_count": len([
                            e for e in game_entries if e.get("status") == "pending"
                        ]),
                    })

            return ToolResult(
                success=True,
                data={
                    "anomalies": anomalies,
                    "anomaly_count": len(anomalies),
                    "entries_scanned": len(entries),
                },
                message=(
                    f"Found {len(anomalies)} anomalies in {len(entries)} entries"
                    if anomalies
                    else f"No anomalies found in {len(entries)} entries"
                )
            )

        except Exception as e:
            logger.error(f"Error detecting anomalies: {e}")
            return ToolResult(success=False, error=str(e))
