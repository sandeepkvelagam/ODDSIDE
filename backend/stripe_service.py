"""
Stripe Payments Integration for Kvitt Premium
"""

import os
import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Request, Depends

logger = logging.getLogger(__name__)

# Premium Plans
PREMIUM_PLANS = {
    "monthly": {
        "id": "monthly",
        "name": "Kvitt Pro Monthly",
        "price": 4.99,
        "interval": "month",
        "features": [
            "Unlimited games",
            "Group analytics",
            "Monthly summaries",
            "Priority support"
        ]
    },
    "yearly": {
        "id": "yearly", 
        "name": "Kvitt Pro Yearly",
        "price": 39.99,
        "interval": "year",
        "features": [
            "Everything in Monthly",
            "2 months free",
            "Advanced insights",
            "Export data"
        ]
    },
    "lifetime": {
        "id": "lifetime",
        "name": "Kvitt Pro Lifetime",
        "price": 99.99,
        "interval": "once",
        "features": [
            "All Pro features forever",
            "No recurring charges",
            "Early access to new features",
            "Founding member badge"
        ]
    }
}


class CheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str


class PaymentStatusResponse(BaseModel):
    status: str
    payment_status: str
    plan_id: Optional[str] = None
    user_id: Optional[str] = None


async def create_stripe_checkout(
    plan_id: str,
    origin_url: str,
    user_id: str,
    user_email: str,
    db
) -> Dict[str, Any]:
    """Create Stripe checkout session for premium subscription"""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, 
        CheckoutSessionRequest,
        CheckoutSessionResponse
    )
    
    # Validate plan
    if plan_id not in PREMIUM_PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan selected")
    
    plan = PREMIUM_PLANS[plan_id]
    api_key = os.environ.get('STRIPE_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Payment service not configured")
    
    # Create Stripe checkout
    webhook_url = f"{origin_url}/api/webhook/stripe"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Build URLs
    success_url = f"{origin_url}/premium/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin_url}/premium"
    
    # Create checkout request
    checkout_request = CheckoutSessionRequest(
        amount=float(plan["price"]),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "plan_id": plan_id,
            "user_id": user_id,
            "user_email": user_email,
            "plan_name": plan["name"]
        }
    )
    
    # Create session
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create payment transaction record
    transaction = {
        "transaction_id": f"txn_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{user_id[:8]}",
        "session_id": session.session_id,
        "user_id": user_id,
        "user_email": user_email,
        "plan_id": plan_id,
        "plan_name": plan["name"],
        "amount": plan["price"],
        "currency": "usd",
        "status": "pending",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.payment_transactions.insert_one(transaction)
    
    logger.info(f"Created checkout session for user {user_id}, plan {plan_id}")
    
    return {
        "checkout_url": session.url,
        "session_id": session.session_id,
        "plan": plan
    }


async def check_payment_status(
    session_id: str,
    db
) -> PaymentStatusResponse:
    """Check payment status and update if completed"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = os.environ.get('STRIPE_API_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="Payment service not configured")
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    # Get status from Stripe
    status_response = await stripe_checkout.get_checkout_status(session_id)
    
    # Get transaction from DB
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id},
        {"_id": 0}
    )
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update transaction if status changed
    if transaction["payment_status"] != status_response.payment_status:
        update_data = {
            "status": status_response.status,
            "payment_status": status_response.payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # If payment successful, upgrade user to premium
        if status_response.payment_status == "paid" and transaction["payment_status"] != "paid":
            update_data["completed_at"] = datetime.now(timezone.utc).isoformat()
            
            # Update user's premium status
            user_id = transaction["user_id"]
            plan_id = transaction["plan_id"]
            
            premium_until = None
            if plan_id == "monthly":
                from datetime import timedelta
                premium_until = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            elif plan_id == "yearly":
                from datetime import timedelta
                premium_until = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
            elif plan_id == "lifetime":
                premium_until = "lifetime"
            
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {
                    "is_premium": True,
                    "premium_plan": plan_id,
                    "premium_until": premium_until,
                    "premium_started_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            logger.info(f"User {user_id} upgraded to {plan_id} premium")
        
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": update_data}
        )
    
    return PaymentStatusResponse(
        status=status_response.status,
        payment_status=status_response.payment_status,
        plan_id=transaction.get("plan_id"),
        user_id=transaction.get("user_id")
    )


async def handle_subscription_renewal(user_id: str, plan_id: str, db):
    """Handle subscription renewal - extend premium access"""
    from datetime import timedelta

    # Calculate new expiry date based on plan
    if plan_id == "monthly":
        new_expiry = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    elif plan_id == "yearly":
        new_expiry = (datetime.now(timezone.utc) + timedelta(days=365)).isoformat()
    else:
        new_expiry = None

    if new_expiry:
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "premium_until": new_expiry,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        logger.info(f"Subscription renewed for user {user_id}, plan {plan_id} until {new_expiry}")


async def handle_subscription_cancelled(user_id: str, cancellation_date: str, db):
    """Handle subscription cancellation - allow access until period end"""
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "premium_cancelled_at": cancellation_date,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    logger.info(f"Subscription cancelled for user {user_id}, access until premium_until date")


async def handle_payment_failed(user_id: str, db):
    """Handle failed payment - set grace period"""
    from datetime import timedelta
    grace_period = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat()

    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "payment_failed": True,
            "grace_period_until": grace_period,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    logger.warning(f"Payment failed for user {user_id}, grace period until {grace_period}")


async def handle_subscription_expired(user_id: str, db):
    """Handle subscription expiry - revoke premium access"""
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {
            "is_premium": False,
            "premium_plan": None,
            "premium_expired_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    logger.info(f"Subscription expired for user {user_id}, premium access revoked")


async def handle_stripe_webhook(
    request_body: bytes,
    signature: str,
    db
) -> Dict[str, Any]:
    """Handle Stripe webhook events for subscription lifecycle"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout

    api_key = os.environ.get('STRIPE_API_KEY')
    if not api_key:
        return {"status": "error", "message": "Not configured"}

    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")

    try:
        webhook_response = await stripe_checkout.handle_webhook(request_body, signature)
        event_type = webhook_response.event_type

        # Update transaction based on webhook
        if webhook_response.session_id:
            transaction = await db.payment_transactions.find_one(
                {"session_id": webhook_response.session_id},
                {"_id": 0}
            )

            if transaction:
                await db.payment_transactions.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {
                        "status": webhook_response.event_type,
                        "payment_status": webhook_response.payment_status,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )

                user_id = transaction.get("user_id")
                plan_id = transaction.get("plan_id")

                # Handle specific subscription events
                if event_type == "checkout.session.completed" and webhook_response.payment_status == "paid":
                    # Initial subscription payment successful
                    logger.info(f"Initial subscription completed for user {user_id}")

                elif event_type == "invoice.payment_succeeded":
                    # Subscription renewal successful
                    await handle_subscription_renewal(user_id, plan_id, db)

                    # Send notification email (if email service is available)
                    try:
                        from email_service import send_email
                        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
                        if user and user.get("email"):
                            await send_email(
                                to=user["email"],
                                subject="Subscription Renewed - Kvitt Pro",
                                html=f"""
                                <h2>Your subscription has been renewed!</h2>
                                <p>Your {plan_id} subscription has been successfully renewed.</p>
                                <p>You'll continue to enjoy all Pro features.</p>
                                """
                            )
                    except Exception as e:
                        logger.warning(f"Could not send renewal email: {e}")

                elif event_type == "invoice.payment_failed":
                    # Payment failed - set grace period
                    await handle_payment_failed(user_id, db)

                    # Send notification email
                    try:
                        from email_service import send_email
                        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
                        if user and user.get("email"):
                            await send_email(
                                to=user["email"],
                                subject="Payment Failed - Kvitt Pro",
                                html=f"""
                                <h2>Payment Failed</h2>
                                <p>We were unable to process your subscription payment.</p>
                                <p>You have 3 days to update your payment method to avoid service interruption.</p>
                                <p><a href="{os.environ.get('FRONTEND_URL', '')}/premium">Update Payment Method</a></p>
                                """
                            )
                    except Exception as e:
                        logger.warning(f"Could not send payment failed email: {e}")

                elif event_type == "customer.subscription.deleted":
                    # Subscription cancelled/expired
                    await handle_subscription_expired(user_id, db)

                    # Send notification email
                    try:
                        from email_service import send_email
                        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
                        if user and user.get("email"):
                            await send_email(
                                to=user["email"],
                                subject="Subscription Ended - Kvitt Pro",
                                html=f"""
                                <h2>Subscription Ended</h2>
                                <p>Your Kvitt Pro subscription has ended.</p>
                                <p>You can resubscribe anytime to regain access to Pro features.</p>
                                <p><a href="{os.environ.get('FRONTEND_URL', '')}/premium">Resubscribe</a></p>
                                """
                            )
                    except Exception as e:
                        logger.warning(f"Could not send expiry email: {e}")

        return {"status": "success", "event_id": webhook_response.event_id, "event_type": event_type}

    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}



# ============================================
# DEBT SETTLEMENT PAYMENTS
# ============================================

class DebtPaymentRequest(BaseModel):
    ledger_id: str
    origin_url: str


async def create_debt_payment_link(
    ledger_id: str,
    from_user_id: str,
    from_user_email: str,
    to_user_id: str,
    to_user_name: str,
    amount: float,
    game_id: str,
    origin_url: str,
    db
) -> Dict[str, Any]:
    """Create a Stripe payment link for settling a debt between players"""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, 
        CheckoutSessionRequest,
        CheckoutSessionResponse
    )
    
    api_key = os.environ.get('STRIPE_API_KEY')
    
    if not api_key:
        raise HTTPException(status_code=500, detail="Payment service not configured")
    
    # Create Stripe checkout for the debt amount
    webhook_url = f"{origin_url}/api/webhook/stripe-debt"
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    # Build URLs
    success_url = f"{origin_url}/games/{game_id}/settlement?payment=success&ledger_id={ledger_id}"
    cancel_url = f"{origin_url}/games/{game_id}/settlement?payment=cancelled"
    
    # Create checkout request
    checkout_request = CheckoutSessionRequest(
        amount=float(amount),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "type": "debt_settlement",
            "ledger_id": ledger_id,
            "from_user_id": from_user_id,
            "to_user_id": to_user_id,
            "to_user_name": to_user_name,
            "game_id": game_id,
            "amount": str(amount)
        }
    )
    
    # Create session
    session: CheckoutSessionResponse = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Create debt payment record
    debt_payment = {
        "payment_id": f"debt_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}_{ledger_id[:8]}",
        "session_id": session.session_id,
        "ledger_id": ledger_id,
        "from_user_id": from_user_id,
        "from_user_email": from_user_email,
        "to_user_id": to_user_id,
        "to_user_name": to_user_name,
        "game_id": game_id,
        "amount": amount,
        "currency": "usd",
        "status": "pending",
        "payment_status": "initiated",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.debt_payments.insert_one(debt_payment)
    
    logger.info(f"Created debt payment session for ledger {ledger_id}, amount ${amount}")
    
    return {
        "checkout_url": session.url,
        "session_id": session.session_id,
        "amount": amount,
        "to_user_name": to_user_name
    }


async def handle_debt_payment_webhook(
    request_body: bytes,
    signature: str,
    db
) -> Dict[str, Any]:
    """Handle Stripe webhook events for debt payments"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout

    api_key = os.environ.get('STRIPE_API_KEY')
    if not api_key:
        return {"status": "error", "message": "Not configured"}

    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")

    try:
        webhook_response = await stripe_checkout.handle_webhook(request_body, signature)
        event_type = webhook_response.event_type

        # Update debt payment based on webhook
        if webhook_response.session_id:
            debt_payment = await db.debt_payments.find_one(
                {"session_id": webhook_response.session_id},
                {"_id": 0}
            )

            if debt_payment:
                await db.debt_payments.update_one(
                    {"session_id": webhook_response.session_id},
                    {"$set": {
                        "status": webhook_response.event_type,
                        "payment_status": webhook_response.payment_status,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )

                # If payment successful, mark ledger entry as paid
                if event_type == "checkout.session.completed" and webhook_response.payment_status == "paid":
                    ledger_id = debt_payment.get("ledger_id")
                    
                    # Update ledger entry
                    await db.ledger.update_one(
                        {"ledger_id": ledger_id},
                        {"$set": {
                            "status": "paid",
                            "paid_at": datetime.now(timezone.utc).isoformat(),
                            "paid_via": "stripe",
                            "stripe_session_id": webhook_response.session_id,
                            "is_locked": True
                        }}
                    )
                    
                    # Update debt payment record
                    await db.debt_payments.update_one(
                        {"session_id": webhook_response.session_id},
                        {"$set": {
                            "completed_at": datetime.now(timezone.utc).isoformat()
                        }}
                    )
                    
                    logger.info(f"Debt payment completed for ledger {ledger_id}")
                    
                    # Send notification to recipient
                    from_user = await db.users.find_one(
                        {"user_id": debt_payment["from_user_id"]},
                        {"_id": 0, "name": 1}
                    )
                    
                    notification = {
                        "notification_id": f"notif_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}",
                        "user_id": debt_payment["to_user_id"],
                        "type": "payment_received",
                        "title": "Payment Received!",
                        "message": f"{from_user.get('name', 'Someone')} paid you ${debt_payment['amount']:.2f} via Stripe",
                        "data": {
                            "ledger_id": ledger_id,
                            "game_id": debt_payment["game_id"],
                            "amount": debt_payment["amount"]
                        },
                        "read": False,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.notifications.insert_one(notification)

        return {"status": "success", "event_id": webhook_response.event_id, "event_type": event_type}

    except Exception as e:
        logger.error(f"Debt webhook error: {e}")
        return {"status": "error", "message": str(e)}
