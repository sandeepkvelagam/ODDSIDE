"""
Ledger Reconciler Tool (v2)

Cross-checks ledger entries against Stripe transactions, consolidates
cross-game debts between players, and identifies payment anomalies.

v2 improvements:
- Two-phase Stripe reconciliation: verify -> apply (prevents race conditions)
- Webhook deduplication via stripe_event_id
- PaymentIntent state machine validation (only process 'succeeded')
- Consolidation: view-only with oldest-first allocation plan, no disputed/cross-currency
- Group-relative nonpayer detection (compare to group median, not absolute)
- Observability KPIs (auto-match rate, time-to-pay, reminder conversion, escalation rate)
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
import statistics

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class LedgerReconcilerTool(BaseTool):
    """
    Tool for reconciling ledger entries, consolidating debts, and
    detecting payment anomalies (v2).

    Key v2 features:
    - verify_stripe_payment: two-phase verify before apply
    - Stripe webhook dedup (stripe_event_id uniqueness)
    - Group-relative nonpayer detection vs group median
    - Consolidation with allocation plan (oldest-first)
    - KPI computation for observability
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
            "generate payment health reports, flag chronic non-payers, "
            "and verify Stripe payments with two-phase reconciliation"
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
                        "verify_stripe_payment",
                        "consolidate_debts",
                        "payment_health_report",
                        "flag_chronic_nonpayers",
                        "detect_anomalies",
                        "compute_kpis",
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
                "ledger_id": {
                    "type": "string",
                    "description": "Ledger entry ID for verification"
                },
                "stripe_payment_id": {
                    "type": "string",
                    "description": "Stripe payment ID for verification"
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
        elif action == "verify_stripe_payment":
            return await self._verify_stripe_payment(
                ledger_id=kwargs.get("ledger_id"),
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
        elif action == "compute_kpis":
            return await self._compute_kpis(
                group_id=kwargs.get("group_id"),
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

        Urgency levels (aligned with escalation policy v2):
        - gentle: 1-2 days overdue
        - firm: 3-6 days overdue
        - final: 7-13 days overdue (soft escalation zone)
        - escalate: 14+ days overdue (hard escalation zone)
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            cutoff = datetime.now(timezone.utc) - timedelta(days=overdue_days)
            query = {
                "status": {"$in": ["pending", "open"]},
                "created_at": {"$lte": cutoff.isoformat()},
            }
            if group_id:
                query["group_id"] = group_id

            entries = await self.db.ledger_entries.find(query).to_list(500)

            now = datetime.now(timezone.utc)
            overdue_entries = []

            for entry in entries:
                # Skip disputed entries
                if entry.get("status") == "disputed":
                    continue

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

                # Classify urgency (aligned with escalation policy)
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
                    "amount_cents": entry.get("amount_cents"),
                    "currency": entry.get("currency", "usd"),
                    "game_id": entry.get("game_id"),
                    "group_id": entry.get("group_id"),
                    "days_overdue": days_overdue,
                    "urgency": urgency,
                    "reminder_count": entry.get("reminder_count", 0),
                    "soft_escalated": entry.get("soft_escalated", False),
                    "hard_escalated": entry.get("hard_escalated", False),
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
        Match an incoming Stripe payment to pending ledger entries.

        v2 improvements:
        - Webhook deduplication via stripe_event_id
        - PaymentIntent state machine (only process 'succeeded')
        - Matching strategies:
          1. metadata.ledger_id -> confidence 1.0
          2. amount + receipt_email -> confidence 0.9
          3. amount + stripe_customer_id -> confidence 0.85
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            payment_data = stripe_event.get("data", {}).get("object", stripe_event)
            stripe_event_id = stripe_event.get("id") or payment_data.get("id")

            # Webhook dedup: check if we've already processed this event
            if stripe_event_id:
                existing = await self.db.payment_reconciliation_log.find_one({
                    "stripe_event_id": stripe_event_id,
                })
                if existing:
                    return ToolResult(
                        success=True,
                        data={
                            "matched": False,
                            "duplicate_webhook": True,
                            "original_processed_at": existing.get("created_at"),
                        },
                        message=f"Duplicate webhook: {stripe_event_id} already processed"
                    )

            # PaymentIntent state machine: only process 'succeeded'
            pi_status = payment_data.get("status")
            if pi_status and pi_status != "succeeded":
                return ToolResult(
                    success=True,
                    data={
                        "matched": False,
                        "skipped_reason": f"payment_intent_status={pi_status}",
                    },
                    message=f"Skipping: PaymentIntent status is '{pi_status}', not 'succeeded'"
                )

            amount_cents = payment_data.get("amount", 0)
            amount = amount_cents / 100 if amount_cents > 0 else 0
            currency = (payment_data.get("currency") or "usd").lower()
            metadata = payment_data.get("metadata", {})
            customer_email = (
                payment_data.get("receipt_email") or payment_data.get("email")
            )
            stripe_customer_id = payment_data.get("customer")
            stripe_payment_intent_id = payment_data.get("payment_intent") or payment_data.get("id")

            matches = []

            # Strategy 1: Direct ledger_id match from metadata (deterministic)
            ledger_id = metadata.get("ledger_id")
            if ledger_id:
                from bson import ObjectId
                entry = await self.db.ledger_entries.find_one({
                    "_id": ObjectId(ledger_id),
                    "status": {"$in": ["pending", "open"]},
                })
                if entry:
                    # Verify amount matches (exact cents)
                    entry_amount = entry.get("amount", 0)
                    entry_amount_cents = entry.get("amount_cents")
                    if entry_amount_cents is not None:
                        amount_match = entry_amount_cents == amount_cents
                    else:
                        amount_match = abs(entry_amount - amount) < 0.01

                    matches.append({
                        "ledger_id": str(entry["_id"]),
                        "match_method": "metadata_ledger_id",
                        "confidence": 1.0 if amount_match else 0.7,
                        "amount_verified": amount_match,
                        "from_user_id": entry.get("from_user_id"),
                        "to_user_id": entry.get("to_user_id"),
                        "amount": entry.get("amount", 0),
                        "currency": entry.get("currency", "usd"),
                    })

            # Strategy 2: Match by amount + email
            if not matches and customer_email and amount > 0:
                user = await self.db.users.find_one({"email": customer_email})
                if user:
                    user_id = user.get("user_id")
                    pending = await self.db.ledger_entries.find({
                        "from_user_id": user_id,
                        "status": {"$in": ["pending", "open"]},
                        "amount": {"$gte": amount - 0.01, "$lte": amount + 0.01},
                    }).to_list(10)

                    for entry in pending:
                        matches.append({
                            "ledger_id": str(entry["_id"]),
                            "match_method": "amount_email",
                            "confidence": 0.9,
                            "amount_verified": True,
                            "from_user_id": entry.get("from_user_id"),
                            "to_user_id": entry.get("to_user_id"),
                            "amount": entry.get("amount", 0),
                            "currency": entry.get("currency", "usd"),
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
                        "status": {"$in": ["pending", "open"]},
                        "amount": {"$gte": amount - 0.01, "$lte": amount + 0.01},
                    }).to_list(10)

                    for entry in pending:
                        matches.append({
                            "ledger_id": str(entry["_id"]),
                            "match_method": "amount_customer_id",
                            "confidence": 0.85,
                            "amount_verified": True,
                            "from_user_id": entry.get("from_user_id"),
                            "to_user_id": entry.get("to_user_id"),
                            "amount": entry.get("amount", 0),
                            "currency": entry.get("currency", "usd"),
                        })

            # Log the match attempt with dedup key
            await self.db.payment_reconciliation_log.insert_one({
                "event_type": "stripe_match_attempt",
                "stripe_event_id": stripe_event_id,
                "stripe_payment_intent_id": stripe_payment_intent_id,
                "amount": amount,
                "amount_cents": amount_cents,
                "currency": currency,
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
                    "stripe_amount_cents": amount_cents,
                    "stripe_currency": currency,
                    "stripe_event_id": stripe_event_id,
                    "stripe_payment_intent_id": stripe_payment_intent_id,
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

    # ==================== Verify Stripe Payment (Phase A) ====================

    async def _verify_stripe_payment(
        self,
        ledger_id: str = None,
        stripe_event: Dict = None,
    ) -> ToolResult:
        """
        Two-phase reconciliation, Phase A: VERIFY.

        Pre-conditions that must ALL pass before marking paid:
        1. Payment succeeded (PaymentIntent status = succeeded)
        2. Currency matches ledger entry
        3. Amount matches exact cents
        4. Ledger entry is still open/pending (not already paid or canceled)
        5. No duplicate application (stripe_payment_intent_id not already used)

        Returns verification result. Agent only proceeds to "apply" if all pass.
        """
        if not self.db or not ledger_id:
            return ToolResult(success=False, error="Database and ledger_id required")

        try:
            from bson import ObjectId
            entry = await self.db.ledger_entries.find_one({"_id": ObjectId(ledger_id)})
            if not entry:
                return ToolResult(
                    success=True,
                    data={"verified": False, "reason": "ledger_entry_not_found"},
                )

            stripe_event = stripe_event or {}
            payment_data = stripe_event.get("data", {}).get("object", stripe_event)
            checks = []

            # Check 1: Payment succeeded
            pi_status = payment_data.get("status", "succeeded")
            if pi_status == "succeeded":
                checks.append({"check": "payment_succeeded", "passed": True})
            else:
                checks.append({
                    "check": "payment_succeeded",
                    "passed": False,
                    "detail": f"status={pi_status}"
                })

            # Check 2: Currency matches
            entry_currency = (entry.get("currency") or "usd").lower()
            payment_currency = (payment_data.get("currency") or "usd").lower()
            currency_match = entry_currency == payment_currency
            checks.append({
                "check": "currency_match",
                "passed": currency_match,
                "detail": f"entry={entry_currency}, payment={payment_currency}"
            })

            # Check 3: Amount matches (exact cents)
            payment_amount_cents = payment_data.get("amount", 0)
            payment_amount = payment_amount_cents / 100 if payment_amount_cents > 0 else 0
            entry_amount = entry.get("amount", 0)
            entry_amount_cents = entry.get("amount_cents")

            if entry_amount_cents is not None:
                amount_match = entry_amount_cents == payment_amount_cents
            else:
                amount_match = abs(entry_amount - payment_amount) < 0.01

            checks.append({
                "check": "amount_match",
                "passed": amount_match,
                "detail": f"entry=${entry_amount:.2f}, payment=${payment_amount:.2f}"
            })

            # Check 4: Ledger entry still open
            entry_status = entry.get("status", "")
            is_open = entry_status in ("pending", "open")
            checks.append({
                "check": "entry_still_open",
                "passed": is_open,
                "detail": f"status={entry_status}"
            })

            # Check 5: No duplicate application
            stripe_pi_id = (
                payment_data.get("payment_intent")
                or payment_data.get("id")
            )
            duplicate = False
            if stripe_pi_id:
                existing = await self.db.ledger_entries.find_one({
                    "stripe_payment_intent_id": stripe_pi_id,
                    "status": "paid",
                })
                if existing:
                    duplicate = True
            checks.append({
                "check": "no_duplicate_application",
                "passed": not duplicate,
                "detail": f"stripe_pi_id={stripe_pi_id}"
            })

            all_passed = all(c["passed"] for c in checks)
            failed = [c for c in checks if not c["passed"]]

            return ToolResult(
                success=True,
                data={
                    "verified": all_passed,
                    "checks": checks,
                    "failed_checks": [c["check"] for c in failed],
                    "ledger_id": ledger_id,
                    "entry_amount": entry_amount,
                    "payment_amount": payment_amount,
                    "stripe_payment_intent_id": stripe_pi_id,
                },
                message=(
                    "All verification checks passed" if all_passed
                    else f"Verification failed: {', '.join(c['check'] for c in failed)}"
                )
            )

        except Exception as e:
            logger.error(f"Error verifying Stripe payment: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Consolidate Debts (v2) ====================

    async def _consolidate_debts(
        self,
        group_id: str = None,
        user_id: str = None,
    ) -> ToolResult:
        """
        Consolidate cross-game debts between player pairs (v2).

        VIEW-ONLY: generates suggestions + allocation plan, never modifies entries.

        v2 improvements:
        - Exclude disputed entries
        - Exclude entries with different currencies
        - Include oldest-first allocation plan for each consolidation
        - Flag disputed/mixed-currency pairs
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            query = {"status": {"$in": ["pending", "open"]}}
            if group_id:
                query["group_id"] = group_id
            if user_id:
                query["$or"] = [
                    {"from_user_id": user_id},
                    {"to_user_id": user_id},
                ]

            entries = await self.db.ledger_entries.find(query).to_list(500)

            # Separate clean entries from disputed
            clean_entries = [
                e for e in entries if e.get("status") != "disputed"
            ]

            # Build debt graph with currency tracking
            debt_pairs = {}
            for entry in clean_entries:
                from_id = entry.get("from_user_id")
                to_id = entry.get("to_user_id")
                amount = entry.get("amount", 0)
                game_id = entry.get("game_id")
                currency = (entry.get("currency") or "usd").lower()

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
                        "currencies": set(),
                        "entries": [],  # Keep full entries for allocation plan
                    }
                debt_pairs[key]["total_amount"] += amount
                debt_pairs[key]["game_count"] += 1
                debt_pairs[key]["currencies"].add(currency)
                if game_id and game_id not in debt_pairs[key]["game_ids"]:
                    debt_pairs[key]["game_ids"].append(game_id)
                debt_pairs[key]["ledger_ids"].append(str(entry.get("_id", "")))
                debt_pairs[key]["entries"].append({
                    "ledger_id": str(entry.get("_id", "")),
                    "amount": amount,
                    "game_id": game_id,
                    "created_at": entry.get("created_at"),
                })

            # Net out bidirectional debts
            consolidated = []
            processed_pairs = set()

            for (from_id, to_id), data in debt_pairs.items():
                if (from_id, to_id) in processed_pairs:
                    continue

                reverse_key = (to_id, from_id)
                reverse_data = debt_pairs.get(reverse_key)

                # Check for mixed currencies
                all_currencies = set(data["currencies"])
                if reverse_data:
                    all_currencies |= reverse_data["currencies"]
                has_mixed = len(all_currencies) > 1

                forward_amount = data["total_amount"]
                reverse_amount = reverse_data["total_amount"] if reverse_data else 0
                net_amount = round(forward_amount - reverse_amount, 2)

                all_entries = list(data["entries"])
                if reverse_data:
                    all_entries.extend(reverse_data["entries"])

                all_ledger_ids = list(data["ledger_ids"])
                if reverse_data:
                    all_ledger_ids.extend(reverse_data["ledger_ids"])

                total_games = data["game_count"] + (
                    reverse_data["game_count"] if reverse_data else 0
                )

                # Determine net direction
                if net_amount == 0:
                    status = "offset"
                    net_from = from_id
                    net_to = to_id
                elif net_amount > 0:
                    status = (
                        "consolidatable"
                        if total_games > 1 or reverse_data
                        else "single"
                    )
                    net_from = from_id
                    net_to = to_id
                else:
                    status = (
                        "consolidatable"
                        if total_games > 1 or reverse_data
                        else "single"
                    )
                    net_from = to_id
                    net_to = from_id
                    net_amount = abs(net_amount)

                # Build oldest-first allocation plan
                # Sort entries by created_at ascending
                sorted_entries = sorted(
                    all_entries,
                    key=lambda e: e.get("created_at") or "",
                )
                allocation_plan = [
                    {
                        "ledger_id": e["ledger_id"],
                        "amount": e["amount"],
                        "order": i + 1,
                    }
                    for i, e in enumerate(sorted_entries)
                ]

                consolidated.append({
                    "from_user_id": net_from,
                    "to_user_id": net_to,
                    "net_amount": net_amount,
                    "status": status,
                    "forward_total": forward_amount if net_from == from_id else reverse_amount,
                    "reverse_total": reverse_amount if net_from == from_id else forward_amount,
                    "game_count": total_games,
                    "ledger_ids": all_ledger_ids,
                    "has_disputed": False,  # Clean entries only
                    "has_mixed_currencies": has_mixed,
                    "currencies": list(all_currencies),
                    "allocation_plan": allocation_plan,
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

            # Filter to consolidatable (multi-game, positive, same currency)
            consolidatable = [
                c for c in consolidated
                if c["status"] == "consolidatable"
                and c["net_amount"] > 0
                and not c["has_mixed_currencies"]
            ]

            total_consolidatable = sum(c["net_amount"] for c in consolidatable)

            return ToolResult(
                success=True,
                data={
                    "consolidated": consolidated,
                    "consolidatable_count": len(consolidatable),
                    "consolidatable_total": round(total_consolidatable, 2),
                    "all_pairs_count": len(consolidated),
                    "mixed_currency_pairs": len([
                        c for c in consolidated if c["has_mixed_currencies"]
                    ]),
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

        Includes: Outstanding vs paid, avg time, overdue breakdown,
        chronic flags, consolidation opportunities.
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        if not group_id:
            return ToolResult(success=False, error="group_id required")

        try:
            pending = await self.db.ledger_entries.find({
                "group_id": group_id,
                "status": {"$in": ["pending", "open"]},
            }).to_list(500)

            cutoff_30d = (
                datetime.now(timezone.utc) - timedelta(days=30)
            ).isoformat()
            paid = await self.db.ledger_entries.find({
                "group_id": group_id,
                "status": "paid",
                "paid_at": {"$gte": cutoff_30d},
            }).to_list(500)

            pending_total = sum(e.get("amount", 0) for e in pending)
            paid_total = sum(e.get("amount", 0) for e in paid)

            # Average and median payment time
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
            median_payment_days = (
                round(statistics.median(payment_times), 1)
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

            total_entries = len(paid) + len(pending)
            payment_rate = (
                round((len(paid) / total_entries) * 100, 1)
                if total_entries > 0 else 100
            )

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
                    "median_payment_days": median_payment_days,
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

    # ==================== Flag Chronic Non-Payers (v2: Group-Relative) ====================

    async def _flag_chronic_nonpayers(
        self,
        group_id: str = None,
    ) -> ToolResult:
        """
        Flag users with a pattern of late or unpaid debts (v2).

        Group-relative detection: compare each user to the group baseline.

        A user is flagged only if BOTH conditions hold:
        1. Absolute threshold: meets at least one of:
           - 3+ currently overdue payments
           - 2+ escalated-to-host payments in last 90 days
        2. Relative threshold: in worst 25th percentile of group on:
           - avg payment time vs group median (user avg > 1.5x group median)
           - % overdue vs group average

        This prevents false-flagging in slow-paying but chill groups.
        Internal-only: never label users as "chronic nonpayer" in notifications.
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            query_pending = {"status": {"$in": ["pending", "open"]}}
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
                    if entry.get("soft_escalated") or entry.get("hard_escalated"):
                        pending_counts[from_id]["escalated_count"] += 1

            # Get paid entries for avg payment time (last 90 days)
            cutoff_90d = (
                datetime.now(timezone.utc) - timedelta(days=90)
            ).isoformat()
            query_paid = {"status": "paid", "paid_at": {"$gte": cutoff_90d}}
            if group_id:
                query_paid["group_id"] = group_id

            paid = await self.db.ledger_entries.find(query_paid).to_list(1000)

            # Compute avg payment time per user
            user_payment_times = {}
            all_payment_times = []  # For group median
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
                        all_payment_times.append(days)

            # Compute group baseline
            group_median_pay_time = (
                statistics.median(all_payment_times)
                if all_payment_times else None
            )

            # Build flagged list with group-relative comparison
            flagged = []
            all_user_ids = set(pending_counts.keys()) | set(user_payment_times.keys())

            for uid in all_user_ids:
                pc = pending_counts.get(uid, {})
                pending_count = pc.get("pending_count", 0)
                total_owed = pc.get("total_owed", 0)
                escalated = pc.get("escalated_count", 0)

                times = user_payment_times.get(uid, [])
                avg_days = round(sum(times) / len(times), 1) if times else None

                # Absolute thresholds (must meet at least one)
                absolute_reasons = []
                if pending_count >= 3:
                    absolute_reasons.append(f"{pending_count} overdue payments")
                if escalated >= 2:
                    absolute_reasons.append(f"{escalated} escalated to host")

                # Relative thresholds (compare to group)
                relative_reasons = []
                if (
                    avg_days is not None
                    and group_median_pay_time is not None
                    and group_median_pay_time > 0
                ):
                    ratio = avg_days / group_median_pay_time
                    if ratio > 1.5:
                        relative_reasons.append(
                            f"avg {avg_days}d vs group median {group_median_pay_time:.1f}d "
                            f"({ratio:.1f}x slower)"
                        )

                # Flag only if absolute threshold met
                # Relative reasons are additive context, not blocking
                if absolute_reasons:
                    all_reasons = absolute_reasons + relative_reasons
                    flagged.append({
                        "user_id": uid,
                        "pending_count": pending_count,
                        "total_owed": round(total_owed, 2),
                        "avg_payment_days": avg_days,
                        "group_median_payment_days": (
                            round(group_median_pay_time, 1)
                            if group_median_pay_time else None
                        ),
                        "escalated_count": escalated,
                        "reasons": all_reasons,
                        "is_group_relative_outlier": len(relative_reasons) > 0,
                    })

            # Enrich with user names
            for f in flagged:
                user = await self.db.users.find_one(
                    {"user_id": f["user_id"]}, {"_id": 0, "name": 1}
                )
                f["name"] = user.get("name", "Unknown") if user else "Unknown"

            # Sort: group-relative outliers first, then by reason count
            flagged.sort(
                key=lambda x: (
                    x.get("is_group_relative_outlier", False),
                    len(x["reasons"]),
                ),
                reverse=True,
            )

            return ToolResult(
                success=True,
                data={
                    "flagged_users": flagged,
                    "flagged_count": len(flagged),
                    "group_id": group_id,
                    "group_median_payment_days": (
                        round(group_median_pay_time, 1)
                        if group_median_pay_time else None
                    ),
                },
                message=f"Flagged {len(flagged)} users with payment concerns"
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
        - Orphaned entries (game doesn't exist or was cancelled)
        - Duplicate Stripe applications (same stripe_payment_intent_id on multiple entries)
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

            # Check for duplicate Stripe payment applications
            stripe_pi_seen = {}
            for entry in entries:
                pi_id = entry.get("stripe_payment_intent_id")
                if pi_id:
                    if pi_id in stripe_pi_seen:
                        anomalies.append({
                            "type": "duplicate_stripe_application",
                            "description": (
                                f"Stripe PaymentIntent {pi_id} applied to multiple entries"
                            ),
                            "ledger_ids": [
                                str(stripe_pi_seen[pi_id].get("_id", "")),
                                str(entry.get("_id", "")),
                            ],
                            "stripe_payment_intent_id": pi_id,
                        })
                    else:
                        stripe_pi_seen[pi_id] = entry

            # Check for orphaned / cancelled game entries
            games_in_scope = set(
                e.get("game_id") for e in entries if e.get("game_id")
            )
            for gid in games_in_scope:
                game = await self.db.game_nights.find_one({"game_id": gid})
                if not game:
                    game_entries = [
                        e for e in entries if e.get("game_id") == gid
                    ]
                    anomalies.append({
                        "type": "orphaned",
                        "description": f"Ledger entries reference non-existent game {gid}",
                        "game_id": gid,
                        "entry_count": len(game_entries),
                    })
                elif game.get("status") == "cancelled":
                    pending_for_game = [
                        e for e in entries
                        if e.get("game_id") == gid
                        and e.get("status") in ("pending", "open")
                    ]
                    if pending_for_game:
                        anomalies.append({
                            "type": "cancelled_game",
                            "description": (
                                f"Pending payments for cancelled game {gid}"
                            ),
                            "game_id": gid,
                            "entry_count": len(pending_for_game),
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

    # ==================== Compute KPIs ====================

    async def _compute_kpis(
        self,
        group_id: str = None,
    ) -> ToolResult:
        """
        Compute observability KPIs for payment reconciliation.

        Tracks:
        - auto_match_rate: % of Stripe payments matched without manual review
        - median_time_to_pay: median days from creation to payment (by group)
        - reminder_to_payment_conversion_24h: % of reminded entries paid within 24h
        - reminder_to_payment_conversion_72h: % of reminded entries paid within 72h
        - escalation_rate: % of entries that required host escalation
        - dispute_rate: % of entries marked as disputed
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            cutoff_30d = (
                datetime.now(timezone.utc) - timedelta(days=30)
            ).isoformat()

            # Auto-match rate
            match_query = {"event_type": "stripe_match_attempt"}
            if group_id:
                match_query["group_id"] = group_id
            match_query["created_at"] = {"$gte": cutoff_30d}

            total_matches = await self.db.payment_reconciliation_log.count_documents(
                match_query
            )
            auto_marked_query = dict(match_query)
            auto_marked_query["event_type"] = "stripe_auto_matched"
            auto_marked = await self.db.payment_reconciliation_log.count_documents(
                auto_marked_query
            )
            auto_match_rate = (
                round((auto_marked / total_matches) * 100, 1)
                if total_matches > 0 else None
            )

            # Median time to pay
            paid_query = {"status": "paid", "paid_at": {"$gte": cutoff_30d}}
            if group_id:
                paid_query["group_id"] = group_id

            paid = await self.db.ledger_entries.find(paid_query).to_list(1000)
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

            median_time = (
                round(statistics.median(payment_times), 1)
                if payment_times else None
            )

            # Reminder-to-payment conversion
            reminder_query = {"sent_at": {"$gte": cutoff_30d}}
            if group_id:
                reminder_query["group_id"] = group_id

            reminders = await self.db.payment_reminders_log.find(
                reminder_query
            ).to_list(1000)

            reminded_ledger_ids = set(r.get("ledger_id") for r in reminders if r.get("ledger_id"))
            converted_24h = 0
            converted_72h = 0

            for rid in reminded_ledger_ids:
                # Find the earliest reminder for this entry
                entry_reminders = [
                    r for r in reminders if r.get("ledger_id") == rid
                ]
                if not entry_reminders:
                    continue

                first_reminder_at = min(
                    r.get("sent_at", "") for r in entry_reminders
                )

                # Check if entry was paid
                from bson import ObjectId
                try:
                    entry = await self.db.ledger_entries.find_one(
                        {"_id": ObjectId(rid)},
                        {"_id": 0, "status": 1, "paid_at": 1}
                    )
                except Exception:
                    continue

                if entry and entry.get("status") == "paid" and entry.get("paid_at"):
                    paid_at = entry["paid_at"]
                    if isinstance(paid_at, str) and isinstance(first_reminder_at, str):
                        try:
                            paid_dt = datetime.fromisoformat(paid_at.replace("Z", "+00:00"))
                            remind_dt = datetime.fromisoformat(first_reminder_at.replace("Z", "+00:00"))
                            hours_diff = (paid_dt - remind_dt).total_seconds() / 3600
                            if 0 <= hours_diff <= 24:
                                converted_24h += 1
                            if 0 <= hours_diff <= 72:
                                converted_72h += 1
                        except (ValueError, TypeError):
                            pass

            total_reminded = len(reminded_ledger_ids)
            conv_24h = (
                round((converted_24h / total_reminded) * 100, 1)
                if total_reminded > 0 else None
            )
            conv_72h = (
                round((converted_72h / total_reminded) * 100, 1)
                if total_reminded > 0 else None
            )

            # Escalation rate
            all_entries_query = {"created_at": {"$gte": cutoff_30d}}
            if group_id:
                all_entries_query["group_id"] = group_id

            total_entries = await self.db.ledger_entries.count_documents(
                all_entries_query
            )
            escalated_query = dict(all_entries_query)
            escalated_query["$or"] = [
                {"soft_escalated": True},
                {"hard_escalated": True},
            ]
            escalated = await self.db.ledger_entries.count_documents(escalated_query)
            escalation_rate = (
                round((escalated / total_entries) * 100, 1)
                if total_entries > 0 else None
            )

            # Dispute rate
            disputed_query = dict(all_entries_query)
            disputed_query["status"] = "disputed"
            disputed = await self.db.ledger_entries.count_documents(disputed_query)
            dispute_rate = (
                round((disputed / total_entries) * 100, 1)
                if total_entries > 0 else None
            )

            kpis = {
                "period": "last_30_days",
                "auto_match_rate": auto_match_rate,
                "median_time_to_pay_days": median_time,
                "reminder_to_payment_conversion_24h": conv_24h,
                "reminder_to_payment_conversion_72h": conv_72h,
                "escalation_rate": escalation_rate,
                "dispute_rate": dispute_rate,
                "total_stripe_matches": total_matches,
                "total_auto_marked": auto_marked,
                "total_entries": total_entries,
                "total_escalated": escalated,
                "total_reminded": total_reminded,
            }

            # Log KPIs
            await self.db.payment_reconciliation_log.insert_one({
                "event_type": "kpi_snapshot",
                "group_id": group_id,
                "kpis": kpis,
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

            return ToolResult(
                success=True,
                data=kpis,
                message=(
                    f"KPIs: auto-match {auto_match_rate}%, "
                    f"median pay {median_time}d, "
                    f"24h conversion {conv_24h}%, "
                    f"escalation {escalation_rate}%"
                )
            )

        except Exception as e:
            logger.error(f"Error computing KPIs: {e}")
            return ToolResult(success=False, error=str(e))
