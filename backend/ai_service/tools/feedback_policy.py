"""
Feedback Policy Tool

Gating layer that decides whether an auto-fix is allowed to run.
Enforces role checks, fix-type permissions, cooldowns, and
confirmation requirements before any mutation.

Fix risk tiers:
- VERIFY (safe, always allowed): Read-only checks and diagnostics
- MUTATE (risky, needs confirmation or privilege): Changes data
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


# Fix operations classified by risk tier
FIX_RISK_TIERS = {
    # VERIFY: read-only diagnostics — always safe
    "settlement_recheck": "verify",
    "resend_notification": "verify",  # resend is low-risk, considered verify
    "reconcile_payment_preview": "verify",
    "fix_permissions_diagnose": "verify",

    # MUTATE: writes data — requires confirmation or elevated role
    "reconcile_payment_apply": "mutate",
    "fix_permissions_apply": "mutate",
}

# Which roles can trigger each fix type
FIX_ROLE_REQUIREMENTS = {
    # Verify-tier: any authenticated user can trigger for their own feedback
    "settlement_recheck": ["self", "host", "admin"],
    "resend_notification": ["self", "host", "admin"],
    "reconcile_payment_preview": ["self", "host", "admin"],
    "fix_permissions_diagnose": ["self", "host", "admin"],

    # Mutate-tier: host or admin only
    "reconcile_payment_apply": ["host", "admin"],
    "fix_permissions_apply": ["host", "admin"],
}

# Cooldown periods per fix type (prevents spamming)
FIX_COOLDOWNS = {
    "settlement_recheck": timedelta(hours=1),
    "resend_notification": timedelta(hours=6),
    "reconcile_payment_preview": timedelta(hours=1),
    "reconcile_payment_apply": timedelta(hours=24),
    "fix_permissions_diagnose": timedelta(hours=1),
    "fix_permissions_apply": timedelta(hours=24),
}

# Max retry attempts per feedback entry per fix type
MAX_FIX_RETRIES = 3


class FeedbackPolicyTool(BaseTool):
    """
    Policy gate for auto-fix operations.

    Checks:
    - requester role (self/host/admin) matches fix requirements
    - fix type is enabled for the group
    - cooldown hasn't been violated
    - retry limit hasn't been exceeded
    - whether mutation requires explicit confirmation

    Returns:
    - allowed: bool
    - tier: verify | mutate
    - requires_confirmation: bool (for mutate-tier)
    - blocked_reason: str (if not allowed)
    """

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "feedback_policy"

    @property
    def description(self) -> str:
        return (
            "Check whether an auto-fix operation is allowed to proceed based on "
            "role permissions, cooldowns, retry limits, and group settings"
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform",
                    "enum": ["check_policy", "get_allowed_fixes"]
                },
                "fix_type": {
                    "type": "string",
                    "description": "The fix operation to check"
                },
                "user_id": {
                    "type": "string",
                    "description": "User requesting the fix"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group context"
                },
                "feedback_id": {
                    "type": "string",
                    "description": "Feedback entry triggering the fix"
                },
                "feedback_owner_id": {
                    "type": "string",
                    "description": "User who submitted the original feedback"
                }
            },
            "required": ["action"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute policy check."""
        action = kwargs.get("action")

        if action == "check_policy":
            return await self._check_policy(
                fix_type=kwargs.get("fix_type"),
                user_id=kwargs.get("user_id"),
                group_id=kwargs.get("group_id"),
                feedback_id=kwargs.get("feedback_id"),
                feedback_owner_id=kwargs.get("feedback_owner_id")
            )
        elif action == "get_allowed_fixes":
            return await self._get_allowed_fixes(
                user_id=kwargs.get("user_id"),
                group_id=kwargs.get("group_id"),
                feedback_owner_id=kwargs.get("feedback_owner_id")
            )
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    async def _check_policy(
        self,
        fix_type: str,
        user_id: str = None,
        group_id: str = None,
        feedback_id: str = None,
        feedback_owner_id: str = None
    ) -> ToolResult:
        """
        Check if a specific fix operation is allowed.

        Returns policy decision with:
        - allowed: bool
        - tier: verify | mutate
        - requires_confirmation: bool
        - blocked_reason: str | None
        """
        if not fix_type:
            return ToolResult(success=False, error="fix_type is required")

        # Map legacy fix types to new tiered types
        effective_fix_type = self._resolve_fix_type(fix_type)

        decision = {
            "fix_type": fix_type,
            "effective_fix_type": effective_fix_type,
            "tier": FIX_RISK_TIERS.get(effective_fix_type, "verify"),
            "allowed": True,
            "requires_confirmation": False,
            "blocked_reason": None,
            "checks_passed": [],
            "checks_failed": [],
        }

        # Check 1: Fix type exists
        if effective_fix_type not in FIX_RISK_TIERS:
            decision["allowed"] = False
            decision["blocked_reason"] = f"Unknown fix type: {effective_fix_type}"
            decision["checks_failed"].append("fix_type_valid")
            return ToolResult(success=True, data=decision)
        decision["checks_passed"].append("fix_type_valid")

        # Check 2: Role authorization
        role_check = await self._check_role(
            effective_fix_type, user_id, group_id, feedback_owner_id
        )
        if not role_check["allowed"]:
            decision["allowed"] = False
            decision["blocked_reason"] = role_check["reason"]
            decision["checks_failed"].append("role_authorized")
            return ToolResult(success=True, data=decision)
        decision["checks_passed"].append("role_authorized")
        decision["user_role"] = role_check.get("role")

        # Check 3: Group settings
        if group_id:
            group_check = await self._check_group_settings(effective_fix_type, group_id)
            if not group_check["allowed"]:
                decision["allowed"] = False
                decision["blocked_reason"] = group_check["reason"]
                decision["checks_failed"].append("group_enabled")
                return ToolResult(success=True, data=decision)
            decision["checks_passed"].append("group_enabled")

        # Check 4: Cooldown
        if feedback_id:
            cooldown_check = await self._check_cooldown(
                effective_fix_type, feedback_id, user_id
            )
            if not cooldown_check["allowed"]:
                decision["allowed"] = False
                decision["blocked_reason"] = cooldown_check["reason"]
                decision["checks_failed"].append("cooldown_ok")
                return ToolResult(success=True, data=decision)
            decision["checks_passed"].append("cooldown_ok")

        # Check 5: Retry limit
        if feedback_id:
            retry_check = await self._check_retry_limit(
                effective_fix_type, feedback_id
            )
            if not retry_check["allowed"]:
                decision["allowed"] = False
                decision["blocked_reason"] = retry_check["reason"]
                decision["checks_failed"].append("retry_limit_ok")
                return ToolResult(success=True, data=decision)
            decision["checks_passed"].append("retry_limit_ok")

        # Check 6: Mutation confirmation requirement
        if decision["tier"] == "mutate":
            decision["requires_confirmation"] = True
            decision["checks_passed"].append("confirmation_flagged")

        return ToolResult(success=True, data=decision)

    async def _get_allowed_fixes(
        self,
        user_id: str = None,
        group_id: str = None,
        feedback_owner_id: str = None
    ) -> ToolResult:
        """Return list of fix types this user is allowed to run."""
        allowed = []
        for fix_type in FIX_RISK_TIERS:
            result = await self._check_policy(
                fix_type=fix_type,
                user_id=user_id,
                group_id=group_id,
                feedback_owner_id=feedback_owner_id
            )
            if result.success and result.data.get("allowed"):
                allowed.append({
                    "fix_type": fix_type,
                    "tier": result.data["tier"],
                    "requires_confirmation": result.data["requires_confirmation"]
                })

        return ToolResult(
            success=True,
            data={"allowed_fixes": allowed, "count": len(allowed)}
        )

    # ==================== Individual Checks ====================

    async def _check_role(
        self,
        fix_type: str,
        user_id: str = None,
        group_id: str = None,
        feedback_owner_id: str = None
    ) -> Dict:
        """Check if the user's role allows this fix type."""
        required_roles = FIX_ROLE_REQUIREMENTS.get(fix_type, ["admin"])

        if not user_id:
            # System/automated trigger — always allowed
            return {"allowed": True, "role": "system"}

        # Determine user's effective role
        role = "self" if user_id == feedback_owner_id else "other"

        if group_id and self.db:
            membership = await self.db.group_members.find_one({
                "group_id": group_id,
                "user_id": user_id
            })
            if membership:
                member_role = membership.get("role", "member")
                if member_role == "admin":
                    role = "admin"
                elif member_role == "host":
                    role = "host"

        # Check if user's role is in the required list
        if role in required_roles:
            return {"allowed": True, "role": role}

        # "self" users can trigger fixes on their own feedback
        if "self" in required_roles and user_id == feedback_owner_id:
            return {"allowed": True, "role": "self"}

        return {
            "allowed": False,
            "role": role,
            "reason": f"Role '{role}' not authorized for {fix_type}. "
                      f"Required: {', '.join(required_roles)}"
        }

    async def _check_group_settings(
        self,
        fix_type: str,
        group_id: str
    ) -> Dict:
        """Check if auto-fixes are enabled for this group."""
        if not self.db:
            return {"allowed": True}

        settings = await self.db.engagement_settings.find_one(
            {"group_id": group_id}, {"_id": 0}
        )

        if not settings:
            # No settings = defaults (all enabled)
            return {"allowed": True}

        # Check master auto-fix toggle
        if not settings.get("auto_fix_enabled", True):
            return {
                "allowed": False,
                "reason": "Auto-fixes are disabled for this group"
            }

        # Check per-type toggles
        type_toggles = settings.get("auto_fix_types", {})
        # Normalize fix_type to base type (e.g., reconcile_payment_apply → reconcile_payment)
        base_type = fix_type.rsplit("_", 1)[0] if fix_type.endswith(("_preview", "_apply", "_diagnose")) else fix_type
        if base_type in type_toggles and not type_toggles[base_type]:
            return {
                "allowed": False,
                "reason": f"Fix type '{base_type}' is disabled for this group"
            }

        return {"allowed": True}

    async def _check_cooldown(
        self,
        fix_type: str,
        feedback_id: str,
        user_id: str = None
    ) -> Dict:
        """Check if the cooldown period has passed since last fix attempt."""
        if not self.db:
            return {"allowed": True}

        cooldown = FIX_COOLDOWNS.get(fix_type, timedelta(hours=1))
        cutoff = (datetime.now(timezone.utc) - cooldown).isoformat()

        query = {
            "fix_type": fix_type,
            "feedback_id": feedback_id,
            "created_at": {"$gte": cutoff}
        }

        recent_attempt = await self.db.auto_fix_log.find_one(query)
        if recent_attempt:
            return {
                "allowed": False,
                "reason": f"Cooldown active for {fix_type}. "
                          f"Last attempt: {recent_attempt.get('created_at')}. "
                          f"Wait {cooldown.total_seconds() / 3600:.0f}h between attempts."
            }

        return {"allowed": True}

    async def _check_retry_limit(
        self,
        fix_type: str,
        feedback_id: str
    ) -> Dict:
        """Check if the maximum retry limit has been reached."""
        if not self.db:
            return {"allowed": True}

        # Count total attempts for this feedback + fix type
        count = await self.db.auto_fix_log.count_documents({
            "fix_type": fix_type,
            "feedback_id": feedback_id
        })

        if count >= MAX_FIX_RETRIES:
            return {
                "allowed": False,
                "reason": f"Max retry limit ({MAX_FIX_RETRIES}) reached for "
                          f"{fix_type} on feedback {feedback_id}"
            }

        return {"allowed": True, "attempts_used": count}

    # ==================== Helpers ====================

    def _resolve_fix_type(self, fix_type: str) -> str:
        """
        Map legacy/shorthand fix types to tiered equivalents.

        Legacy: reconcile_payment → reconcile_payment_preview (safe default)
        Legacy: fix_permissions → fix_permissions_diagnose (safe default)
        """
        mapping = {
            "reconcile_payment": "reconcile_payment_preview",
            "fix_permissions": "fix_permissions_diagnose",
        }
        return mapping.get(fix_type, fix_type)
