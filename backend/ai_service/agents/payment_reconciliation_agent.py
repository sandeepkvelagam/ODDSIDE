"""
Payment Reconciliation Agent (v1)

Autonomous agent that tracks and resolves payment issues.
Uses the full pipeline: Scan -> Policy -> Escalate -> Execute -> Measure.

Trigger Types:
1. Daily scan: Find overdue ledger entries, send escalating reminders
   -> Day 1 (gentle), Day 3 (firm), Day 7 (final), Day 14 (escalate to host)
2. Stripe webhook: Match incoming payment to ledger entry
   -> Auto-mark as paid (if confidence >= threshold), notify both parties
3. Weekly: Payment health report per group
   -> Flag chronic non-payers to host
4. Monthly: Consolidate cross-game debts
   -> "You owe Player X $15 across 3 games" -> single consolidated view
5. On-demand: Reconcile a specific game or group
6. Anomaly detection: Find duplicates, orphans, mismatched totals

Architecture:
- PaymentTrackerTool (existing): Get outstanding, send reminders, mark paid
- LedgerReconcilerTool (new): Cross-check, consolidate, health reports, anomalies
- PaymentPolicyTool (new): Cooldown, quiet hours, escalation rules, tone
- NotificationSenderTool (existing): Send reminders and alerts
- payment_reconciliation_log collection: Audit trail
- payment_reminders_log collection: Cooldown tracking
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseAgent, AgentResult

logger = logging.getLogger(__name__)


class PaymentReconciliationAgent(BaseAgent):
    """
    Agent for autonomously tracking and resolving payment issues.

    Uses the Scan -> Policy -> Escalate -> Execute -> Measure pipeline
    to manage payments with policy-gated reminders and escalations.
    """

    @property
    def name(self) -> str:
        return "payment_reconciliation"

    @property
    def description(self) -> str:
        return (
            "autonomously tracking and resolving payment issues including "
            "overdue payment reminders, Stripe payment matching, cross-game "
            "debt consolidation, payment health reports, and chronic non-payer flagging"
        )

    @property
    def capabilities(self) -> List[str]:
        return [
            "Scan for overdue payments with urgency classification (gentle/firm/final/escalate)",
            "Send policy-gated payment reminders with escalating urgency",
            "Match Stripe webhook payments to pending ledger entries",
            "Auto-mark matched payments as paid (above confidence threshold)",
            "Consolidate cross-game debts between player pairs",
            "Generate weekly payment health reports per group",
            "Flag chronic non-payers to group hosts",
            "Detect payment anomalies (duplicates, orphans, mismatches)",
            "Escalate overdue payments to hosts after reminder cap",
            "Process scheduled payment reconciliation jobs",
            "Enforce quiet hours, cooldowns, and reminder caps",
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

            if action == "scan_and_remind":
                return await self._scan_and_remind(context, steps_taken)
            elif action == "match_stripe_payment":
                return await self._match_stripe_payment(context, steps_taken)
            elif action == "consolidate_debts":
                return await self._consolidate_debts(context, steps_taken)
            elif action == "payment_health_report":
                return await self._payment_health_report(context, steps_taken)
            elif action == "flag_nonpayers":
                return await self._flag_nonpayers(context, steps_taken)
            elif action == "detect_anomalies":
                return await self._detect_anomalies(context, steps_taken)
            elif action == "reconcile_game":
                return await self._reconcile_game(context, steps_taken)
            elif action == "reconcile_group":
                return await self._reconcile_group(context, steps_taken)
            elif action == "run_daily_scan":
                return await self._run_daily_scan(context, steps_taken)
            elif action == "run_weekly_report":
                return await self._run_weekly_report(context, steps_taken)
            elif action == "process_job":
                return await self._process_job(context, steps_taken)
            else:
                return AgentResult(
                    success=False,
                    error="Unknown payment reconciliation action",
                    message=(
                        "Available actions: scan_and_remind, match_stripe_payment, "
                        "consolidate_debts, payment_health_report, flag_nonpayers, "
                        "detect_anomalies, reconcile_game, reconcile_group, "
                        "run_daily_scan, run_weekly_report, process_job"
                    ),
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
        if any(kw in input_lower for kw in ["process job", "job"]):
            return "process_job"
        if any(kw in input_lower for kw in [
            "payment", "reconcil", "settle", "owed", "outstanding", "unpaid"
        ]):
            return "scan_and_remind"

        return "scan_and_remind"

    # ==================== Scan and Remind (Core Pipeline) ====================

    async def _scan_and_remind(self, context: Dict, steps: List) -> AgentResult:
        """
        Full pipeline: Scan overdue -> Policy check each -> Send reminder -> Log.

        This is the core reconciliation loop used by daily scans and on-demand triggers.
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
                data={"reminders_sent": 0, "escalated": 0, "blocked": 0},
                message="No overdue payments found",
                steps_taken=steps
            )

        reminders_sent = 0
        escalated = 0
        blocked = 0

        for entry in overdue_entries:
            ledger_id = entry.get("ledger_id")
            user_id = entry.get("from_user_id")
            urgency = entry.get("urgency", "gentle")

            # Step 2: POLICY — check if we can remind this user
            policy_result = await self.call_tool(
                "payment_policy",
                action="check_reminder_policy",
                user_id=user_id,
                group_id=entry.get("group_id") or group_id,
                ledger_id=ledger_id,
                urgency=urgency,
            )
            steps.append({
                "step": f"policy_{ledger_id}",
                "result": policy_result
            })

            policy_data = policy_result.get("data", {})

            if not policy_data.get("allowed"):
                # Check if we should escalate instead
                if policy_data.get("should_escalate"):
                    esc_result = await self._escalate_single(
                        entry, steps
                    )
                    if esc_result:
                        escalated += 1
                else:
                    blocked += 1
                continue

            # Step 3: EXECUTE — send the reminder
            tone_config = policy_data.get("tone_config", {})

            # Get user names for personalized message
            to_name = await self._get_user_name(entry.get("to_user_id"))
            from_name = await self._get_user_name(user_id)
            amount = entry.get("amount", 0)
            days = entry.get("days_overdue", 0)

            message = self._build_reminder_message(
                urgency=urgency,
                to_name=to_name,
                amount=amount,
                days_overdue=days,
                tone_config=tone_config,
            )

            notif_result = await self.call_tool(
                "notification_sender",
                user_ids=[user_id],
                title=self._build_reminder_title(urgency),
                message=message,
                notification_type="reminder",
                data={
                    "ledger_id": ledger_id,
                    "amount": amount,
                    "to_user_id": entry.get("to_user_id"),
                    "urgency": urgency,
                    "source": "payment_reconciliation_agent",
                }
            )
            steps.append({
                "step": f"remind_{ledger_id}",
                "result": notif_result
            })

            # Step 4: MEASURE — log the reminder
            await self._log_reminder(
                user_id=user_id,
                ledger_id=ledger_id,
                group_id=entry.get("group_id") or group_id,
                urgency=urgency,
                amount=amount,
            )

            # Update reminder count on ledger entry
            if self.db and ledger_id:
                from bson import ObjectId
                await self.db.ledger_entries.update_one(
                    {"_id": ObjectId(ledger_id)},
                    {
                        "$inc": {"reminder_count": 1},
                        "$set": {
                            "last_reminder_at": datetime.now(timezone.utc).isoformat(),
                            "last_reminder_urgency": urgency,
                        }
                    }
                )

            reminders_sent += 1

            # Check if this entry should be escalated after final reminder
            if urgency in ("final", "escalate"):
                esc_policy = await self.call_tool(
                    "payment_policy",
                    action="check_escalation_policy",
                    ledger_id=ledger_id,
                    group_id=entry.get("group_id") or group_id,
                )
                if esc_policy.get("data", {}).get("should_escalate"):
                    esc_result = await self._escalate_single(entry, steps)
                    if esc_result:
                        escalated += 1

        return AgentResult(
            success=True,
            data={
                "overdue_found": len(overdue_entries),
                "reminders_sent": reminders_sent,
                "escalated": escalated,
                "blocked": blocked,
                "by_urgency": scan_result.get("data", {}).get("by_urgency", {}),
            },
            message=(
                f"Processed {len(overdue_entries)} overdue payments: "
                f"{reminders_sent} reminded, {escalated} escalated, {blocked} blocked"
            ),
            steps_taken=steps
        )

    # ==================== Match Stripe Payment ====================

    async def _match_stripe_payment(self, context: Dict, steps: List) -> AgentResult:
        """
        Match an incoming Stripe payment to a ledger entry.
        Pipeline: Match -> Policy -> Mark Paid -> Notify.
        """
        stripe_event = context.get("stripe_event", {})

        if not stripe_event:
            return AgentResult(
                success=False,
                error="stripe_event required",
                steps_taken=steps
            )

        # Step 1: MATCH — find matching ledger entries
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

        best_match = match_result.get("data", {}).get("best_match")

        if not best_match:
            return AgentResult(
                success=True,
                data={"matched": False, "auto_marked": False},
                message="No matching ledger entry found for Stripe payment",
                steps_taken=steps
            )

        # Step 2: POLICY — check if auto-mark is allowed
        confidence = best_match.get("confidence", 0)
        group_id = None

        # Get group_id from ledger entry
        if self.db and best_match.get("ledger_id"):
            from bson import ObjectId
            entry = await self.db.ledger_entries.find_one(
                {"_id": ObjectId(best_match["ledger_id"])},
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

        if auto_mark_allowed:
            # Step 3: EXECUTE — mark as paid
            mark_result = await self.call_tool(
                "payment_tracker",
                action="mark_paid",
                ledger_id=best_match["ledger_id"],
            )
            steps.append({"step": "mark_paid", "result": mark_result})

            # Step 4: NOTIFY — tell both parties
            from_id = best_match.get("from_user_id")
            to_id = best_match.get("to_user_id")
            amount = best_match.get("amount", 0)
            from_name = await self._get_user_name(from_id)
            to_name = await self._get_user_name(to_id)

            # Notify payer
            if from_id:
                await self.call_tool(
                    "notification_sender",
                    user_ids=[from_id],
                    title="Payment Confirmed",
                    message=f"Your ${amount:.2f} payment to {to_name} has been confirmed via Stripe.",
                    notification_type="settlement",
                    data={
                        "ledger_id": best_match["ledger_id"],
                        "amount": amount,
                        "source": "stripe_auto_match",
                    }
                )

            # Notify recipient
            if to_id:
                await self.call_tool(
                    "notification_sender",
                    user_ids=[to_id],
                    title="Payment Received",
                    message=f"{from_name} paid ${amount:.2f} (confirmed via Stripe).",
                    notification_type="settlement",
                    data={
                        "ledger_id": best_match["ledger_id"],
                        "amount": amount,
                        "source": "stripe_auto_match",
                    }
                )

            steps.append({"step": "notify_parties", "from": from_id, "to": to_id})

            # Log the reconciliation event
            await self._log_reconciliation_event(
                event_type="stripe_auto_matched",
                ledger_id=best_match["ledger_id"],
                group_id=group_id,
                amount=amount,
                confidence=confidence,
            )

            return AgentResult(
                success=True,
                data={
                    "matched": True,
                    "auto_marked": True,
                    "ledger_id": best_match["ledger_id"],
                    "amount": amount,
                    "confidence": confidence,
                    "match_method": best_match.get("match_method"),
                },
                message=f"Stripe payment matched and auto-marked (${amount:.2f}, conf={confidence:.2f})",
                steps_taken=steps
            )
        else:
            # Low confidence — queue for manual review
            await self._log_reconciliation_event(
                event_type="stripe_manual_review_needed",
                ledger_id=best_match["ledger_id"],
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
                    "ledger_id": best_match["ledger_id"],
                    "confidence": confidence,
                },
                message=(
                    f"Stripe payment matched but confidence ({confidence:.2f}) "
                    f"below auto-mark threshold. Queued for manual review."
                ),
                steps_taken=steps
            )

    # ==================== Consolidate Debts ====================

    async def _consolidate_debts(self, context: Dict, steps: List) -> AgentResult:
        """
        Consolidate cross-game debts and notify relevant users.
        Read-only: generates suggestions, doesn't modify entries.
        """
        group_id = context.get("group_id")
        user_id = context.get("user_id")

        # Step 1: Get consolidated view
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
            if c.get("status") == "consolidatable" and c.get("net_amount", 0) > 0
        ]

        if not consolidatable:
            return AgentResult(
                success=True,
                data={"consolidatable_count": 0},
                message="No debts to consolidate (all single-game or already settled)",
                steps_taken=steps
            )

        # Step 2: Policy check each consolidation
        suggestions = []
        for debt in consolidatable:
            policy_result = await self.call_tool(
                "payment_policy",
                action="check_consolidation_policy",
                debt_data=debt,
                group_id=group_id,
            )

            if policy_result.get("data", {}).get("allowed"):
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
                    "message": (
                        f"{from_name} owes {to_name} ${debt['net_amount']:.2f} "
                        f"across {debt['game_count']} games"
                    ),
                })

        # Step 3: Notify users with consolidation suggestions
        notified = 0
        for suggestion in suggestions:
            await self.call_tool(
                "notification_sender",
                user_ids=[suggestion["from_user_id"]],
                title="Settle Up: Combined Balance",
                message=(
                    f"You owe {suggestion['to_user_name']} "
                    f"${suggestion['net_amount']:.2f} across "
                    f"{suggestion['game_count']} games. "
                    f"Pay once instead of separately!"
                ),
                notification_type="settlement",
                data={
                    "type": "consolidation_suggestion",
                    "net_amount": suggestion["net_amount"],
                    "to_user_id": suggestion["to_user_id"],
                    "game_count": suggestion["game_count"],
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
            },
            message=f"Found {len(suggestions)} consolidation opportunities, notified {notified} users",
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

        # Step 1: Generate report
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

        # Step 2: Format the report
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

        avg_days = report.get("avg_payment_days")
        if avg_days is not None:
            lines.append(f"  Avg Payment Time: {avg_days} days")

        total_overdue = overdue.get("total", 0)
        if total_overdue > 0:
            lines.append(f"\n  Overdue: {total_overdue} entries")
            for urgency, count in by_urgency.items():
                if count > 0:
                    lines.append(f"    {urgency}: {count}")

        chronic = report.get("chronic_nonpayer_count", 0)
        if chronic > 0:
            lines.append(f"\n  Chronic Non-Payers: {chronic} users flagged")

        report_text = "\n".join(lines)

        # Step 3: Send to group admins
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

        # Log the report
        await self._log_reconciliation_event(
            event_type="health_report_generated",
            group_id=group_id,
            data={
                "payment_rate": report.get("payment_rate"),
                "pending_count": pending.get("count", 0),
                "overdue_total": total_overdue,
            }
        )

        return AgentResult(
            success=True,
            data={
                "report": report,
                "report_text": report_text,
                "admins_notified": len(admins),
            },
            message=f"Payment health report sent to {len(admins)} admins (rate: {report.get('payment_rate', 0)}%)",
            steps_taken=steps
        )

    # ==================== Flag Non-Payers ====================

    async def _flag_nonpayers(self, context: Dict, steps: List) -> AgentResult:
        """Flag chronic non-payers and notify group hosts."""
        group_id = context.get("group_id")

        # Step 1: Identify chronic non-payers
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
                message="No chronic non-payers found",
                steps_taken=steps
            )

        # Step 2: Notify hosts (per group)
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
                    title="Payment Alert: Chronic Non-Payers",
                    message=(
                        f"{len(flagged)} players flagged for late payments:\n"
                        f"{flagged_summary}"
                    ),
                    notification_type="general",
                    data={
                        "type": "chronic_nonpayer_alert",
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
            },
            message=f"Flagged {len(flagged)} chronic non-payers",
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

        # Notify admins if anomalies found
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
        """Full reconciliation for a specific game: scan + remind + anomaly check."""
        game_id = context.get("game_id")

        if not game_id:
            return AgentResult(
                success=False,
                error="game_id required",
                steps_taken=steps
            )

        # Get group_id from game
        group_id = context.get("group_id")
        if not group_id and self.db:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id}, {"_id": 0, "group_id": 1}
            )
            if game:
                group_id = game.get("group_id")

        results = {}

        # 1. Scan and remind for this game
        remind_result = await self._scan_and_remind(
            {"group_id": group_id, "game_id": game_id, "overdue_days": 1},
            steps
        )
        results["reminders"] = {
            "sent": remind_result.data.get("reminders_sent", 0) if remind_result.data else 0,
            "escalated": remind_result.data.get("escalated", 0) if remind_result.data else 0,
        }

        # 2. Check for anomalies
        anomaly_result = await self._detect_anomalies(
            {"game_id": game_id, "group_id": group_id},
            steps
        )
        results["anomalies"] = {
            "found": anomaly_result.data.get("anomaly_count", 0) if anomaly_result.data else 0,
        }

        return AgentResult(
            success=True,
            data=results,
            message=(
                f"Game reconciliation: {results['reminders']['sent']} reminders sent, "
                f"{results['anomalies']['found']} anomalies found"
            ),
            steps_taken=steps
        )

    # ==================== Reconcile Group ====================

    async def _reconcile_group(self, context: Dict, steps: List) -> AgentResult:
        """Full reconciliation for a group: scan + consolidate + health report."""
        group_id = context.get("group_id")

        if not group_id:
            return AgentResult(
                success=False,
                error="group_id required",
                steps_taken=steps
            )

        results = {}

        # 1. Scan and remind
        remind_result = await self._scan_and_remind(
            {"group_id": group_id, "overdue_days": 1},
            steps
        )
        results["reminders"] = {
            "sent": remind_result.data.get("reminders_sent", 0) if remind_result.data else 0,
            "escalated": remind_result.data.get("escalated", 0) if remind_result.data else 0,
            "overdue_found": remind_result.data.get("overdue_found", 0) if remind_result.data else 0,
        }

        # 2. Consolidate debts
        consol_result = await self._consolidate_debts(
            {"group_id": group_id},
            steps
        )
        results["consolidation"] = {
            "suggestions": consol_result.data.get("suggestion_count", 0) if consol_result.data else 0,
        }

        # 3. Generate health report
        health_result = await self._payment_health_report(
            {"group_id": group_id},
            steps
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
                f"{results['consolidation']['suggestions']} consolidation opportunities, "
                f"{results['health']['payment_rate']}% payment rate"
            ),
            steps_taken=steps
        )

    # ==================== Scheduled Jobs ====================

    async def _run_daily_scan(self, context: Dict, steps: List) -> AgentResult:
        """
        Daily scan: process all groups with overdue payments.
        Typically triggered by a scheduler or cron job.
        """
        if not self.db:
            return AgentResult(
                success=False,
                error="Database not available",
                steps_taken=steps
            )

        # Get all groups with pending payments
        groups = await self.db.ledger_entries.distinct(
            "group_id",
            {"status": "pending"}
        )

        total_reminded = 0
        total_escalated = 0
        total_blocked = 0
        groups_processed = 0

        for group_id in groups:
            if not group_id:
                continue

            result = await self._scan_and_remind(
                {"group_id": group_id, "overdue_days": 1},
                steps
            )
            if result.data:
                total_reminded += result.data.get("reminders_sent", 0)
                total_escalated += result.data.get("escalated", 0)
                total_blocked += result.data.get("blocked", 0)
            groups_processed += 1

        # Log daily scan
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
        """
        Weekly report: generate health reports for all active groups.
        Also flags chronic non-payers and suggests debt consolidation.
        """
        if not self.db:
            return AgentResult(
                success=False,
                error="Database not available",
                steps_taken=steps
            )

        # Get groups with any ledger activity in last 90 days
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

            # Health report
            health_result = await self._payment_health_report(
                {"group_id": group_id},
                steps
            )
            if health_result.success:
                reports_sent += 1

            # Flag non-payers
            flag_result = await self._flag_nonpayers(
                {"group_id": group_id},
                steps
            )
            if flag_result.data:
                nonpayers_flagged += flag_result.data.get("flagged_count", 0)

        # Log weekly report
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
                f"Weekly report: {reports_sent} reports sent, "
                f"{nonpayers_flagged} non-payers flagged"
            ),
            steps_taken=steps
        )

    # ==================== Job Queue Processing ====================

    async def _process_job(self, context: Dict, steps: List) -> AgentResult:
        """
        Process a single payment reconciliation job from the queue.
        Jobs are created by EventListener or scheduler.
        """
        job = context.get("job", {})
        job_type = job.get("job_type", context.get("job_type"))
        group_id = job.get("group_id", context.get("group_id"))
        game_id = job.get("game_id", context.get("game_id"))

        if job_type == "daily_scan":
            return await self._run_daily_scan(context, steps)
        elif job_type == "weekly_report":
            return await self._run_weekly_report(context, steps)
        elif job_type == "scan_and_remind":
            return await self._scan_and_remind(
                {"group_id": group_id, **job}, steps
            )
        elif job_type == "reconcile_game":
            return await self._reconcile_game(
                {"game_id": game_id, "group_id": group_id}, steps
            )
        elif job_type == "reconcile_group":
            return await self._reconcile_group(
                {"group_id": group_id}, steps
            )
        elif job_type == "stripe_match":
            return await self._match_stripe_payment(context, steps)
        elif job_type == "consolidate":
            return await self._consolidate_debts(
                {"group_id": group_id}, steps
            )
        else:
            return AgentResult(
                success=False,
                error=f"Unknown job type: {job_type}",
                steps_taken=steps
            )

    # ==================== Single Escalation ====================

    async def _escalate_single(self, entry: Dict, steps: List) -> bool:
        """Escalate a single overdue payment to the host."""
        ledger_id = entry.get("ledger_id")

        if not ledger_id:
            return False

        result = await self.call_tool(
            "payment_tracker",
            action="escalate_to_host",
            ledger_id=ledger_id,
        )
        steps.append({"step": f"escalate_{ledger_id}", "result": result})

        # Log the escalation
        await self._log_reconciliation_event(
            event_type="payment_escalated",
            ledger_id=ledger_id,
            group_id=entry.get("group_id"),
            amount=entry.get("amount", 0),
            data={"days_overdue": entry.get("days_overdue", 0)},
        )

        return result.get("success", False)

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
        tone_config: Dict = None,
    ) -> str:
        """
        Build reminder message with urgency-appropriate tone.

        Every reminder includes:
        1. Who you owe
        2. How much
        3. How long it's been (if firm+)
        4. What to do next
        """
        tone_config = tone_config or {}

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
        """Log a reminder for cooldown tracking."""
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
