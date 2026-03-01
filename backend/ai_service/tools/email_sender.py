"""
Email Sender Tool

Sends transactional emails for game invites, settlements, reports, etc.
"""

from typing import List, Dict, Optional
from .base import BaseTool, ToolResult
from datetime import datetime
import uuid


class EmailSenderTool(BaseTool):
    """
    Sends transactional emails for various purposes.

    Capabilities:
    - Game invitation emails
    - Settlement summary emails
    - Game reminder emails
    - Weekly/monthly digest emails
    - Custom notification emails
    """

    def __init__(self, db=None, email_client=None):
        self.db = db
        self.email_client = email_client  # Could be SendGrid, SES, etc.

    @property
    def name(self) -> str:
        return "email_sender"

    @property
    def description(self) -> str:
        return """Sends transactional emails to users.
        Can send game invites, settlement summaries, reminders, and custom notifications.
        Use this when you need to send email communications to players."""

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "email_type": {
                    "type": "string",
                    "enum": [
                        "game_invite",
                        "settlement_summary",
                        "game_reminder",
                        "weekly_digest",
                        "custom"
                    ],
                    "description": "Type of email to send"
                },
                "recipients": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "user_id": {"type": "string"},
                            "email": {"type": "string", "format": "email"},
                            "name": {"type": "string"}
                        }
                    },
                    "description": "List of recipients"
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject (for custom emails)"
                },
                "body": {
                    "type": "string",
                    "description": "Email body (for custom emails)"
                },
                "template_data": {
                    "type": "object",
                    "description": "Data for email template (game_id, settlement info, etc.)"
                },
                "schedule_for": {
                    "type": "string",
                    "format": "date-time",
                    "description": "Optional: Schedule email for later"
                }
            },
            "required": ["email_type", "recipients"]
        }

    async def execute(
        self,
        email_type: str,
        recipients: List[Dict],
        subject: str = None,
        body: str = None,
        template_data: Dict = None,
        schedule_for: str = None
    ) -> ToolResult:
        """Send emails"""
        try:
            if not recipients:
                return ToolResult(
                    success=False,
                    error="No recipients provided"
                )

            # Generate email content based on type
            email_content = await self._generate_email_content(
                email_type, subject, body, template_data
            )

            if not email_content.get("subject") or not email_content.get("body"):
                return ToolResult(
                    success=False,
                    error="Could not generate email content"
                )

            sent_count = 0
            failed_count = 0
            results = []

            for recipient in recipients:
                email_record = {
                    "email_id": str(uuid.uuid4()),
                    "type": email_type,
                    "recipient_user_id": recipient.get("user_id"),
                    "recipient_email": recipient.get("email"),
                    "recipient_name": recipient.get("name"),
                    "subject": email_content["subject"],
                    "body": email_content["body"],
                    "status": "pending",
                    "created_at": datetime.utcnow(),
                    "scheduled_for": schedule_for,
                    "template_data": template_data
                }

                # Store email record
                if self.db is not None:
                    await self.db.email_logs.insert_one(email_record)

                # Send email (or queue if scheduled)
                if schedule_for:
                    # Queue for later
                    email_record["status"] = "scheduled"
                    results.append({
                        "email": recipient.get("email"),
                        "status": "scheduled",
                        "scheduled_for": schedule_for
                    })
                    sent_count += 1
                else:
                    # Send immediately
                    send_result = await self._send_email(
                        to_email=recipient.get("email"),
                        to_name=recipient.get("name"),
                        subject=email_content["subject"],
                        body=email_content["body"],
                        html_body=email_content.get("html_body")
                    )

                    if send_result["success"]:
                        sent_count += 1
                        results.append({
                            "email": recipient.get("email"),
                            "status": "sent"
                        })
                    else:
                        failed_count += 1
                        results.append({
                            "email": recipient.get("email"),
                            "status": "failed",
                            "error": send_result.get("error")
                        })

            return ToolResult(
                success=sent_count > 0,
                data={
                    "sent_count": sent_count,
                    "failed_count": failed_count,
                    "total_recipients": len(recipients),
                    "results": results
                },
                message=f"Sent {sent_count} emails, {failed_count} failed"
            )

        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e)
            )

    async def _generate_email_content(
        self,
        email_type: str,
        subject: str,
        body: str,
        template_data: Dict
    ) -> Dict:
        """Generate email content based on type"""
        template_data = template_data or {}

        if email_type == "game_invite":
            return {
                "subject": f"You're invited to {template_data.get('game_title', 'Poker Night')}!",
                "body": f"""
Hey {template_data.get('recipient_name', 'there')}!

You've been invited to join a poker game:

Game: {template_data.get('game_title', 'Poker Night')}
When: {template_data.get('scheduled_time', 'TBD')}
Buy-in: ${template_data.get('buy_in_amount', 20)}
Host: {template_data.get('host_name', 'Unknown')}

Click here to RSVP: {template_data.get('rsvp_link', '#')}

See you at the table!
- The Kvitt Team
                """.strip(),
                "html_body": None  # Would include HTML version
            }

        elif email_type == "settlement_summary":
            return {
                "subject": f"Game Settlement: {template_data.get('game_title', 'Poker Night')}",
                "body": f"""
Game Summary: {template_data.get('game_title', 'Poker Night')}

Your Results:
- Buy-in: ${template_data.get('total_buy_in', 0)}
- Cash-out: ${template_data.get('cash_out', 0)}
- Net Result: ${template_data.get('net_result', 0)}

{template_data.get('settlement_instructions', '')}

Thanks for playing!
- The Kvitt Team
                """.strip()
            }

        elif email_type == "game_reminder":
            return {
                "subject": f"Reminder: {template_data.get('game_title', 'Poker Night')} starts soon!",
                "body": f"""
Hey {template_data.get('recipient_name', 'there')}!

Just a reminder that the game is starting soon:

Game: {template_data.get('game_title', 'Poker Night')}
When: {template_data.get('scheduled_time', 'Soon')}
Location: {template_data.get('location', 'Check the app')}

See you there!
- The Kvitt Team
                """.strip()
            }

        elif email_type == "weekly_digest":
            return {
                "subject": "Your Weekly Poker Summary",
                "body": f"""
Hey {template_data.get('recipient_name', 'there')}!

Here's your weekly poker summary:

Games Played: {template_data.get('games_played', 0)}
Total Profit/Loss: ${template_data.get('total_profit', 0)}
Win Rate: {template_data.get('win_rate', 0)}%

{template_data.get('highlights', '')}

Keep up the good game!
- The Kvitt Team
                """.strip()
            }

        else:
            # Custom email
            return {
                "subject": subject or "Message from Kvitt",
                "body": body or "No content provided"
            }

    async def _send_email(
        self,
        to_email: str,
        to_name: str,
        subject: str,
        body: str,
        html_body: str = None
    ) -> Dict:
        """Actually send the email (placeholder for email service integration)"""
        # This would integrate with SendGrid, AWS SES, etc.
        # For now, we'll simulate success

        if not to_email:
            return {"success": False, "error": "No email address provided"}

        # TODO: Integrate with actual email service
        # Example with SendGrid:
        # from sendgrid import SendGridAPIClient
        # from sendgrid.helpers.mail import Mail
        # message = Mail(
        #     from_email='noreply@kvitt.app',
        #     to_emails=to_email,
        #     subject=subject,
        #     plain_text_content=body,
        #     html_content=html_body
        # )
        # sg = SendGridAPIClient(api_key)
        # response = sg.send(message)

        return {
            "success": True,
            "message_id": str(uuid.uuid4()),
            "note": "Email service integration pending"
        }
