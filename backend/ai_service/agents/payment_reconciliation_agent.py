"""
Payment Reconciliation Agent (v2)

Autonomous agent that tracks and resolves payment issues.
Uses the full pipeline: Scan -> Policy -> Escalate -> Execute -> Measure.

v2 improvements:
1. Single consistent escalation: soft at 7d+2 reminders, hard at 14d unconditional
2. Two-phase Stripe: verify -> apply (prevents race conditions, duplicate application)
3. Batch reminders: single notification per user for multiple debts
4. Consolidation: view-only with oldest-first allocation plan
5. Group-relative nonpayer flagging (never label users as "chronic nonpayer")
6. Anti-spam: per-user/day and per-group/day caps
7. Quiet hours: escalation bypass for hosts only, payers still protected
8. Observability KPIs: auto-match rate, time-to-pay, conversion, escalation rate

Architecture:
- PaymentTrackerTool (existing): Get outstanding, send reminders, mark paid
- LedgerReconcilerTool (v2): Verify, consolidate with allocation, group-relative flagging, KPIs
- PaymentPolicyTool (v2): Soft/hard escalation, per-user/group caps, host-only bypass
- NotificationSenderTool (existing): Send reminders and alerts
- payment_reconciliation_log: Audit trail + KPI snapshots
- payment_reminders_log: Per-user cooldown + daily cap tracking
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseAgent, AgentResult

logger = logging.getLogger(__name__)


class PaymentReconciliationAgent(BaseAgent):
    """
    Agent for autonomously tracking and resolving payment issues (v2).

    Pipeline: Scan -> Policy -> Escalate -> Execute -> Measure
    with batched reminders, two-phase Stripe, and soft/hard escalation.
    """

    @property
    def name(self) -> str:
        return "payment_reconciliation"

    @property
    def description(self) -> str:
        return (
            "autonomously tracking and resolving payment issues including "
            "overdue payment reminders, Stripe payment matching with two-phase "
            "verification, cross-game debt consolidation, payment health reports, "
            "and group-relative nonpayer flagging"
        )

    @property
    def capabilities(self) -> List[str]:
        return [
            "Scan for overdue payments with urgency classification (gentle/firm/final/escalate)",
            "Send batched policy-gated payment reminders (single notification per user)",
            "Match Stripe webhook payments with two-phase verify -> apply reconciliation",
            "Auto-mark matched payments as paid (metadata match only, not fuzzy)",
            "Consolidate cross-game debts with oldest-first allocation plan",
            "Generate weekly payment health reports per group",
            "Flag payment concerns with group-relative detection (vs group median)",
            "Detect payment anomalies (duplicates, orphans, duplicate Stripe applications)",
            "Soft escalate at 7d + 2 reminders (host visibility)",
            "Hard escalate at 14d unconditional (host action required)",
            "Enforce per-user/day and per-group/day reminder caps",
            "Respect quiet hours for payers (hosts bypass on escalation only)",
            "Compute reconciliation KPIs for observability",
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "payment_tracker",
            "ledger_reconciler",
            "payment_policy",
            "notification_sender",
        ]

    @property
    def input_schema(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "user_input": {
                    "type": "string",
                    "description": "The payment reconciliation request"
                },
                "action": {
                    "type": "string",
                    "description": "Specific payment action to perform",
                    "enum": [
                        "scan_and_remind",
                        "match_stripe_payment",
                        "consolidate_debts",
                        "payment_health_report",
                        "flag_nonpayers",
                        "detect_anomalies",
                        "reconcile_game",
                        "reconcile_group",
                        "run_daily_scan",
                        "run_weekly_report",
                        "compute_kpis",
                        "process_job",
                    ]
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID for group-specific operations"
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
                    "description": "Stripe webhook event data"
                },
            },
            "required": ["user_input"]
        }

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """Execute payment reconciliation tasks through the full pipeline."""
        context = context or {}
        steps_taken = []

        try:
            action = context.get("action") or self._parse_action(user_input)

            handlers = {
                "scan_and_remind": self._scan_and_remind,
                "match_stripe_payment": self._match_stripe_payment,
                "consolidate_debts": self._consolidate_debts,
                "payment_health_report": self._payment_health_report,
                "flag_nonpayers": self._flag_nonpayers,
                "detect_anomalies": self._detect_anomalies,
                "reconcile_game": self._reconcile_game,
                "reconcile_group": self._reconcile_group,
                "run_daily_scan": self._run_daily_scan,
                "run_weekly_report": self._run_weekly_report,
                "compute_kpis": self._compute_kpis,
                "process_job": self._process_job,
            }

            handler = handlers.get(action)
            if handler:
                return await handler(context, steps_taken)
            else:
                return AgentResult(
                    success=False,
                    error="Unknown payment reconciliation action",
                    message=f"Available actions: {', '.join(handlers.keys())}",
                    steps_taken=steps_taken
                )

        except Exception as e:
            logger.error(f"PaymentReconciliationAgent error: {e}")
            return AgentResult(
                success=False,
                error=str(e),
                steps_taken=steps_taken
            )

    def _parse_action(self, user_input: str) -> str:
        """Parse action from natural language input."""
        input_lower = user_input.lower()

        if any(kw in input_lower for kw in ["scan", "overdue", "remind", "reminder"]):
            return "scan_and_remind"
        if any(kw in input_lower for kw in ["stripe", "match payment", "incoming payment"]):
            return "match_stripe_payment"
        if any(kw in input_lower for kw in ["consolidat", "combine debt", "net debt"]):
            return "consolidate_debts"
        if any(kw in input_lower for kw in ["health report", "payment report", "payment health"]):
            return "payment_health_report"
        if any(kw in input_lower for kw in ["non-payer", "nonpayer", "chronic", "flag"]):
            return "flag_nonpayers"
        if any(kw in input_lower for kw in ["anomal", "duplicate", "orphan", "mismatch"]):
            return "detect_anomalies"
        if any(kw in input_lower for kw in ["reconcile game", "game payment"]):
            return "reconcile_game"
        if any(kw in input_lower for kw in ["reconcile group", "group payment"]):
            return "reconcile_group"
        if any(kw in input_lower for kw in ["daily", "daily scan"]):
            return "run_daily_scan"
        if any(kw in input_lower for kw in ["weekly", "weekly report"]):
            return "run_weekly_report"
        if any(kw in input_lower for kw in ["kpi", "metrics", "observ"]):
            return "compute_kpis"
        if any(kw in input_lower for kw in ["process job", "job"]):
            return "process_job"
        if any(kw in input_lower for kw in [
            "payment", "reconcil", "settle", "owed", "outstanding", "unpaid"
        ]):
            return "scan_and_remind"

        return "scan_and_remind"

    # ==================== Scan and Remind (v2: Batched) ====================

    async def _scan_and_remind(self, context: Dict, steps: List) -> AgentResult:
        """
        Full pipeline: Scan overdue -> Batch by user -> Policy check -> Send -> Log.

        v2: Groups overdue entries by user and sends ONE batched notification
        per user instead of individual reminders. This is the difference between
        "helpful" and "annoying".
        """
        group_id = context.get("group_id")
        overdue_days = context.get("overdue_days", 1)

        # Step 1: SCAN — find overdue entries
        scan_result = await self.call_tool(
            "ledger_reconciler",
            action="scan_overdue",
            group_id=group_id,
            overdue_days=overdue_days,
        )
        steps.append({"step": "scan_overdue", "result": scan_result})

        if not scan_result.get("success"):
            return AgentResult(
                success=False,
                error=scan_result.get("error", "Scan failed"),
                steps_taken=steps
            )

        overdue_entries = scan_result.get("data", {}).get("overdue_entries", [])

        if not overdue_entries:
            return AgentResult(
                success=True,
                data={"reminders_sent": 0, "escalated": 0, "blocked": 0, "batched": 0},
                message="No overdue payments found",
                steps_taken=steps
            )

        # Step 2: GROUP by user for batching
        user_entries = {}
        for entry in overdue_entries:
            user_id = entry.get("from_user_id")
            if user_id not in user_entries:
                user_entries[user_id] = []
            user_entries[user_id].append(entry)

        reminders_sent = 0
        escalated = 0
        blocked = 0
        batched = 0

        for user_id, entries in user_entries.items():
            # Step 3: POLICY — check per-user daily cap
            batch_policy = await self.call_tool(
                "payment_policy",
                action="check_batch_reminder_policy",
                user_id=user_id,
                group_id=group_id,
            )
            remaining_today = batch_policy.get("data", {}).get("remaining_today", 0)

            if remaining_today <= 0:
                blocked += len(entries)
                continue

            # Check which entries need escalation vs reminder
            to_remind = []
            for entry in entries:
                ledger_id = entry.get("ledger_id")
                urgency = entry.get("urgency", "gentle")

                # Check escalation first
                esc_policy = await self.call_tool(
                    "payment_policy",
                    action="check_escalation_policy",
                    ledger_id=ledger_id,
                    group_id=entry.get("group_id") or group_id,
                )
                esc_data = esc_policy.get("data", {})

                if esc_data.get("should_escalate"):
                    esc_result = await self._escalate_single(
                        entry, esc_data.get("escalation_type", "soft"), steps
                    )
                    if esc_result:
                        escalated += 1
                    continue

                # Check individual entry policy
                policy_result = await self.call_tool(
                    "payment_policy",
                    action="check_reminder_policy",
                    user_id=user_id,
                    group_id=entry.get("group_id") or group_id,
                    ledger_id=ledger_id,
                    urgency=urgency,
                    target_type="payer",
                )
                policy_data = policy_result.get("data", {})

                if policy_data.get("allowed"):
                    to_remind.append(entry)
                elif policy_data.get("should_escalate"):
                    esc_result = await self._escalate_single(entry, "hard", steps)
                    if esc_result:
                        escalated += 1
                else:
                    blocked += 1

            if not to_remind:
                continue

            # Step 4: EXECUTE — send batched or single notification
            if len(to_remind) > 1:
                # Batch: single notification for multiple debts
                await self._send_batched_reminder(user_id, to_remind, group_id, steps)
                batched += 1
                reminders_sent += len(to_remind)
            else:
                # Single entry
                entry = to_remind[0]
                await self._send_single_reminder(user_id, entry, group_id, steps)
                reminders_sent += 1

            # Step 5: MEASURE — log all reminded entries
            for entry in to_remind:
                await self._log_reminder(
                    user_id=user_id,
                    ledger_id=entry.get("ledger_id"),
                    group_id=entry.get("group_id") or group_id,
                    urgency=entry.get("urgency", "gentle"),
                    amount=entry.get("amount", 0),
                )
                # Update reminder count
                if self.db and entry.get("ledger_id"):
                    from bson import ObjectId
                    await self.db.ledger_entries.update_one(
                        {"_id": ObjectId(entry["ledger_id"])},
                        {
                            "$inc": {"reminder_count": 1},
                            "$set": {
                                "last_reminder_at": datetime.now(timezone.utc).isoformat(),
                                "last_reminder_urgency": entry.get("urgency", "gentle"),
                            }
                        }
                    )

        return AgentResult(
            success=True,
            data={
                "overdue_found": len(overdue_entries),
                "reminders_sent": reminders_sent,
                "escalated": escalated,
                "blocked": blocked,
                "batched_notifications": batched,
                "users_reminded": len([
                    uid for uid, entries in user_entries.items()
                    if any(e in overdue_entries for e in entries)
                ]),
                "by_urgency": scan_result.get("data", {}).get("by_urgency", {}),
            },
            message=(
                f"Processed {len(overdue_entries)} overdue payments: "
                f"{reminders_sent} reminded ({batched} batched), "
                f"{escalated} escalated, {blocked} blocked"
            ),
            steps_taken=steps
        )

    # ==================== Match Stripe Payment (v2: Verify -> Apply) ====================

    async def _match_stripe_payment(self, context: Dict, steps: List) -> AgentResult:
        """
        Match an incoming Stripe payment to a ledger entry.
        v2 pipeline: Match -> Verify -> Policy -> Apply -> Notify.

        Two-phase reconciliation prevents race conditions, duplicate application,
        currency mismatch, and "I already paid" complaints.
        """
        stripe_event = context.get("stripe_event", {})

        if not stripe_event:
            return AgentResult(
                success=False,
                error="stripe_event required",
                steps_taken=steps
            )

        # Step 1: MATCH — find matching ledger entries (with dedup)
        match_result = await self.call_tool(
            "ledger_reconciler",
            action="match_stripe_payment",
            stripe_event=stripe_event,
        )
        steps.append({"step": "match_stripe", "result": match_result})

        if not match_result.get("success"):
            return AgentResult(
                success=False,
                error=match_result.get("error"),
                steps_taken=steps
            )

        match_data = match_result.get("data", {})

        # Handle duplicate webhook
        if match_data.get("duplicate_webhook"):
            return AgentResult(
                success=True,
                data={"matched": False, "duplicate_webhook": True},
                message="Duplicate webhook already processed",
                steps_taken=steps
            )

        # Handle non-succeeded status
        if match_data.get("skipped_reason"):
            return AgentResult(
                success=True,
                data={"matched": False, "skipped": True, "reason": match_data["skipped_reason"]},
                message=f"Skipped: {match_data['skipped_reason']}",
                steps_taken=steps
            )

        best_match = match_data.get("best_match")

        if not best_match:
            return AgentResult(
                success=True,
                data={"matched": False, "auto_marked": False},
                message="No matching ledger entry found for Stripe payment",
                steps_taken=steps
            )

        # Step 2: POLICY — check if auto-mark is allowed
        confidence = best_match.get("confidence", 0)
        ledger_id = best_match.get("ledger_id")
        group_id = None

        if self.db and ledger_id:
            from bson import ObjectId
            entry = await self.db.ledger_entries.find_one(
                {"_id": ObjectId(ledger_id)},
                {"_id": 0, "group_id": 1}
            )
            if entry:
                group_id = entry.get("group_id")

        auto_mark_policy = await self.call_tool(
            "payment_policy",
            action="check_auto_mark_policy",
            match_confidence=confidence,
            group_id=group_id,
        )
        steps.append({"step": "auto_mark_policy", "result": auto_mark_policy})

        auto_mark_allowed = auto_mark_policy.get("data", {}).get("allowed", False)

        if not auto_mark_allowed:
            # Low confidence — queue for manual review
            await self._log_reconciliation_event(
                event_type="stripe_manual_review_needed",
                ledger_id=ledger_id,
                group_id=group_id,
                amount=best_match.get("amount", 0),
                confidence=confidence,
            )
            return AgentResult(
                success=True,
                data={
                    "matched": True,
                    "auto_marked": False,
                    "requires_manual_review": True,
                    "ledger_id": ledger_id,
                    "confidence": confidence,
                },
                message=(
                    f"Stripe payment matched but confidence ({confidence:.2f}) "
                    f"below auto-mark threshold. Queued for manual review."
                ),
                steps_taken=steps
            )

        # Step 3: VERIFY — two-phase reconciliation, Phase A
        verify_result = await self.call_tool(
            "ledger_reconciler",
            action="verify_stripe_payment",
            ledger_id=ledger_id,
            stripe_event=stripe_event,
        )
        steps.append({"step": "verify_stripe", "result": verify_result})

        verified = verify_result.get("data", {}).get("verified", False)

        if not verified:
            failed_checks = verify_result.get("data", {}).get("failed_checks", [])
            await self._log_reconciliation_event(
                event_type="stripe_verification_failed",
                ledger_id=ledger_id,
                group_id=group_id,
                amount=best_match.get("amount", 0),
                data={"failed_checks": failed_checks},
            )
            return AgentResult(
                success=True,
                data={
                    "matched": True,
                    "auto_marked": False,
                    "verification_failed": True,
                    "failed_checks": failed_checks,
                },
                message=(
                    f"Stripe payment matched but verification failed: "
                    f"{', '.join(failed_checks)}"
                ),
                steps_taken=steps
            )

        # Step 4: APPLY — mark as paid + store stripe_payment_intent_id
        stripe_pi_id = match_data.get("stripe_payment_intent_id")

        # Update ledger entry with Stripe data before marking paid
        if self.db and ledger_id and stripe_pi_id:
            await self.db.ledger_entries.update_one(
                {"_id": ObjectId(ledger_id)},
                {"$set": {
                    "stripe_payment_intent_id": stripe_pi_id,
                    "paid_by_provider": "stripe",
                }}
            )

        mark_result = await self.call_tool(
            "payment_tracker",
            action="mark_paid",
            ledger_id=ledger_id,
        )
        steps.append({"step": "mark_paid", "result": mark_result})

        # Step 5: NOTIFY — tell both parties
        from_id = best_match.get("from_user_id")
        to_id = best_match.get("to_user_id")
        amount = best_match.get("amount", 0)
        from_name = await self._get_user_name(from_id)
        to_name = await self._get_user_name(to_id)

        if from_id:
            await self.call_tool(
                "notification_sender",
                user_ids=[from_id],
                title="Payment Confirmed",
                message=f"Your ${amount:.2f} payment to {to_name} has been confirmed via Stripe.",
                notification_type="settlement",
                data={
                    "ledger_id": ledger_id,
                    "amount": amount,
                    "source": "stripe_auto_match",
                }
            )

        if to_id:
            await self.call_tool(
                "notification_sender",
                user_ids=[to_id],
                title="Payment Received",
                message=f"{from_name} paid ${amount:.2f} (confirmed via Stripe).",
                notification_type="settlement",
                data={
                    "ledger_id": ledger_id,
                    "amount": amount,
                    "source": "stripe_auto_match",
                }
            )

        await self._log_reconciliation_event(
            event_type="stripe_auto_matched",
            ledger_id=ledger_id,
            group_id=group_id,
            amount=amount,
            confidence=confidence,
            data={"stripe_payment_intent_id": stripe_pi_id},
        )

        return AgentResult(
            success=True,
            data={
                "matched": True,
                "auto_marked": True,
                "verified": True,
                "ledger_id": ledger_id,
                "amount": amount,
                "confidence": confidence,
                "match_method": best_match.get("match_method"),
                "stripe_payment_intent_id": stripe_pi_id,
            },
            message=(
                f"Stripe payment verified and applied "
                f"(${amount:.2f}, conf={confidence:.2f})"
            ),
            steps_taken=steps
        )

    # ==================== Consolidate Debts ====================

    async def _consolidate_debts(self, context: Dict, steps: List) -> AgentResult:
        """
        Consolidate cross-game debts and notify with "pay once" suggestions.
        View-only: original entries preserved, allocation plan included.
        """
        group_id = context.get("group_id")
        user_id = context.get("user_id")

        consol_result = await self.call_tool(
            "ledger_reconciler",
            action="consolidate_debts",
            group_id=group_id,
            user_id=user_id,
        )
        steps.append({"step": "consolidate", "result": consol_result})

        if not consol_result.get("success"):
            return AgentResult(
                success=False,
                error=consol_result.get("error"),
                steps_taken=steps
            )

        data = consol_result.get("data", {})
        consolidated = data.get("consolidated", [])
        consolidatable = [
            c for c in consolidated
            if c.get("status") == "consolidatable"
            and c.get("net_amount", 0) > 0
            and not c.get("has_mixed_currencies")
        ]

        if not consolidatable:
            return AgentResult(
                success=True,
                data={"consolidatable_count": 0},
                message="No debts to consolidate (all single-game, mixed currency, or settled)",
                steps_taken=steps
            )

        suggestions = []
        notified = 0

        for debt in consolidatable:
            policy_result = await self.call_tool(
                "payment_policy",
                action="check_consolidation_policy",
                debt_data=debt,
                group_id=group_id,
            )

            if not policy_result.get("data", {}).get("allowed"):
                continue

            from_name = debt.get("from_user_name", "Unknown")
            to_name = debt.get("to_user_name", "Unknown")

            suggestions.append({
                "from_user_id": debt["from_user_id"],
                "from_user_name": from_name,
                "to_user_id": debt["to_user_id"],
                "to_user_name": to_name,
                "net_amount": debt["net_amount"],
                "game_count": debt["game_count"],
                "ledger_ids": debt.get("ledger_ids", []),
                "allocation_plan": debt.get("allocation_plan", []),
            })

            # Single "pay once" notification per consolidation
            await self.call_tool(
                "notification_sender",
                user_ids=[debt["from_user_id"]],
                title="Settle Up: Combined Balance",
                message=(
                    f"You have {debt['game_count']} open debts to "
                    f"{to_name} totaling ${debt['net_amount']:.2f}. "
                    f"Pay once to settle all."
                ),
                notification_type="settlement",
                data={
                    "type": "consolidation_suggestion",
                    "net_amount": debt["net_amount"],
                    "to_user_id": debt["to_user_id"],
                    "game_count": debt["game_count"],
                    "ledger_ids": debt.get("ledger_ids", []),
                    "source": "payment_reconciliation_agent",
                }
            )
            notified += 1

        return AgentResult(
            success=True,
            data={
                "suggestions": suggestions,
                "suggestion_count": len(suggestions),
                "users_notified": notified,
                "mixed_currency_skipped": data.get("mixed_currency_pairs", 0),
            },
            message=(
                f"Found {len(suggestions)} consolidation opportunities, "
                f"notified {notified} users"
            ),
            steps_taken=steps
        )

    # ==================== Payment Health Report ====================

    async def _payment_health_report(self, context: Dict, steps: List) -> AgentResult:
        """Generate and send payment health report to group hosts."""
        group_id = context.get("group_id")

        if not group_id:
            return AgentResult(
                success=False,
                error="group_id required for health report",
                steps_taken=steps
            )

        report_result = await self.call_tool(
            "ledger_reconciler",
            action="payment_health_report",
            group_id=group_id,
        )
        steps.append({"step": "health_report", "result": report_result})

        if not report_result.get("success"):
            return AgentResult(
                success=False,
                error=report_result.get("error"),
                steps_taken=steps
            )

        report = report_result.get("data", {})
        pending = report.get("pending", {})
        paid = report.get("paid_last_30d", {})
        overdue = report.get("overdue", {})
        by_urgency = overdue.get("by_urgency", {})

        lines = ["Weekly Payment Health Report:"]
        lines.append(f"  Payment Rate: {report.get('payment_rate', 0)}%")
        lines.append(
            f"  Pending: {pending.get('count', 0)} entries "
            f"(${pending.get('total_amount', 0):.2f})"
        )
        lines.append(
            f"  Paid (30d): {paid.get('count', 0)} entries "
            f"(${paid.get('total_amount', 0):.2f})"
        )

        median_days = report.get("median_payment_days")
        if median_days is not None:
            lines.append(f"  Median Payment Time: {median_days} days")

        total_overdue = overdue.get("total", 0)
        if total_overdue > 0:
            lines.append(f"\n  Overdue: {total_overdue} entries")
            for urgency, count in by_urgency.items():
                if count > 0:
                    lines.append(f"    {urgency}: {count}")

        chronic = report.get("chronic_nonpayer_count", 0)
        if chronic > 0:
            lines.append(f"\n  Players with payment concerns: {chronic}")

        report_text = "\n".join(lines)

        admins = await self._get_group_admins(group_id)
        if admins:
            await self.call_tool(
                "notification_sender",
                user_ids=admins,
                title="Payment Health Report",
                message=report_text,
                notification_type="general",
                data={
                    "type": "payment_health_report",
                    "group_id": group_id,
                    "payment_rate": report.get("payment_rate"),
                    "pending_count": pending.get("count", 0),
                    "overdue_count": total_overdue,
                    "source": "payment_reconciliation_agent",
                }
            )
            steps.append({"step": "send_report", "admins": admins})

        await self._log_reconciliation_event(
            event_type="health_report_generated",
            group_id=group_id,
            data={
                "payment_rate": report.get("payment_rate"),
                "pending_count": pending.get("count", 0),
                "overdue_total": total_overdue,
                "median_payment_days": median_days,
            }
        )

        return AgentResult(
            success=True,
            data={
                "report": report,
                "report_text": report_text,
                "admins_notified": len(admins),
            },
            message=(
                f"Payment health report sent to {len(admins)} admins "
                f"(rate: {report.get('payment_rate', 0)}%)"
            ),
            steps_taken=steps
        )

    # ==================== Flag Non-Payers ====================

    async def _flag_nonpayers(self, context: Dict, steps: List) -> AgentResult:
        """
        Flag users with payment concerns and notify group hosts.
        Uses group-relative detection. Never labels users as "chronic nonpayer"
        in user-facing messages — that's internal only.
        """
        group_id = context.get("group_id")

        flag_result = await self.call_tool(
            "ledger_reconciler",
            action="flag_chronic_nonpayers",
            group_id=group_id,
        )
        steps.append({"step": "flag_nonpayers", "result": flag_result})

        if not flag_result.get("success"):
            return AgentResult(
                success=False,
                error=flag_result.get("error"),
                steps_taken=steps
            )

        flagged = flag_result.get("data", {}).get("flagged_users", [])

        if not flagged:
            return AgentResult(
                success=True,
                data={"flagged_count": 0},
                message="No payment concerns found",
                steps_taken=steps
            )

        # Notify hosts with neutral language (never "chronic nonpayer")
        if group_id:
            admins = await self._get_group_admins(group_id)
            if admins:
                flagged_summary = "\n".join(
                    f"  - {f['name']}: {', '.join(f['reasons'])}"
                    for f in flagged[:5]
                )

                await self.call_tool(
                    "notification_sender",
                    user_ids=admins,
                    title="Payment Update: Players Needing Attention",
                    message=(
                        f"{len(flagged)} players may need a reminder:\n"
                        f"{flagged_summary}"
                    ),
                    notification_type="general",
                    data={
                        "type": "payment_concern_alert",
                        "flagged_count": len(flagged),
                        "source": "payment_reconciliation_agent",
                    }
                )
                steps.append({"step": "notify_admins", "admins": admins})

        return AgentResult(
            success=True,
            data={
                "flagged_users": flagged,
                "flagged_count": len(flagged),
                "group_median_payment_days": flag_result.get("data", {}).get(
                    "group_median_payment_days"
                ),
            },
            message=f"Flagged {len(flagged)} players with payment concerns",
            steps_taken=steps
        )

    # ==================== Detect Anomalies ====================

    async def _detect_anomalies(self, context: Dict, steps: List) -> AgentResult:
        """Detect and report payment anomalies."""
        group_id = context.get("group_id")
        game_id = context.get("game_id")

        result = await self.call_tool(
            "ledger_reconciler",
            action="detect_anomalies",
            group_id=group_id,
            game_id=game_id,
        )
        steps.append({"step": "detect_anomalies", "result": result})

        if not result.get("success"):
            return AgentResult(
                success=False,
                error=result.get("error"),
                steps_taken=steps
            )

        data = result.get("data", {})
        anomalies = data.get("anomalies", [])

        if anomalies and group_id:
            admins = await self._get_group_admins(group_id)
            if admins:
                summary = "\n".join(
                    f"  - [{a['type']}] {a['description']}"
                    for a in anomalies[:5]
                )
                await self.call_tool(
                    "notification_sender",
                    user_ids=admins,
                    title="Payment Anomalies Detected",
                    message=f"Found {len(anomalies)} anomalies:\n{summary}",
                    notification_type="general",
                    data={
                        "type": "payment_anomaly_alert",
                        "anomaly_count": len(anomalies),
                        "source": "payment_reconciliation_agent",
                    }
                )

        return AgentResult(
            success=True,
            data=data,
            message=result.get("message", f"Found {len(anomalies)} anomalies"),
            steps_taken=steps
        )

    # ==================== Reconcile Game ====================

    async def _reconcile_game(self, context: Dict, steps: List) -> AgentResult:
        """Full reconciliation for a specific game."""
        game_id = context.get("game_id")

        if not game_id:
            return AgentResult(
                success=False, error="game_id required", steps_taken=steps
            )

        group_id = context.get("group_id")
        if not group_id and self.db:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id}, {"_id": 0, "group_id": 1}
            )
            if game:
                group_id = game.get("group_id")

        results = {}

        remind_result = await self._scan_and_remind(
            {"group_id": group_id, "game_id": game_id, "overdue_days": 1}, steps
        )
        results["reminders"] = {
            "sent": remind_result.data.get("reminders_sent", 0) if remind_result.data else 0,
            "escalated": remind_result.data.get("escalated", 0) if remind_result.data else 0,
        }

        anomaly_result = await self._detect_anomalies(
            {"game_id": game_id, "group_id": group_id}, steps
        )
        results["anomalies"] = {
            "found": anomaly_result.data.get("anomaly_count", 0) if anomaly_result.data else 0,
        }

        return AgentResult(
            success=True,
            data=results,
            message=(
                f"Game reconciliation: {results['reminders']['sent']} reminders, "
                f"{results['anomalies']['found']} anomalies"
            ),
            steps_taken=steps
        )

    # ==================== Reconcile Group ====================

    async def _reconcile_group(self, context: Dict, steps: List) -> AgentResult:
        """Full reconciliation for a group."""
        group_id = context.get("group_id")

        if not group_id:
            return AgentResult(
                success=False, error="group_id required", steps_taken=steps
            )

        results = {}

        remind_result = await self._scan_and_remind(
            {"group_id": group_id, "overdue_days": 1}, steps
        )
        results["reminders"] = {
            "sent": remind_result.data.get("reminders_sent", 0) if remind_result.data else 0,
            "escalated": remind_result.data.get("escalated", 0) if remind_result.data else 0,
        }

        consol_result = await self._consolidate_debts({"group_id": group_id}, steps)
        results["consolidation"] = {
            "suggestions": consol_result.data.get("suggestion_count", 0) if consol_result.data else 0,
        }

        health_result = await self._payment_health_report(
            {"group_id": group_id}, steps
        )
        results["health"] = {
            "payment_rate": (
                health_result.data.get("report", {}).get("payment_rate", 0)
                if health_result.data else 0
            ),
        }

        return AgentResult(
            success=True,
            data=results,
            message=(
                f"Group reconciliation: "
                f"{results['reminders']['sent']} reminders, "
                f"{results['consolidation']['suggestions']} consolidations, "
                f"{results['health']['payment_rate']}% rate"
            ),
            steps_taken=steps
        )

    # ==================== Scheduled Jobs ====================

    async def _run_daily_scan(self, context: Dict, steps: List) -> AgentResult:
        """Daily scan: process all groups with overdue payments."""
        if not self.db:
            return AgentResult(
                success=False, error="Database not available", steps_taken=steps
            )

        groups = await self.db.ledger_entries.distinct(
            "group_id",
            {"status": {"$in": ["pending", "open"]}}
        )

        total_reminded = 0
        total_escalated = 0
        total_blocked = 0
        groups_processed = 0

        for group_id in groups:
            if not group_id:
                continue

            result = await self._scan_and_remind(
                {"group_id": group_id, "overdue_days": 1}, steps
            )
            if result.data:
                total_reminded += result.data.get("reminders_sent", 0)
                total_escalated += result.data.get("escalated", 0)
                total_blocked += result.data.get("blocked", 0)
            groups_processed += 1

        await self._log_reconciliation_event(
            event_type="daily_scan_completed",
            data={
                "groups_processed": groups_processed,
                "reminders_sent": total_reminded,
                "escalated": total_escalated,
                "blocked": total_blocked,
            }
        )

        return AgentResult(
            success=True,
            data={
                "groups_processed": groups_processed,
                "reminders_sent": total_reminded,
                "escalated": total_escalated,
                "blocked": total_blocked,
            },
            message=(
                f"Daily scan: {groups_processed} groups, "
                f"{total_reminded} reminders, {total_escalated} escalated"
            ),
            steps_taken=steps
        )

    async def _run_weekly_report(self, context: Dict, steps: List) -> AgentResult:
        """Weekly report: health reports + nonpayer flagging for all active groups."""
        if not self.db:
            return AgentResult(
                success=False, error="Database not available", steps_taken=steps
            )

        cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
        groups = await self.db.ledger_entries.distinct(
            "group_id",
            {"created_at": {"$gte": cutoff}}
        )

        reports_sent = 0
        nonpayers_flagged = 0

        for group_id in groups:
            if not group_id:
                continue

            health_result = await self._payment_health_report(
                {"group_id": group_id}, steps
            )
            if health_result.success:
                reports_sent += 1

            flag_result = await self._flag_nonpayers(
                {"group_id": group_id}, steps
            )
            if flag_result.data:
                nonpayers_flagged += flag_result.data.get("flagged_count", 0)

        await self._log_reconciliation_event(
            event_type="weekly_report_completed",
            data={
                "groups_processed": len(groups),
                "reports_sent": reports_sent,
                "nonpayers_flagged": nonpayers_flagged,
            }
        )

        return AgentResult(
            success=True,
            data={
                "groups_processed": len(groups),
                "reports_sent": reports_sent,
                "nonpayers_flagged": nonpayers_flagged,
            },
            message=(
                f"Weekly report: {reports_sent} reports, "
                f"{nonpayers_flagged} flagged"
            ),
            steps_taken=steps
        )

    # ==================== Compute KPIs ====================

    async def _compute_kpis(self, context: Dict, steps: List) -> AgentResult:
        """Compute and return reconciliation KPIs."""
        group_id = context.get("group_id")

        result = await self.call_tool(
            "ledger_reconciler",
            action="compute_kpis",
            group_id=group_id,
        )
        steps.append({"step": "compute_kpis", "result": result})

        if not result.get("success"):
            return AgentResult(
                success=False, error=result.get("error"), steps_taken=steps
            )

        return AgentResult(
            success=True,
            data=result.get("data", {}),
            message=result.get("message", "KPIs computed"),
            steps_taken=steps
        )

    # ==================== Job Queue Processing ====================

    async def _process_job(self, context: Dict, steps: List) -> AgentResult:
        """Process a single payment reconciliation job from the queue."""
        job = context.get("job", {})
        job_type = job.get("job_type", context.get("job_type"))
        group_id = job.get("group_id", context.get("group_id"))
        game_id = job.get("game_id", context.get("game_id"))

        job_handlers = {
            "daily_scan": lambda: self._run_daily_scan(context, steps),
            "weekly_report": lambda: self._run_weekly_report(context, steps),
            "scan_and_remind": lambda: self._scan_and_remind(
                {"group_id": group_id, **job}, steps
            ),
            "reconcile_game": lambda: self._reconcile_game(
                {"game_id": game_id, "group_id": group_id}, steps
            ),
            "reconcile_group": lambda: self._reconcile_group(
                {"group_id": group_id}, steps
            ),
            "stripe_match": lambda: self._match_stripe_payment(context, steps),
            "consolidate": lambda: self._consolidate_debts(
                {"group_id": group_id}, steps
            ),
            "compute_kpis": lambda: self._compute_kpis(
                {"group_id": group_id}, steps
            ),
        }

        handler = job_handlers.get(job_type)
        if handler:
            return await handler()
        else:
            return AgentResult(
                success=False,
                error=f"Unknown job type: {job_type}",
                steps_taken=steps
            )

    # ==================== Escalation (v2: Soft/Hard) ====================

    async def _escalate_single(
        self, entry: Dict, escalation_type: str, steps: List
    ) -> bool:
        """
        Escalate a single overdue payment to the host.

        v2: Soft escalation = host gets visibility (informational).
            Hard escalation = host action required.
        """
        ledger_id = entry.get("ledger_id")
        if not ledger_id:
            return False

        # Notify host (bypasses quiet hours for hosts only)
        group_id = entry.get("group_id")
        admins = await self._get_group_admins(group_id) if group_id else []

        if admins:
            from_name = await self._get_user_name(entry.get("from_user_id"))
            amount = entry.get("amount", 0)
            days = entry.get("days_overdue", 0)

            if escalation_type == "soft":
                title = "Payment Needs Attention"
                message = (
                    f"{from_name}'s ${amount:.2f} payment is {days} days overdue. "
                    f"They've been reminded — this is a heads-up for your awareness."
                )
            else:  # hard
                title = "Overdue Payment: Action Needed"
                message = (
                    f"{from_name}'s ${amount:.2f} payment is {days} days overdue "
                    f"and has not been resolved despite multiple reminders. "
                    f"Please reach out to them directly."
                )

            await self.call_tool(
                "notification_sender",
                user_ids=admins,
                title=title,
                message=message,
                notification_type="general",
                data={
                    "type": f"{escalation_type}_escalation",
                    "ledger_id": ledger_id,
                    "from_user_id": entry.get("from_user_id"),
                    "amount": amount,
                    "days_overdue": days,
                    "source": "payment_reconciliation_agent",
                }
            )

        # Mark escalation on ledger entry
        if self.db and ledger_id:
            from bson import ObjectId
            update = {
                f"{escalation_type}_escalated": True,
                f"{escalation_type}_escalated_at": datetime.now(timezone.utc).isoformat(),
            }
            await self.db.ledger_entries.update_one(
                {"_id": ObjectId(ledger_id)},
                {"$set": update}
            )

        steps.append({
            "step": f"{escalation_type}_escalate_{ledger_id}",
            "admins": admins,
        })

        await self._log_reconciliation_event(
            event_type=f"payment_{escalation_type}_escalated",
            ledger_id=ledger_id,
            group_id=group_id,
            amount=entry.get("amount", 0),
            data={
                "days_overdue": entry.get("days_overdue", 0),
                "escalation_type": escalation_type,
            },
        )

        return True

    # ==================== Reminder Sending ====================

    async def _send_batched_reminder(
        self,
        user_id: str,
        entries: List[Dict],
        group_id: str,
        steps: List,
    ):
        """
        Send a single batched notification for multiple debts.
        "You have 3 open payments to settle" with itemized list.
        """
        total = sum(e.get("amount", 0) for e in entries)
        max_urgency = max(
            entries,
            key=lambda e: ["gentle", "firm", "final", "escalate"].index(
                e.get("urgency", "gentle")
            )
        ).get("urgency", "gentle")

        # Build itemized list
        items = []
        for entry in entries[:5]:  # Cap at 5 items
            to_name = await self._get_user_name(entry.get("to_user_id"))
            items.append(
                f"  ${entry['amount']:.2f} to {to_name} "
                f"({entry.get('days_overdue', 0)}d)"
            )

        remaining = len(entries) - 5
        item_text = "\n".join(items)
        if remaining > 0:
            item_text += f"\n  ...and {remaining} more"

        message = (
            f"You have {len(entries)} open payments "
            f"totaling ${total:.2f}:\n{item_text}\n\n"
            f"Settle up to keep your group running smoothly."
        )

        await self.call_tool(
            "notification_sender",
            user_ids=[user_id],
            title=self._build_reminder_title(max_urgency),
            message=message,
            notification_type="reminder",
            data={
                "type": "batched_reminder",
                "entry_count": len(entries),
                "total_amount": total,
                "urgency": max_urgency,
                "source": "payment_reconciliation_agent",
            }
        )
        steps.append({
            "step": f"batched_remind_{user_id}",
            "entry_count": len(entries),
        })

    async def _send_single_reminder(
        self,
        user_id: str,
        entry: Dict,
        group_id: str,
        steps: List,
    ):
        """Send a single reminder for one debt."""
        urgency = entry.get("urgency", "gentle")
        to_name = await self._get_user_name(entry.get("to_user_id"))
        amount = entry.get("amount", 0)
        days = entry.get("days_overdue", 0)

        message = self._build_reminder_message(
            urgency=urgency,
            to_name=to_name,
            amount=amount,
            days_overdue=days,
        )

        await self.call_tool(
            "notification_sender",
            user_ids=[user_id],
            title=self._build_reminder_title(urgency),
            message=message,
            notification_type="reminder",
            data={
                "ledger_id": entry.get("ledger_id"),
                "amount": amount,
                "to_user_id": entry.get("to_user_id"),
                "urgency": urgency,
                "source": "payment_reconciliation_agent",
            }
        )
        steps.append({
            "step": f"remind_{entry.get('ledger_id')}",
        })

    # ==================== Message Building ====================

    def _build_reminder_title(self, urgency: str) -> str:
        """Build reminder notification title based on urgency."""
        titles = {
            "gentle": "Friendly Reminder: Settle Up",
            "firm": "Payment Reminder",
            "final": "Final Payment Reminder",
            "escalate": "Overdue Payment Alert",
        }
        return titles.get(urgency, "Payment Reminder")

    def _build_reminder_message(
        self,
        urgency: str,
        to_name: str,
        amount: float,
        days_overdue: int,
    ) -> str:
        """Build reminder message with urgency-appropriate tone."""
        if urgency == "gentle":
            return (
                f"Hey! Just a heads up - you owe {to_name} ${amount:.2f} "
                f"from your last poker game. Settle up when you get a chance!"
            )
        elif urgency == "firm":
            return (
                f"Reminder: You owe {to_name} ${amount:.2f} "
                f"({days_overdue} days ago). "
                f"Please settle this payment soon."
            )
        elif urgency == "final":
            return (
                f"Final reminder: Your ${amount:.2f} payment to {to_name} "
                f"is {days_overdue} days overdue. "
                f"Please pay today to avoid this being flagged to your host."
            )
        else:  # escalate
            return (
                f"Your ${amount:.2f} payment to {to_name} is significantly "
                f"overdue ({days_overdue} days). The host has been notified. "
                f"Please settle this as soon as possible."
            )

    # ==================== Helper Methods ====================

    async def _get_user_name(self, user_id: str) -> str:
        """Get a user's display name."""
        if not self.db or not user_id:
            return "Unknown"
        user = await self.db.users.find_one(
            {"user_id": user_id}, {"_id": 0, "name": 1}
        )
        return user.get("name", "Unknown") if user else "Unknown"

    async def _get_group_admins(self, group_id: str) -> List[str]:
        """Get admin user IDs for a group."""
        if not self.db or not group_id:
            return []
        admins = await self.db.group_members.find(
            {"group_id": group_id, "role": "admin"},
            {"_id": 0, "user_id": 1}
        ).to_list(10)
        return [a["user_id"] for a in admins]

    async def _log_reminder(
        self,
        user_id: str,
        ledger_id: str,
        group_id: str = None,
        urgency: str = "gentle",
        amount: float = 0,
    ):
        """Log a reminder for cooldown + daily cap tracking."""
        if not self.db:
            return
        await self.db.payment_reminders_log.insert_one({
            "user_id": user_id,
            "ledger_id": ledger_id,
            "group_id": group_id,
            "urgency": urgency,
            "amount": amount,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        })

    async def _log_reconciliation_event(
        self,
        event_type: str,
        ledger_id: str = None,
        group_id: str = None,
        amount: float = None,
        confidence: float = None,
        data: Dict = None,
    ):
        """Log a reconciliation event for audit trail."""
        if not self.db:
            return
        event = {
            "event_type": event_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        if ledger_id:
            event["ledger_id"] = ledger_id
        if group_id:
            event["group_id"] = group_id
        if amount is not None:
            event["amount"] = amount
        if confidence is not None:
            event["confidence"] = confidence
        if data:
            event["data"] = data
        await self.db.payment_reconciliation_log.insert_one(event)
