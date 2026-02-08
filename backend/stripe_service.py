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


async def handle_stripe_webhook(
    request_body: bytes,
    signature: str,
    db
) -> Dict[str, Any]:
    """Handle Stripe webhook events"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = os.environ.get('STRIPE_API_KEY')
    if not api_key:
        return {"status": "error", "message": "Not configured"}
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    try:
        webhook_response = await stripe_checkout.handle_webhook(request_body, signature)
        
        # Update transaction based on webhook
        if webhook_response.session_id:
            await db.payment_transactions.update_one(
                {"session_id": webhook_response.session_id},
                {"$set": {
                    "status": webhook_response.event_type,
                    "payment_status": webhook_response.payment_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        return {"status": "success", "event_id": webhook_response.event_id}
        
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}
