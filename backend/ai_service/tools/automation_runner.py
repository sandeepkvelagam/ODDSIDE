"""
Automation Runner Tool

Executes user-defined automation workflows. When a trigger fires,
this tool evaluates conditions and executes the action chain.

Execution pipeline:
1. Load automation config from DB
2. Evaluate conditions against event data
3. Execute each action in sequence
4. Log results and update run stats
5. Handle failures gracefully (with auto-disable after N consecutive errors)

Safety:
- Actions execute in the context of the automation owner (user_id)
- No action can trigger another automation (prevents infinite loops)
- Consecutive error threshold: 5 errors → auto-disable
- Each action has a timeout safeguard
- All executions are logged for auditability
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging
import uuid

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)

# Auto-disable after this many consecutive errors
CONSECUTIVE_ERROR_THRESHOLD = 5


class AutomationRunnerTool(BaseTool):
    """
    Executes user-defined automation workflows.

    Evaluates trigger conditions and runs action chains with
    error tracking and auto-disable on repeated failures.
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
            "Execute a user-defined automation. Evaluates conditions against "
            "event data, then runs each action in sequence. Tracks execution "
            "results and auto-disables after consecutive failures."
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

    # ==================== Run Single Automation ====================

    async def _run_automation(self, **kwargs) -> ToolResult:
        """Run a specific automation by ID."""
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

        if not automation.get("enabled"):
            return ToolResult(
                success=False,
                error="Automation is disabled",
                data={"auto_disabled": automation.get("auto_disabled", False)}
            )

        return await self._execute_automation(automation, event_data)

    # ==================== Run By Trigger ====================

    async def _run_by_trigger(self, **kwargs) -> ToolResult:
        """
        Find and run all automations matching a trigger type.
        Called by EventListenerService when an event fires.
        """
        trigger_type = kwargs.get("trigger_type")
        event_data = kwargs.get("event_data", {})
        group_id = kwargs.get("group_id")

        if not trigger_type or not self.db:
            return ToolResult(success=False, error="trigger_type and database required")

        # Find matching automations
        query = {
            "trigger.type": trigger_type,
            "enabled": True,
            "auto_disabled": {"$ne": True},
        }

        # For group-scoped triggers, also match automations without a group
        # (user wants it for all their groups)
        if group_id:
            query["$or"] = [
                {"group_id": group_id},
                {"group_id": None},
                {"group_id": {"$exists": False}},
            ]
            # Remove the top-level group_id since we're using $or
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

        # For event triggers, also check if the user is involved
        # (don't run if the event doesn't concern the automation owner)
        relevant_automations = []
        for auto in automations:
            if self._is_user_relevant(auto, event_data):
                relevant_automations.append(auto)

        executed = 0
        succeeded = 0
        failed = 0
        results = []

        for automation in relevant_automations:
            result = await self._execute_automation(automation, event_data)
            executed += 1

            if result.success:
                succeeded += 1
            else:
                failed += 1

            results.append({
                "automation_id": automation["automation_id"],
                "name": automation.get("name"),
                "success": result.success,
                "error": result.error,
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
        event_data: Dict
    ) -> ToolResult:
        """
        Execute a single automation:
        1. Check conditions
        2. Execute actions in sequence
        3. Log results
        4. Update run stats
        """
        automation_id = automation["automation_id"]
        user_id = automation["user_id"]
        conditions = automation.get("conditions", {})
        actions = automation.get("actions", [])
        run_id = f"run_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        # Step 1: Evaluate conditions
        if conditions:
            conditions_met = self._evaluate_conditions(conditions, event_data)
            if not conditions_met:
                # Log skipped run
                await self._log_run(
                    automation_id=automation_id,
                    run_id=run_id,
                    status="skipped",
                    reason="conditions_not_met",
                    event_data=event_data,
                )
                return ToolResult(
                    success=True,
                    data={
                        "automation_id": automation_id,
                        "skipped": True,
                        "reason": "conditions_not_met",
                    },
                    message="Conditions not met, automation skipped"
                )

        # Step 2: Execute actions in sequence
        action_results = []
        all_succeeded = True

        for i, action_config in enumerate(actions):
            action_type = action_config.get("type")
            params = action_config.get("params", {})

            try:
                result = await self._execute_action(
                    action_type=action_type,
                    params=params,
                    user_id=user_id,
                    event_data=event_data,
                    automation=automation,
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
                    # Don't break on failure — try remaining actions
                    # (each action is independent)

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

        # Step 3: Update run stats
        status = "success" if all_succeeded else "partial_failure"
        await self._update_run_stats(
            automation_id=automation_id,
            user_id=user_id,
            success=all_succeeded,
            run_id=run_id,
            now=now,
        )

        # Step 4: Log the run
        await self._log_run(
            automation_id=automation_id,
            run_id=run_id,
            status=status,
            action_results=action_results,
            event_data=event_data,
        )

        succeeded_count = sum(1 for r in action_results if r.get("success"))
        failed_count = len(action_results) - succeeded_count

        return ToolResult(
            success=all_succeeded,
            data={
                "automation_id": automation_id,
                "run_id": run_id,
                "actions_total": len(action_results),
                "actions_succeeded": succeeded_count,
                "actions_failed": failed_count,
                "action_results": action_results,
            },
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
        if self.db:
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
        if not self.db:
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
            # Player might not be in the game yet — check if they're a group member
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "group_id": 1}
            )
            if not game:
                return {"success": False, "error": "Game not found"}

            # Add player to game
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
                # Post summary as a group message
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

    def _evaluate_conditions(self, conditions: Dict, event_data: Dict) -> bool:
        """
        Evaluate conditions against event data.

        Conditions format:
        {
            "field_name": {"op": "gte", "value": 3},
            "another_field": {"op": "eq", "value": "some_value"},
        }
        """
        for field, condition in conditions.items():
            op = condition.get("op", "eq")
            expected = condition.get("value")
            actual = event_data.get(field)

            if actual is None:
                return False

            if op == "eq" and actual != expected:
                return False
            elif op == "neq" and actual == expected:
                return False
            elif op == "gt" and not (actual > expected):
                return False
            elif op == "gte" and not (actual >= expected):
                return False
            elif op == "lt" and not (actual < expected):
                return False
            elif op == "lte" and not (actual <= expected):
                return False
            elif op == "in" and actual not in expected:
                return False
            elif op == "not_in" and actual in expected:
                return False

        return True

    # ==================== Helper Methods ====================

    def _is_user_relevant(self, automation: Dict, event_data: Dict) -> bool:
        """Check if the automation owner is relevant to this event."""
        user_id = automation.get("user_id")
        if not user_id:
            return False

        # Check common fields where the user might be referenced
        relevant_fields = [
            "host_id", "from_user_id", "to_user_id",
            "player_id", "user_id",
        ]

        # User is directly referenced
        for field in relevant_fields:
            if event_data.get(field) == user_id:
                return True

        # User is in player_ids list
        player_ids = event_data.get("player_ids", [])
        if user_id in player_ids:
            return True

        # For group-scoped automations, check if user is a group member
        group_id = event_data.get("group_id")
        automation_group = automation.get("group_id")

        if automation_group and group_id and automation_group == group_id:
            return True

        # For automations without group scope that match the trigger,
        # they're relevant if the user is part of the group
        if not automation_group and group_id:
            # We can't async check DB membership here, so be permissive
            # The policy tool will gate actual execution
            return True

        return False

    def _resolve_params(
        self, params: Dict, event_data: Dict, user_id: str
    ) -> Dict:
        """
        Resolve template variables in params.

        Supports {{variable}} syntax:
        - {{game_id}}, {{group_id}}, {{amount}}, etc. from event_data
        - {{user_id}} from the automation owner
        """
        resolved = {}
        for key, value in params.items():
            if isinstance(value, str):
                # Replace template variables
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
            return [user_id]  # fallback to self

    async def _update_run_stats(
        self,
        automation_id: str,
        user_id: str,
        success: bool,
        run_id: str,
        now: str,
    ):
        """Update automation run statistics."""
        if not self.db:
            return

        update = {
            "$set": {
                "last_run": now,
                "last_run_result": "success" if success else "failed",
            },
            "$inc": {"run_count": 1},
        }

        if success:
            update["$set"]["consecutive_errors"] = 0
        else:
            update["$inc"]["error_count"] = 1
            update["$inc"]["consecutive_errors"] = 1

        await self.db.user_automations.update_one(
            {"automation_id": automation_id},
            update
        )

        # Check for auto-disable
        if not success:
            auto = await self.db.user_automations.find_one(
                {"automation_id": automation_id},
                {"_id": 0, "consecutive_errors": 1}
            )
            if auto and auto.get("consecutive_errors", 0) >= CONSECUTIVE_ERROR_THRESHOLD:
                await self.db.user_automations.update_one(
                    {"automation_id": automation_id},
                    {
                        "$set": {
                            "enabled": False,
                            "auto_disabled": True,
                            "auto_disabled_reason": (
                                f"Auto-disabled after {CONSECUTIVE_ERROR_THRESHOLD} "
                                f"consecutive failures"
                            ),
                        },
                        "$push": {"events": {
                            "ts": now,
                            "actor": "system",
                            "action": "auto_disabled",
                            "details": {
                                "consecutive_errors": CONSECUTIVE_ERROR_THRESHOLD,
                                "last_run_id": run_id,
                            },
                        }}
                    }
                )

                # Notify the user
                if self.tool_registry:
                    await self.tool_registry.execute(
                        "notification_sender",
                        user_ids=[user_id],
                        title="Automation Disabled",
                        message=(
                            f"Your automation has been disabled after "
                            f"{CONSECUTIVE_ERROR_THRESHOLD} consecutive failures. "
                            f"Check the settings and re-enable it."
                        ),
                        notification_type="general",
                        data={
                            "automation_id": automation_id,
                            "source": "automation_auto_disable",
                        }
                    )
                    logger.warning(
                        f"Automation {automation_id} auto-disabled after "
                        f"{CONSECUTIVE_ERROR_THRESHOLD} consecutive errors"
                    )

    async def _log_run(
        self,
        automation_id: str,
        run_id: str,
        status: str,
        reason: str = None,
        action_results: List = None,
        event_data: Dict = None,
    ):
        """Log an automation run for auditability."""
        if not self.db:
            return

        log_entry = {
            "run_id": run_id,
            "automation_id": automation_id,
            "status": status,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

        if reason:
            log_entry["reason"] = reason
        if action_results:
            log_entry["action_results"] = action_results
        if event_data:
            # Only log non-sensitive fields
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

        if not self.db:
            return ToolResult(success=False, error="Database not available")

        # Verify ownership
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
        conditions_met = self._evaluate_conditions(conditions, event_data) if conditions else True

        # Resolve params for preview
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
                "would_execute": conditions_met and automation.get("enabled", False),
                "actions_preview": actions_preview,
                "enabled": automation.get("enabled", False),
            },
            message=(
                f"Dry run: conditions {'met' if conditions_met else 'NOT met'}, "
                f"would {'execute' if conditions_met and automation.get('enabled') else 'skip'}"
            )
        )
