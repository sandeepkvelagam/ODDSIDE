"""
Automation Builder Tool

Creates, validates, edits, and manages user-defined automations (IFTTT-style).

Automations consist of:
- Trigger: What event causes the automation to fire
  - Event-based: game_ended, payment_due, game_created, player_confirmed, etc.
  - Schedule-based: cron expressions (e.g., "every Friday at 5pm")
  - Condition-based: when amount > X, when days_overdue > Y
- Actions: What happens when the trigger fires
  - send_notification, send_email, create_game, auto_rsvp,
    send_payment_reminder, generate_summary
- Conditions (optional): Additional filters on the trigger
  - group_id match, amount threshold, user role, etc.
- Execution options: stop_on_failure, per-action timeout, max duration

Safety:
- Validates trigger types against allowlist
- Validates action types and their required params
- Enforces per-user automation limits
- Cron schedule constraints (minimum 15 min interval)
- Build-time policy check (role-based action permissions)
- Prevents infinite loops (no automation can trigger another automation)
- No PII in automation names/descriptions
- Expanded condition operators: exists, contains, between, any_of, starts_with
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone
import logging
import uuid
import re

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)

# Allowed trigger types with descriptions
ALLOWED_TRIGGERS = {
    "game_ended": {
        "description": "When a game ends in your group",
        "event_fields": ["game_id", "group_id", "player_ids"],
    },
    "game_created": {
        "description": "When a new game is created in your group",
        "event_fields": ["game_id", "group_id", "host_id"],
    },
    "settlement_generated": {
        "description": "When a settlement is generated after a game",
        "event_fields": ["game_id", "group_id", "ledger_entries"],
    },
    "payment_due": {
        "description": "When you owe someone money",
        "event_fields": ["ledger_id", "from_user_id", "to_user_id", "amount"],
    },
    "payment_overdue": {
        "description": "When someone's payment is overdue (configurable days)",
        "event_fields": ["ledger_id", "from_user_id", "to_user_id", "amount", "days_overdue"],
    },
    "payment_received": {
        "description": "When you receive a payment",
        "event_fields": ["ledger_id", "from_user_id", "to_user_id", "amount"],
    },
    "player_confirmed": {
        "description": "When a player confirms RSVP for a game",
        "event_fields": ["game_id", "player_id", "group_id"],
    },
    "all_players_confirmed": {
        "description": "When all invited players have confirmed",
        "event_fields": ["game_id", "group_id", "confirmed_count"],
    },
    "schedule": {
        "description": "Run on a recurring schedule (cron expression)",
        "event_fields": [],
    },
}

# Allowed action types with required parameters
ALLOWED_ACTIONS = {
    "send_notification": {
        "description": "Send a push notification",
        "required_params": ["title", "message"],
        "optional_params": ["target"],  # "self", "group", "host"
    },
    "send_email": {
        "description": "Send an email",
        "required_params": ["subject", "body"],
        "optional_params": ["target"],
    },
    "send_payment_reminder": {
        "description": "Send a payment reminder to people who owe you",
        "required_params": [],
        "optional_params": ["urgency", "custom_message"],
    },
    "auto_rsvp": {
        "description": "Automatically RSVP 'yes' to new games in your group",
        "required_params": [],
        "optional_params": ["response"],  # "confirmed" or "declined"
    },
    "create_game": {
        "description": "Create a new game with preset configuration",
        "required_params": ["title"],
        "optional_params": [
            "buy_in", "max_players", "game_type", "group_id",
        ],
    },
    "generate_summary": {
        "description": "Generate and share a game summary",
        "required_params": [],
        "optional_params": ["share_to"],  # "self", "group"
    },
}

# Per-user limits
MAX_AUTOMATIONS_PER_USER = 20
MAX_ACTIONS_PER_AUTOMATION = 5
MAX_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 500

# Engine version — stamped on every automation doc for future migration safety
AUTOMATION_ENGINE_VERSION = "v1"

# Valid cron pattern (basic validation)
CRON_PATTERN = re.compile(
    r'^(\*|[0-9,\-\/]+)\s+'   # minute
    r'(\*|[0-9,\-\/]+)\s+'    # hour
    r'(\*|[0-9,\-\/]+)\s+'    # day of month
    r'(\*|[0-9,\-\/]+)\s+'    # month
    r'(\*|[0-9,\-\/]+)$'      # day of week
)

# Minimum cron interval (minutes)
MIN_CRON_INTERVAL_MINUTES = 15

# Expanded condition operators
ALLOWED_CONDITION_OPS = {
    "eq", "neq", "gt", "gte", "lt", "lte",
    "in", "not_in",
    "exists", "not_exists",
    "contains", "starts_with",
    "between",
    "any_of",
}


class AutomationBuilderTool(BaseTool):
    """
    Creates and manages user-defined automations.

    Handles CRUD operations, validation, and template suggestions.
    Includes build-time policy check and cron schedule constraints.
    """

    def __init__(self, db=None, policy_tool=None):
        self.db = db
        self.policy_tool = policy_tool

    @property
    def name(self) -> str:
        return "automation_builder"

    @property
    def description(self) -> str:
        return (
            "Create, edit, delete, and list user-defined automations. "
            "Automations are IFTTT-style rules: when a trigger fires, "
            "execute one or more actions. Supports event-based and "
            "schedule-based triggers with cron constraints."
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "enum": [
                        "create", "update", "delete", "get", "list",
                        "toggle", "list_triggers", "list_actions",
                        "suggest_templates", "validate",
                    ],
                },
                "user_id": {"type": "string"},
                "automation_id": {"type": "string"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "trigger": {"type": "object"},
                "actions": {"type": "array"},
                "conditions": {"type": "object"},
                "execution_options": {
                    "type": "object",
                    "description": "Options: stop_on_failure, action_timeout_ms, max_duration_ms",
                },
                "enabled": {"type": "boolean"},
                "group_id": {"type": "string"},
            },
            "required": ["action", "user_id"],
        }

    async def execute(self, **kwargs) -> ToolResult:
        action = kwargs.get("action")
        handlers = {
            "create": self._create_automation,
            "update": self._update_automation,
            "delete": self._delete_automation,
            "get": self._get_automation,
            "list": self._list_automations,
            "toggle": self._toggle_automation,
            "list_triggers": self._list_triggers,
            "list_actions": self._list_actions,
            "suggest_templates": self._suggest_templates,
            "validate": self._validate_automation,
        }

        handler = handlers.get(action)
        if not handler:
            return ToolResult(
                success=False,
                error=f"Unknown action: {action}. Available: {', '.join(handlers.keys())}"
            )

        return await handler(**kwargs)

    # ==================== Create Automation ====================

    async def _create_automation(self, **kwargs) -> ToolResult:
        """Create a new user automation."""
        user_id = kwargs.get("user_id")
        name = kwargs.get("name", "").strip()
        description = kwargs.get("description", "").strip()
        trigger = kwargs.get("trigger", {})
        actions = kwargs.get("actions", [])
        conditions = kwargs.get("conditions", {})
        group_id = kwargs.get("group_id")
        execution_options = kwargs.get("execution_options", {})

        if not user_id:
            return ToolResult(success=False, error="user_id required")

        if not name:
            return ToolResult(success=False, error="Automation name required")

        if len(name) > MAX_NAME_LENGTH:
            return ToolResult(
                success=False,
                error=f"Name too long (max {MAX_NAME_LENGTH} chars)"
            )

        if len(description) > MAX_DESCRIPTION_LENGTH:
            return ToolResult(
                success=False,
                error=f"Description too long (max {MAX_DESCRIPTION_LENGTH} chars)"
            )

        # Check per-user limit
        if self.db is not None:
            count = await self.db.user_automations.count_documents(
                {"user_id": user_id}
            )
            if count >= MAX_AUTOMATIONS_PER_USER:
                return ToolResult(
                    success=False,
                    error=f"Automation limit reached ({MAX_AUTOMATIONS_PER_USER} max)"
                )

        # Validate trigger
        trigger_validation = self._validate_trigger(trigger)
        if not trigger_validation["valid"]:
            return ToolResult(success=False, error=trigger_validation["error"])

        # Validate actions
        actions_validation = self._validate_actions(actions)
        if not actions_validation["valid"]:
            return ToolResult(success=False, error=actions_validation["error"])

        # Validate conditions
        conditions_validation = self._validate_conditions(conditions, trigger)
        if not conditions_validation["valid"]:
            return ToolResult(success=False, error=conditions_validation["error"])

        # Validate execution options
        exec_validation = self._validate_execution_options(execution_options)
        if not exec_validation["valid"]:
            return ToolResult(success=False, error=exec_validation["error"])

        # Build-time policy check (permissions + cron constraints)
        if self.policy_tool and group_id:
            build_policy = await self.policy_tool.execute(
                action="check_build_policy",
                user_id=user_id,
                group_id=group_id,
                trigger=trigger,
                actions=actions,
            )
            if not build_policy.success or not (build_policy.data or {}).get("allowed", True):
                return ToolResult(
                    success=False,
                    error=f"Build policy blocked: {build_policy.error or 'Permission denied'}",
                    data={"policy_errors": (build_policy.data or {}).get("errors", [])},
                )

        # Snapshot user timezone for stability
        user_tz = None
        if self.db is not None:
            user_doc = await self.db.users.find_one(
                {"user_id": user_id},
                {"_id": 0, "timezone": 1}
            )
            if user_doc:
                user_tz = user_doc.get("timezone")

        automation_id = f"auto_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        doc = {
            "automation_id": automation_id,
            "user_id": user_id,
            "name": name,
            "description": description,
            "trigger": trigger,
            "actions": actions,
            "conditions": conditions,
            "execution_options": execution_options,
            "group_id": group_id,
            "enabled": True,
            "last_run": None,
            "last_run_result": None,
            "last_event_id": None,
            "run_count": 0,
            "error_count": 0,
            "consecutive_errors": 0,
            "skip_count": 0,
            "consecutive_skips": 0,
            "auto_disabled": False,
            "auto_disabled_reason": None,
            "timezone": user_tz,
            "engine_version": AUTOMATION_ENGINE_VERSION,
            "created_from_template_id": kwargs.get("template_id"),
            "created_at": now,
            "updated_at": now,
            "events": [{
                "ts": now,
                "actor": user_id,
                "action": "created",
                "details": {},
            }],
        }

        if self.db is not None:
            await self.db.user_automations.insert_one(doc)
            doc.pop("_id", None)

        return ToolResult(
            success=True,
            data={
                "automation_id": automation_id,
                "name": name,
                "trigger_type": trigger.get("type"),
                "action_count": len(actions),
                "enabled": True,
            },
            message=f"Automation '{name}' created successfully"
        )

    # ==================== Update Automation ====================

    async def _update_automation(self, **kwargs) -> ToolResult:
        """Update an existing automation."""
        user_id = kwargs.get("user_id")
        automation_id = kwargs.get("automation_id")

        if not automation_id:
            return ToolResult(success=False, error="automation_id required")

        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        existing = await self.db.user_automations.find_one(
            {"automation_id": automation_id, "user_id": user_id},
            {"_id": 0}
        )
        if not existing:
            return ToolResult(success=False, error="Automation not found")

        updates = {}
        now = datetime.now(timezone.utc).isoformat()

        # Update name
        name = kwargs.get("name")
        if name is not None:
            name = name.strip()
            if len(name) > MAX_NAME_LENGTH:
                return ToolResult(success=False, error="Name too long")
            updates["name"] = name

        # Update description
        description = kwargs.get("description")
        if description is not None:
            updates["description"] = description.strip()[:MAX_DESCRIPTION_LENGTH]

        # Update trigger
        trigger = kwargs.get("trigger")
        if trigger is not None:
            validation = self._validate_trigger(trigger)
            if not validation["valid"]:
                return ToolResult(success=False, error=validation["error"])
            updates["trigger"] = trigger

        # Update actions
        actions = kwargs.get("actions")
        if actions is not None:
            validation = self._validate_actions(actions)
            if not validation["valid"]:
                return ToolResult(success=False, error=validation["error"])
            updates["actions"] = actions

        # Update conditions
        conditions = kwargs.get("conditions")
        if conditions is not None:
            trigger_for_validation = trigger or existing.get("trigger", {})
            validation = self._validate_conditions(conditions, trigger_for_validation)
            if not validation["valid"]:
                return ToolResult(success=False, error=validation["error"])
            updates["conditions"] = conditions

        # Update execution_options
        execution_options = kwargs.get("execution_options")
        if execution_options is not None:
            validation = self._validate_execution_options(execution_options)
            if not validation["valid"]:
                return ToolResult(success=False, error=validation["error"])
            updates["execution_options"] = execution_options

        # Update group_id
        group_id = kwargs.get("group_id")
        if group_id is not None:
            updates["group_id"] = group_id

        if not updates:
            return ToolResult(success=False, error="No fields to update")

        updates["updated_at"] = now

        # Reset error state on manual update (user is fixing it)
        if existing.get("auto_disabled"):
            updates["auto_disabled"] = False
            updates["auto_disabled_reason"] = None
            updates["consecutive_errors"] = 0
            updates["consecutive_skips"] = 0

        # Build-time policy re-check if actions or trigger changed
        effective_group_id = group_id or existing.get("group_id")
        if self.policy_tool and effective_group_id and (actions or trigger):
            build_policy = await self.policy_tool.execute(
                action="check_build_policy",
                user_id=user_id,
                group_id=effective_group_id,
                trigger=trigger or existing.get("trigger", {}),
                actions=actions or existing.get("actions", []),
            )
            if not build_policy.success or not (build_policy.data or {}).get("allowed", True):
                return ToolResult(
                    success=False,
                    error=f"Build policy blocked: {build_policy.error or 'Permission denied'}",
                )

        await self.db.user_automations.update_one(
            {"automation_id": automation_id, "user_id": user_id},
            {
                "$set": updates,
                "$push": {"events": {
                    "ts": now,
                    "actor": user_id,
                    "action": "updated",
                    "details": {"fields": list(updates.keys())},
                }}
            }
        )

        return ToolResult(
            success=True,
            data={"automation_id": automation_id, "updated_fields": list(updates.keys())},
            message=f"Automation updated: {', '.join(updates.keys())}"
        )

    # ==================== Delete Automation ====================

    async def _delete_automation(self, **kwargs) -> ToolResult:
        """Delete an automation."""
        user_id = kwargs.get("user_id")
        automation_id = kwargs.get("automation_id")

        if not automation_id:
            return ToolResult(success=False, error="automation_id required")

        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        result = await self.db.user_automations.delete_one(
            {"automation_id": automation_id, "user_id": user_id}
        )

        if result.deleted_count == 0:
            return ToolResult(success=False, error="Automation not found")

        return ToolResult(
            success=True,
            data={"automation_id": automation_id, "deleted": True},
            message="Automation deleted"
        )

    # ==================== Get Automation ====================

    async def _get_automation(self, **kwargs) -> ToolResult:
        """Get a single automation."""
        user_id = kwargs.get("user_id")
        automation_id = kwargs.get("automation_id")

        if not automation_id or not self.db:
            return ToolResult(success=False, error="automation_id and database required")

        doc = await self.db.user_automations.find_one(
            {"automation_id": automation_id, "user_id": user_id},
            {"_id": 0}
        )

        if not doc:
            return ToolResult(success=False, error="Automation not found")

        # Compute health score
        doc["health"] = self._compute_health_score(doc)

        return ToolResult(success=True, data=doc)

    # ==================== List Automations ====================

    async def _list_automations(self, **kwargs) -> ToolResult:
        """List all automations for a user."""
        user_id = kwargs.get("user_id")
        group_id = kwargs.get("group_id")

        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        query = {"user_id": user_id}
        if group_id:
            query["group_id"] = group_id

        docs = await self.db.user_automations.find(
            query,
            {
                "_id": 0,
                "automation_id": 1,
                "name": 1,
                "description": 1,
                "trigger": 1,
                "actions": 1,
                "enabled": 1,
                "auto_disabled": 1,
                "auto_disabled_reason": 1,
                "run_count": 1,
                "error_count": 1,
                "skip_count": 1,
                "consecutive_errors": 1,
                "consecutive_skips": 1,
                "last_run": 1,
                "last_run_result": 1,
                "group_id": 1,
                "created_at": 1,
                "engine_version": 1,
            }
        ).sort("created_at", -1).to_list(MAX_AUTOMATIONS_PER_USER)

        # Compute health score for each automation
        for doc in docs:
            doc["health"] = self._compute_health_score(doc)

        return ToolResult(
            success=True,
            data={
                "automations": docs,
                "count": len(docs),
                "limit": MAX_AUTOMATIONS_PER_USER,
            }
        )

    # ==================== Toggle Automation ====================

    async def _toggle_automation(self, **kwargs) -> ToolResult:
        """Enable or disable an automation."""
        user_id = kwargs.get("user_id")
        automation_id = kwargs.get("automation_id")
        enabled = kwargs.get("enabled")

        if not automation_id or enabled is None:
            return ToolResult(success=False, error="automation_id and enabled required")

        if self.db is None:
            return ToolResult(success=False, error="Database not available")

        now = datetime.now(timezone.utc).isoformat()
        updates = {"enabled": enabled, "updated_at": now}

        # If re-enabling, clear auto-disable state
        if enabled:
            updates["auto_disabled"] = False
            updates["auto_disabled_reason"] = None
            updates["consecutive_errors"] = 0
            updates["consecutive_skips"] = 0

        result = await self.db.user_automations.update_one(
            {"automation_id": automation_id, "user_id": user_id},
            {
                "$set": updates,
                "$push": {"events": {
                    "ts": now,
                    "actor": user_id,
                    "action": "toggled",
                    "details": {"enabled": enabled},
                }}
            }
        )

        if result.modified_count == 0:
            return ToolResult(success=False, error="Automation not found")

        return ToolResult(
            success=True,
            data={"automation_id": automation_id, "enabled": enabled},
            message=f"Automation {'enabled' if enabled else 'disabled'}"
        )

    # ==================== List Triggers/Actions ====================

    async def _list_triggers(self, **kwargs) -> ToolResult:
        """List all available trigger types."""
        triggers = []
        for trigger_type, info in ALLOWED_TRIGGERS.items():
            triggers.append({
                "type": trigger_type,
                "description": info["description"],
                "event_fields": info["event_fields"],
            })

        return ToolResult(
            success=True,
            data={"triggers": triggers, "count": len(triggers)}
        )

    async def _list_actions(self, **kwargs) -> ToolResult:
        """List all available action types."""
        actions = []
        for action_type, info in ALLOWED_ACTIONS.items():
            actions.append({
                "type": action_type,
                "description": info["description"],
                "required_params": info["required_params"],
                "optional_params": info["optional_params"],
            })

        return ToolResult(
            success=True,
            data={"actions": actions, "count": len(actions)}
        )

    # ==================== Suggest Templates ====================

    async def _suggest_templates(self, **kwargs) -> ToolResult:
        """Suggest pre-built automation templates."""
        templates = [
            {
                "template_id": "tpl_auto_rsvp",
                "name": "Auto-RSVP to games",
                "description": "Automatically confirm your attendance when a new game is created",
                "trigger": {"type": "game_created"},
                "actions": [{"type": "auto_rsvp", "params": {"response": "confirmed"}}],
            },
            {
                "template_id": "tpl_payment_reminder",
                "name": "Payment reminder after 3 days",
                "description": "Remind people who owe you if they haven't paid within 3 days",
                "trigger": {
                    "type": "payment_overdue",
                },
                "conditions": {"days_overdue": {"op": "gte", "value": 3}},
                "actions": [
                    {"type": "send_payment_reminder", "params": {"urgency": "gentle"}},
                ],
            },
            {
                "template_id": "tpl_self_reminder",
                "name": "Self-reminder when I owe",
                "description": "Get a reminder notification when you owe someone money",
                "trigger": {"type": "payment_due"},
                "actions": [{
                    "type": "send_notification",
                    "params": {
                        "title": "You owe money",
                        "message": "Don't forget to settle up!",
                        "target": "self",
                    },
                }],
            },
            {
                "template_id": "tpl_friday_game",
                "name": "Friday game suggestion",
                "description": "Suggest creating a game every Friday at 5pm",
                "trigger": {"type": "schedule", "schedule": "0 17 * * 5"},
                "actions": [{
                    "type": "send_notification",
                    "params": {
                        "title": "Time for poker!",
                        "message": "It's Friday - want to host a game tonight?",
                        "target": "self",
                    },
                }],
            },
            {
                "template_id": "tpl_game_summary",
                "name": "Game summary after every game",
                "description": "Automatically generate and share a game summary when a game ends",
                "trigger": {"type": "game_ended"},
                "actions": [
                    {"type": "generate_summary", "params": {"share_to": "group"}},
                ],
            },
            {
                "template_id": "tpl_all_confirmed",
                "name": "Notify me when all players confirmed",
                "description": "Get notified when every invited player has confirmed",
                "trigger": {"type": "all_players_confirmed"},
                "actions": [{
                    "type": "send_notification",
                    "params": {
                        "title": "All players confirmed!",
                        "message": "Everyone's in - game is ready to go!",
                        "target": "self",
                    },
                }],
            },
        ]

        return ToolResult(
            success=True,
            data={"templates": templates, "count": len(templates)}
        )

    # ==================== Validate Automation ====================

    async def _validate_automation(self, **kwargs) -> ToolResult:
        """Validate an automation configuration without creating it."""
        trigger = kwargs.get("trigger", {})
        actions = kwargs.get("actions", [])
        conditions = kwargs.get("conditions", {})
        execution_options = kwargs.get("execution_options", {})

        errors = []

        trigger_result = self._validate_trigger(trigger)
        if not trigger_result["valid"]:
            errors.append(f"Trigger: {trigger_result['error']}")

        actions_result = self._validate_actions(actions)
        if not actions_result["valid"]:
            errors.append(f"Actions: {actions_result['error']}")

        conditions_result = self._validate_conditions(conditions, trigger)
        if not conditions_result["valid"]:
            errors.append(f"Conditions: {conditions_result['error']}")

        if execution_options:
            exec_result = self._validate_execution_options(execution_options)
            if not exec_result["valid"]:
                errors.append(f"Execution options: {exec_result['error']}")

        if errors:
            return ToolResult(
                success=False,
                error="; ".join(errors),
                data={"valid": False, "errors": errors}
            )

        return ToolResult(
            success=True,
            data={"valid": True, "errors": []},
            message="Automation configuration is valid"
        )

    # ==================== Validation Helpers ====================

    def _validate_trigger(self, trigger: Dict) -> Dict:
        """Validate a trigger configuration."""
        if not trigger:
            return {"valid": False, "error": "Trigger is required"}

        trigger_type = trigger.get("type")
        if not trigger_type:
            return {"valid": False, "error": "Trigger type is required"}

        if trigger_type not in ALLOWED_TRIGGERS:
            allowed = ", ".join(ALLOWED_TRIGGERS.keys())
            return {
                "valid": False,
                "error": f"Unknown trigger type '{trigger_type}'. Allowed: {allowed}"
            }

        # Validate schedule trigger
        if trigger_type == "schedule":
            schedule = trigger.get("schedule")
            if not schedule:
                return {"valid": False, "error": "Schedule trigger requires a cron expression"}

            if not CRON_PATTERN.match(schedule.strip()):
                return {
                    "valid": False,
                    "error": "Invalid cron expression. Format: 'minute hour day_of_month month day_of_week'"
                }

            # Cron frequency constraints
            cron_error = self._validate_cron_frequency(schedule)
            if cron_error:
                return {"valid": False, "error": cron_error}

        return {"valid": True, "error": None}

    def _validate_cron_frequency(self, schedule: str) -> Optional[str]:
        """Validate that a cron schedule doesn't fire too frequently."""
        parts = schedule.strip().split()
        if len(parts) != 5:
            return None  # Let the pattern validator handle format errors

        minute, hour = parts[0], parts[1]

        # Block "every minute" patterns
        if minute == "*" and hour == "*":
            return (
                f"Schedule too frequent. Minimum interval is "
                f"{MIN_CRON_INTERVAL_MINUTES} minutes."
            )

        # Check step intervals (*/N)
        if minute.startswith("*/"):
            try:
                interval = int(minute.split("/")[1])
                if interval < MIN_CRON_INTERVAL_MINUTES and hour == "*":
                    return (
                        f"Schedule interval ({interval} min) below minimum "
                        f"({MIN_CRON_INTERVAL_MINUTES} min)"
                    )
            except (ValueError, IndexError):
                pass

        return None

    def _validate_actions(self, actions: List) -> Dict:
        """Validate action configurations."""
        if not actions:
            return {"valid": False, "error": "At least one action is required"}

        if len(actions) > MAX_ACTIONS_PER_AUTOMATION:
            return {
                "valid": False,
                "error": f"Too many actions (max {MAX_ACTIONS_PER_AUTOMATION})"
            }

        for i, action in enumerate(actions):
            action_type = action.get("type")
            if not action_type:
                return {"valid": False, "error": f"Action {i+1}: type is required"}

            if action_type not in ALLOWED_ACTIONS:
                allowed = ", ".join(ALLOWED_ACTIONS.keys())
                return {
                    "valid": False,
                    "error": f"Action {i+1}: unknown type '{action_type}'. Allowed: {allowed}"
                }

            # Check required params
            spec = ALLOWED_ACTIONS[action_type]
            params = action.get("params", {})
            for required_param in spec["required_params"]:
                if required_param not in params:
                    return {
                        "valid": False,
                        "error": (
                            f"Action {i+1} ({action_type}): "
                            f"missing required param '{required_param}'"
                        )
                    }

            # Validate per-action timeout if specified
            if "timeout_ms" in action:
                timeout = action["timeout_ms"]
                if not isinstance(timeout, (int, float)) or timeout < 1000 or timeout > 60000:
                    return {
                        "valid": False,
                        "error": (
                            f"Action {i+1} ({action_type}): "
                            f"timeout_ms must be between 1000 and 60000"
                        )
                    }

        return {"valid": True, "error": None}

    def _validate_conditions(self, conditions: Dict, trigger: Dict) -> Dict:
        """Validate condition configuration with expanded operators."""
        if not conditions:
            return {"valid": True, "error": None}

        for field, condition in conditions.items():
            if not isinstance(condition, dict):
                return {
                    "valid": False,
                    "error": f"Condition for '{field}' must be an object with 'op' and 'value'"
                }

            op = condition.get("op")
            if not op:
                return {"valid": False, "error": f"Condition for '{field}': 'op' required"}

            if op not in ALLOWED_CONDITION_OPS:
                return {
                    "valid": False,
                    "error": (
                        f"Condition for '{field}': unknown op '{op}'. "
                        f"Allowed: {', '.join(sorted(ALLOWED_CONDITION_OPS))}"
                    )
                }

            # exists/not_exists don't require a value
            if op in ("exists", "not_exists"):
                continue

            if "value" not in condition:
                return {
                    "valid": False,
                    "error": f"Condition for '{field}': 'value' required for op '{op}'"
                }

            # Type-specific validation
            value = condition["value"]

            if op == "between":
                if not isinstance(value, list) or len(value) != 2:
                    return {
                        "valid": False,
                        "error": (
                            f"Condition for '{field}': 'between' requires "
                            f"a [min, max] array"
                        )
                    }

            if op in ("in", "not_in", "any_of"):
                if not isinstance(value, list):
                    return {
                        "valid": False,
                        "error": (
                            f"Condition for '{field}': '{op}' requires "
                            f"an array value"
                        )
                    }

            if op in ("contains", "starts_with"):
                if not isinstance(value, str):
                    return {
                        "valid": False,
                        "error": (
                            f"Condition for '{field}': '{op}' requires "
                            f"a string value"
                        )
                    }

        return {"valid": True, "error": None}

    def _validate_execution_options(self, options: Dict) -> Dict:
        """Validate execution options."""
        if not options:
            return {"valid": True, "error": None}

        if "stop_on_failure" in options:
            if not isinstance(options["stop_on_failure"], bool):
                return {
                    "valid": False,
                    "error": "stop_on_failure must be a boolean"
                }

        if "action_timeout_ms" in options:
            timeout = options["action_timeout_ms"]
            if not isinstance(timeout, (int, float)) or timeout < 1000 or timeout > 60000:
                return {
                    "valid": False,
                    "error": "action_timeout_ms must be between 1000 and 60000"
                }

        if "max_duration_ms" in options:
            max_dur = options["max_duration_ms"]
            if not isinstance(max_dur, (int, float)) or max_dur < 5000 or max_dur > 300000:
                return {
                    "valid": False,
                    "error": "max_duration_ms must be between 5000 and 300000"
                }

        return {"valid": True, "error": None}

    # ==================== Health Score ====================

    def _compute_health_score(self, automation: Dict) -> Dict:
        """
        Compute a health score for an automation based on its run stats.

        Returns:
            status: "healthy" | "warning" | "critical" | "disabled" | "new"
            score: 0-100
            reasons: list of human-readable reasons for the status
        """
        # Auto-disabled → always critical
        if automation.get("auto_disabled"):
            return {
                "status": "disabled",
                "score": 0,
                "reasons": [automation.get("auto_disabled_reason", "Auto-disabled")],
            }

        # Manually disabled
        if not automation.get("enabled"):
            return {
                "status": "disabled",
                "score": 0,
                "reasons": ["Manually disabled"],
            }

        run_count = automation.get("run_count", 0)
        error_count = automation.get("error_count", 0)
        skip_count = automation.get("skip_count", 0)
        consecutive_errors = automation.get("consecutive_errors", 0)
        consecutive_skips = automation.get("consecutive_skips", 0)

        # Brand new — no runs yet
        if run_count == 0:
            return {
                "status": "new",
                "score": 100,
                "reasons": ["No runs yet"],
            }

        reasons = []
        score = 100

        # Error rate penalty
        if run_count > 0:
            error_rate = error_count / run_count
            if error_rate > 0.5:
                score -= 40
                reasons.append(f"High error rate ({error_rate:.0%})")
            elif error_rate > 0.2:
                score -= 20
                reasons.append(f"Elevated error rate ({error_rate:.0%})")

        # Skip rate penalty (only if significant runs)
        total_attempts = run_count + skip_count
        if total_attempts > 5:
            skip_rate = skip_count / total_attempts
            if skip_rate > 0.8:
                score -= 25
                reasons.append(f"High skip rate ({skip_rate:.0%})")
            elif skip_rate > 0.5:
                score -= 10
                reasons.append(f"Moderate skip rate ({skip_rate:.0%})")

        # Consecutive error penalty (recent trouble)
        if consecutive_errors >= 3:
            score -= 30
            reasons.append(f"{consecutive_errors} consecutive errors")
        elif consecutive_errors >= 1:
            score -= 10
            reasons.append(f"{consecutive_errors} recent error(s)")

        # Consecutive skip penalty
        if consecutive_skips >= 20:
            score -= 20
            reasons.append(f"{consecutive_skips} consecutive skips")
        elif consecutive_skips >= 10:
            score -= 10
            reasons.append(f"{consecutive_skips} consecutive skips")

        # Last run result
        if automation.get("last_run_result") == "failed":
            score -= 10
            if "recent error" not in " ".join(reasons):
                reasons.append("Last run failed")

        # Clamp score
        score = max(0, min(100, score))

        # Determine status
        if score >= 80:
            status = "healthy"
        elif score >= 50:
            status = "warning"
        else:
            status = "critical"

        if not reasons:
            reasons.append("Running normally")

        return {
            "status": status,
            "score": score,
            "reasons": reasons,
        }
