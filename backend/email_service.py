"""
Email Service for Kvitt
Using Resend for transactional emails
"""

import os
import asyncio
import logging
import resend
from typing import Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# Initialize Resend
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
APP_NAME = "Kvitt"
APP_URL = os.environ.get('APP_URL', 'https://kvitt.app')

# Email Templates
def get_base_template(content: str, preview_text: str = "") -> str:
    """Base HTML email template with Kvitt branding"""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{APP_NAME}</title>
        <!--[if !mso]><!-->
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        </style>
        <!--<![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f0; font-family: 'Inter', Arial, sans-serif;">
        <!-- Preview text -->
        <div style="display: none; max-height: 0; overflow: hidden;">
            {preview_text}
        </div>
        
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f0;">
            <tr>
                <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                        <!-- Header -->
                        <tr>
                            <td style="padding: 32px 40px 24px; border-bottom: 1px solid #e5e5e5;">
                                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td>
                                            <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a;">
                                                K<span style="color: #f97316;">vitt</span>
                                            </h1>
                                            <p style="margin: 4px 0 0; font-size: 12px; color: #666;">Play smarter.</p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                            <td style="padding: 32px 40px;">
                                {content}
                            </td>
                        </tr>
                        
                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #e5e5e5; border-radius: 0 0 12px 12px;">
                                <p style="margin: 0; font-size: 12px; color: #999; text-align: center;">
                                    © {datetime.now().year} {APP_NAME}. All rights reserved.<br>
                                    <a href="{APP_URL}" style="color: #f97316; text-decoration: none;">Visit Kvitt</a>
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """


async def send_email(to: str, subject: str, html: str) -> dict:
    """Send an email using Resend (non-blocking)"""
    if not resend.api_key:
        logger.warning("RESEND_API_KEY not configured, skipping email")
        return {"status": "skipped", "reason": "API key not configured"}
    
    params = {
        "from": SENDER_EMAIL,
        "to": [to],
        "subject": subject,
        "html": html
    }
    
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: {subject}")
        return {"status": "success", "email_id": result.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return {"status": "error", "error": str(e)}


# ============== EMAIL TEMPLATES ==============

async def send_welcome_email(to: str, name: str) -> dict:
    """Send welcome email to new users"""
    content = f"""
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        Welcome to Kvitt, {name}! 🎉
    </h2>
    <p style="margin: 0 0 16px; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
        You're all set to track your poker games with ease. No more messy spreadsheets or forgotten IOUs.
    </p>
    
    <h3 style="margin: 24px 0 12px; font-size: 16px; font-weight: 600; color: #1a1a1a;">
        Get Started:
    </h3>
    <ol style="margin: 0 0 24px; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
        <li><strong>Create a Group</strong> - Organize your regular poker crew</li>
        <li><strong>Invite Friends</strong> - Add players via email</li>
        <li><strong>Start a Game</strong> - Set buy-ins and deal the cards</li>
        <li><strong>Settle Up</strong> - Let Kvitt calculate who owes who</li>
    </ol>
    
    <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
            <td style="border-radius: 8px; background-color: #f97316;">
                <a href="{APP_URL}/dashboard" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none;">
                    Go to Dashboard →
                </a>
            </td>
        </tr>
    </table>
    
    <p style="margin: 24px 0 0; font-size: 14px; color: #666;">
        Questions? Just reply to this email or use the AI assistant in the app!
    </p>
    """
    
    html = get_base_template(content, f"Welcome to Kvitt, {name}! Start tracking your poker games.")
    return await send_email(to, f"Welcome to {APP_NAME}! 🎰", html)


async def send_group_invite_email(to: str, inviter_name: str, group_name: str, invite_link: str) -> dict:
    """Send group invitation email"""
    content = f"""
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        You're Invited! 🃏
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
        <strong>{inviter_name}</strong> has invited you to join <strong>"{group_name}"</strong> on Kvitt.
    </p>
    
    <div style="background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #666;">
            Kvitt makes it easy to track buy-ins, cash-outs, and settlements for your poker nights. 
            No more "who owes who?" confusion!
        </p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
            <td style="border-radius: 8px; background-color: #f97316;">
                <a href="{invite_link}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none;">
                    Accept Invite →
                </a>
            </td>
        </tr>
    </table>
    
    <p style="margin: 24px 0 0; font-size: 12px; color: #999;">
        If you didn't expect this invite, you can ignore this email.
    </p>
    """
    
    html = get_base_template(content, f"{inviter_name} invited you to join {group_name} on Kvitt")
    return await send_email(to, f"🃏 {inviter_name} invited you to {group_name}", html)


async def send_game_started_email(to: str, player_name: str, game_title: str, group_name: str, host_name: str, buy_in: float, game_link: str) -> dict:
    """Send notification when a game starts"""
    content = f"""
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        Game On! 🎰
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
        Hey {player_name}, <strong>{host_name}</strong> just started a game in <strong>{group_name}</strong>!
    </p>
    
    <div style="background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding: 8px 0;">
                    <span style="font-size: 12px; color: #999;">GAME</span><br>
                    <span style="font-size: 16px; font-weight: 600; color: #1a1a1a;">{game_title}</span>
                </td>
            </tr>
            <tr>
                <td style="padding: 8px 0;">
                    <span style="font-size: 12px; color: #999;">BUY-IN</span><br>
                    <span style="font-size: 20px; font-weight: 700; color: #f97316;">${buy_in:.0f}</span>
                </td>
            </tr>
        </table>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
            <td style="border-radius: 8px; background-color: #f97316;">
                <a href="{game_link}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none;">
                    Join Game →
                </a>
            </td>
        </tr>
    </table>
    """
    
    html = get_base_template(content, f"Game started in {group_name}! Buy-in: ${buy_in:.0f}")
    return await send_email(to, f"🎰 Game started: {game_title}", html)


async def send_settlement_ready_email(to: str, player_name: str, game_title: str, net_result: float, settlement_link: str) -> dict:
    """Send notification when game settles"""
    result_text = f"+${net_result:.0f}" if net_result >= 0 else f"-${abs(net_result):.0f}"
    result_color = "#22c55e" if net_result >= 0 else "#ef4444"
    emoji = "🎉" if net_result >= 0 else "📊"
    
    content = f"""
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        Game Settled {emoji}
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
        Hey {player_name}, <strong>{game_title}</strong> has ended and settlements are ready!
    </p>
    
    <div style="background-color: #fafafa; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center;">
        <span style="font-size: 12px; color: #999;">YOUR RESULT</span><br>
        <span style="font-size: 36px; font-weight: 700; color: {result_color};">{result_text}</span>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
        <tr>
            <td style="border-radius: 8px; background-color: #f97316;">
                <a href="{settlement_link}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none;">
                    View Settlement →
                </a>
            </td>
        </tr>
    </table>
    """
    
    html = get_base_template(content, f"Game settled! Your result: {result_text}")
    return await send_email(to, f"{emoji} {game_title} settled: {result_text}", html)


async def send_payment_reminder_email(to: str, player_name: str, amount: float, recipient_name: str, game_title: str) -> dict:
    """Send payment reminder"""
    content = f"""
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        Payment Reminder 💰
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
        Hey {player_name}, just a friendly reminder about your pending payment from <strong>{game_title}</strong>.
    </p>
    
    <div style="background-color: #fef3c7; border-radius: 8px; padding: 24px; margin-bottom: 24px; text-align: center; border: 1px solid #fcd34d;">
        <span style="font-size: 12px; color: #92400e;">YOU OWE</span><br>
        <span style="font-size: 36px; font-weight: 700; color: #92400e;">${amount:.0f}</span><br>
        <span style="font-size: 14px; color: #92400e;">to {recipient_name}</span>
    </div>
    
    <p style="margin: 0; font-size: 14px; color: #666;">
        Once paid, ask {recipient_name} to mark it as settled in Kvitt.
    </p>
    """
    
    html = get_base_template(content, f"Reminder: You owe ${amount:.0f} to {recipient_name}")
    return await send_email(to, f"💰 Payment reminder: ${amount:.0f} to {recipient_name}", html)


async def send_login_notification_email(to: str, name: str, login_time: str, ip_address: str = "Unknown") -> dict:
    """Send login notification for security"""
    content = f"""
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        New Login Detected 🔐
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
        Hey {name}, we noticed a new login to your Kvitt account.
    </p>
    
    <div style="background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding: 8px 0;">
                    <span style="font-size: 12px; color: #999;">TIME</span><br>
                    <span style="font-size: 14px; color: #1a1a1a;">{login_time}</span>
                </td>
            </tr>
            <tr>
                <td style="padding: 8px 0;">
                    <span style="font-size: 12px; color: #999;">IP ADDRESS</span><br>
                    <span style="font-size: 14px; color: #1a1a1a;">{ip_address}</span>
                </td>
            </tr>
        </table>
    </div>
    
    <p style="margin: 0; font-size: 14px; color: #666;">
        If this was you, no action needed. If not, please secure your account immediately.
    </p>
    """
    
    html = get_base_template(content, f"New login to your Kvitt account")
    return await send_email(to, f"🔐 New login to your Kvitt account", html)


async def send_chips_edited_email(to: str, player_name: str, game_title: str, old_chips: int, new_chips: int, host_name: str, reason: str = None) -> dict:
    """Send notification when host edits player chips"""
    diff = new_chips - old_chips
    diff_text = f"+{diff}" if diff > 0 else str(diff)

    content = f"""
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        Chip Count Updated ✏️
    </h2>
    <p style="margin: 0 0 24px; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
        Hey {player_name}, <strong>{host_name}</strong> has updated your chip count in <strong>{game_title}</strong>.
    </p>

    <div style="background-color: #fafafa; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
                <td style="padding: 8px 0; text-align: center;">
                    <span style="font-size: 24px; color: #999;">{old_chips}</span>
                    <span style="font-size: 24px; color: #666; padding: 0 16px;">→</span>
                    <span style="font-size: 24px; font-weight: 700; color: #1a1a1a;">{new_chips}</span>
                    <span style="font-size: 14px; color: {'#22c55e' if diff >= 0 else '#ef4444'}; padding-left: 8px;">({diff_text})</span>
                </td>
            </tr>
            {f'<tr><td style="padding: 12px 0 0; text-align: center; font-size: 14px; color: #666;">Reason: {reason}</td></tr>' if reason else ''}
        </table>
    </div>

    <p style="margin: 0; font-size: 14px; color: #666;">
        Contact the host if you have any questions about this change.
    </p>
    """

    html = get_base_template(content, f"Your chips updated: {old_chips} → {new_chips}")
    return await send_email(to, f"✏️ Chip count updated in {game_title}", html)


async def send_subscriber_welcome_email(to: str, source: str, interests: list) -> dict:
    """Send welcome email to new subscribers with FOMO elements"""

    # Customize message based on source
    source_messages = {
        "hero": "You're now on the exclusive early access list",
        "footer": "You're subscribed to the Kvitt newsletter",
        "waitlist_ai": "You're on the AI Assistant waitlist",
        "waitlist_music": "You're on the Music Integration waitlist",
        "waitlist_charts": "You're on the Dashboard Charts waitlist",
        "landing": "You're now part of the Kvitt community",
        "cta": "You're locked in for early access"
    }

    headline = source_messages.get(source, "You're in! 🎉")

    # Build interest-specific content
    interest_content = ""
    if "ai_assistant" in interests:
        interest_content += """
        <li style="margin-bottom: 8px;">
            <strong>🤖 AI Poker Assistant</strong> - Get hand analysis and strategy tips (Coming Soon)
        </li>
        """
    if "music_integration" in interests:
        interest_content += """
        <li style="margin-bottom: 8px;">
            <strong>🎵 Music Integration</strong> - Control the vibe with Spotify/Apple Music (Coming Soon)
        </li>
        """
    if "charts" in interests:
        interest_content += """
        <li style="margin-bottom: 8px;">
            <strong>📊 Dashboard Charts</strong> - Visual analytics for your poker journey (In Development)
        </li>
        """

    content = f"""
    <h2 style="margin: 0 0 16px; font-size: 24px; font-weight: 600; color: #1a1a1a;">
        {headline}
    </h2>

    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f97316;">
        <p style="margin: 0; font-size: 14px; color: #92400e; font-weight: 600;">
            🔥 You're among the first 500 to join the waitlist
        </p>
        <p style="margin: 8px 0 0; font-size: 13px; color: #a16207;">
            Early supporters get exclusive benefits when we launch new features.
        </p>
    </div>

    <p style="margin: 0 0 16px; font-size: 16px; color: #4a4a4a; line-height: 1.6;">
        Welcome to the inside track! You'll be the first to know about:
    </p>

    <ul style="margin: 0 0 24px; padding-left: 20px; font-size: 14px; color: #4a4a4a; line-height: 1.8;">
        <li style="margin-bottom: 8px;"><strong>🚀 New feature launches</strong> - Before anyone else</li>
        <li style="margin-bottom: 8px;"><strong>🎁 Exclusive early access</strong> - Beta test new features</li>
        <li style="margin-bottom: 8px;"><strong>💰 Special offers</strong> - Founding member pricing</li>
        {interest_content}
    </ul>

    <table role="presentation" cellspacing="0" cellpadding="0">
        <tr>
            <td style="border-radius: 8px; background-color: #f97316;">
                <a href="{APP_URL}" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #000000; text-decoration: none;">
                    Check Out Kvitt →
                </a>
            </td>
        </tr>
    </table>

    <p style="margin: 24px 0 0; font-size: 12px; color: #999;">
        You're receiving this because you signed up at kvitt.app.
        <a href="{APP_URL}/unsubscribe" style="color: #999;">Unsubscribe</a>
    </p>
    """

    html = get_base_template(content, "You're on the list! Get ready for exclusive early access.")
    return await send_email(to, "🎰 You're in! Welcome to Kvitt's inner circle", html)
