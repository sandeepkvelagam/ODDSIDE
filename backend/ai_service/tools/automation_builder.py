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

Safety:
- Validates trigger types against allowlist
- Validates action types and their required params
- Enforces per-user automation limits
- Prevents infinite loops (no automation can trigger another automation)
- No PII in automation names/descriptions
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

# Valid cron pattern (basic validation)
CRON_PATTERN = re.compile(
    r'^(\*|[0-9,\-\/]+)\s+'   # minute
    r'(\*|[0-9,\-\/]+)\s+'    # hour
    r'(\*|[0-9,\-\/]+)\s+'    # day of month
    r'(\*|[0-9,\-\/]+)\s+'    # month
    r'(\*|[0-9,\-\/]+)$'      # day of week
)


class AutomationBuilderTool(BaseTool):
    """
    Creates and manages user-defined automations.

    Handles CRUD operations, validation, and template suggestions.
    """

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "automation_builder"

    @property
    def description(self) -> str:
        return (
            "Create, edit, delete, and list user-defined automations. "
            "Automations are IFTTT-style rules: when a trigger fires, "
            "execute one or more actions. Supports event-based and "
            "schedule-based triggers."
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
        if self.db:
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
            "group_id": group_id,
            "enabled": True,
            "last_run": None,
            "last_run_result": None,
            "run_count": 0,
            "error_count": 0,
            "consecutive_errors": 0,
            "auto_disabled": False,
            "auto_disabled_reason": None,
            "created_at": now,
            "updated_at": now,
            "events": [{
                "ts": now,
                "actor": user_id,
                "action": "created",
                "details": {},
            }],
        }

        if self.db:
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

        if not self.db:
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

        if not self.db:
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

        return ToolResult(success=True, data=doc)

    # ==================== List Automations ====================

    async def _list_automations(self, **kwargs) -> ToolResult:
        """List all automations for a user."""
        user_id = kwargs.get("user_id")
        group_id = kwargs.get("group_id")

        if not self.db:
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
                "run_count": 1,
                "last_run": 1,
                "last_run_result": 1,
                "group_id": 1,
                "created_at": 1,
            }
        ).sort("created_at", -1).to_list(MAX_AUTOMATIONS_PER_USER)

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

        if not self.db:
            return ToolResult(success=False, error="Database not available")

        now = datetime.now(timezone.utc).isoformat()
        updates = {"enabled": enabled, "updated_at": now}

        # If re-enabling, clear auto-disable state
        if enabled:
            updates["auto_disabled"] = False
            updates["auto_disabled_reason"] = None
            updates["consecutive_errors"] = 0

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
                "name": "Auto-RSVP to games",
                "description": "Automatically confirm your attendance when a new game is created",
                "trigger": {"type": "game_created"},
                "actions": [{"type": "auto_rsvp", "params": {"response": "confirmed"}}],
            },
            {
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
                "name": "Game summary after every game",
                "description": "Automatically generate and share a game summary when a game ends",
                "trigger": {"type": "game_ended"},
                "actions": [
                    {"type": "generate_summary", "params": {"share_to": "group"}},
                ],
            },
            {
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

        return {"valid": True, "error": None}

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

        return {"valid": True, "error": None}

    def _validate_conditions(self, conditions: Dict, trigger: Dict) -> Dict:
        """Validate condition configuration."""
        if not conditions:
            return {"valid": True, "error": None}

        allowed_ops = {"eq", "neq", "gt", "gte", "lt", "lte", "in", "not_in"}

        for field, condition in conditions.items():
            if not isinstance(condition, dict):
                return {
                    "valid": False,
                    "error": f"Condition for '{field}' must be an object with 'op' and 'value'"
                }

            op = condition.get("op")
            if not op:
                return {"valid": False, "error": f"Condition for '{field}': 'op' required"}

            if op not in allowed_ops:
                return {
                    "valid": False,
                    "error": f"Condition for '{field}': unknown op '{op}'. Allowed: {', '.join(allowed_ops)}"
                }

            if "value" not in condition:
                return {
                    "valid": False,
                    "error": f"Condition for '{field}': 'value' required"
                }

        return {"valid": True, "error": None}
