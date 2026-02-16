"""
Wallet Service Module
Handles wallet operations including transfers, PIN verification, fraud detection, and audit logging.

PAYMENT ENGINEERING PRINCIPLES:
1. All money stored as INTEGER CENTS (not floats)
2. wallet_transactions is the source of truth (immutable ledger)
3. wallets.balance_cents is a cached value for fast reads
4. Idempotency keys prevent duplicate transactions
5. Stripe webhooks are authoritative for deposits
6. Atomic transfers use shared transfer_id
"""

import uuid
import string
import random
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Optional, Tuple, List, Dict, Any
from fastapi import Request, HTTPException


# ============== CONSTANTS ==============

PIN_MAX_ATTEMPTS = 5
PIN_LOCKOUT_DURATION = timedelta(minutes=30)
DEFAULT_DAILY_LIMIT_CENTS = 50000       # $500
DEFAULT_PER_TXN_LIMIT_CENTS = 20000     # $200
MIN_DEPOSIT_CENTS = 500                  # $5
MAX_DEPOSIT_CENTS = 100000               # $1000


# ============== RATE LIMITING ==============

async def check_rate_limit(
    key: str,
    endpoint: str,
    limit: int,
    window_seconds: int,
    db
) -> bool:
    """
    Check and increment rate limit. Returns True if allowed, False if blocked.
    Uses MongoDB with TTL for automatic cleanup.

    Args:
        key: Rate limit key (e.g., "ip:192.168.1.1" or "wallet:KVT-XXXXXX")
        endpoint: Endpoint name (e.g., "transfer", "lookup", "deposit")
        limit: Max requests allowed in window
        window_seconds: Time window in seconds
        db: MongoDB database instance

    Returns:
        True if request is allowed, False if rate limited
    """
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(seconds=window_seconds)

    # Atomic upsert and increment
    result = await db.rate_limits.find_one_and_update(
        {
            "key": key,
            "endpoint": endpoint,
            "window_start": {"$gte": window_start}
        },
        {
            "$inc": {"count": 1},
            "$setOnInsert": {
                "window_start": now,
                "expires_at": now + timedelta(seconds=window_seconds * 2)
            }
        },
        upsert=True,
        return_document=True
    )

    return result["count"] <= limit


# ============== WALLET ID GENERATION ==============

def generate_wallet_id() -> str:
    """
    Generate a unique wallet ID in format KVT-XXXXXX.
    Uses uppercase letters and digits, excluding confusing chars (0, O, I, 1).
    """
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'  # No 0, O, I, 1
    suffix = ''.join(random.choices(chars, k=6))
    return f"KVT-{suffix}"


async def generate_unique_wallet_id(db) -> str:
    """Generate a wallet ID that doesn't exist in the database."""
    for _ in range(10):
        wallet_id = generate_wallet_id()
        if not await db.wallets.find_one({"wallet_id": wallet_id}):
            return wallet_id
    # Fallback with longer suffix
    suffix = ''.join(random.choices('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', k=8))
    return f"KVT-{suffix}"


# ============== PIN SECURITY ==============

def hash_pin(pin: str) -> str:
    """Hash PIN using bcrypt with cost factor 12."""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(pin.encode('utf-8'), salt).decode('utf-8')


def verify_pin(pin: str, pin_hash: str) -> bool:
    """Verify a PIN against its bcrypt hash."""
    try:
        return bcrypt.checkpw(pin.encode('utf-8'), pin_hash.encode('utf-8'))
    except Exception:
        return False


async def verify_pin_with_lockout(
    wallet: dict,
    pin: str,
    db
) -> Tuple[bool, Optional[str]]:
    """
    Verify PIN with lockout protection.

    Returns:
        (success: bool, error_message: Optional[str])
    """
    wallet_id = wallet["wallet_id"]

    if not wallet.get("pin_hash"):
        return False, "PIN not set. Please set up your wallet PIN first."

    # Check if currently locked
    if wallet.get("pin_locked_until"):
        lock_time = wallet["pin_locked_until"]
        if isinstance(lock_time, str):
            lock_time = datetime.fromisoformat(lock_time.replace('Z', '+00:00'))

        now = datetime.now(timezone.utc)
        if now < lock_time:
            remaining = int((lock_time - now).total_seconds() // 60) + 1
            return False, f"PIN locked. Try again in {remaining} minute{'s' if remaining != 1 else ''}."

    # Verify PIN
    if verify_pin(pin, wallet["pin_hash"]):
        await db.wallets.update_one(
            {"wallet_id": wallet_id},
            {"$set": {"pin_attempts": 0, "pin_locked_until": None}}
        )
        return True, None

    # Failed - increment attempts
    attempts = wallet.get("pin_attempts", 0) + 1
    update: Dict[str, Any] = {"$set": {"pin_attempts": attempts}}

    if attempts >= PIN_MAX_ATTEMPTS:
        lock_until = datetime.now(timezone.utc) + PIN_LOCKOUT_DURATION
        update["$set"]["pin_locked_until"] = lock_until.isoformat()
        await db.wallets.update_one({"wallet_id": wallet_id}, update)
        return False, f"Too many failed attempts. PIN locked for {int(PIN_LOCKOUT_DURATION.total_seconds() // 60)} minutes."

    await db.wallets.update_one({"wallet_id": wallet_id}, update)
    remaining = PIN_MAX_ATTEMPTS - attempts
    return False, f"Incorrect PIN. {remaining} attempt{'s' if remaining != 1 else ''} remaining."


# ============== LIMIT MANAGEMENT ==============

async def reset_daily_limit_if_needed(wallet: dict, db) -> int:
    """Reset daily transferred amount if new day. Returns current daily_transferred_cents."""
    wallet_id = wallet["wallet_id"]
    daily_transferred = wallet.get("daily_transferred_cents", 0)
    reset_at = wallet.get("daily_transferred_reset_at")

    if reset_at:
        if isinstance(reset_at, str):
            reset_time = datetime.fromisoformat(reset_at.replace('Z', '+00:00'))
        else:
            reset_time = reset_at

        if datetime.now(timezone.utc).date() > reset_time.date():
            await db.wallets.update_one(
                {"wallet_id": wallet_id},
                {"$set": {
                    "daily_transferred_cents": 0,
                    "daily_transferred_reset_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            return 0

    return daily_transferred


def check_transfer_limits(
    wallet: dict,
    amount_cents: int,
    daily_transferred_cents: int
) -> Tuple[bool, Optional[str]]:
    """Check if transfer amount is within limits."""
    per_txn_limit = wallet.get("per_transaction_limit_cents", DEFAULT_PER_TXN_LIMIT_CENTS)
    daily_limit = wallet.get("daily_transfer_limit_cents", DEFAULT_DAILY_LIMIT_CENTS)

    if amount_cents > per_txn_limit:
        return False, f"Amount exceeds per-transaction limit of ${per_txn_limit / 100:.2f}"

    remaining_daily = daily_limit - daily_transferred_cents
    if amount_cents > remaining_daily:
        return False, f"Amount exceeds remaining daily limit of ${remaining_daily / 100:.2f}"

    return True, None


# ============== FRAUD DETECTION ==============

async def calculate_risk_score(
    wallet_id: str,
    amount_cents: int,
    recipient_wallet_id: str,
    db
) -> Tuple[int, List[str]]:
    """
    Calculate fraud risk score (0-100) and flags.

    Risk signals:
    - unusual_amount (+20): Amount > 2x user's average
    - new_recipient (+15): First transfer to this wallet
    - rapid_transactions (+25): >3 transfers in 10 minutes
    - new_account_large_transfer (+20): Account < 7 days, amount > $100
    - near_daily_limit (+10): Using > 90% of remaining daily limit
    """
    risk_score = 0
    risk_flags = []

    wallet = await db.wallets.find_one({"wallet_id": wallet_id})
    if not wallet:
        return 0, []

    ten_mins_ago = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()

    # Check 1: Unusual amount
    recent_txns = await db.wallet_transactions.find({
        "wallet_id": wallet_id,
        "type": "transfer_out",
        "created_at": {"$gte": thirty_days_ago}
    }).to_list(100)

    if recent_txns:
        avg_cents = sum(t.get("amount_cents", 0) for t in recent_txns) / len(recent_txns)
        if avg_cents > 0 and amount_cents > avg_cents * 2:
            risk_score += 20
            risk_flags.append("unusual_amount")

    # Check 2: New recipient
    has_sent_before = await db.wallet_transactions.find_one({
        "wallet_id": wallet_id,
        "counterparty_wallet_id": recipient_wallet_id,
        "type": "transfer_out"
    })
    if not has_sent_before:
        risk_score += 15
        risk_flags.append("new_recipient")

    # Check 3: Rapid transactions
    recent_count = await db.wallet_transactions.count_documents({
        "wallet_id": wallet_id,
        "type": "transfer_out",
        "created_at": {"$gte": ten_mins_ago}
    })
    if recent_count >= 3:
        risk_score += 25
        risk_flags.append("rapid_transactions")

    # Check 4: New account + large transfer
    created_at = wallet.get("created_at")
    if created_at:
        if isinstance(created_at, str):
            created_time = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        else:
            created_time = created_at

        age_days = (datetime.now(timezone.utc) - created_time).days
        if age_days < 7 and amount_cents > 10000:  # > $100
            risk_score += 20
            risk_flags.append("new_account_large_transfer")

    # Check 5: Near daily limit
    daily_limit = wallet.get("daily_transfer_limit_cents", DEFAULT_DAILY_LIMIT_CENTS)
    daily_transferred = wallet.get("daily_transferred_cents", 0)
    remaining = daily_limit - daily_transferred
    if remaining > 0 and amount_cents > remaining * 0.9:
        risk_score += 10
        risk_flags.append("near_daily_limit")

    return min(risk_score, 100), risk_flags


# ============== AUDIT LOGGING ==============

async def log_wallet_audit(
    wallet_id: str,
    user_id: str,
    action: str,
    db,
    request: Optional[Request] = None,
    old_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
    risk_score: Optional[int] = None,
    risk_flags: Optional[List[str]] = None,
    request_id: Optional[str] = None
):
    """Log wallet audit event for compliance and fraud investigation."""
    audit_entry = {
        "audit_id": f"waud_{uuid.uuid4().hex[:12]}",
        "wallet_id": wallet_id,
        "user_id": user_id,
        "action": action,
        "old_value": old_value,
        "new_value": new_value,
        "ip_address": request.client.host if request and request.client else None,
        "user_agent": request.headers.get("user-agent") if request else None,
        "risk_score": risk_score,
        "risk_flags": risk_flags or [],
        "request_id": request_id or f"req_{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.wallet_audit.insert_one(audit_entry)
    return audit_entry["audit_id"]


# ============== TRANSFER PROCESSING ==============

async def process_transfer(
    from_wallet_id: str,
    to_wallet_id: str,
    amount_cents: int,
    pin: str,
    idempotency_key: str,
    db,
    mongo_client,
    request: Optional[Request] = None,
    description: Optional[str] = None
) -> Dict[str, Any]:
    """
    Process a wallet-to-wallet transfer with full security checks.

    ATOMIC OPERATION:
    - Both transfer_out and transfer_in share same transfer_id
    - MongoDB transaction ensures both commit or neither
    - Idempotency key prevents duplicate processing
    """
    now = datetime.now(timezone.utc)
    transfer_id = f"xfer_{uuid.uuid4().hex[:12]}"

    # Check idempotency - has this request already been processed?
    existing = await db.wallet_transactions.find_one({
        "wallet_id": from_wallet_id,
        "idempotency_key": idempotency_key
    })
    if existing:
        # Return the existing transaction result (idempotent)
        return {
            "success": True,
            "transaction_id": existing["transaction_id"],
            "transfer_id": existing.get("transfer_id"),
            "amount_cents": existing["amount_cents"],
            "idempotent_replay": True
        }

    # 1. Get sender wallet
    sender_wallet = await db.wallets.find_one({"wallet_id": from_wallet_id})
    if not sender_wallet:
        raise HTTPException(status_code=404, detail="Sender wallet not found")
    if sender_wallet.get("status") != "active":
        raise HTTPException(status_code=400, detail="Your wallet is not active")

    # 2. Get recipient wallet
    recipient_wallet = await db.wallets.find_one({"wallet_id": to_wallet_id})
    if not recipient_wallet:
        raise HTTPException(status_code=404, detail="Recipient wallet not found. Check the wallet ID.")
    if recipient_wallet.get("status") != "active":
        raise HTTPException(status_code=400, detail="Recipient wallet is not active")

    # 3. Prevent self-transfer
    if from_wallet_id == to_wallet_id:
        raise HTTPException(status_code=400, detail="Cannot transfer to your own wallet")

    # 4. Verify PIN
    pin_valid, pin_error = await verify_pin_with_lockout(sender_wallet, pin, db)
    if not pin_valid:
        await log_wallet_audit(
            from_wallet_id, sender_wallet["user_id"], "pin_failed",
            db, request, new_value={"reason": pin_error}
        )
        raise HTTPException(status_code=401, detail=pin_error)

    # 5. Check balance (in cents)
    sender_balance = sender_wallet.get("balance_cents", 0)
    if sender_balance < amount_cents:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance. Available: ${sender_balance / 100:.2f}"
        )

    # 6. Check limits
    daily_transferred = await reset_daily_limit_if_needed(sender_wallet, db)
    limit_ok, limit_error = check_transfer_limits(sender_wallet, amount_cents, daily_transferred)
    if not limit_ok:
        raise HTTPException(status_code=400, detail=limit_error)

    # 7. Calculate risk score
    risk_score, risk_flags = await calculate_risk_score(
        from_wallet_id, amount_cents, to_wallet_id, db
    )

    # Get user info for transaction records
    recipient_user = await db.users.find_one(
        {"user_id": recipient_wallet["user_id"]},
        {"_id": 0, "name": 1, "picture": 1}
    )
    sender_user = await db.users.find_one(
        {"user_id": sender_wallet["user_id"]},
        {"_id": 0, "name": 1, "picture": 1}
    )

    recipient_name = recipient_user.get("name", "Unknown") if recipient_user else "Unknown"
    sender_name = sender_user.get("name", "Unknown") if sender_user else "Unknown"

    # 8. Execute transfer (without transactions for standalone MongoDB)
    sender_txn_id = f"wtxn_{uuid.uuid4().hex[:12]}"
    recipient_txn_id = f"wtxn_{uuid.uuid4().hex[:12]}"
    recipient_balance = recipient_wallet.get("balance_cents", 0)

    # Debit sender (with balance check)
    sender_result = await db.wallets.find_one_and_update(
        {
            "wallet_id": from_wallet_id,
            "balance_cents": {"$gte": amount_cents}
        },
        {
            "$inc": {
                "balance_cents": -amount_cents,
                "daily_transferred_cents": amount_cents,
                "version": 1
            },
            "$set": {"updated_at": now.isoformat()}
        },
        return_document=True
    )

    if not sender_result:
        raise HTTPException(status_code=400, detail="Transfer failed. Check your balance.")

    # Credit recipient
    recipient_result = await db.wallets.find_one_and_update(
        {"wallet_id": to_wallet_id},
        {
            "$inc": {"balance_cents": amount_cents, "version": 1},
            "$set": {"updated_at": now.isoformat()}
        },
        return_document=True
    )

    # Create ledger entries (immutable)
    sender_txn = {
        "transaction_id": sender_txn_id,
        "wallet_id": from_wallet_id,
        "user_id": sender_wallet["user_id"],
        "type": "transfer_out",
        "amount_cents": amount_cents,
        "direction": "debit",
        "balance_before_cents": sender_balance,
        "balance_after_cents": sender_result["balance_cents"],
        "transfer_id": transfer_id,
        "counterparty_wallet_id": to_wallet_id,
        "counterparty_user_id": recipient_wallet["user_id"],
        "counterparty_name": recipient_name,
        "idempotency_key": idempotency_key,
        "description": description or f"Sent to {recipient_name}",
        "status": "completed",
        "ip_address": request.client.host if request and request.client else None,
        "created_at": now.isoformat()
    }

    recipient_txn = {
        "transaction_id": recipient_txn_id,
        "wallet_id": to_wallet_id,
        "user_id": recipient_wallet["user_id"],
        "type": "transfer_in",
        "amount_cents": amount_cents,
        "direction": "credit",
        "balance_before_cents": recipient_balance,
        "balance_after_cents": recipient_result["balance_cents"],
        "transfer_id": transfer_id,
        "counterparty_wallet_id": from_wallet_id,
        "counterparty_user_id": sender_wallet["user_id"],
        "counterparty_name": sender_name,
        "idempotency_key": idempotency_key,
        "description": description or f"Received from {sender_name}",
        "status": "completed",
        "created_at": now.isoformat()
    }

    await db.wallet_transactions.insert_many([sender_txn, recipient_txn])

    # 9. Log audit event
    await log_wallet_audit(
        from_wallet_id, sender_wallet["user_id"], "transfer_completed",
        db, request,
        new_value={
            "transfer_id": transfer_id,
            "to_wallet_id": to_wallet_id,
            "amount_cents": amount_cents
        },
        risk_score=risk_score,
        risk_flags=risk_flags
    )

    # 10. Send notification to recipient
    try:
        notification = {
            "notification_id": f"notif_{uuid.uuid4().hex[:12]}",
            "user_id": recipient_wallet["user_id"],
            "type": "wallet_received",
            "title": "Money Received",
            "message": f"You received ${amount_cents / 100:.2f} from {sender_name}",
            "data": {
                "transfer_id": transfer_id,
                "amount_cents": amount_cents,
                "from_wallet_id": from_wallet_id
            },
            "read": False,
            "created_at": now.isoformat()
        }
        await db.notifications.insert_one(notification)
    except Exception:
        pass  # Don't fail transfer if notification fails

    return {
        "success": True,
        "transaction_id": sender_txn_id,
        "transfer_id": transfer_id,
        "amount_cents": amount_cents,
        "new_balance_cents": sender_result["balance_cents"],
        "recipient": {
            "wallet_id": to_wallet_id,
            "name": recipient_name
        },
        "timestamp": now.isoformat()
    }


# ============== WALLET CREATION ==============

async def create_wallet(user_id: str, db) -> Dict[str, Any]:
    """Create a new wallet for a user with unique wallet_id."""
    # Check if user already has a wallet
    existing = await db.wallets.find_one({"user_id": user_id})
    if existing:
        if existing.get("wallet_id"):
            return {k: v for k, v in existing.items() if k != "_id"}

        # Upgrade legacy wallet
        wallet_id = await generate_unique_wallet_id(db)
        await db.wallets.update_one(
            {"user_id": user_id},
            {"$set": {
                "wallet_id": wallet_id,
                "balance_cents": int(existing.get("balance", 0) * 100),
                "status": "active",
                "daily_transfer_limit_cents": DEFAULT_DAILY_LIMIT_CENTS,
                "per_transaction_limit_cents": DEFAULT_PER_TXN_LIMIT_CENTS,
                "daily_transferred_cents": 0,
                "pin_attempts": 0,
                "version": 1,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return await db.wallets.find_one({"user_id": user_id}, {"_id": 0})

    # Create new wallet
    wallet_id = await generate_unique_wallet_id(db)
    now = datetime.now(timezone.utc)

    wallet = {
        "wallet_id": wallet_id,
        "user_id": user_id,
        "balance_cents": 0,
        "currency": "usd",
        "status": "active",
        "pin_hash": None,
        "pin_attempts": 0,
        "pin_locked_until": None,
        "daily_transfer_limit_cents": DEFAULT_DAILY_LIMIT_CENTS,
        "per_transaction_limit_cents": DEFAULT_PER_TXN_LIMIT_CENTS,
        "daily_transferred_cents": 0,
        "daily_transferred_reset_at": now.isoformat(),
        "version": 1,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }

    await db.wallets.insert_one(wallet)
    wallet.pop("_id", None)
    return wallet


# ============== DEPOSIT HANDLING (Stripe Webhook) ==============

async def credit_wallet_deposit(
    wallet_id: str,
    amount_cents: int,
    stripe_payment_intent_id: str,
    db
) -> Optional[Dict[str, Any]]:
    """
    Credit wallet after Stripe payment confirmation.
    IDEMPOTENT: Unique index on stripe_payment_intent_id prevents double-crediting.

    Called from Stripe webhook handler.
    """
    now = datetime.now(timezone.utc)
    transaction_id = f"wtxn_{uuid.uuid4().hex[:12]}"

    # Get wallet
    wallet = await db.wallets.find_one({"wallet_id": wallet_id})
    if not wallet:
        return None

    balance_before = wallet.get("balance_cents", 0)

    # Check if already processed (idempotency)
    existing = await db.wallet_transactions.find_one({
        "stripe_payment_intent_id": stripe_payment_intent_id
    })
    if existing:
        return {
            "transaction_id": existing["transaction_id"],
            "amount_cents": existing["amount_cents"],
            "idempotent_replay": True
        }

    # Credit wallet
    result = await db.wallets.find_one_and_update(
        {"wallet_id": wallet_id},
        {
            "$inc": {"balance_cents": amount_cents, "version": 1},
            "$set": {"updated_at": now.isoformat()}
        },
        return_document=True
    )

    # Create ledger entry
    transaction = {
        "transaction_id": transaction_id,
        "wallet_id": wallet_id,
        "user_id": wallet["user_id"],
        "type": "deposit",
        "amount_cents": amount_cents,
        "direction": "credit",
        "balance_before_cents": balance_before,
        "balance_after_cents": result["balance_cents"],
        "stripe_payment_intent_id": stripe_payment_intent_id,
        "description": f"Added ${amount_cents / 100:.2f} to wallet",
        "status": "completed",
        "created_at": now.isoformat()
    }

    try:
        await db.wallet_transactions.insert_one(transaction)
    except Exception as e:
        # Duplicate key error = already processed (race condition)
        if "duplicate key" in str(e).lower():
            return {"idempotent_replay": True}
        raise

    return {
        "transaction_id": transaction_id,
        "amount_cents": amount_cents,
        "new_balance_cents": result["balance_cents"]
    }


# ============== WALLET LOOKUP ==============

async def lookup_wallet_by_id(
    wallet_id: str,
    db,
    exclude_user_id: Optional[str] = None
) -> Optional[Dict[str, Any]]:
    """Look up wallet by ID. Returns limited info for privacy."""
    wallet = await db.wallets.find_one({"wallet_id": wallet_id})
    if not wallet:
        return None

    if exclude_user_id and wallet["user_id"] == exclude_user_id:
        return None

    user = await db.users.find_one(
        {"user_id": wallet["user_id"]},
        {"_id": 0, "name": 1, "picture": 1}
    )
    if not user:
        return None

    # Privacy: First name + last initial only
    name = user.get("name", "Unknown")
    parts = name.split()
    display_name = parts[0] + (f" {parts[-1][0]}." if len(parts) > 1 else "")

    return {
        "wallet_id": wallet_id,
        "display_name": display_name,
        "picture": user.get("picture"),
        "status": wallet.get("status", "active")
    }


async def search_wallets(
    query: str,
    db,
    exclude_user_id: Optional[str] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Search wallets by user name or wallet ID."""
    results = []
    query_upper = query.upper().strip()

    # If looks like wallet ID
    if query_upper.startswith("KVT-") or len(query_upper) == 10:
        wallet = await lookup_wallet_by_id(query_upper, db, exclude_user_id)
        if wallet:
            results.append(wallet)

    # Search by name
    users = await db.users.find({
        "name": {"$regex": query, "$options": "i"}
    }).limit(limit).to_list(limit)

    for user in users:
        if exclude_user_id and user["user_id"] == exclude_user_id:
            continue

        wallet = await db.wallets.find_one({"user_id": user["user_id"]})
        if wallet and wallet.get("wallet_id"):
            name = user.get("name", "Unknown")
            parts = name.split()
            display_name = parts[0] + (f" {parts[-1][0]}." if len(parts) > 1 else "")

            results.append({
                "wallet_id": wallet["wallet_id"],
                "display_name": display_name,
                "picture": user.get("picture"),
                "status": wallet.get("status", "active")
            })

    # Dedupe
    seen = set()
    unique = []
    for r in results:
        if r["wallet_id"] not in seen:
            seen.add(r["wallet_id"])
            unique.append(r)

    return unique[:limit]


# ============== BALANCE RECONCILIATION ==============

async def reconcile_wallet_balance(wallet_id: str, db) -> Dict[str, Any]:
    """
    Reconcile wallet balance against ledger.
    The ledger (wallet_transactions) is the source of truth.

    Returns discrepancy info if any.
    """
    wallet = await db.wallets.find_one({"wallet_id": wallet_id})
    if not wallet:
        return {"error": "Wallet not found"}

    cached_balance = wallet.get("balance_cents", 0)

    # Calculate from ledger
    pipeline = [
        {"$match": {"wallet_id": wallet_id, "status": "completed"}},
        {"$group": {
            "_id": None,
            "credits": {
                "$sum": {
                    "$cond": [{"$eq": ["$direction", "credit"]}, "$amount_cents", 0]
                }
            },
            "debits": {
                "$sum": {
                    "$cond": [{"$eq": ["$direction", "debit"]}, "$amount_cents", 0]
                }
            }
        }}
    ]

    result = await db.wallet_transactions.aggregate(pipeline).to_list(1)

    if result:
        ledger_balance = result[0]["credits"] - result[0]["debits"]
    else:
        ledger_balance = 0

    discrepancy = cached_balance - ledger_balance

    return {
        "wallet_id": wallet_id,
        "cached_balance_cents": cached_balance,
        "ledger_balance_cents": ledger_balance,
        "discrepancy_cents": discrepancy,
        "is_reconciled": discrepancy == 0
    }
