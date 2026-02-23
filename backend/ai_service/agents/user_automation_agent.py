"""
User Automation Agent (v2)

Autonomous agent that manages user-defined IFTTT-style automations.
Uses the full pipeline: Build → Validate → Policy → Execute → Measure.

Trigger Types:
1. Event-based: game_ended, game_created, payment_due, payment_overdue, etc.
2. Schedule-based: cron expressions (e.g., "every Friday at 5pm")
3. Condition-based: when amount > X, when days_overdue > Y

Actions:
- send_notification: Push notifications to self/group/host
- send_email: Email to self/group
- send_payment_reminder: Remind debtors
- auto_rsvp: Auto-confirm for new games
- create_game: Create games with preset config
- generate_summary: Auto-generate game summaries

Architecture:
- AutomationBuilderTool: CRUD + validation for automation configs
- AutomationRunnerTool: Execute workflows with action chains
- AutomationPolicyTool: Rate limiting, quiet hours, caps, membership checks
- user_automations collection: Automation configs with run stats
- automation_runs collection: Execution audit trail

Safety:
- Policy gating before every execution
- Consecutive error auto-disable (5 failures → disabled)
- Per-user, per-group, per-automation daily caps
- Action-specific rate limits
- Quiet hours enforcement
- No automation-to-automation chaining (prevents loops)
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseAgent, AgentResult

logger = logging.getLogger(__name__)


class UserAutomationAgent(BaseAgent):
    """
    Agent for managing and executing user-defined automations.

    Uses the Build → Validate → Policy → Execute → Measure pipeline
    to handle IFTTT-style automation workflows.
    """

    @property
    def name(self) -> str:
        return "user_automation"

    @property
    def description(self) -> str:
        return (
            "managing user-defined IFTTT-style automations including "
            "creating, editing, and executing automated workflows with "
            "event-based and schedule-based triggers. Supports actions like "
            "auto-RSVP, payment reminders, game creation, and notifications."
        )

    @property
    def capabilities(self) -> List[str]:
        return [
            "Create user-defined automations with event or schedule triggers",
            "Edit and delete existing automations",
            "Toggle automations on/off",
            "Validate automation configurations before creation",
            "Suggest pre-built automation templates",
            "Execute automations when triggers fire (event-driven)",
            "Execute scheduled automations (cron-based)",
            "Policy-gated execution (rate limits, quiet hours, caps)",
            "Auto-disable automations after consecutive failures",
            "Track execution history and run statistics",
            "Dry-run automations to preview behavior",
            "List available triggers and actions",
            "Get automation usage stats",
            "Process automation jobs from the queue",
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "automation_builder",
            "automation_runner",
            "automation_policy",
            "notification_sender",
        ]

    @property
    def input_schema(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "user_input": {
                    "type": "string",
                    "description": "The automation request"
                },
                "action": {
                    "type": "string",
                    "description": "Specific automation action to perform",
                    "enum": [
                        "create_automation",
                        "update_automation",
                        "delete_automation",
                        "get_automation",
                        "list_automations",
                        "toggle_automation",
                        "run_automation",
                        "trigger_automations",
                        "dry_run",
                        "get_run_history",
                        "list_triggers",
                        "list_actions",
                        "suggest_templates",
                        "get_usage_stats",
                        "process_job",
                        "run_scheduled",
                    ]
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID"
                },
                "automation_id": {
                    "type": "string",
                    "description": "Automation ID for specific operations"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID for group-scoped automations"
                },
                "name": {
                    "type": "string",
                    "description": "Automation name"
                },
                "description": {
                    "type": "string",
                    "description": "Automation description"
                },
                "trigger": {
                    "type": "object",
                    "description": "Trigger configuration"
                },
                "actions": {
                    "type": "array",
                    "description": "List of actions to execute"
                },
                "conditions": {
                    "type": "object",
                    "description": "Optional conditions to filter trigger"
                },
                "enabled": {
                    "type": "boolean",
                    "description": "Enable or disable state"
                },
                "trigger_type": {
                    "type": "string",
                    "description": "Trigger type for trigger_automations action"
                },
                "event_data": {
                    "type": "object",
                    "description": "Event data for trigger execution"
                },
                "event_id": {
                    "type": "string",
                    "description": "Unique event ID for idempotency"
                },
                "causation_run_id": {
                    "type": "string",
                    "description": "Run ID that caused this event (loop guard)"
                },
                "correlation_id": {
                    "type": "string",
                    "description": "Correlation ID to trace related events"
                },
            },
            "required": ["user_input"]
        }

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """Execute user automation tasks through the full pipeline."""
        context = context or {}
        steps_taken = []

        try:
            action = context.get("action") or self._parse_action(user_input)

            handlers = {
                "create_automation": self._create_automation,
                "update_automation": self._update_automation,
                "delete_automation": self._delete_automation,
                "get_automation": self._get_automation,
                "list_automations": self._list_automations,
                "toggle_automation": self._toggle_automation,
                "run_automation": self._run_automation,
                "trigger_automations": self._trigger_automations,
                "dry_run": self._dry_run,
                "get_run_history": self._get_run_history,
                "list_triggers": self._list_triggers,
                "list_actions": self._list_actions,
                "suggest_templates": self._suggest_templates,
                "get_usage_stats": self._get_usage_stats,
                "process_job": self._process_job,
                "run_scheduled": self._run_scheduled_automations,
            }

            handler = handlers.get(action)
            if handler:
                return await handler(context, steps_taken)
            else:
                return AgentResult(
                    success=False,
                    error="Unknown automation action",
                    message=f"Available actions: {', '.join(handlers.keys())}",
                    steps_taken=steps_taken
                )

        except Exception as e:
            logger.error(f"UserAutomationAgent error: {e}")
            return AgentResult(
                success=False,
                error=str(e),
                steps_taken=steps_taken
            )

    def _parse_action(self, user_input: str) -> str:
        """Parse action from natural language input."""
        input_lower = user_input.lower()

        if any(kw in input_lower for kw in [
            "create automation", "new automation", "set up automation",
            "add automation", "build automation",
        ]):
            return "create_automation"
        if any(kw in input_lower for kw in ["edit automation", "update automation", "change automation"]):
            return "update_automation"
        if any(kw in input_lower for kw in ["delete automation", "remove automation"]):
            return "delete_automation"
        if any(kw in input_lower for kw in ["list automation", "my automation", "show automation"]):
            return "list_automations"
        if any(kw in input_lower for kw in ["enable", "disable", "toggle", "turn on", "turn off"]):
            return "toggle_automation"
        if any(kw in input_lower for kw in ["run automation", "execute automation", "test automation"]):
            return "run_automation"
        if any(kw in input_lower for kw in ["dry run", "preview", "simulate"]):
            return "dry_run"
        if any(kw in input_lower for kw in ["history", "run log", "execution log"]):
            return "get_run_history"
        if any(kw in input_lower for kw in ["trigger", "available trigger"]):
            return "list_triggers"
        if any(kw in input_lower for kw in ["available action"]):
            return "list_actions"
        if any(kw in input_lower for kw in ["template", "suggest", "example", "preset"]):
            return "suggest_templates"
        if any(kw in input_lower for kw in ["usage", "stats", "limits"]):
            return "get_usage_stats"

        return "list_automations"

    # ==================== Create Automation ====================

    async def _create_automation(self, context: Dict, steps: List) -> AgentResult:
        """
        Full pipeline: Validate → Build → Confirm.
        """
        user_id = context.get("user_id")
        name = context.get("name", "")
        description = context.get("description", "")
        trigger = context.get("trigger", {})
        actions = context.get("actions", [])
        conditions = context.get("conditions", {})
        group_id = context.get("group_id")

        if not user_id:
            return AgentResult(
                success=False,
                error="user_id required",
                steps_taken=steps
            )

        # Step 1: VALIDATE
        validate_result = await self.call_tool(
            "automation_builder",
            action="validate",
            user_id=user_id,
            trigger=trigger,
            actions=actions,
            conditions=conditions,
        )
        steps.append({"step": "validate", "result": validate_result})

        if not validate_result.get("success"):
            return AgentResult(
                success=False,
                error=validate_result.get("error", "Validation failed"),
                data=validate_result.get("data"),
                steps_taken=steps
            )

        # Step 2: CHECK POLICY — can this user create more automations?
        policy_result = await self.call_tool(
            "automation_policy",
            action="get_usage_stats",
            user_id=user_id,
        )
        steps.append({"step": "policy_check", "result": policy_result})

        policy_data = policy_result.get("data", {})
        if policy_data.get("total_automations", 0) >= 20:
            return AgentResult(
                success=False,
                error="Automation limit reached (20 max). Delete unused automations first.",
                steps_taken=steps
            )

        # Step 2b: BUILD-TIME POLICY — permissions + cron constraints
        if group_id:
            build_policy = await self.call_tool(
                "automation_policy",
                action="check_build_policy",
                user_id=user_id,
                group_id=group_id,
                trigger=trigger,
                actions=actions,
            )
            steps.append({"step": "build_policy_check", "result": build_policy})

            build_data = build_policy.get("data", {})
            if not build_data.get("allowed", True):
                return AgentResult(
                    success=False,
                    error=f"Build policy blocked: {build_policy.get('error', 'Permission denied')}",
                    data={"policy_errors": build_data.get("errors", [])},
                    steps_taken=steps,
                )

        # Step 3: BUILD — create the automation
        create_result = await self.call_tool(
            "automation_builder",
            action="create",
            user_id=user_id,
            name=name,
            description=description,
            trigger=trigger,
            actions=actions,
            conditions=conditions,
            group_id=group_id,
        )
        steps.append({"step": "create", "result": create_result})

        if not create_result.get("success"):
            return AgentResult(
                success=False,
                error=create_result.get("error", "Failed to create automation"),
                steps_taken=steps
            )

        data = create_result.get("data", {})
        automation_id = data.get("automation_id")

        # Step 4: CONFIRM — notify user
        trigger_type = trigger.get("type", "unknown")
        action_count = len(actions)
        action_types = [a.get("type") for a in actions]

        await self.call_tool(
            "notification_sender",
            user_ids=[user_id],
            title="Automation Created",
            message=(
                f"'{name}' is now active! "
                f"Trigger: {trigger_type} → "
                f"{', '.join(action_types)}"
            ),
            notification_type="general",
            data={
                "automation_id": automation_id,
                "source": "user_automation_agent",
            }
        )
        steps.append({"step": "notify"})

        return AgentResult(
            success=True,
            data={
                "automation_id": automation_id,
                "name": name,
                "trigger_type": trigger_type,
                "action_count": action_count,
                "action_types": action_types,
                "enabled": True,
            },
            message=f"Automation '{name}' created: {trigger_type} → {', '.join(action_types)}",
            steps_taken=steps
        )

    # ==================== Update Automation ====================

    async def _update_automation(self, context: Dict, steps: List) -> AgentResult:
        """Update an existing automation."""
        user_id = context.get("user_id")
        automation_id = context.get("automation_id")

        if not user_id or not automation_id:
            return AgentResult(
                success=False,
                error="user_id and automation_id required",
                steps_taken=steps
            )

        # Validate if trigger/actions changed
        trigger = context.get("trigger")
        actions = context.get("actions")
        conditions = context.get("conditions")

        if trigger or actions:
            validate_args = {"action": "validate", "user_id": user_id}
            if trigger:
                validate_args["trigger"] = trigger
            if actions:
                validate_args["actions"] = actions
            if conditions:
                validate_args["conditions"] = conditions

            # Need existing config for fields not being updated
            get_result = await self.call_tool(
                "automation_builder",
                action="get",
                user_id=user_id,
                automation_id=automation_id,
            )
            if get_result.get("success") and get_result.get("data"):
                existing = get_result["data"]
                if not trigger:
                    validate_args["trigger"] = existing.get("trigger", {})
                if not actions:
                    validate_args["actions"] = existing.get("actions", [])

            validate_result = await self.call_tool(
                "automation_builder",
                **validate_args
            )
            steps.append({"step": "validate", "result": validate_result})

            if not validate_result.get("success"):
                return AgentResult(
                    success=False,
                    error=validate_result.get("error"),
                    steps_taken=steps
                )

        # Update
        update_kwargs = {
            "action": "update",
            "user_id": user_id,
            "automation_id": automation_id,
        }
        for field in ["name", "description", "trigger", "actions", "conditions", "group_id"]:
            if context.get(field) is not None:
                update_kwargs[field] = context[field]

        result = await self.call_tool("automation_builder", **update_kwargs)
        steps.append({"step": "update", "result": result})

        if not result.get("success"):
            return AgentResult(
                success=False,
                error=result.get("error"),
                steps_taken=steps
            )

        return AgentResult(
            success=True,
            data=result.get("data"),
            message=result.get("message", "Automation updated"),
            steps_taken=steps
        )

    # ==================== Delete Automation ====================

    async def _delete_automation(self, context: Dict, steps: List) -> AgentResult:
        """Delete an automation."""
        user_id = context.get("user_id")
        automation_id = context.get("automation_id")

        if not user_id or not automation_id:
            return AgentResult(
                success=False,
                error="user_id and automation_id required",
                steps_taken=steps
            )

        result = await self.call_tool(
            "automation_builder",
            action="delete",
            user_id=user_id,
            automation_id=automation_id,
        )
        steps.append({"step": "delete", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            error=result.get("error"),
            message=result.get("message", "Automation deleted"),
            steps_taken=steps
        )

    # ==================== Get Automation ====================

    async def _get_automation(self, context: Dict, steps: List) -> AgentResult:
        """Get a single automation with details."""
        user_id = context.get("user_id")
        automation_id = context.get("automation_id")

        if not user_id or not automation_id:
            return AgentResult(
                success=False,
                error="user_id and automation_id required",
                steps_taken=steps
            )

        result = await self.call_tool(
            "automation_builder",
            action="get",
            user_id=user_id,
            automation_id=automation_id,
        )
        steps.append({"step": "get", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            error=result.get("error"),
            steps_taken=steps
        )

    # ==================== List Automations ====================

    async def _list_automations(self, context: Dict, steps: List) -> AgentResult:
        """List all automations for a user."""
        user_id = context.get("user_id")
        group_id = context.get("group_id")

        if not user_id:
            return AgentResult(
                success=False,
                error="user_id required",
                steps_taken=steps
            )

        result = await self.call_tool(
            "automation_builder",
            action="list",
            user_id=user_id,
            group_id=group_id,
        )
        steps.append({"step": "list", "result": result})

        data = result.get("data", {})
        automations = data.get("automations", [])
        count = data.get("count", 0)

        # Build summary
        enabled_count = sum(1 for a in automations if a.get("enabled"))
        disabled_count = count - enabled_count
        auto_disabled = sum(1 for a in automations if a.get("auto_disabled"))

        summary_parts = [f"{count} automations"]
        if enabled_count > 0:
            summary_parts.append(f"{enabled_count} active")
        if disabled_count > 0:
            summary_parts.append(f"{disabled_count} disabled")
        if auto_disabled > 0:
            summary_parts.append(f"{auto_disabled} auto-disabled")

        return AgentResult(
            success=True,
            data=data,
            message=", ".join(summary_parts),
            steps_taken=steps
        )

    # ==================== Toggle Automation ====================

    async def _toggle_automation(self, context: Dict, steps: List) -> AgentResult:
        """Enable or disable an automation."""
        user_id = context.get("user_id")
        automation_id = context.get("automation_id")
        enabled = context.get("enabled")

        if not user_id or not automation_id or enabled is None:
            return AgentResult(
                success=False,
                error="user_id, automation_id, and enabled required",
                steps_taken=steps
            )

        result = await self.call_tool(
            "automation_builder",
            action="toggle",
            user_id=user_id,
            automation_id=automation_id,
            enabled=enabled,
        )
        steps.append({"step": "toggle", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            error=result.get("error"),
            message=result.get("message", f"Automation {'enabled' if enabled else 'disabled'}"),
            steps_taken=steps
        )

    # ==================== Run Automation (Manual) ====================

    async def _run_automation(self, context: Dict, steps: List) -> AgentResult:
        """Manually run a specific automation."""
        user_id = context.get("user_id")
        automation_id = context.get("automation_id")
        event_data = context.get("event_data", {})

        if not user_id or not automation_id:
            return AgentResult(
                success=False,
                error="user_id and automation_id required",
                steps_taken=steps
            )

        # Get automation config for policy check
        get_result = await self.call_tool(
            "automation_builder",
            action="get",
            user_id=user_id,
            automation_id=automation_id,
        )

        if not get_result.get("success"):
            return AgentResult(
                success=False,
                error="Automation not found",
                steps_taken=steps
            )

        automation = get_result.get("data", {})
        action_types = [a.get("type") for a in automation.get("actions", [])]

        # POLICY CHECK (pass full actions for permission matrix)
        policy_result = await self.call_tool(
            "automation_policy",
            action="check_policy",
            user_id=user_id,
            automation_id=automation_id,
            group_id=automation.get("group_id"),
            action_types=action_types,
            actions=automation.get("actions", []),
        )
        steps.append({"step": "policy_check", "result": policy_result})

        policy_data = policy_result.get("data", {})
        if not policy_data.get("allowed"):
            return AgentResult(
                success=False,
                error=f"Blocked by policy: {policy_data.get('blocked_reason')}",
                data={"policy_decision": policy_data},
                steps_taken=steps
            )

        # EXECUTE (pass idempotency fields from context)
        run_result = await self.call_tool(
            "automation_runner",
            action="run_automation",
            automation_id=automation_id,
            event_data=event_data,
            event_id=context.get("event_id"),
            causation_run_id=context.get("causation_run_id"),
            correlation_id=context.get("correlation_id"),
            force_replay=context.get("force_replay", False),
        )
        steps.append({"step": "run", "result": run_result})

        return AgentResult(
            success=run_result.get("success", False),
            data=run_result.get("data"),
            error=run_result.get("error"),
            message=run_result.get("message", "Automation executed"),
            steps_taken=steps
        )

    # ==================== Trigger Automations (Event-Driven) ====================

    async def _trigger_automations(self, context: Dict, steps: List) -> AgentResult:
        """
        Trigger all matching automations for an event.
        Called by EventListenerService when events fire.

        Full pipeline: Match → Dedupe → Policy → Execute → Measure
        """
        trigger_type = context.get("trigger_type")
        event_data = context.get("event_data", {})
        group_id = context.get("group_id") or event_data.get("group_id")
        event_id = context.get("event_id") or event_data.get("event_id")
        causation_run_id = context.get("causation_run_id")
        correlation_id = context.get("correlation_id")

        if not trigger_type:
            return AgentResult(
                success=False,
                error="trigger_type required",
                steps_taken=steps
            )

        # Step 1: FIND matching automations
        if not self.db:
            return AgentResult(
                success=False,
                error="Database not available",
                steps_taken=steps
            )

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

        matching = await self.db.user_automations.find(
            query, {"_id": 0}
        ).to_list(50)

        if not matching:
            return AgentResult(
                success=True,
                data={"matched": 0, "executed": 0},
                message=f"No automations matched trigger '{trigger_type}'",
                steps_taken=steps
            )

        steps.append({
            "step": "match",
            "matched": len(matching),
            "trigger_type": trigger_type,
        })

        # Step 2: POLICY + EXECUTE for each matching automation
        executed = 0
        succeeded = 0
        blocked = 0
        failed = 0
        results = []

        for automation in matching:
            automation_id = automation["automation_id"]
            user_id = automation["user_id"]
            action_types = [a.get("type") for a in automation.get("actions", [])]

            # Policy check per automation (pass full actions for permission matrix)
            policy_result = await self.call_tool(
                "automation_policy",
                action="check_policy",
                user_id=user_id,
                automation_id=automation_id,
                group_id=automation.get("group_id") or group_id,
                action_types=action_types,
                actions=automation.get("actions", []),
            )

            policy_data = policy_result.get("data", {})
            if not policy_data.get("allowed"):
                blocked += 1
                results.append({
                    "automation_id": automation_id,
                    "name": automation.get("name"),
                    "status": "blocked",
                    "reason": policy_data.get("blocked_reason"),
                    "blocked_check": policy_data.get("blocked_check"),
                })
                continue

            # Execute (pass idempotency + loop guard fields)
            run_result = await self.call_tool(
                "automation_runner",
                action="run_automation",
                automation_id=automation_id,
                event_data=event_data,
                event_id=event_id,
                causation_run_id=causation_run_id,
                correlation_id=correlation_id,
            )

            executed += 1
            run_data = run_result.get("data", {})
            run_success = run_result.get("success", False)
            was_skipped = run_data.get("skipped", False)

            if run_success and not was_skipped:
                succeeded += 1
            elif not run_success:
                failed += 1

            results.append({
                "automation_id": automation_id,
                "name": automation.get("name"),
                "status": "success" if (run_success and not was_skipped) else ("skipped" if was_skipped else "failed"),
                "skip_reason": run_data.get("reason") if was_skipped else None,
                "blocked_check": policy_data.get("blocked_check") if not policy_data.get("allowed") else None,
                "error": run_result.get("error") if not run_success else None,
            })

        return AgentResult(
            success=True,
            data={
                "trigger_type": trigger_type,
                "matched": len(matching),
                "executed": executed,
                "succeeded": succeeded,
                "blocked": blocked,
                "failed": failed,
                "results": results,
            },
            message=(
                f"Trigger '{trigger_type}': {len(matching)} matched, "
                f"{executed} executed ({succeeded} ok, {failed} failed, "
                f"{blocked} blocked)"
            ),
            steps_taken=steps
        )

    # ==================== Dry Run ====================

    async def _dry_run(self, context: Dict, steps: List) -> AgentResult:
        """Dry-run an automation to preview behavior."""
        automation_id = context.get("automation_id")
        event_data = context.get("event_data", {})

        if not automation_id:
            return AgentResult(
                success=False,
                error="automation_id required",
                steps_taken=steps
            )

        result = await self.call_tool(
            "automation_runner",
            action="dry_run",
            automation_id=automation_id,
            event_data=event_data,
        )
        steps.append({"step": "dry_run", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message=result.get("message"),
            steps_taken=steps
        )

    # ==================== Run History ====================

    async def _get_run_history(self, context: Dict, steps: List) -> AgentResult:
        """Get execution history for an automation."""
        user_id = context.get("user_id")
        automation_id = context.get("automation_id")

        result = await self.call_tool(
            "automation_runner",
            action="get_run_history",
            automation_id=automation_id,
            user_id=user_id,
        )
        steps.append({"step": "get_history", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message=f"{result.get('data', {}).get('count', 0)} runs found",
            steps_taken=steps
        )

    # ==================== List Triggers/Actions ====================

    async def _list_triggers(self, context: Dict, steps: List) -> AgentResult:
        """List all available trigger types."""
        result = await self.call_tool(
            "automation_builder",
            action="list_triggers",
            user_id=context.get("user_id", "system"),
        )
        steps.append({"step": "list_triggers", "result": result})

        return AgentResult(
            success=True,
            data=result.get("data"),
            message=f"{result.get('data', {}).get('count', 0)} trigger types available",
            steps_taken=steps
        )

    async def _list_actions(self, context: Dict, steps: List) -> AgentResult:
        """List all available action types."""
        result = await self.call_tool(
            "automation_builder",
            action="list_actions",
            user_id=context.get("user_id", "system"),
        )
        steps.append({"step": "list_actions", "result": result})

        return AgentResult(
            success=True,
            data=result.get("data"),
            message=f"{result.get('data', {}).get('count', 0)} action types available",
            steps_taken=steps
        )

    # ==================== Suggest Templates ====================

    async def _suggest_templates(self, context: Dict, steps: List) -> AgentResult:
        """Suggest pre-built automation templates."""
        result = await self.call_tool(
            "automation_builder",
            action="suggest_templates",
            user_id=context.get("user_id", "system"),
        )
        steps.append({"step": "suggest_templates", "result": result})

        templates = result.get("data", {}).get("templates", [])

        return AgentResult(
            success=True,
            data=result.get("data"),
            message=f"{len(templates)} automation templates available",
            steps_taken=steps
        )

    # ==================== Usage Stats ====================

    async def _get_usage_stats(self, context: Dict, steps: List) -> AgentResult:
        """Get automation usage statistics."""
        user_id = context.get("user_id")

        if not user_id:
            return AgentResult(
                success=False,
                error="user_id required",
                steps_taken=steps
            )

        result = await self.call_tool(
            "automation_policy",
            action="get_usage_stats",
            user_id=user_id,
        )
        steps.append({"step": "usage_stats", "result": result})

        data = result.get("data", {})

        lines = ["Automation Usage:"]
        lines.append(
            f"  Automations: {data.get('total_automations', 0)}/"
            f"{data.get('max_automations', 20)} "
            f"({data.get('enabled', 0)} active)"
        )
        if data.get("auto_disabled", 0) > 0:
            lines.append(f"  Auto-disabled: {data['auto_disabled']}")
        lines.append(
            f"  Today's runs: {data.get('today_executions', 0)}/"
            f"{data.get('max_daily_executions', 50)}"
        )
        lines.append(f"  All-time runs: {data.get('total_runs_all_time', 0)}")

        return AgentResult(
            success=True,
            data=data,
            message="\n".join(lines),
            steps_taken=steps
        )

    # ==================== Scheduled Automations ====================

    async def _run_scheduled_automations(self, context: Dict, steps: List) -> AgentResult:
        """
        Run all schedule-based automations that are due.
        Called by the scheduler/cron job.
        """
        if not self.db:
            return AgentResult(
                success=False,
                error="Database not available",
                steps_taken=steps
            )

        # Find all enabled schedule-based automations
        scheduled = await self.db.user_automations.find(
            {
                "trigger.type": "schedule",
                "enabled": True,
                "auto_disabled": {"$ne": True},
            },
            {"_id": 0}
        ).to_list(100)

        if not scheduled:
            return AgentResult(
                success=True,
                data={"found": 0, "executed": 0},
                message="No scheduled automations found",
                steps_taken=steps
            )

        executed = 0
        succeeded = 0
        blocked = 0
        failed = 0

        for automation in scheduled:
            automation_id = automation["automation_id"]
            user_id = automation["user_id"]
            action_types = [a.get("type") for a in automation.get("actions", [])]

            # Check if it should run now based on cron schedule
            # (simplified — in production this would use APScheduler)
            if not self._should_run_now(automation):
                continue

            # Policy check
            policy_result = await self.call_tool(
                "automation_policy",
                action="check_policy",
                user_id=user_id,
                automation_id=automation_id,
                group_id=automation.get("group_id"),
                action_types=action_types,
            )

            if not policy_result.get("data", {}).get("allowed"):
                blocked += 1
                continue

            # Execute (generate unique event_id for each scheduled run)
            import uuid as _uuid
            sched_event_id = f"sched_{_uuid.uuid4().hex[:12]}"
            run_result = await self.call_tool(
                "automation_runner",
                action="run_automation",
                automation_id=automation_id,
                event_data={"trigger_type": "schedule"},
                event_id=sched_event_id,
            )

            executed += 1
            if run_result.get("success"):
                succeeded += 1
            else:
                failed += 1

        return AgentResult(
            success=True,
            data={
                "total_scheduled": len(scheduled),
                "executed": executed,
                "succeeded": succeeded,
                "blocked": blocked,
                "failed": failed,
            },
            message=(
                f"Scheduled automations: {executed} executed "
                f"({succeeded} ok, {failed} failed, {blocked} blocked)"
            ),
            steps_taken=steps
        )

    def _should_run_now(self, automation: Dict) -> bool:
        """
        Check if a schedule-based automation should run now.
        Simple check: if it hasn't run in the last cooldown period.
        Respects the automation's stored timezone for schedule evaluation.
        Full cron evaluation would use APScheduler in production.
        """
        last_run = automation.get("last_run")
        if not last_run:
            return True

        if isinstance(last_run, str):
            last_run_dt = datetime.fromisoformat(last_run.replace("Z", "+00:00"))
        else:
            last_run_dt = last_run

        # Use the automation's timezone snapshot for schedule evaluation
        user_tz = automation.get("timezone")
        now = datetime.now(timezone.utc)

        if user_tz:
            try:
                from zoneinfo import ZoneInfo
                user_zone = ZoneInfo(user_tz)
                now_local = now.astimezone(user_zone)
                last_run_local = last_run_dt.astimezone(user_zone)
                # Check if it hasn't run in the current local-time hour
                return (now_local - last_run_local) > timedelta(hours=1)
            except (ImportError, KeyError):
                pass

        return (now - last_run_dt) > timedelta(hours=1)

    # ==================== Job Queue Processing ====================

    async def _process_job(self, context: Dict, steps: List) -> AgentResult:
        """Process a job from the queue."""
        job = context.get("job", {})
        job_type = job.get("job_type", context.get("job_type"))

        job_handlers = {
            "trigger": lambda: self._trigger_automations(
                {
                    "trigger_type": job.get("trigger_type", context.get("trigger_type")),
                    "event_data": job.get("event_data", context.get("event_data", {})),
                    "group_id": job.get("group_id", context.get("group_id")),
                },
                steps
            ),
            "run_scheduled": lambda: self._run_scheduled_automations(context, steps),
            "run_automation": lambda: self._run_automation(
                {
                    "user_id": job.get("user_id", context.get("user_id")),
                    "automation_id": job.get("automation_id", context.get("automation_id")),
                    "event_data": job.get("event_data", {}),
                },
                steps
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
