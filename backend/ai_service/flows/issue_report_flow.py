"""
Issue Report Flow — 3-step guided issue reporting.

Step 1: Category selection (option_selector)
Step 2: Description input (text_input_prompt)
Step 3: Submit → calls FeedbackCollectorTool with idempotency_key
"""

import logging
from typing import Dict, Any

from . import BaseFlow, FlowResult, register_flow

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1

ISSUE_CATEGORIES = [
    {
        "label": "Bug / Something Broken",
        "value": "bug",
        "icon": "bug-outline",
        "description": "App crash, error, or unexpected behavior",
    },
    {
        "label": "Feature Request",
        "value": "feature_request",
        "icon": "bulb-outline",
        "description": "Something you wish Kvitt could do",
    },
    {
        "label": "UX / Design Issue",
        "value": "ux_issue",
        "icon": "color-palette-outline",
        "description": "Confusing layout, hard to find something",
    },
    {
        "label": "Complaint",
        "value": "complaint",
        "icon": "alert-circle-outline",
        "description": "Unfair result, wrong calculation, etc.",
    },
    {
        "label": "Other",
        "value": "other",
        "icon": "chatbox-outline",
        "description": "Anything else",
    },
]


def _category_label(value: str) -> str:
    return next(
        (c["label"] for c in ISSUE_CATEGORIES if c["value"] == value),
        value,
    )


class IssueReportFlow(BaseFlow):

    @property
    def flow_id(self) -> str:
        return "report_issue"

    async def start(self, user_id: str, db: Any) -> FlowResult:
        return FlowResult(
            text="I can help you file this properly. Choose the category that best matches what you're seeing.",
            structured_content={
                "schema_version": SCHEMA_VERSION,
                "type": "option_selector",
                "flow_id": self.flow_id,
                "flow_step": 1,
                "flow_data": {},
                "payload": {
                    "prompt": "Select the type of issue:",
                    "options": ISSUE_CATEGORIES,
                    "allow_custom": False,
                },
            },
        )

    async def advance(
        self,
        step: int,
        action: str,
        value: str,
        flow_data: Dict,
        user_id: str,
        interaction_id: str,
        db: Any,
    ) -> FlowResult:

        # Step 1 → 2: category selected, ask for description
        if step == 1 and action == "option_selected":
            flow_data["category"] = value
            return FlowResult(
                text=f"Understood — {_category_label(value)}. Please describe what happened, what you expected, and any steps to reproduce.",
                structured_content={
                    "schema_version": SCHEMA_VERSION,
                    "type": "text_input_prompt",
                    "flow_id": self.flow_id,
                    "flow_step": 2,
                    "flow_data": flow_data,
                    "payload": {
                        "prompt": "Describe the issue:",
                        "placeholder": "What happened? Include steps to reproduce if possible...",
                        "min_length": 20,
                        "max_length": 1000,
                        "submit_label": "Submit Report",
                    },
                },
            )

        # Step 2 → 3: description submitted, create ticket
        if step == 2 and action == "text_submitted":
            category = flow_data.get("category", "other")
            description = value

            try:
                from ..tools.feedback_collector import FeedbackCollectorTool

                tool = FeedbackCollectorTool(db=db)
                result = await tool.execute(
                    action="submit_feedback",
                    user_id=user_id,
                    feedback_type=category,
                    content=description,
                    idempotency_key=interaction_id,
                )

                if result.success:
                    feedback_id = result.data.get("feedback_id", "N/A")
                    return FlowResult(
                        text="Thank you — your report has been submitted and is now under review.",
                        structured_content={
                            "schema_version": SCHEMA_VERSION,
                            "type": "confirmation",
                            "flow_id": self.flow_id,
                            "flow_step": 3,
                            "flow_data": {},
                            "payload": {
                                "title": "Report Received",
                                "message": "Your feedback helps us improve Kvitt for everyone.",
                                "variant": "success",
                                "details": [
                                    {"label": "Reference", "value": feedback_id},
                                    {"label": "Category", "value": _category_label(category)},
                                    {"label": "Status", "value": "Under Review"},
                                ],
                                "actions": [
                                    {
                                        "label": "Email Support",
                                        "action": "email:support@kvitt.app",
                                        "variant": "ghost",
                                    },
                                ],
                            },
                        },
                        follow_ups=["What are my stats?", "Show my groups", "Any active games?"],
                    )
                else:
                    logger.error(f"FeedbackCollector error: {result.error}")
                    return FlowResult(
                        text="Sorry, there was a problem submitting your report. Please try again.",
                        follow_ups=["Report an issue"],
                    )

            except Exception as e:
                logger.error(f"Issue report flow step 3 error: {e}")
                return FlowResult(
                    text="Sorry, there was an unexpected error. Please try again later.",
                    follow_ups=["Report an issue"],
                )

        # Unexpected step/action
        return FlowResult(
            text="Something went wrong with the report flow. Let's start over.",
            follow_ups=["Report an issue"],
        )


# Self-register on import
register_flow(IssueReportFlow())
