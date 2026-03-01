"""
Automation Runner Tool

Executes user-defined automation workflows. When a trigger fires,
this tool evaluates conditions and executes the action chain.

Execution pipeline:
1. Load automation config from DB
2. Deduplicate: check event_id against dedupe store (idempotency)
3. Loop guard: reject events with causation_run_id (prevent recursion)
4. Evaluate conditions against event data
5. Execute actions (with optional stop_on_failure + per-action timeout)
6. Log results with correlation/causation IDs
7. Update run stats + hot-loop detection
8. Handle failures gracefully (with auto-disable after N consecutive errors)

Safety:
- Idempotency via event_id + dedupe store
- Loop prevention via causation_run_id tracking
- Hot-loop detection: auto-disable if too many runs in a short window
- Actions execute in the context of the automation owner (user_id)
- No action can trigger another automation (prevents infinite loops)
- Consecutive error threshold: 5 errors → auto-disable
- Per-action timeout + per-run max duration
- All executions are logged for auditability
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging
import uuid
import asyncio
import hashlib

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)

# Auto-disable after this many consecutive errors
CONSECUTIVE_ERROR_THRESHOLD = 5

# Hot-loop detection: max runs per automation in a rolling window
HOT_LOOP_MAX_RUNS = 20
HOT_LOOP_WINDOW_MINUTES = 10

# Default timeouts
DEFAULT_ACTION_TIMEOUT_MS = 30_000  # 30 seconds per action
DEFAULT_RUN_MAX_DURATION_MS = 120_000  # 2 minutes per run


class AutomationRunnerTool(BaseTool):
    """
    Executes user-defined automation workflows.

    Evaluates trigger conditions and runs action chains with
    idempotency, loop guards, error tracking, and auto-disable.
    """

    def __init__(self, db=None, tool_registry=None):
        self.db = db
        self.tool_registry = tool_registry

    @property
    def name(self) -> str:
        return "automation_runner"

    @property
    def description(self) -> str:
        return (
            "Execute a user-defined automation. Deduplicates events, guards "
            "against loops, evaluates conditions, then runs each action. "
            "Tracks execution with correlation IDs and auto-disables on "
            "repeated failures or hot loops."
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": [
                        "run_automation", "run_by_trigger",
                        "get_run_history", "dry_run",
                    ],
                },
                "automation_id": {"type": "string"},
                "user_id": {"type": "string"},
                "trigger_type": {"type": "string"},
                "event_data": {"type": "object"},
                "group_id": {"type": "string"},
                "event_id": {
                    "type": "string",
                    "description": "Unique event ID for idempotency",
                },
                "causation_run_id": {
                    "type": "string",
                    "description": "Run ID of the automation that caused this event (loop guard)",
                },
                "correlation_id": {
                    "type": "string",
                    "description": "Correlation ID to trace related events",
                },
                "force_replay": {
                    "type": "boolean",
                    "description": "Bypass dedupe check for manual event replay (default false)",
                },
            },
            "required": ["action"],
        }

    async def execute(self, **kwargs) -> ToolResult:
        action = kwargs.get("action")
        handlers = {
            "run_automation": self._run_automation,
            "run_by_trigger": self._run_by_trigger,
            "get_run_history": self._get_run_history,
            "dry_run": self._dry_run,
        }

        handler = handlers.get(action)
        if not handler:
            return ToolResult(
                success=False,
                error=f"Unknown action: {action}"
            )

        return await handler(**kwargs)

    # ==================== Idempotency ====================

    async def _check_dedupe(
        self, automation_id: str, event_id: str
    ) -> bool:
        """
        Check if this (automation_id, event_id) pair has already been processed.
        Returns True if it's a duplicate (should skip).
        """
        if self.db is None or not event_id:
            return False

        dedupe_key = f"{automation_id}:{event_id}"

        existing = await self.db.automation_event_dedupe.find_one(
            {"dedupe_key": dedupe_key}
        )

        if existing:
            logger.debug(
                f"Dedupe hit: automation={automation_id} event={event_id}"
            )
            return True

        # Insert dedupe record (with TTL — MongoDB TTL index on expires_at)
        await self.db.automation_event_dedupe.insert_one({
            "dedupe_key": dedupe_key,
            "automation_id": automation_id,
            "event_id": event_id,
            "processed_at": datetime.now(timezone.utc).isoformat(),
            "expires_at": (
                datetime.now(timezone.utc) + timedelta(hours=24)
            ).isoformat(),
        })

        return False

    def _generate_event_hash(self, event_data: Dict, trigger_type: str) -> str:
        """
        Generate a content-based hash for events that lack an event_id.
        Uses (trigger_type + key event fields + 5-minute time bucket).
        """
        now = datetime.now(timezone.utc)
        time_bucket = now.strftime("%Y-%m-%dT%H:") + str(now.minute // 5 * 5)

        hash_parts = [trigger_type, time_bucket]
        for key in sorted(event_data.keys()):
            val = event_data[key]
            if isinstance(val, (str, int, float, bool)):
                hash_parts.append(f"{key}={val}")

        hash_str = "|".join(hash_parts)
        return hashlib.sha256(hash_str.encode()).hexdigest()[:16]

    # ==================== Loop Guard ====================

    async def _check_loop_guard(
        self, automation_id: str, causation_run_id: str = None
    ) -> Optional[str]:
        """
        Check for loop conditions. Returns a reason string if blocked, None if OK.

        Guards:
        1. Reject events caused by another automation run (causation_run_id present)
        2. Hot-loop detection: too many runs in a short window
        """
        # Guard 1: Causation chain — block automation-generated events
        if causation_run_id:
            return (
                f"Blocked: event was caused by automation run {causation_run_id}. "
                f"Automation-to-automation chaining is not allowed."
            )

        # Guard 2: Hot-loop detection
        if self.db is not None:
            window_start = (
                datetime.now(timezone.utc) - timedelta(minutes=HOT_LOOP_WINDOW_MINUTES)
            ).isoformat()

            recent_count = await self.db.automation_runs.count_documents({
                "automation_id": automation_id,
                "created_at": {"$gte": window_start},
                "status": {"$in": ["success", "partial_failure"]},
            })

            if recent_count >= HOT_LOOP_MAX_RUNS:
                # Auto-disable the automation
                await self._auto_disable(
                    automation_id,
                    reason=(
                        f"Hot loop detected: {recent_count} runs in "
                        f"{HOT_LOOP_WINDOW_MINUTES} minutes. "
                        f"Likely a loop — auto-disabled."
                    ),
                    disable_type="hot_loop",
                )
                return (
                    f"Hot loop detected: {recent_count} runs in "
                    f"{HOT_LOOP_WINDOW_MINUTES} minutes"
                )

        return None

    # ==================== Run Single Automation ====================

    async def _run_automation(self, **kwargs) -> ToolResult:
        """Run a specific automation by ID."""
        automation_id = kwargs.get("automation_id")
        event_data = kwargs.get("event_data", {})
        event_id = kwargs.get("event_id")
        causation_run_id = kwargs.get("causation_run_id")
        correlation_id = kwargs.get("correlation_id")
        force_replay = kwargs.get("force_replay", False)

        if not automation_id or not self.db:
            return ToolResult(success=False, error="automation_id and database required")

        automation = await self.db.user_automations.find_one(
            {"automation_id": automation_id},
            {"_id": 0}
        )

        if not automation:
            return ToolResult(success=False, error="Automation not found")

        if not automation.get("enabled"):
            return ToolResult(
                success=False,
                error="Automation is disabled",
                data={"auto_disabled": automation.get("auto_disabled", False)}
            )

        # Idempotency check (skip if force_replay for manual re-runs)
        effective_event_id = event_id or event_data.get("event_id")
        if not effective_event_id:
            # Generate content-based hash as fallback
            trigger_type = automation.get("trigger", {}).get("type", "unknown")
            effective_event_id = f"hash_{self._generate_event_hash(event_data, trigger_type)}"

        if force_replay:
            # Generate a fresh event_id so the replay is tracked separately
            effective_event_id = f"replay_{uuid.uuid4().hex[:12]}"
            logger.info(
                f"Force replay: automation={automation_id} "
                f"replay_event_id={effective_event_id}"
            )

        is_duplicate = await self._check_dedupe(automation_id, effective_event_id)
        if is_duplicate:
            return ToolResult(
                success=True,
                data={
                    "automation_id": automation_id,
                    "skipped": True,
                    "reason": "duplicate_event",
                    "event_id": effective_event_id,
                },
                message="Duplicate event — already processed"
            )

        # Loop guard
        loop_reason = await self._check_loop_guard(automation_id, causation_run_id)
        if loop_reason:
            block_enum = "loop_guard_causation" if causation_run_id else "loop_guard_hot_loop"
            await self._log_run(
                automation_id=automation_id,
                run_id=f"run_{uuid.uuid4().hex[:12]}",
                status="skipped",
                reason="loop_guard",
                event_data=event_data,
                event_id=effective_event_id,
                correlation_id=correlation_id,
                causation_run_id=causation_run_id,
                policy_result=loop_reason,
                policy_block_reason_enum=block_enum,
                engine_version=automation.get("engine_version"),
            )
            return ToolResult(
                success=False,
                error=loop_reason,
                data={
                    "automation_id": automation_id,
                    "skipped": True,
                    "reason": "loop_guard",
                },
            )

        return await self._execute_automation(
            automation, event_data,
            event_id=effective_event_id,
            correlation_id=correlation_id,
            causation_run_id=causation_run_id,
            force_replay=force_replay,
        )

    # ==================== Run By Trigger ====================

    async def _run_by_trigger(self, **kwargs) -> ToolResult:
        """
        Find and run all automations matching a trigger type.
        Called by EventListenerService when an event fires.
        """
        trigger_type = kwargs.get("trigger_type")
        event_data = kwargs.get("event_data", {})
        group_id = kwargs.get("group_id")
        event_id = kwargs.get("event_id")
        causation_run_id = kwargs.get("causation_run_id")
        correlation_id = kwargs.get("correlation_id")

        if not trigger_type or not self.db:
            return ToolResult(success=False, error="trigger_type and database required")

        # Find matching automations
        query = {
            "trigger.type": trigger_type,
            "enabled": True,
            "auto_disabled": {"$ne": True},
        }

        if group_id:
            query["$or"] = [
                {"group_id": group_id},
                {"group_id": None},
                {"group_id": {"$exists": False}},
            ]
        else:
            query["$or"] = [
                {"group_id": None},
                {"group_id": {"$exists": False}},
            ]

        automations = await self.db.user_automations.find(
            query, {"_id": 0}
        ).to_list(50)

        if not automations:
            return ToolResult(
                success=True,
                data={"matched": 0, "executed": 0},
                message=f"No automations matched trigger '{trigger_type}'"
            )

        relevant_automations = []
        for auto in automations:
            if self._is_user_relevant(auto, event_data):
                relevant_automations.append(auto)

        executed = 0
        succeeded = 0
        failed = 0
        results = []

        for automation in relevant_automations:
            result = await self._run_automation(
                automation_id=automation["automation_id"],
                event_data=event_data,
                event_id=event_id,
                causation_run_id=causation_run_id,
                correlation_id=correlation_id,
            )
            executed += 1

            if result.success and not (result.data or {}).get("skipped"):
                succeeded += 1
            elif not result.success:
                failed += 1

            results.append({
                "automation_id": automation["automation_id"],
                "name": automation.get("name"),
                "success": result.success,
                "error": result.error,
                "skipped": (result.data or {}).get("skipped", False),
                "skip_reason": (result.data or {}).get("reason"),
            })

        return ToolResult(
            success=True,
            data={
                "trigger_type": trigger_type,
                "matched": len(relevant_automations),
                "executed": executed,
                "succeeded": succeeded,
                "failed": failed,
                "results": results,
            },
            message=(
                f"Trigger '{trigger_type}': {executed} automations executed "
                f"({succeeded} ok, {failed} failed)"
            )
        )

    # ==================== Execute Automation ====================

    async def _execute_automation(
        self,
        automation: Dict,
        event_data: Dict,
        event_id: str = None,
        correlation_id: str = None,
        causation_run_id: str = None,
        force_replay: bool = False,
    ) -> ToolResult:
        """
        Execute a single automation:
        1. Check conditions
        2. Execute actions (with stop_on_failure + timeout support)
        3. Log results with event_id, correlation_id, causation_run_id
        4. Update run stats + hot-loop counter
        """
        automation_id = automation["automation_id"]
        user_id = automation["user_id"]
        conditions = automation.get("conditions", {})
        actions = automation.get("actions", [])
        run_id = f"run_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # Execution options from automation config
        exec_options = automation.get("execution_options", {})
        stop_on_failure = exec_options.get("stop_on_failure", False)
        action_timeout_ms = exec_options.get(
            "action_timeout_ms", DEFAULT_ACTION_TIMEOUT_MS
        )
        run_max_duration_ms = exec_options.get(
            "max_duration_ms", DEFAULT_RUN_MAX_DURATION_MS
        )

        # Correlation ID: inherit or create
        effective_correlation_id = correlation_id or f"corr_{uuid.uuid4().hex[:12]}"

        # Trigger latency: time between event emission and execution start
        trigger_latency_ms = None
        event_ts = event_data.get("timestamp") or event_data.get("event_ts")
        if event_ts:
            try:
                if isinstance(event_ts, str):
                    event_dt = datetime.fromisoformat(event_ts.replace("Z", "+00:00"))
                else:
                    event_dt = event_ts
                trigger_latency_ms = int((now - event_dt).total_seconds() * 1000)
            except (ValueError, TypeError):
                pass

        # Step 1: Evaluate conditions
        if conditions:
            conditions_met, condition_details = self._evaluate_conditions(
                conditions, event_data
            )
            if not conditions_met:
                await self._log_run(
                    automation_id=automation_id,
                    run_id=run_id,
                    status="skipped",
                    reason="conditions_not_met",
                    event_data=event_data,
                    event_id=event_id,
                    correlation_id=effective_correlation_id,
                    trigger_latency_ms=trigger_latency_ms,
                    policy_result=f"Failed conditions: {condition_details}",
                    policy_block_reason_enum="conditions_not_met",
                    engine_version=automation.get("engine_version"),
                )
                # Track skip count
                await self._increment_skip_count(automation_id)
                return ToolResult(
                    success=True,
                    data={
                        "automation_id": automation_id,
                        "skipped": True,
                        "reason": "conditions_not_met",
                        "condition_details": condition_details,
                    },
                    message="Conditions not met, automation skipped"
                )

        # Step 2: Execute actions with timeout enforcement
        action_results = []
        all_succeeded = True
        run_start = datetime.now(timezone.utc)

        for i, action_config in enumerate(actions):
            # Check run-level timeout
            elapsed_ms = (
                datetime.now(timezone.utc) - run_start
            ).total_seconds() * 1000
            if elapsed_ms >= run_max_duration_ms:
                action_results.append({
                    "action_index": i,
                    "type": action_config.get("type"),
                    "success": False,
                    "error": f"Run timeout exceeded ({run_max_duration_ms}ms)",
                })
                all_succeeded = False
                break

            action_type = action_config.get("type")
            params = action_config.get("params", {})
            per_action_timeout = action_config.get(
                "timeout_ms", action_timeout_ms
            )

            try:
                result = await asyncio.wait_for(
                    self._execute_action(
                        action_type=action_type,
                        params=params,
                        user_id=user_id,
                        event_data=event_data,
                        automation=automation,
                    ),
                    timeout=per_action_timeout / 1000.0,
                )
                action_results.append({
                    "action_index": i,
                    "type": action_type,
                    "success": result.get("success", False),
                    "message": result.get("message"),
                    "error": result.get("error"),
                })

                if not result.get("success", False):
                    all_succeeded = False
                    if stop_on_failure:
                        action_results[-1]["note"] = "stop_on_failure triggered"
                        break

            except asyncio.TimeoutError:
                logger.error(
                    f"Automation {automation_id} action {i} ({action_type}) "
                    f"timed out after {per_action_timeout}ms"
                )
                action_results.append({
                    "action_index": i,
                    "type": action_type,
                    "success": False,
                    "error": f"Action timed out after {per_action_timeout}ms",
                })
                all_succeeded = False
                if stop_on_failure:
                    break

            except Exception as e:
                logger.error(
                    f"Automation {automation_id} action {i} ({action_type}) error: {e}"
                )
                action_results.append({
                    "action_index": i,
                    "type": action_type,
                    "success": False,
                    "error": str(e),
                })
                all_succeeded = False
                if stop_on_failure:
                    break

        # Step 3: Compute duration
        duration_ms = int(
            (datetime.now(timezone.utc) - run_start).total_seconds() * 1000
        )

        # Step 4: Update run stats
        status = "success" if all_succeeded else "partial_failure"
        await self._update_run_stats(
            automation_id=automation_id,
            user_id=user_id,
            success=all_succeeded,
            run_id=run_id,
            now=now_iso,
            event_id=event_id,
        )

        # Step 5: Resolve params for logging (sanitized preview)
        resolved_params = []
        for ac in actions:
            resolved = self._resolve_params(
                ac.get("params", {}), event_data, user_id
            )
            resolved_params.append({
                "type": ac.get("type"),
                "params": {
                    k: v for k, v in resolved.items()
                    if k not in ("password", "token", "secret")
                },
            })

        # Step 6: Log the run
        await self._log_run(
            automation_id=automation_id,
            run_id=run_id,
            status=status,
            action_results=action_results,
            event_data=event_data,
            event_id=event_id,
            event_type=automation.get("trigger", {}).get("type"),
            correlation_id=effective_correlation_id,
            causation_run_id=causation_run_id,
            duration_ms=duration_ms,
            trigger_latency_ms=trigger_latency_ms,
            resolved_params=resolved_params,
            force_replay=force_replay,
            engine_version=automation.get("engine_version"),
        )

        succeeded_count = sum(1 for r in action_results if r.get("success"))
        failed_count = len(action_results) - succeeded_count

        result_data = {
            "automation_id": automation_id,
            "run_id": run_id,
            "event_id": event_id,
            "correlation_id": effective_correlation_id,
            "actions_total": len(action_results),
            "actions_succeeded": succeeded_count,
            "actions_failed": failed_count,
            "action_results": action_results,
            "duration_ms": duration_ms,
        }
        if trigger_latency_ms is not None:
            result_data["trigger_latency_ms"] = trigger_latency_ms
        if force_replay:
            result_data["force_replay"] = True

        return ToolResult(
            success=all_succeeded,
            data=result_data,
            message=(
                f"Automation '{automation.get('name', automation_id)}': "
                f"{succeeded_count}/{len(action_results)} actions succeeded"
            ),
            error=None if all_succeeded else f"{failed_count} action(s) failed"
        )

    # ==================== Execute Single Action ====================

    async def _execute_action(
        self,
        action_type: str,
        params: Dict,
        user_id: str,
        event_data: Dict,
        automation: Dict,
    ) -> Dict:
        """Execute a single action within an automation."""

        # Resolve template variables in params
        resolved_params = self._resolve_params(params, event_data, user_id)

        if action_type == "send_notification":
            return await self._action_send_notification(
                resolved_params, user_id, automation
            )
        elif action_type == "send_email":
            return await self._action_send_email(
                resolved_params, user_id, automation
            )
        elif action_type == "send_payment_reminder":
            return await self._action_send_payment_reminder(
                resolved_params, user_id, event_data
            )
        elif action_type == "auto_rsvp":
            return await self._action_auto_rsvp(
                resolved_params, user_id, event_data
            )
        elif action_type == "create_game":
            return await self._action_create_game(
                resolved_params, user_id, automation
            )
        elif action_type == "generate_summary":
            return await self._action_generate_summary(
                resolved_params, user_id, event_data
            )
        else:
            return {"success": False, "error": f"Unknown action type: {action_type}"}

    # ==================== Action Implementations ====================

    async def _action_send_notification(
        self, params: Dict, user_id: str, automation: Dict
    ) -> Dict:
        """Send a push notification."""
        if not self.tool_registry:
            return {"success": False, "error": "Tool registry not available"}

        target = params.get("target", "self")
        recipients = await self._resolve_recipients(
            target, user_id, automation.get("group_id")
        )

        if not recipients:
            return {"success": False, "error": "No recipients resolved"}

        result = await self.tool_registry.execute(
            "notification_sender",
            user_ids=recipients,
            title=params.get("title", "Automation"),
            message=params.get("message", ""),
            notification_type="general",
            data={
                "source": "user_automation",
                "automation_id": automation.get("automation_id"),
                "automation_name": automation.get("name"),
            }
        )

        return result.model_dump()

    async def _action_send_email(
        self, params: Dict, user_id: str, automation: Dict
    ) -> Dict:
        """Send an email."""
        if not self.tool_registry:
            return {"success": False, "error": "Tool registry not available"}

        target = params.get("target", "self")
        recipients = await self._resolve_recipients(
            target, user_id, automation.get("group_id")
        )

        if not recipients:
            return {"success": False, "error": "No recipients resolved"}

        # Get email addresses
        emails = []
        if self.db is not None:
            users = await self.db.users.find(
                {"user_id": {"$in": recipients}},
                {"_id": 0, "email": 1}
            ).to_list(50)
            emails = [u["email"] for u in users if u.get("email")]

        if not emails:
            return {"success": False, "error": "No email addresses found"}

        result = await self.tool_registry.execute(
            "email_sender",
            to=emails,
            subject=params.get("subject", "ODDSIDE Automation"),
            body=params.get("body", ""),
        )

        return result.model_dump()

    async def _action_send_payment_reminder(
        self, params: Dict, user_id: str, event_data: Dict
    ) -> Dict:
        """Send payment reminders for debts owed to this user."""
        if not self.tool_registry or not self.db:
            return {"success": False, "error": "Tool registry and database required"}

        # Find pending ledger entries where this user is the creditor
        pending = await self.db.ledger_entries.find(
            {
                "to_user_id": user_id,
                "status": "pending",
            },
            {"_id": 0, "from_user_id": 1, "amount": 1, "game_id": 1}
        ).to_list(20)

        if not pending:
            return {"success": True, "message": "No pending payments to remind about"}

        urgency = params.get("urgency", "gentle")
        custom_message = params.get("custom_message")
        reminded = 0

        for entry in pending:
            from_id = entry.get("from_user_id")
            amount = entry.get("amount", 0)

            message = custom_message or (
                f"Friendly reminder: you owe ${amount:.2f}. "
                f"Settle up when you get a chance!"
            )

            result = await self.tool_registry.execute(
                "notification_sender",
                user_ids=[from_id],
                title="Payment Reminder",
                message=message,
                notification_type="reminder",
                data={
                    "source": "user_automation",
                    "amount": amount,
                    "urgency": urgency,
                }
            )

            if result.success:
                reminded += 1

        return {
            "success": True,
            "message": f"Reminded {reminded} people",
            "data": {"reminded": reminded, "total_pending": len(pending)},
        }

    async def _action_auto_rsvp(
        self, params: Dict, user_id: str, event_data: Dict
    ) -> Dict:
        """Auto-RSVP to a game."""
        if self.db is None:
            return {"success": False, "error": "Database not available"}

        game_id = event_data.get("game_id")
        if not game_id:
            return {"success": False, "error": "No game_id in event data"}

        response = params.get("response", "confirmed")

        # Update player's RSVP status
        result = await self.db.game_nights.update_one(
            {
                "game_id": game_id,
                "players.user_id": user_id,
            },
            {
                "$set": {
                    "players.$.rsvp_status": response,
                    "players.$.rsvp_at": datetime.now(timezone.utc).isoformat(),
                }
            }
        )

        if result.modified_count == 0:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "group_id": 1}
            )
            if not game:
                return {"success": False, "error": "Game not found"}

            await self.db.game_nights.update_one(
                {"game_id": game_id},
                {
                    "$push": {
                        "players": {
                            "user_id": user_id,
                            "rsvp_status": response,
                            "rsvp_at": datetime.now(timezone.utc).isoformat(),
                            "total_buy_in": 0,
                            "cash_out": None,
                        }
                    }
                }
            )

        return {
            "success": True,
            "message": f"Auto-RSVP: {response} for game {game_id}",
            "data": {"game_id": game_id, "response": response},
        }

    async def _action_create_game(
        self, params: Dict, user_id: str, automation: Dict
    ) -> Dict:
        """Create a game with preset configuration."""
        if not self.tool_registry:
            return {"success": False, "error": "Tool registry not available"}

        group_id = automation.get("group_id") or params.get("group_id")
        if not group_id:
            return {"success": False, "error": "group_id required to create game"}

        result = await self.tool_registry.execute(
            "game_manager",
            action="create_game",
            host_id=user_id,
            group_id=group_id,
            title=params.get("title", "Auto-created Game"),
            buy_in=params.get("buy_in", 20),
            max_players=params.get("max_players", 10),
            game_type=params.get("game_type", "poker"),
        )

        return result.model_dump()

    async def _action_generate_summary(
        self, params: Dict, user_id: str, event_data: Dict
    ) -> Dict:
        """Generate a game summary."""
        if not self.tool_registry:
            return {"success": False, "error": "Tool registry not available"}

        game_id = event_data.get("game_id")
        if not game_id:
            return {"success": False, "error": "No game_id in event data"}

        result = await self.tool_registry.execute(
            "report_generator",
            action="game_summary",
            game_id=game_id,
        )

        share_to = params.get("share_to", "self")
        if result.success and share_to == "group" and result.data:
            group_id = event_data.get("group_id")
            if group_id and self.db:
                import uuid as _uuid
                msg_id = f"gmsg_{_uuid.uuid4().hex[:12]}"
                summary_text = result.data.get("summary", str(result.data))

                await self.db.group_messages.insert_one({
                    "message_id": msg_id,
                    "group_id": group_id,
                    "user_id": "ai_assistant",
                    "content": summary_text,
                    "type": "ai",
                    "metadata": {
                        "source": "user_automation",
                        "game_id": game_id,
                    },
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "deleted": False,
                })

        return result.model_dump()

    # ==================== Condition Evaluation ====================

    def _evaluate_conditions(
        self, conditions: Dict, event_data: Dict
    ) -> tuple:
        """
        Evaluate conditions against event data.
        Returns (bool, str) — (met, detail_string).

        Supports operators:
        - eq, neq, gt, gte, lt, lte, in, not_in (original)
        - exists, not_exists (field presence)
        - contains, starts_with (string ops)
        - between (range check)
        - any_of (array intersection)
        """
        failed_conditions = []

        for field, condition in conditions.items():
            op = condition.get("op", "eq")
            expected = condition.get("value")
            actual = event_data.get(field)

            # Existence checks (don't need a value in event_data)
            if op == "exists":
                if field not in event_data or actual is None:
                    failed_conditions.append(f"{field}: expected to exist")
                continue
            if op == "not_exists":
                if field in event_data and actual is not None:
                    failed_conditions.append(f"{field}: expected not to exist")
                continue

            # All other ops require actual to be present
            if actual is None:
                failed_conditions.append(f"{field}: field missing from event")
                continue

            # Type coercion for numeric comparisons
            if op in ("gt", "gte", "lt", "lte", "between"):
                try:
                    actual = float(actual)
                    if op == "between":
                        expected = [float(v) for v in expected]
                    else:
                        expected = float(expected)
                except (ValueError, TypeError):
                    failed_conditions.append(
                        f"{field}: cannot compare non-numeric values"
                    )
                    continue

            if op == "eq" and actual != expected:
                failed_conditions.append(f"{field}: {actual} != {expected}")
            elif op == "neq" and actual == expected:
                failed_conditions.append(f"{field}: {actual} == {expected}")
            elif op == "gt" and not (actual > expected):
                failed_conditions.append(f"{field}: {actual} not > {expected}")
            elif op == "gte" and not (actual >= expected):
                failed_conditions.append(f"{field}: {actual} not >= {expected}")
            elif op == "lt" and not (actual < expected):
                failed_conditions.append(f"{field}: {actual} not < {expected}")
            elif op == "lte" and not (actual <= expected):
                failed_conditions.append(f"{field}: {actual} not <= {expected}")
            elif op == "in" and actual not in expected:
                failed_conditions.append(f"{field}: {actual} not in list")
            elif op == "not_in" and actual in expected:
                failed_conditions.append(f"{field}: {actual} is in excluded list")
            elif op == "contains":
                if not isinstance(actual, str) or expected not in actual:
                    failed_conditions.append(
                        f"{field}: does not contain '{expected}'"
                    )
            elif op == "starts_with":
                if not isinstance(actual, str) or not actual.startswith(expected):
                    failed_conditions.append(
                        f"{field}: does not start with '{expected}'"
                    )
            elif op == "between":
                if not (expected[0] <= actual <= expected[1]):
                    failed_conditions.append(
                        f"{field}: {actual} not between {expected[0]} and {expected[1]}"
                    )
            elif op == "any_of":
                # Check if any element in actual (list) matches expected (list)
                actual_set = set(actual) if isinstance(actual, list) else {actual}
                expected_set = set(expected) if isinstance(expected, list) else {expected}
                if not actual_set & expected_set:
                    failed_conditions.append(
                        f"{field}: no overlap with {expected}"
                    )

        met = len(failed_conditions) == 0
        detail = "; ".join(failed_conditions) if failed_conditions else "all_passed"
        return met, detail

    # ==================== Helper Methods ====================

    def _is_user_relevant(self, automation: Dict, event_data: Dict) -> bool:
        """Check if the automation owner is relevant to this event."""
        user_id = automation.get("user_id")
        if not user_id:
            return False

        relevant_fields = [
            "host_id", "from_user_id", "to_user_id",
            "player_id", "user_id",
        ]

        for field in relevant_fields:
            if event_data.get(field) == user_id:
                return True

        player_ids = event_data.get("player_ids", [])
        if user_id in player_ids:
            return True

        group_id = event_data.get("group_id")
        automation_group = automation.get("group_id")

        if automation_group and group_id and automation_group == group_id:
            return True

        if not automation_group and group_id:
            return True

        return False

    def _resolve_params(
        self, params: Dict, event_data: Dict, user_id: str
    ) -> Dict:
        """
        Resolve template variables in params.
        Supports {{variable}} syntax from event_data and {{user_id}}.
        """
        resolved = {}
        for key, value in params.items():
            if isinstance(value, str):
                resolved_value = value
                for var_name, var_value in event_data.items():
                    if isinstance(var_value, (str, int, float)):
                        resolved_value = resolved_value.replace(
                            f"{{{{{var_name}}}}}", str(var_value)
                        )
                resolved_value = resolved_value.replace("{{user_id}}", user_id)
                resolved[key] = resolved_value
            else:
                resolved[key] = value

        return resolved

    async def _resolve_recipients(
        self, target: str, user_id: str, group_id: str = None
    ) -> List[str]:
        """Resolve notification target to user IDs."""
        if target == "self":
            return [user_id]
        elif target == "host" and group_id and self.db:
            admins = await self.db.group_members.find(
                {"group_id": group_id, "role": "admin"},
                {"_id": 0, "user_id": 1}
            ).to_list(10)
            return [a["user_id"] for a in admins]
        elif target == "group" and group_id and self.db:
            members = await self.db.group_members.find(
                {"group_id": group_id},
                {"_id": 0, "user_id": 1}
            ).to_list(200)
            return [m["user_id"] for m in members]
        else:
            return [user_id]

    async def _increment_skip_count(self, automation_id: str):
        """Increment skip count and check for repeated-skip auto-disable."""
        if self.db is None:
            return

        await self.db.user_automations.update_one(
            {"automation_id": automation_id},
            {
                "$inc": {
                    "skip_count": 1,
                    "consecutive_skips": 1,
                },
            }
        )

        # Auto-disable if skipped too many times in 24h (likely misconfigured)
        auto = await self.db.user_automations.find_one(
            {"automation_id": automation_id},
            {"_id": 0, "consecutive_skips": 1}
        )
        if auto and auto.get("consecutive_skips", 0) >= 50:
            await self._auto_disable(
                automation_id,
                reason="Auto-disabled after 50 consecutive skips — likely misconfigured conditions.",
                disable_type="excessive_skips",
            )

    async def _auto_disable(
        self, automation_id: str, reason: str, disable_type: str = "error"
    ):
        """Auto-disable an automation with reason and user notification."""
        if self.db is None:
            return

        now = datetime.now(timezone.utc).isoformat()

        auto = await self.db.user_automations.find_one(
            {"automation_id": automation_id},
            {"_id": 0, "user_id": 1, "auto_disabled": 1}
        )
        if not auto or auto.get("auto_disabled"):
            return  # Already disabled

        user_id = auto.get("user_id")

        await self.db.user_automations.update_one(
            {"automation_id": automation_id},
            {
                "$set": {
                    "enabled": False,
                    "auto_disabled": True,
                    "auto_disabled_reason": reason,
                },
                "$push": {"events": {
                    "ts": now,
                    "actor": "system",
                    "action": "auto_disabled",
                    "details": {
                        "reason": reason,
                        "disable_type": disable_type,
                    },
                }}
            }
        )

        if self.tool_registry and user_id:
            await self.tool_registry.execute(
                "notification_sender",
                user_ids=[user_id],
                title="Automation Disabled",
                message=reason,
                notification_type="general",
                data={
                    "automation_id": automation_id,
                    "source": "automation_auto_disable",
                    "disable_type": disable_type,
                }
            )

        logger.warning(f"Automation {automation_id} auto-disabled: {reason}")

    async def _update_run_stats(
        self,
        automation_id: str,
        user_id: str,
        success: bool,
        run_id: str,
        now: str,
        event_id: str = None,
    ):
        """Update automation run statistics."""
        if self.db is None:
            return

        update = {
            "$set": {
                "last_run": now,
                "last_run_result": "success" if success else "failed",
                "last_event_id": event_id,
            },
            "$inc": {"run_count": 1},
        }

        if success:
            update["$set"]["consecutive_errors"] = 0
            update["$set"]["consecutive_skips"] = 0
        else:
            update["$inc"]["error_count"] = 1
            update["$inc"]["consecutive_errors"] = 1

        await self.db.user_automations.update_one(
            {"automation_id": automation_id},
            update
        )

        # Check for auto-disable on consecutive errors
        if not success:
            auto = await self.db.user_automations.find_one(
                {"automation_id": automation_id},
                {"_id": 0, "consecutive_errors": 1}
            )
            if auto and auto.get("consecutive_errors", 0) >= CONSECUTIVE_ERROR_THRESHOLD:
                await self._auto_disable(
                    automation_id,
                    reason=(
                        f"Auto-disabled after {CONSECUTIVE_ERROR_THRESHOLD} "
                        f"consecutive failures. Check your automation config."
                    ),
                    disable_type="consecutive_errors",
                )

    async def _log_run(
        self,
        automation_id: str,
        run_id: str,
        status: str,
        reason: str = None,
        action_results: List = None,
        event_data: Dict = None,
        event_id: str = None,
        event_type: str = None,
        correlation_id: str = None,
        causation_run_id: str = None,
        duration_ms: int = None,
        trigger_latency_ms: int = None,
        policy_result: str = None,
        policy_block_reason_enum: str = None,
        resolved_params: List = None,
        force_replay: bool = False,
        engine_version: str = None,
    ):
        """Log an automation run with full traceability."""
        if self.db is None:
            return

        log_entry = {
            "run_id": run_id,
            "automation_id": automation_id,
            "status": status,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        # Traceability fields
        if event_id:
            log_entry["event_id"] = event_id
        if event_type:
            log_entry["event_type"] = event_type
        if correlation_id:
            log_entry["correlation_id"] = correlation_id
        if causation_run_id:
            log_entry["causation_run_id"] = causation_run_id
        if duration_ms is not None:
            log_entry["duration_ms"] = duration_ms
        if trigger_latency_ms is not None:
            log_entry["trigger_latency_ms"] = trigger_latency_ms
        if policy_result:
            log_entry["policy_result"] = policy_result
        if policy_block_reason_enum:
            log_entry["policy_block_reason_enum"] = policy_block_reason_enum
        if resolved_params:
            log_entry["resolved_params"] = resolved_params
        if force_replay:
            log_entry["force_replay"] = True
        if engine_version:
            log_entry["engine_version"] = engine_version

        if reason:
            log_entry["reason"] = reason
        if action_results:
            log_entry["action_results"] = action_results
        if event_data:
            safe_fields = {
                "game_id", "group_id", "trigger_type",
                "amount", "days_overdue", "event_type",
            }
            log_entry["event_summary"] = {
                k: v for k, v in event_data.items()
                if k in safe_fields
            }

        await self.db.automation_runs.insert_one(log_entry)

    # ==================== Run History ====================

    async def _get_run_history(self, **kwargs) -> ToolResult:
        """Get recent run history for an automation."""
        automation_id = kwargs.get("automation_id")
        user_id = kwargs.get("user_id")

        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        if automation_id and user_id:
            auto = await self.db.user_automations.find_one(
                {"automation_id": automation_id, "user_id": user_id},
                {"_id": 0, "automation_id": 1}
            )
            if not auto:
                return ToolResult(success=False, error="Automation not found")

        query = {}
        if automation_id:
            query["automation_id"] = automation_id

        runs = await self.db.automation_runs.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).to_list(20)

        return ToolResult(
            success=True,
            data={"runs": runs, "count": len(runs)}
        )

    # ==================== Dry Run ====================

    async def _dry_run(self, **kwargs) -> ToolResult:
        """
        Simulate an automation execution without actually running actions.
        Useful for testing conditions.
        """
        automation_id = kwargs.get("automation_id")
        event_data = kwargs.get("event_data", {})

        if not automation_id or not self.db:
            return ToolResult(success=False, error="automation_id and database required")

        automation = await self.db.user_automations.find_one(
            {"automation_id": automation_id},
            {"_id": 0}
        )

        if not automation:
            return ToolResult(success=False, error="Automation not found")

        conditions = automation.get("conditions", {})
        if conditions:
            conditions_met, condition_details = self._evaluate_conditions(
                conditions, event_data
            )
        else:
            conditions_met = True
            condition_details = "no_conditions"

        actions_preview = []
        for action_config in automation.get("actions", []):
            resolved = self._resolve_params(
                action_config.get("params", {}),
                event_data,
                automation["user_id"]
            )
            actions_preview.append({
                "type": action_config["type"],
                "resolved_params": resolved,
            })

        return ToolResult(
            success=True,
            data={
                "automation_id": automation_id,
                "conditions_met": conditions_met,
                "condition_details": condition_details,
                "would_execute": conditions_met and automation.get("enabled", False),
                "actions_preview": actions_preview,
                "enabled": automation.get("enabled", False),
            },
            message=(
                f"Dry run: conditions {'met' if conditions_met else 'NOT met'}, "
                f"would {'execute' if conditions_met and automation.get('enabled') else 'skip'}"
            )
        )
