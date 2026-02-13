from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
import random
from datetime import datetime, timezone, timedelta
import httpx
import jwt
from jwt import PyJWKClient
import socketio

# Setup logging early
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent

# Fun poker-themed default names
GROUP_NAME_PREFIXES = ["High Rollers", "Royal Flush", "Pocket Aces", "All In", "Full House", 
                       "The Sharks", "Diamond Club", "Lucky 7s", "Card Kings", "Chip Leaders",
                       "Bluff Masters", "Texas Holdem", "River Rats", "Flop House", "Ante Up"]

GAME_NAME_PREFIXES = ["Friday Night", "Saturday Showdown", "The Big Game", "Cash Game", 
                      "Tournament Time", "High Stakes", "Dealer's Choice", "Wild Card Night",
                      "Poker Party", "All-In Action", "River Run", "Final Table", "House Game"]

def generate_default_group_name():
    """Generate a fun default group name."""
    prefix = random.choice(GROUP_NAME_PREFIXES)
    suffix = random.randint(1, 99)
    return f"{prefix} #{suffix}"

def generate_default_game_name():
    """Generate a fun default game name."""
    prefix = random.choice(GAME_NAME_PREFIXES)
    return prefix
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Supabase config
SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET', '')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')

# Initialize JWKS client for RS256 verification (new Supabase signing keys)
jwks_client = None
if SUPABASE_URL:
    try:
        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/jwks"
        jwks_client = PyJWKClient(jwks_url)
        logger.info(f"✅ JWKS client initialized: {jwks_url}")
    except Exception as e:
        logger.warning(f"Failed to initialize JWKS client: {e}")

# Import WebSocket manager
from websocket_manager import sio, emit_game_event, notify_player_joined, notify_buy_in, notify_cash_out, notify_chips_edited, notify_game_message, notify_game_state_change, emit_notification

# Create the main app
app = FastAPI(title="ODDSIDE API")

# Wrap FastAPI with Socket.IO
socket_app = socketio.ASGIApp(sio, other_asgi_app=app)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ============== MODELS ==============

# Badge/Level definitions
LEVELS = [
    {"name": "Rookie", "min_games": 0, "min_profit": -999999, "icon": "🎯"},
    {"name": "Regular", "min_games": 5, "min_profit": -999999, "icon": "🃏"},
    {"name": "Pro", "min_games": 20, "min_profit": 0, "icon": "⭐"},
    {"name": "VIP", "min_games": 50, "min_profit": 100, "icon": "💎"},
    {"name": "Legend", "min_games": 100, "min_profit": 500, "icon": "👑"}
]

BADGES = [
    {"id": "first_win", "name": "First Blood", "description": "Win your first game", "icon": "🏆"},
    {"id": "winning_streak_3", "name": "Hot Streak", "description": "Win 3 games in a row", "icon": "🔥"},
    {"id": "winning_streak_5", "name": "On Fire", "description": "Win 5 games in a row", "icon": "💥"},
    {"id": "big_win", "name": "Big Winner", "description": "Win $100+ in a single game", "icon": "💰"},
    {"id": "huge_win", "name": "Jackpot", "description": "Win $500+ in a single game", "icon": "🎰"},
    {"id": "games_10", "name": "Dedicated", "description": "Play 10 games", "icon": "🎲"},
    {"id": "games_50", "name": "Veteran", "description": "Play 50 games", "icon": "🎖️"},
    {"id": "games_100", "name": "Centurion", "description": "Play 100 games", "icon": "🏅"},
    {"id": "host_5", "name": "Host Master", "description": "Host 5 games", "icon": "🏠"},
    {"id": "comeback", "name": "Comeback Kid", "description": "Win after being down 50%+", "icon": "💪"},
    {"id": "consistent", "name": "Consistent", "description": "Profit in 5 consecutive games", "icon": "📈"},
    {"id": "social", "name": "Social Butterfly", "description": "Play with 10+ different players", "icon": "🦋"},
]

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    supabase_id: Optional[str] = None
    level: str = "Rookie"
    total_games: int = 0
    total_profit: float = 0.0
    badges: List[str] = []  # List of badge IDs earned
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GroupInvite(BaseModel):
    model_config = ConfigDict(extra="ignore")
    invite_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    group_id: str
    invited_by: str  # user_id who sent invite
    invited_email: str  # email of person being invited
    invited_user_id: Optional[str] = None  # if user exists
    status: str = "pending"  # pending, accepted, rejected, expired
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    responded_at: Optional[datetime] = None

class Group(BaseModel):
    model_config = ConfigDict(extra="ignore")
    group_id: str = Field(default_factory=lambda: f"grp_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    default_buy_in: float = 20.0
    default_chip_value: float = 1.0  # Value per chip (e.g., $1 per chip)
    chips_per_buy_in: int = 20  # Number of chips per buy-in
    currency: str = "USD"
    max_players: int = 20

class GroupMember(BaseModel):
    model_config = ConfigDict(extra="ignore")
    member_id: str = Field(default_factory=lambda: f"mem_{uuid.uuid4().hex[:12]}")
    group_id: str
    user_id: str
    role: str = "member"  # admin, member
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    nickname: Optional[str] = None

class Subscriber(BaseModel):
    """Email subscriber for waitlist, newsletter, and feature updates"""
    model_config = ConfigDict(extra="ignore")
    subscriber_id: str = Field(default_factory=lambda: f"sub_{uuid.uuid4().hex[:12]}")
    email: str
    source: str = "landing"  # landing, hero, footer, waitlist_ai, waitlist_music, waitlist_charts
    interests: List[str] = []  # ai_assistant, music_integration, charts, newsletter
    subscribed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified: bool = False
    unsubscribed: bool = False
    unsubscribed_at: Optional[datetime] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class GameNight(BaseModel):
    model_config = ConfigDict(extra="ignore")
    game_id: str = Field(default_factory=lambda: f"game_{uuid.uuid4().hex[:12]}")
    group_id: str
    host_id: str  # user_id
    title: Optional[str] = None
    location: Optional[str] = None  # e.g., "Host's place"
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    status: str = "scheduled"  # scheduled, active, ended, settled, cancelled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    is_finalized: bool = False
    chip_value: float = 1.0  # Value per chip for this game
    chips_per_buy_in: int = 20  # Chips given per buy-in
    buy_in_amount: float = 20.0  # Dollar amount per buy-in
    total_chips_distributed: int = 0  # Track total chips in play
    total_chips_returned: int = 0  # Track chips returned
    cancelled_by: Optional[str] = None
    cancel_reason: Optional[str] = None

class Player(BaseModel):
    model_config = ConfigDict(extra="ignore")
    player_id: str = Field(default_factory=lambda: f"plr_{uuid.uuid4().hex[:12]}")
    game_id: str
    user_id: str
    total_buy_in: float = 0.0
    total_chips: int = 0  # Total chips received
    chips_returned: Optional[int] = None  # Chips returned at end
    cash_out: Optional[float] = None
    net_result: Optional[float] = None
    rsvp_status: str = "pending"  # pending, yes, maybe, no
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    cashed_out_at: Optional[datetime] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    game_id: str
    user_id: str
    type: str  # buy_in, cash_out, rebuy
    amount: float
    chips: int = 0  # Number of chips involved
    chip_value: float = 1.0  # Value per chip at time of transaction
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None

class LedgerEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    ledger_id: str = Field(default_factory=lambda: f"led_{uuid.uuid4().hex[:12]}")
    group_id: str
    game_id: str
    from_user_id: str
    to_user_id: str
    amount: float
    status: str = "pending"  # pending, paid
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    paid_at: Optional[datetime] = None
    is_locked: bool = False

class AuditLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    audit_id: str = Field(default_factory=lambda: f"aud_{uuid.uuid4().hex[:12]}")
    entity_type: str  # ledger, game, transaction
    entity_id: str
    action: str  # create, update, delete
    old_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    changed_by: str  # user_id
    reason: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    notification_id: str = Field(default_factory=lambda: f"ntf_{uuid.uuid4().hex[:12]}")
    user_id: str
    type: str  # game_invite, settlement_request, game_started, etc.
    title: str
    message: str
    data: Optional[Dict[str, Any]] = None
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class GameThread(BaseModel):
    model_config = ConfigDict(extra="ignore")
    message_id: str = Field(default_factory=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    game_id: str
    user_id: str
    content: str
    type: str = "user"  # user, system
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== REQUEST/RESPONSE MODELS ==============

class SessionRequest(BaseModel):
    session_id: str

class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    default_buy_in: float = 20.0  # Must be one of: 5, 10, 20, 50, 100
    chips_per_buy_in: int = 20
    currency: str = "USD"

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_buy_in: Optional[float] = None
    chips_per_buy_in: Optional[int] = None

class GameNightCreate(BaseModel):
    group_id: str
    title: Optional[str] = None
    location: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    buy_in_amount: float = 20.0
    chips_per_buy_in: int = 20

class GameNightUpdate(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    scheduled_at: Optional[datetime] = None

class BuyInRequest(BaseModel):
    amount: float
    chips: Optional[int] = None  # If not provided, calculated from game settings

class CashOutRequest(BaseModel):
    chips_returned: int  # Number of chips being returned

class RSVPRequest(BaseModel):
    status: str  # yes, maybe, no

class ThreadMessageCreate(BaseModel):
    content: str

class MarkPaidRequest(BaseModel):
    paid: bool

class LedgerEditRequest(BaseModel):
    amount: float
    reason: str

class InviteMemberRequest(BaseModel):
    email: str

class AddPlayerRequest(BaseModel):
    user_id: str

class CancelGameRequest(BaseModel):
    reason: Optional[str] = None

class SearchUsersRequest(BaseModel):
    query: str  # Search by name or email

class RespondToInviteRequest(BaseModel):
    accept: bool

class AdminBuyInRequest(BaseModel):
    user_id: str
    amount: float

class RequestBuyInRequest(BaseModel):
    amount: float

class RequestCashOutRequest(BaseModel):
    chips_count: int

class AdminCashOutRequest(BaseModel):
    user_id: str
    chips_count: int

class EditPlayerChipsRequest(BaseModel):
    user_id: str
    chips_count: int
    reason: Optional[str] = None

# ============== AUTH HELPERS ==============

async def verify_supabase_jwt(token: str) -> dict:
    """
    Verify Supabase JWT using either:
    1. New JWKS method (RS256) - auto-fetches public keys
    2. Legacy secret method (HS256) - uses shared secret
    """
    # Try new JWKS method first (RS256)
    if jwks_client:
        try:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience="authenticated"
            )
            logger.debug("JWT verified using JWKS (RS256)")
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except Exception as e:
            logger.debug(f"JWKS verification failed: {e}")

    # Fallback to legacy secret method (HS256)
    if SUPABASE_JWT_SECRET:
        try:
            payload = jwt.decode(
                token,
                SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated"
            )
            logger.debug("JWT verified using legacy secret (HS256)")
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except Exception as e:
            logger.debug(f"Legacy secret verification failed: {e}")

    return None

async def get_current_user(request: Request) -> User:
    """Get current authenticated user from session token or Supabase JWT."""
    # Check Authorization header first for JWT
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]

        # Try Supabase JWT first (with JWKS or legacy secret)
        if jwks_client or SUPABASE_JWT_SECRET:
            payload = await verify_supabase_jwt(token)
            if payload:
                supabase_id = payload.get("sub")
                user_doc = await db.users.find_one(
                    {"supabase_id": supabase_id},
                    {"_id": 0}
                )
                if user_doc:
                    return User(**user_doc)
        
        # Fallback to session token
        session_doc = await db.user_sessions.find_one(
            {"session_token": token},
            {"_id": 0}
        )
        if session_doc:
            expires_at = session_doc["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user_doc = await db.users.find_one(
                    {"user_id": session_doc["user_id"]},
                    {"_id": 0}
                )
                if user_doc:
                    return User(**user_doc)
    
    # Check cookie
    session_token = request.cookies.get("session_token")
    if session_token:
        session_doc = await db.user_sessions.find_one(
            {"session_token": session_token},
            {"_id": 0}
        )
        
        if session_doc:
            expires_at = session_doc["expires_at"]
            if isinstance(expires_at, str):
                expires_at = datetime.fromisoformat(expires_at)
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            if expires_at >= datetime.now(timezone.utc):
                user_doc = await db.users.find_one(
                    {"user_id": session_doc["user_id"]},
                    {"_id": 0}
                )
                if user_doc:
                    return User(**user_doc)
    
    raise HTTPException(status_code=401, detail="Not authenticated")

# ============== AUTH ENDPOINTS ==============

class SyncUserRequest(BaseModel):
    supabase_id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None

@api_router.post("/auth/sync-user")
async def sync_user(data: SyncUserRequest, response: Response):
    """Sync Supabase user to MongoDB after authentication."""
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    
    # Check if user exists by supabase_id or email
    existing_user = await db.users.find_one(
        {"$or": [{"supabase_id": data.supabase_id}, {"email": data.email}]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "supabase_id": data.supabase_id,
                "name": data.name or existing_user.get("name"),
                "picture": data.picture or existing_user.get("picture")
            }}
        )
        is_new_user = False
    else:
        new_user = {
            "user_id": user_id,
            "supabase_id": data.supabase_id,
            "email": data.email,
            "name": data.name or data.email.split('@')[0],
            "picture": data.picture,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
        is_new_user = True
        
        # Send welcome email for new users (async, non-blocking)
        try:
            from email_service import send_welcome_email
            asyncio.create_task(send_welcome_email(data.email, data.name or data.email.split('@')[0]))
        except Exception as e:
            logger.warning(f"Failed to send welcome email: {e}")
    
    # Create a session for cookie-based auth as backup
    session_token = str(uuid.uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Check for pending group invites for this email
    pending_invites = await db.group_invites.find(
        {"invited_email": data.email, "status": "pending", "invited_user_id": None}
    ).to_list(100)
    
    for invite in pending_invites:
        await db.group_invites.update_one(
            {"invite_id": invite["invite_id"]},
            {"$set": {"invited_user_id": user_id}}
        )
        # Create notification
        group = await db.groups.find_one({"group_id": invite["group_id"]}, {"_id": 0, "name": 1})
        inviter = await db.users.find_one({"user_id": invite["invited_by"]}, {"_id": 0, "name": 1})
        notification = Notification(
            user_id=user_id,
            type="group_invite_request",
            title="Group Invitation",
            message=f"{inviter['name'] if inviter else 'Someone'} invited you to join {group['name'] if group else 'a group'}",
            data={"group_id": invite["group_id"], "invite_id": invite["invite_id"]}
        )
        notif_dict = notification.model_dump()
        notif_dict["created_at"] = notif_dict["created_at"].isoformat()
        await db.notifications.insert_one(notif_dict)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    # Add pending invite count
    invite_count = len(pending_invites)
    if invite_count > 0:
        user_doc["pending_invites"] = invite_count
    
    return user_doc

@api_router.post("/auth/session")
async def create_session(request: SessionRequest, response: Response):
    """Exchange session_id for session_token after OAuth."""
    try:
        auth_service_url = os.environ.get('AUTH_SERVICE_URL', 'https://demobackend.emergentagent.com')
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(
                f"{auth_service_url}/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": request.session_id}
            )
            
            if resp.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session ID")
            
            data = resp.json()
    except httpx.RequestError as e:
        logger.error(f"Auth service error: {e}")
        raise HTTPException(status_code=500, detail="Authentication service unavailable")
    
    # Create or update user
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    existing_user = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    
    if existing_user:
        user_id = existing_user["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": data.get("name", existing_user.get("name")),
                "picture": data.get("picture", existing_user.get("picture"))
            }}
        )
    else:
        new_user = {
            "user_id": user_id,
            "email": data["email"],
            "name": data.get("name", "Player"),
            "picture": data.get("picture"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Create session
    session_token = data.get("session_token", str(uuid.uuid4()))
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_doc = {
        "session_id": str(uuid.uuid4()),
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.user_sessions.insert_one(session_doc)
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user_doc

@api_router.get("/auth/me")
async def get_me(user: User = Depends(get_current_user)):
    """Get current user data."""
    return user.model_dump()

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout and clear session."""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.user_sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============== GROUP ENDPOINTS ==============

@api_router.post("/groups", response_model=dict)
async def create_group(data: GroupCreate, user: User = Depends(get_current_user)):
    """Create a new group."""
    # Use default name if not provided or empty
    group_name = data.name.strip() if data.name and data.name.strip() else generate_default_group_name()
    
    group = Group(
        name=group_name,
        description=data.description,
        created_by=user.user_id,
        default_buy_in=data.default_buy_in,
        currency=data.currency
    )
    
    group_dict = group.model_dump()
    group_dict["created_at"] = group_dict["created_at"].isoformat()
    await db.groups.insert_one(group_dict)
    
    # Add creator as admin
    member = GroupMember(
        group_id=group.group_id,
        user_id=user.user_id,
        role="admin"
    )
    member_dict = member.model_dump()
    member_dict["joined_at"] = member_dict["joined_at"].isoformat()
    await db.group_members.insert_one(member_dict)
    
    return {"group_id": group.group_id, "name": group.name}

@api_router.get("/groups/buy-in-options")
async def get_buy_in_options():
    """Get available buy-in denomination options."""
    return {
        "denominations": [5, 10, 20, 50, 100],
        "chip_options": [10, 20, 50, 100]
    }

@api_router.get("/groups")
async def get_groups(user: User = Depends(get_current_user)):
    """Get all groups user is a member of."""
    memberships = await db.group_members.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    
    group_ids = [m["group_id"] for m in memberships]
    groups = await db.groups.find(
        {"group_id": {"$in": group_ids}},
        {"_id": 0}
    ).to_list(100)
    
    # Add member count and user's role
    for group in groups:
        count = await db.group_members.count_documents({"group_id": group["group_id"]})
        group["member_count"] = count
        membership = next((m for m in memberships if m["group_id"] == group["group_id"]), None)
        group["user_role"] = membership["role"] if membership else None
    
    return groups

@api_router.get("/groups/{group_id}")
async def get_group(group_id: str, user: User = Depends(get_current_user)):
    """Get group details."""
    # Verify membership
    membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    group = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Get members with user info (batched query)
    members = await db.group_members.find(
        {"group_id": group_id},
        {"_id": 0}
    ).to_list(100)
    
    # Batch fetch user info for all members
    user_ids = [m["user_id"] for m in members]
    users = await db.users.find(
        {"user_id": {"$in": user_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1}
    ).to_list(100)
    user_map = {u["user_id"]: u for u in users}
    
    for member in members:
        member["user"] = user_map.get(member["user_id"])
    
    group["members"] = members
    group["user_role"] = membership["role"]
    
    return group

@api_router.put("/groups/{group_id}")
async def update_group(group_id: str, data: GroupUpdate, user: User = Depends(get_current_user)):
    """Update group (admin only)."""
    membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership or membership["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.groups.update_one({"group_id": group_id}, {"$set": update_data})
    
    return {"message": "Group updated"}

@api_router.post("/groups/{group_id}/invite")
async def invite_member(group_id: str, data: InviteMemberRequest, user: User = Depends(get_current_user)):
    """Invite a user to group by email. Works for both registered and unregistered users."""
    membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    group = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
    inviter = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "name": 1})
    
    # Check if user exists
    invited_user = await db.users.find_one({"email": data.email}, {"_id": 0})
    
    if invited_user:
        # Check if already a member
        existing = await db.group_members.find_one(
            {"group_id": group_id, "user_id": invited_user["user_id"]},
            {"_id": 0}
        )
        if existing:
            raise HTTPException(status_code=400, detail="User already a member")
        
        # Check for pending invite
        pending = await db.group_invites.find_one({
            "group_id": group_id,
            "invited_email": data.email,
            "status": "pending"
        }, {"_id": 0})
        if pending:
            raise HTTPException(status_code=400, detail="Invite already sent")
        
        # Create invite for existing user
        invite = GroupInvite(
            group_id=group_id,
            invited_by=user.user_id,
            invited_email=data.email,
            invited_user_id=invited_user["user_id"]
        )
        invite_dict = invite.model_dump()
        invite_dict["created_at"] = invite_dict["created_at"].isoformat()
        await db.group_invites.insert_one(invite_dict)
        
        # Create notification for the user
        notification = Notification(
            user_id=invited_user["user_id"],
            type="group_invite_request",
            title="Group Invitation",
            message=f"{inviter['name']} invited you to join {group['name']}",
            data={"group_id": group_id, "invite_id": invite.invite_id, "inviter_name": inviter['name']}
        )
        notif_dict = notification.model_dump()
        notif_dict["created_at"] = notif_dict["created_at"].isoformat()
        await db.notifications.insert_one(notif_dict)
        
        # Send email notification
        try:
            from email_service import send_group_invite_email
            app_url = os.environ.get('APP_URL', 'https://kvitt.app')
            invite_link = f"{app_url}/dashboard"
            asyncio.create_task(send_group_invite_email(
                data.email, 
                inviter['name'], 
                group['name'], 
                invite_link
            ))
        except Exception as e:
            logger.warning(f"Failed to send invite email: {e}")
        
        return {"message": "Invite sent! They'll see a notification to accept.", "status": "invite_sent"}
    else:
        # User not registered - create pending invite
        pending = await db.group_invites.find_one({
            "group_id": group_id,
            "invited_email": data.email,
            "status": "pending"
        }, {"_id": 0})
        if pending:
            raise HTTPException(status_code=400, detail="Invite already sent to this email")
        
        invite = GroupInvite(
            group_id=group_id,
            invited_by=user.user_id,
            invited_email=data.email,
            invited_user_id=None  # Will be set when they register
        )
        invite_dict = invite.model_dump()
        invite_dict["created_at"] = invite_dict["created_at"].isoformat()
        await db.group_invites.insert_one(invite_dict)
        
        # Send email invitation to non-registered user
        try:
            from email_service import send_group_invite_email
            app_url = os.environ.get('APP_URL', 'https://kvitt.app')
            invite_link = f"{app_url}/signup"
            asyncio.create_task(send_group_invite_email(
                data.email, 
                inviter['name'], 
                group['name'], 
                invite_link
            ))
        except Exception as e:
            logger.warning(f"Failed to send invite email: {e}")
        
        return {
            "message": f"Invite sent to {data.email}. They'll receive an email!",
            "status": "pending_registration",
            "note": "Email sent. Invite will be waiting when they sign up."
        }

@api_router.get("/groups/{group_id}/invites")
async def get_group_invites(group_id: str, user: User = Depends(get_current_user)):
    """Get pending invites for a group (admin only)."""
    membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id, "role": "admin"},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    invites = await db.group_invites.find(
        {"group_id": group_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Add inviter info
    for invite in invites:
        inviter = await db.users.find_one({"user_id": invite["invited_by"]}, {"_id": 0, "name": 1})
        invite["inviter_name"] = inviter["name"] if inviter else "Unknown"
    
    return invites

@api_router.put("/users/me")
async def update_user_profile(data: dict, user: User = Depends(get_current_user)):
    """Update current user's profile."""
    allowed_fields = {"name", "nickname", "preferences", "help_improve_ai"}
    update_data = {k: v for k, v in data.items() if k in allowed_fields}

    if update_data:
        await db.users.update_one(
            {"user_id": user.user_id},
            {"$set": update_data}
        )

    updated_user = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    return updated_user or {"status": "updated"}

@api_router.get("/users/search")
async def search_users(query: str, user: User = Depends(get_current_user)):
    """Search for users by name or email."""
    if len(query) < 2:
        return []
    
    # Search by name or email (case-insensitive)
    users = await db.users.find(
        {
            "$or": [
                {"name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}}
            ],
            "user_id": {"$ne": user.user_id}  # Exclude self
        },
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1, "level": 1}
    ).to_list(20)
    
    return users

@api_router.get("/users/invites")
async def get_my_invites(user: User = Depends(get_current_user)):
    """Get pending group invites for current user."""
    invites = await db.group_invites.find(
        {"invited_user_id": user.user_id, "status": "pending"},
        {"_id": 0}
    ).to_list(50)
    
    # Add group and inviter info
    for invite in invites:
        group = await db.groups.find_one({"group_id": invite["group_id"]}, {"_id": 0, "name": 1, "description": 1})
        inviter = await db.users.find_one({"user_id": invite["invited_by"]}, {"_id": 0, "name": 1, "picture": 1})
        invite["group"] = group
        invite["inviter"] = inviter
    
    return invites

@api_router.post("/users/invites/{invite_id}/respond")
async def respond_to_invite(invite_id: str, data: RespondToInviteRequest, user: User = Depends(get_current_user)):
    """Accept or reject a group invite."""
    invite = await db.group_invites.find_one(
        {"invite_id": invite_id, "invited_user_id": user.user_id, "status": "pending"},
        {"_id": 0}
    )
    if not invite:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    if data.accept:
        # Add user to group
        member = GroupMember(
            group_id=invite["group_id"],
            user_id=user.user_id,
            role="member"
        )
        member_dict = member.model_dump()
        member_dict["joined_at"] = member_dict["joined_at"].isoformat()
        await db.group_members.insert_one(member_dict)
        
        # Update invite status
        await db.group_invites.update_one(
            {"invite_id": invite_id},
            {"$set": {"status": "accepted", "responded_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        # Notify inviter
        group = await db.groups.find_one({"group_id": invite["group_id"]}, {"_id": 0, "name": 1})
        notification = Notification(
            user_id=invite["invited_by"],
            type="invite_accepted",
            title="Invite Accepted",
            message=f"{user.name} joined {group['name']}!",
            data={"group_id": invite["group_id"]}
        )
        notif_dict = notification.model_dump()
        notif_dict["created_at"] = notif_dict["created_at"].isoformat()
        await db.notifications.insert_one(notif_dict)
        
        return {"message": "Welcome to the group!", "group_id": invite["group_id"]}
    else:
        # Reject invite
        await db.group_invites.update_one(
            {"invite_id": invite_id},
            {"$set": {"status": "rejected", "responded_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Invite declined"}

@api_router.delete("/groups/{group_id}/members/{member_id}")
async def remove_group_member(group_id: str, member_id: str, user: User = Depends(get_current_user)):
    """Remove a member from group (admin only) or leave group (self). Stats are preserved."""
    group = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    # Check if user is admin or removing themselves
    membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    is_admin = membership and membership.get("role") == "admin"
    is_self = user.user_id == member_id
    
    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Only admins can remove other members")
    
    # Check if target member exists
    target_membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": member_id},
        {"_id": 0}
    )
    if not target_membership:
        raise HTTPException(status_code=404, detail="Member not found in group")
    
    # Cannot remove group admin (unless leaving as admin)
    if target_membership.get("role") == "admin" and not is_self:
        raise HTTPException(status_code=403, detail="Cannot remove group admin")
    
    # Check if member is in active game without cashing out
    active_games = await db.game_nights.find(
        {"group_id": group_id, "status": "active"},
        {"_id": 0, "game_id": 1}
    ).to_list(100)
    
    for game in active_games:
        player = await db.players.find_one(
            {"game_id": game["game_id"], "user_id": member_id, "cashed_out": {"$ne": True}},
            {"_id": 0}
        )
        if player:
            raise HTTPException(
                status_code=400, 
                detail="Cannot remove member who is in an active game. They must cash out first."
            )
    
    # Remove membership (but keep player records for stats)
    await db.group_members.delete_one({"group_id": group_id, "user_id": member_id})
    
    # Get member name for notification
    removed_user = await db.users.find_one({"user_id": member_id}, {"_id": 0, "name": 1})
    member_name = removed_user["name"] if removed_user else "Member"
    
    if is_self:
        return {"message": f"You have left {group['name']}"}
    else:
        # Notify the removed member
        notification = Notification(
            user_id=member_id,
            type="removed_from_group",
            title="Removed from Group",
            message=f"You have been removed from {group['name']} by an admin.",
            data={"group_id": group_id}
        )
        notif_dict = notification.model_dump()
        notif_dict["created_at"] = notif_dict["created_at"].isoformat()
        await db.notifications.insert_one(notif_dict)
        
        return {"message": f"{member_name} has been removed from the group"}

@api_router.put("/groups/{group_id}/transfer-admin")
async def transfer_group_admin(group_id: str, data: dict, user: User = Depends(get_current_user)):
    """Transfer group admin role to another member (admin only)."""
    group = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    # Validate current user is admin
    current_membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not current_membership or current_membership.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only group admins can transfer ownership")

    # Get target user ID from request
    new_admin_id = data.get("new_admin_id")
    if not new_admin_id:
        raise HTTPException(status_code=400, detail="new_admin_id is required")

    # Cannot transfer to self
    if new_admin_id == user.user_id:
        raise HTTPException(status_code=400, detail="Cannot transfer admin to yourself")

    # Validate target user is a member
    target_membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": new_admin_id},
        {"_id": 0}
    )
    if not target_membership:
        raise HTTPException(status_code=404, detail="Target user is not a member of this group")

    # Check if target user is in active game (optional check for safety)
    active_games = await db.game_nights.find(
        {"group_id": group_id, "status": "active"},
        {"_id": 0, "game_id": 1}
    ).to_list(100)

    for game in active_games:
        player = await db.players.find_one(
            {"game_id": game["game_id"], "user_id": new_admin_id, "cashed_out": {"$ne": True}},
            {"_id": 0}
        )
        if player:
            raise HTTPException(
                status_code=400,
                detail="Cannot transfer admin to a member who is currently in an active game"
            )

    # Update both memberships
    await db.group_members.update_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"$set": {"role": "member"}}
    )

    await db.group_members.update_one(
        {"group_id": group_id, "user_id": new_admin_id},
        {"$set": {"role": "admin"}}
    )

    # Create audit log
    audit = AuditLog(
        entity_type="group",
        entity_id=group_id,
        action="transfer_admin",
        old_value={"admin_id": user.user_id},
        new_value={"admin_id": new_admin_id},
        changed_by=user.user_id,
        reason=f"Admin role transferred to {new_admin_id}"
    )
    audit_dict = audit.model_dump()
    audit_dict["timestamp"] = audit_dict["timestamp"].isoformat()
    await db.audit_logs.insert_one(audit_dict)

    # Send notification to new admin
    new_admin_user = await db.users.find_one({"user_id": new_admin_id}, {"_id": 0})
    notification = Notification(
        user_id=new_admin_id,
        type="admin_transferred",
        title="You're now a group admin!",
        message=f"You've been promoted to admin of {group['name']}",
        data={"group_id": group_id}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)

    # Emit real-time notification
    await emit_notification(new_admin_id, {
        "type": "admin_transferred",
        "title": "You're now a group admin!",
        "message": f"You've been promoted to admin of {group['name']}",
        "group_id": group_id
    })

    logger.info(f"Admin transferred from {user.user_id} to {new_admin_id} in group {group_id}")

    return {
        "message": "Admin role transferred successfully",
        "new_admin_name": new_admin_user.get("name", "Unknown") if new_admin_user else "Unknown"
    }

@api_router.get("/users/me/badges")
async def get_my_badges(user: User = Depends(get_current_user)):
    """Get current user's badges and level progress."""
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0})
    
    # Calculate stats
    players = await db.players.find(
        {"user_id": user.user_id, "net_result": {"$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    total_games = len(players)
    total_profit = sum(p.get("net_result", 0) for p in players)
    wins = sum(1 for p in players if p.get("net_result", 0) > 0)
    win_rate = (wins / total_games * 100) if total_games > 0 else 0
    
    # Determine current level
    current_level = LEVELS[0]
    next_level = None
    for i, level in enumerate(LEVELS):
        if total_games >= level["min_games"] and total_profit >= level["min_profit"]:
            current_level = level
            if i < len(LEVELS) - 1:
                next_level = LEVELS[i + 1]
    
    # Calculate progress to next level
    progress = None
    if next_level:
        games_needed = max(0, next_level["min_games"] - total_games)
        profit_needed = max(0, next_level["min_profit"] - total_profit)
        progress = {
            "next_level": next_level["name"],
            "games_needed": games_needed,
            "profit_needed": round(profit_needed, 2),
            "games_progress": min(100, (total_games / next_level["min_games"]) * 100) if next_level["min_games"] > 0 else 100
        }
    
    # Get earned badges
    earned_badges = user_doc.get("badges", [])
    all_badges = []
    for badge in BADGES:
        all_badges.append({
            **badge,
            "earned": badge["id"] in earned_badges
        })
    
    return {
        "level": current_level,
        "progress": progress,
        "stats": {
            "total_games": total_games,
            "total_profit": round(total_profit, 2),
            "wins": wins,
            "win_rate": round(win_rate, 1)
        },
        "badges": all_badges,
        "earned_count": len(earned_badges),
        "total_badges": len(BADGES)
    }

@api_router.get("/levels")
async def get_levels():
    """Get all level definitions."""
    return {"levels": LEVELS, "badges": BADGES}

@api_router.get("/users/game-history")
async def get_game_history(user: User = Depends(get_current_user)):
    """Get user's complete game history with stats."""
    # Get all games where user was a player
    player_records = await db.players.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(1000)
    
    game_ids = [p["game_id"] for p in player_records]
    
    # Get game details
    games = []
    total_winnings = 0
    total_losses = 0
    wins = 0
    
    for player in player_records:
        game = await db.game_nights.find_one(
            {"game_id": player["game_id"]},
            {"_id": 0}
        )
        if game:
            # Get group info
            group = await db.groups.find_one(
                {"group_id": game["group_id"]},
                {"_id": 0, "name": 1}
            )
            
            net_result = player.get("net_result", 0)
            
            games.append({
                "game_id": game["game_id"],
                "title": game.get("title", "Game Night"),
                "status": game["status"],
                "created_at": game.get("created_at", game.get("started_at")),
                "group": {"name": group.get("name") if group else "Unknown"},
                "net_result": net_result if player.get("cashed_out") else None,
                "total_buy_in": player.get("total_buy_in", 0),
                "cashed_out": player.get("cashed_out", False)
            })
            
            if player.get("cashed_out") and net_result is not None:
                if net_result > 0:
                    total_winnings += net_result
                    wins += 1
                else:
                    total_losses += net_result
    
    # Sort by date (newest first)
    games.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Calculate stats
    completed_games = [g for g in games if g.get("cashed_out")]
    win_rate = (wins / len(completed_games) * 100) if completed_games else 0
    
    return {
        "games": games,
        "stats": {
            "totalGames": len(games),
            "totalWinnings": total_winnings,
            "totalLosses": total_losses,
            "winRate": win_rate
        }
    }

@api_router.delete("/groups/{group_id}/members/{member_user_id}")
async def remove_member(group_id: str, member_user_id: str, user: User = Depends(get_current_user)):
    """Remove a member from group (admin only, or self-leave)."""
    membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Allow self-leave or admin removal
    if member_user_id != user.user_id and membership["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.group_members.delete_one(
        {"group_id": group_id, "user_id": member_user_id}
    )
    
    return {"message": "Member removed"}

# ============== GAME NIGHT ENDPOINTS ==============

@api_router.post("/games", response_model=dict)
async def create_game(data: GameNightCreate, user: User = Depends(get_current_user)):
    """Create a new game night."""
    # Verify membership
    membership = await db.group_members.find_one(
        {"group_id": data.group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Get group settings
    group = await db.groups.find_one({"group_id": data.group_id}, {"_id": 0})
    
    # Calculate chip value
    chip_value = data.buy_in_amount / data.chips_per_buy_in
    
    # Use default title if not provided or empty
    game_title = data.title.strip() if data.title and data.title.strip() else generate_default_game_name()
    
    game = GameNight(
        group_id=data.group_id,
        host_id=user.user_id,
        title=game_title,
        location=data.location,
        scheduled_at=data.scheduled_at,
        status="scheduled" if data.scheduled_at else "active",
        started_at=None if data.scheduled_at else datetime.now(timezone.utc),
        buy_in_amount=data.buy_in_amount,
        chips_per_buy_in=data.chips_per_buy_in,
        chip_value=chip_value
    )
    
    game_dict = game.model_dump()
    for key in ["scheduled_at", "started_at", "ended_at", "created_at", "updated_at"]:
        if game_dict.get(key):
            game_dict[key] = game_dict[key].isoformat()
    
    await db.game_nights.insert_one(game_dict)
    
    # Add host as player with auto buy-in for active games
    player = Player(
        game_id=game.game_id,
        user_id=user.user_id,
        rsvp_status="yes",
        total_buy_in=data.buy_in_amount if game.status == "active" else 0,
        total_chips=data.chips_per_buy_in if game.status == "active" else 0
    )
    player_dict = player.model_dump()
    player_dict["joined_at"] = player_dict["joined_at"].isoformat()
    await db.players.insert_one(player_dict)
    
    # Update game's total chips distributed if auto buy-in was added
    if game.status == "active":
        await db.game_nights.update_one(
            {"game_id": game.game_id},
            {"$inc": {"total_chips_distributed": data.chips_per_buy_in}}
        )
        
        # Create transaction record for host's initial buy-in
        txn = Transaction(
            game_id=game.game_id,
            user_id=user.user_id,
            type="buy_in",
            amount=data.buy_in_amount,
            chips=data.chips_per_buy_in,
            chip_value=chip_value,
            notes="Initial buy-in (auto)"
        )
        txn_dict = txn.model_dump()
        txn_dict["timestamp"] = txn_dict["timestamp"].isoformat()
        await db.transactions.insert_one(txn_dict)
    
    # Notify group members
    members = await db.group_members.find(
        {"group_id": data.group_id, "user_id": {"$ne": user.user_id}},
        {"_id": 0}
    ).to_list(100)
    
    for member in members:
        notification = Notification(
            user_id=member["user_id"],
            type="game_invite",
            title="Game Night!",
            message=f"New game scheduled in {group['name']}",
            data={"game_id": game.game_id, "group_id": data.group_id}
        )
        notif_dict = notification.model_dump()
        notif_dict["created_at"] = notif_dict["created_at"].isoformat()
        await db.notifications.insert_one(notif_dict)
    
    return {"game_id": game.game_id, "status": game.status}

@api_router.get("/games")
async def get_games(group_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Get games (optionally filtered by group)."""
    # Get user's groups
    memberships = await db.group_members.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    group_ids = [m["group_id"] for m in memberships]
    
    query = {"group_id": {"$in": group_ids}}
    if group_id:
        if group_id not in group_ids:
            raise HTTPException(status_code=403, detail="Not a member of this group")
        query["group_id"] = group_id
    
    games = await db.game_nights.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    if not games:
        return games
    
    # Batch fetch all related data
    game_ids = [g["game_id"] for g in games]
    unique_group_ids = list(set(g["group_id"] for g in games))
    unique_host_ids = list(set(g["host_id"] for g in games if g.get("host_id")))
    
    # Get all groups at once
    groups = await db.groups.find(
        {"group_id": {"$in": unique_group_ids}},
        {"_id": 0, "group_id": 1, "name": 1}
    ).to_list(100)
    group_map = {g["group_id"]: g for g in groups}
    
    # Get all hosts
    hosts = await db.users.find(
        {"user_id": {"$in": unique_host_ids}},
        {"_id": 0, "user_id": 1, "name": 1}
    ).to_list(100)
    host_map = {h["user_id"]: h for h in hosts}
    
    # Get player counts and total buy-ins using aggregation
    player_stats = await db.players.aggregate([
        {"$match": {"game_id": {"$in": game_ids}}},
        {"$group": {
            "_id": "$game_id", 
            "count": {"$sum": 1},
            "total_pot": {"$sum": "$total_buy_in"}
        }}
    ]).to_list(100)
    stats_map = {ps["_id"]: ps for ps in player_stats}
    
    # Get user's player records for all games
    user_players = await db.players.find(
        {"game_id": {"$in": game_ids}, "user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    player_map = {p["game_id"]: p for p in user_players}
    
    # Apply to games
    for game in games:
        group = group_map.get(game["group_id"])
        host = host_map.get(game.get("host_id"))
        stats = stats_map.get(game["game_id"], {})
        
        game["group_name"] = group["name"] if group else "Unknown"
        game["host_name"] = host["name"] if host else "Unknown"
        game["player_count"] = stats.get("count", 0)
        game["total_pot"] = stats.get("total_pot", 0)
        
        player = player_map.get(game["game_id"])
        game["is_player"] = player is not None
        game["rsvp_status"] = player["rsvp_status"] if player else None
    
    return games

@api_router.get("/games/{game_id}")
async def get_game(game_id: str, user: User = Depends(get_current_user)):
    """Get game details."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Verify membership
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Get players
    players = await db.players.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    
    if players:
        # Batch fetch user info for all players
        user_ids = [p["user_id"] for p in players]
        users = await db.users.find(
            {"user_id": {"$in": user_ids}},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        ).to_list(100)
        user_map = {u["user_id"]: u for u in users}
        
        # Batch fetch all transactions for this game
        txns = await db.transactions.find(
            {"game_id": game_id},
            {"_id": 0}
        ).to_list(1000)
        txn_map = {}
        for txn in txns:
            if txn["user_id"] not in txn_map:
                txn_map[txn["user_id"]] = []
            txn_map[txn["user_id"]].append(txn)
        
        # Apply to players
        for player in players:
            player["user"] = user_map.get(player["user_id"])
            player["transactions"] = txn_map.get(player["user_id"], [])
            player["buy_in_count"] = len([t for t in player["transactions"] if t.get("type") == "buy_in"])
    
    game["players"] = players
    
    # Get group info
    group = await db.groups.find_one({"group_id": game["group_id"]}, {"_id": 0})
    game["group"] = group
    
    # Get host info
    host = await db.users.find_one(
        {"user_id": game["host_id"]},
        {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
    )
    game["host"] = host
    
    # Check if current user is host
    game["is_host"] = game["host_id"] == user.user_id
    
    # Get current user's player record (already in players list)
    current_player = next((p for p in players if p["user_id"] == user.user_id), None)
    game["current_player"] = current_player
    
    return game

@api_router.post("/games/{game_id}/start")
async def start_game(game_id: str, user: User = Depends(get_current_user)):
    """Start a scheduled game (host only). Requires minimum 2 players."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["host_id"] != user.user_id:
        # Check if user is admin
        membership = await db.group_members.find_one(
            {"group_id": game["group_id"], "user_id": user.user_id, "role": "admin"},
            {"_id": 0}
        )
        if not membership:
            raise HTTPException(status_code=403, detail="Only host or admin can start game")
    
    if game["status"] != "scheduled":
        raise HTTPException(status_code=400, detail="Game already started or ended")
    
    # Check minimum players (at least 2 with RSVP yes)
    player_count = await db.players.count_documents({
        "game_id": game_id,
        "rsvp_status": "yes"
    })
    if player_count < 2:
        raise HTTPException(status_code=400, detail="Minimum 2 players required to start game")
    
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$set": {
            "status": "active",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add system message to thread
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content="Game started!",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {"message": "Game started", "player_count": player_count}


async def auto_generate_settlement(game_id: str, game: dict, players: list) -> dict:
    """
    Smart Settlement Algorithm - Automatically generates optimized settlement.

    Algorithm: Greedy Debt Minimization
    - Separates players into winners (positive net) and losers (negative net)
    - Matches losers to winners to minimize total transactions
    - Consolidates payments to reduce complexity

    Returns: {"settlements": [...]} with minimized payment list
    """
    # Calculate net results for each player
    all_players = []
    for p in players:
        buy_in = p.get("total_buy_in", 0)
        cash_out = p.get("cash_out", 0)
        net_result = cash_out - buy_in
        all_players.append({
            "user_id": p["user_id"],
            "net_result": net_result
        })

    # Separate winners and losers
    winners = [(p["user_id"], p["net_result"]) for p in all_players if p["net_result"] > 0.01]
    losers = [(p["user_id"], -p["net_result"]) for p in all_players if p["net_result"] < -0.01]

    # Sort for optimal matching (largest first)
    winners.sort(key=lambda x: -x[1])
    losers.sort(key=lambda x: -x[1])

    settlements = []

    # Match losers to winners (greedy algorithm)
    i, j = 0, 0
    while i < len(losers) and j < len(winners):
        loser_id, loser_debt = losers[i]
        winner_id, winner_credit = winners[j]

        amount = min(loser_debt, winner_credit)

        if amount > 0.01:
            settlements.append({
                "from_user_id": loser_id,
                "to_user_id": winner_id,
                "amount": round(amount, 2)
            })

        losers[i] = (loser_id, round(loser_debt - amount, 2))
        winners[j] = (winner_id, round(winner_credit - amount, 2))

        if losers[i][1] <= 0.01:
            i += 1
        if winners[j][1] <= 0.01:
            j += 1

    # Delete any existing settlements for this game
    await db.ledger.delete_many({"game_id": game_id})

    # Create ledger entries
    for s in settlements:
        entry = LedgerEntry(
            group_id=game["group_id"],
            game_id=game_id,
            from_user_id=s["from_user_id"],
            to_user_id=s["to_user_id"],
            amount=s["amount"]
        )
        entry_dict = entry.model_dump()
        entry_dict["created_at"] = entry_dict["created_at"].isoformat()
        if entry_dict.get("paid_at"):
            entry_dict["paid_at"] = entry_dict["paid_at"].isoformat()
        await db.ledger.insert_one(entry_dict)

    # Update game status to settled
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$set": {"status": "settled", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    logger.info(f"Smart settlement generated for game {game_id}: {len(settlements)} transactions")
    return {"settlements": settlements}


@api_router.post("/games/{game_id}/end")
async def end_game(game_id: str, user: User = Depends(get_current_user)):
    """End an active game (host/admin only). Validates all players cashed out."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check host or admin
    is_host = game["host_id"] == user.user_id
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not is_host and (not membership or membership["role"] != "admin"):
        raise HTTPException(status_code=403, detail="Only host or admin can end game")
    
    if game["status"] != "active":
        raise HTTPException(status_code=400, detail="Game not active")
    
    # Check if all players with buy-ins have cashed out
    players_with_buyin = await db.players.find({
        "game_id": game_id,
        "total_buy_in": {"$gt": 0}
    }, {"_id": 0}).to_list(100)
    
    not_cashed_out = [p for p in players_with_buyin if p.get("cash_out") is None]
    
    if not_cashed_out:
        player_names = []
        for p in not_cashed_out:
            u = await db.users.find_one({"user_id": p["user_id"]}, {"_id": 0, "name": 1})
            player_names.append(u["name"] if u else "Unknown")
        raise HTTPException(
            status_code=400, 
            detail=f"All players must cash out before ending. Waiting for: {', '.join(player_names)}"
        )
    
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$set": {
            "status": "ended",
            "ended_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    # Add system message
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content="Game ended!",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)

    # Auto-generate settlement (Smart Settlement)
    settlement_result = await auto_generate_settlement(game_id, game, players_with_buyin)

    # Notify all players about settlement
    if settlement_result.get("settlements"):
        for player in players_with_buyin:
            await db.notifications.insert_one({
                "notification_id": str(uuid.uuid4()),
                "user_id": player["user_id"],
                "type": "settlement_generated",
                "title": "Settlement Ready",
                "message": f"Smart settlement has been generated for the game. View your debts and pay via Stripe.",
                "data": {"game_id": game_id, "group_id": game["group_id"]},
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

    return {
        "message": "Game ended",
        "settlement_generated": bool(settlement_result.get("settlements")),
        "settlement_count": len(settlement_result.get("settlements", []))
    }

@api_router.put("/games/{game_id}")
async def update_game(game_id: str, data: GameNightUpdate, user: User = Depends(get_current_user)):
    """Update game details (host/admin only)."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check host or admin
    is_host = game["host_id"] == user.user_id
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not is_host and (not membership or membership["role"] != "admin"):
        raise HTTPException(status_code=403, detail="Only host or admin can update game")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if "scheduled_at" in update_data and update_data["scheduled_at"]:
        update_data["scheduled_at"] = update_data["scheduled_at"].isoformat()
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    if update_data:
        await db.game_nights.update_one({"game_id": game_id}, {"$set": update_data})
    
    return {"message": "Game updated"}

@api_router.post("/games/{game_id}/cancel")
async def cancel_game(game_id: str, data: CancelGameRequest, user: User = Depends(get_current_user)):
    """Cancel a game (host/admin only)."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check host or admin
    is_host = game["host_id"] == user.user_id
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not is_host and (not membership or membership["role"] != "admin"):
        raise HTTPException(status_code=403, detail="Only host or admin can cancel game")
    
    if game["status"] in ["settled", "cancelled"]:
        raise HTTPException(status_code=400, detail="Game already settled or cancelled")
    
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_by": user.user_id,
            "cancel_reason": data.reason,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Add system message
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"Game cancelled. Reason: {data.reason or 'No reason provided'}",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {"message": "Game cancelled"}

@api_router.post("/games/{game_id}/rsvp")
async def rsvp_game(game_id: str, data: RSVPRequest, user: User = Depends(get_current_user)):
    """RSVP for a game."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Verify membership
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Update or create player record
    existing = await db.players.find_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if existing:
        await db.players.update_one(
            {"game_id": game_id, "user_id": user.user_id},
            {"$set": {"rsvp_status": data.status}}
        )
    else:
        player = Player(
            game_id=game_id,
            user_id=user.user_id,
            rsvp_status=data.status
        )
        await db.players.insert_one(player.model_dump())
    
    return {"message": "RSVP updated"}

@api_router.post("/games/{game_id}/join")
async def join_game(game_id: str, user: User = Depends(get_current_user)):
    """Request to join an active game. Sends notification to host for approval."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Verify membership in group
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Check if already a player
    existing = await db.players.find_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if existing:
        if existing.get("rsvp_status") == "pending":
            return {"message": "Join request already pending", "status": "pending"}
        elif existing.get("rsvp_status") == "yes":
            return {"message": "Already in game", "status": "joined"}
        else:
            # Update to pending
            await db.players.update_one(
                {"game_id": game_id, "user_id": user.user_id},
                {"$set": {"rsvp_status": "pending"}}
            )
    else:
        # Create pending player record
        player = Player(
            game_id=game_id,
            user_id=user.user_id,
            rsvp_status="pending"
        )
        await db.players.insert_one(player.model_dump())
    
    # Send notification to host
    notification = Notification(
        user_id=game["host_id"],
        type="join_request",
        title="Join Request",
        message=f"{user.name} wants to join the game",
        data={"game_id": game_id, "user_id": user.user_id, "user_name": user.name}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Add system message to thread
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"🙋 {user.name} requested to join",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {"message": "Join request sent to host", "status": "pending"}

@api_router.post("/games/{game_id}/approve-join")
async def approve_join(game_id: str, data: dict, user: User = Depends(get_current_user)):
    """Host approves a join request - auto adds default buy-in."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Only host can approve
    if game["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can approve join requests")
    
    player_user_id = data.get("user_id")
    if not player_user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    # Get default buy-in from game
    buy_in_amount = game.get("buy_in_amount", 20)
    chips_per_buy_in = game.get("chips_per_buy_in", 20)
    chip_value = buy_in_amount / chips_per_buy_in if chips_per_buy_in > 0 else 1.0
    
    # Update player status AND add default buy-in
    result = await db.players.update_one(
        {"game_id": game_id, "user_id": player_user_id, "rsvp_status": "pending"},
        {"$set": {
            "rsvp_status": "yes",
            "total_buy_in": buy_in_amount,
            "total_chips": chips_per_buy_in,
            "buy_in_count": 1
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="No pending request found")
    
    # Update game's total chips distributed
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$inc": {"total_chips_distributed": chips_per_buy_in}}
    )
    
    # Create transaction record
    txn = Transaction(
        game_id=game_id,
        user_id=player_user_id,
        type="buy_in",
        amount=buy_in_amount,
        chips=chips_per_buy_in,
        chip_value=chip_value,
        notes="Initial buy-in (auto on join)"
    )
    txn_dict = txn.model_dump()
    txn_dict["timestamp"] = txn_dict["timestamp"].isoformat()
    await db.transactions.insert_one(txn_dict)
    
    # Get player name
    player_user = await db.users.find_one({"user_id": player_user_id}, {"_id": 0})
    player_name = player_user["name"] if player_user else "Player"
    
    # Notify the player
    notification = Notification(
        user_id=player_user_id,
        type="join_approved",
        title="You're In!",
        message=f"Joined with ${buy_in_amount} ({chips_per_buy_in} chips)",
        data={"game_id": game_id, "buy_in": buy_in_amount, "chips": chips_per_buy_in}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Add system message
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"✅ {player_name} joined with ${buy_in_amount} ({chips_per_buy_in} chips)",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    # Emit WebSocket event for real-time update
    await notify_player_joined(game_id, player_name, player_user_id, buy_in_amount, chips_per_buy_in)
    
    return {"message": f"{player_name} approved with default buy-in"}

@api_router.post("/games/{game_id}/reject-join")
async def reject_join(game_id: str, data: dict, user: User = Depends(get_current_user)):
    """Host rejects a join request."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can reject join requests")
    
    player_user_id = data.get("user_id")
    if not player_user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    # Remove player record
    result = await db.players.delete_one(
        {"game_id": game_id, "user_id": player_user_id, "rsvp_status": "pending"}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=400, detail="No pending request found")
    
    # Notify the player
    notification = Notification(
        user_id=player_user_id,
        type="join_rejected",
        title="Join Request Declined",
        message="Your request to join the game was declined",
        data={"game_id": game_id}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return {"message": "Request rejected"}

@api_router.post("/games/{game_id}/add-player")
async def add_player_to_game(game_id: str, data: dict, user: User = Depends(get_current_user)):
    """Host adds a player to the game by user_id or email."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Only host can add players
    if game["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can add players")
    
    player_user_id = data.get("user_id")
    email = data.get("email")
    
    # Find user by email if user_id not provided
    if not player_user_id and email:
        found_user = await db.users.find_one({"email": email.lower()}, {"_id": 0})
        if found_user:
            player_user_id = found_user["user_id"]
        else:
            raise HTTPException(status_code=404, detail=f"No user found with email {email}")
    
    if not player_user_id:
        raise HTTPException(status_code=400, detail="user_id or email required")
    
    # Check if user is in the group, if not add them
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": player_user_id},
        {"_id": 0}
    )
    if not membership:
        # Auto-add to group
        member = GroupMember(
            group_id=game["group_id"],
            user_id=player_user_id,
            role="member"
        )
        member_dict = member.model_dump()
        member_dict["joined_at"] = member_dict["joined_at"].isoformat()
        await db.group_members.insert_one(member_dict)
    
    # Check if already a player
    existing = await db.players.find_one(
        {"game_id": game_id, "user_id": player_user_id},
        {"_id": 0}
    )
    
    if existing:
        if existing.get("rsvp_status") == "yes":
            raise HTTPException(status_code=400, detail="Player already in game")
        # Update status to yes
        await db.players.update_one(
            {"game_id": game_id, "user_id": player_user_id},
            {"$set": {"rsvp_status": "yes"}}
        )
    else:
        player = Player(
            game_id=game_id,
            user_id=player_user_id,
            rsvp_status="yes"
        )
        await db.players.insert_one(player.model_dump())
    
    # Get player name
    player_user = await db.users.find_one({"user_id": player_user_id}, {"_id": 0})
    player_name = player_user["name"] if player_user else "Player"
    
    # Notify the player
    notification = Notification(
        user_id=player_user_id,
        type="added_to_game",
        title="Added to Game",
        message=f"You've been added to a game by {user.name}",
        data={"game_id": game_id}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Add system message
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"➕ {user.name} added {player_name} to the game",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {"message": f"{player_name} added to game"}

@api_router.get("/games/{game_id}/available-players")
async def get_available_players(game_id: str, user: User = Depends(get_current_user)):
    """Get group members who can be added to the game."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Get all group members
    memberships = await db.group_members.find(
        {"group_id": game["group_id"]},
        {"_id": 0}
    ).to_list(100)
    
    member_ids = [m["user_id"] for m in memberships]
    
    # Get existing players in game
    existing_players = await db.players.find(
        {"game_id": game_id, "rsvp_status": {"$in": ["yes", "pending"]}},
        {"_id": 0, "user_id": 1}
    ).to_list(100)
    existing_ids = [p["user_id"] for p in existing_players]
    
    # Filter out existing players
    available_ids = [uid for uid in member_ids if uid not in existing_ids]
    
    # Get user details
    users = await db.users.find(
        {"user_id": {"$in": available_ids}},
        {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1}
    ).to_list(100)
    
    return users

@api_router.post("/games/{game_id}/approve-buy-in")
async def approve_buy_in(game_id: str, data: dict, user: User = Depends(get_current_user)):
    """Host approves a buy-in request."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can approve buy-ins")
    
    player_user_id = data.get("user_id")
    amount = data.get("amount", game.get("buy_in_amount", 20))
    chips = data.get("chips")
    
    if not player_user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    
    # Calculate chips if not provided
    chip_value = game.get("chip_value", 1.0)
    if not chips:
        chips_per_buy_in = game.get("chips_per_buy_in", 20)
        buy_in_amount = game.get("buy_in_amount", 20.0)
        chips = int((amount / buy_in_amount) * chips_per_buy_in)
    
    # Update player
    result = await db.players.update_one(
        {"game_id": game_id, "user_id": player_user_id},
        {"$inc": {"total_buy_in": amount, "total_chips": chips, "buy_in_count": 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Player not found")
    
    # Update game's total chips distributed
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$inc": {"total_chips_distributed": chips}}
    )
    
    # Create transaction record
    txn = Transaction(
        game_id=game_id,
        user_id=player_user_id,
        type="buy_in",
        amount=amount,
        chips=chips,
        chip_value=chip_value,
        notes="Buy-in (approved by host)"
    )
    txn_dict = txn.model_dump()
    txn_dict["timestamp"] = txn_dict["timestamp"].isoformat()
    await db.transactions.insert_one(txn_dict)
    
    # Get player name
    player_user = await db.users.find_one({"user_id": player_user_id}, {"_id": 0})
    player_name = player_user["name"] if player_user else "Player"
    
    # Notify the player
    notification = Notification(
        user_id=player_user_id,
        type="buy_in_approved",
        title="Buy-In Approved!",
        message=f"Your ${amount} buy-in was approved. You received {chips} chips.",
        data={"game_id": game_id, "amount": amount, "chips": chips}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Add system message
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"💰 {player_name} bought in for ${amount} ({chips} chips)",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {"message": f"Buy-in approved for {player_name}", "chips": chips}

# ============== BUY-IN / CASH-OUT ENDPOINTS ==============

@api_router.post("/games/{game_id}/buy-in")
async def add_buy_in(game_id: str, data: BuyInRequest, user: User = Depends(get_current_user)):
    """Add a buy-in for current user. Tracks chips received."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["status"] != "active":
        raise HTTPException(status_code=400, detail="Game not active")
    
    # Calculate chips based on game settings
    chip_value = game.get("chip_value", 1.0)
    chips_per_buy_in = game.get("chips_per_buy_in", 20)
    buy_in_amount = game.get("buy_in_amount", 20.0)
    
    # Calculate chips to give (based on amount paid vs standard buy-in)
    chips = data.chips if data.chips else int((data.amount / buy_in_amount) * chips_per_buy_in)
    
    # Check if player exists
    player = await db.players.find_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not player:
        # Auto-join if not already a player
        player_doc = Player(
            game_id=game_id,
            user_id=user.user_id,
            rsvp_status="yes",
            total_buy_in=0,
            total_chips=0
        )
        player_dict = player_doc.model_dump()
        player_dict["joined_at"] = player_dict["joined_at"].isoformat()
        await db.players.insert_one(player_dict)
        player = player_dict
    
    # Create transaction with chip info
    txn = Transaction(
        game_id=game_id,
        user_id=user.user_id,
        type="buy_in",
        amount=data.amount,
        chips=chips,
        chip_value=chip_value
    )
    txn_dict = txn.model_dump()
    txn_dict["timestamp"] = txn_dict["timestamp"].isoformat()
    await db.transactions.insert_one(txn_dict)
    
    # Update player totals
    new_total_buy_in = player.get("total_buy_in", 0) + data.amount
    new_total_chips = player.get("total_chips", 0) + chips
    
    await db.players.update_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"$set": {
            "total_buy_in": new_total_buy_in,
            "total_chips": new_total_chips
        }}
    )
    
    # Update game's total chips distributed
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$inc": {"total_chips_distributed": chips}}
    )
    
    return {
        "message": "Buy-in added",
        "total_buy_in": new_total_buy_in,
        "total_chips": new_total_chips,
        "chips_received": chips,
        "chip_value": chip_value
    }

@api_router.post("/games/{game_id}/admin-buy-in")
async def admin_buy_in(game_id: str, data: AdminBuyInRequest, user: User = Depends(get_current_user)):
    """Admin/Host adds buy-in for a specific player. Only host or admin can do this."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check host or admin permission
    is_host = game["host_id"] == user.user_id
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not is_host and (not membership or membership["role"] != "admin"):
        raise HTTPException(status_code=403, detail="Only host or admin can add buy-ins for players")
    
    if game["status"] != "active":
        raise HTTPException(status_code=400, detail="Game not active")
    
    # Calculate chips based on game settings
    chip_value = game.get("chip_value", 1.0)
    chips_per_buy_in = game.get("chips_per_buy_in", 20)
    buy_in_amount = game.get("buy_in_amount", 20.0)
    
    # Calculate chips to give
    chips = int((data.amount / buy_in_amount) * chips_per_buy_in)
    
    # Check if target player exists in game
    player = await db.players.find_one(
        {"game_id": game_id, "user_id": data.user_id},
        {"_id": 0}
    )
    
    if not player:
        raise HTTPException(status_code=400, detail="Player not in this game")
    
    if player.get("cash_out") is not None:
        raise HTTPException(status_code=400, detail="Player has already cashed out")
    
    # Create transaction
    txn = Transaction(
        game_id=game_id,
        user_id=data.user_id,
        type="buy_in",
        amount=data.amount,
        chips=chips,
        chip_value=chip_value,
        notes=f"Added by {user.name}"
    )
    txn_dict = txn.model_dump()
    txn_dict["timestamp"] = txn_dict["timestamp"].isoformat()
    await db.transactions.insert_one(txn_dict)
    
    # Update player totals
    new_total_buy_in = player.get("total_buy_in", 0) + data.amount
    new_total_chips = player.get("total_chips", 0) + chips
    
    await db.players.update_one(
        {"game_id": game_id, "user_id": data.user_id},
        {"$set": {
            "total_buy_in": new_total_buy_in,
            "total_chips": new_total_chips
        }}
    )
    
    # Update game's total chips distributed
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$inc": {"total_chips_distributed": chips}}
    )
    
    # Create notification for the player
    target_user = await db.users.find_one({"user_id": data.user_id}, {"_id": 0, "name": 1})
    notification = Notification(
        user_id=data.user_id,
        type="buy_in_added",
        title="Buy-In Added",
        message=f"{user.name} added ${data.amount} buy-in ({chips} chips) for you",
        data={"game_id": game_id, "amount": data.amount, "chips": chips}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Add system message to thread
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"💰 {target_user['name'] if target_user else 'Player'} bought in for ${data.amount} ({chips} chips)",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {
        "message": "Buy-in added for player",
        "player_user_id": data.user_id,
        "total_buy_in": new_total_buy_in,
        "total_chips": new_total_chips,
        "chips_added": chips
    }

@api_router.post("/games/{game_id}/request-buy-in")
async def request_buy_in(game_id: str, data: RequestBuyInRequest, user: User = Depends(get_current_user)):
    """Player requests a buy-in. Sends notification to host for approval."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["status"] != "active":
        raise HTTPException(status_code=400, detail="Game not active")
    
    player = await db.players.find_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not player:
        raise HTTPException(status_code=400, detail="Not a player in this game")
    
    if player.get("cashed_out"):
        raise HTTPException(status_code=400, detail="Already cashed out")
    
    # Calculate chips that would be given
    chip_value = game.get("chip_value", 1.0)
    chips_per_buy_in = game.get("chips_per_buy_in", 20)
    buy_in_amount = game.get("buy_in_amount", 20.0)
    chips = int((data.amount / buy_in_amount) * chips_per_buy_in)
    
    # Send notification to host
    notification = Notification(
        user_id=game["host_id"],
        type="buy_in_request",
        title="Buy-In Request",
        message=f"{user.name} is requesting ${data.amount} buy-in ({chips} chips)",
        data={"game_id": game_id, "user_id": user.user_id, "amount": data.amount, "chips": chips}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Add system message to thread
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"🙋 {user.name} requested ${data.amount} buy-in",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {"message": "Buy-in request sent to host", "amount": data.amount, "chips": chips}

@api_router.post("/games/{game_id}/request-cash-out")
async def request_cash_out(game_id: str, data: RequestCashOutRequest, user: User = Depends(get_current_user)):
    """Player requests to cash out with their chip count. Host must approve."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["status"] != "active":
        raise HTTPException(status_code=400, detail="Game not active")
    
    player = await db.players.find_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not player:
        raise HTTPException(status_code=400, detail="Not a player in this game")
    
    if player.get("cashed_out"):
        raise HTTPException(status_code=400, detail="Already cashed out")
    
    chip_value = game.get("chip_value", 1.0)
    cash_value = data.chips_count * chip_value
    net_result = cash_value - player.get("total_buy_in", 0)
    
    # Send notification to host for approval
    notification = Notification(
        user_id=game["host_id"],
        type="cash_out_request",
        title="Cash-Out Request",
        message=f"{user.name} wants to cash out {data.chips_count} chips (${cash_value:.2f})",
        data={"game_id": game_id, "user_id": user.user_id, "chips": data.chips_count, "cash_value": cash_value}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Add system message to thread
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"🎯 {user.name} requested cash-out: {data.chips_count} chips (${cash_value:.2f})",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {"message": "Cash-out request sent to host", "chips": data.chips_count, "cash_value": cash_value}

@api_router.post("/games/{game_id}/admin-cash-out")
async def admin_cash_out(game_id: str, data: AdminCashOutRequest, user: User = Depends(get_current_user)):
    """Admin/Host cashes out a player with specified chip count."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check host or admin permission
    is_host = game["host_id"] == user.user_id
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not is_host and (not membership or membership["role"] != "admin"):
        raise HTTPException(status_code=403, detail="Only host or admin can cash out players")
    
    if game["status"] != "active":
        raise HTTPException(status_code=400, detail="Game not active")
    
    player = await db.players.find_one(
        {"game_id": game_id, "user_id": data.user_id},
        {"_id": 0}
    )
    
    if not player:
        raise HTTPException(status_code=400, detail="Player not in this game")
    
    if player.get("cashed_out"):
        raise HTTPException(status_code=400, detail="Player already cashed out")
    
    chip_value = game.get("chip_value", 1.0)
    cash_value = data.chips_count * chip_value
    net_result = cash_value - player.get("total_buy_in", 0)
    
    # Create cash-out transaction
    txn = Transaction(
        game_id=game_id,
        user_id=data.user_id,
        type="cash_out",
        amount=cash_value,
        chips=data.chips_count,
        chip_value=chip_value,
        notes=f"Cashed out by {user.name}"
    )
    txn_dict = txn.model_dump()
    txn_dict["timestamp"] = txn_dict["timestamp"].isoformat()
    await db.transactions.insert_one(txn_dict)
    
    # Update player record
    await db.players.update_one(
        {"game_id": game_id, "user_id": data.user_id},
        {"$set": {
            "cashed_out": True,
            "chips_returned": data.chips_count,
            "cash_out": cash_value,
            "net_result": net_result,
            "cashed_out_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update game's chips returned
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$inc": {"total_chips_returned": data.chips_count}}
    )
    
    # Get target user for notification
    target_user = await db.users.find_one({"user_id": data.user_id}, {"_id": 0, "name": 1})
    
    # Send notification to player
    notification = Notification(
        user_id=data.user_id,
        type="cashed_out",
        title="Cashed Out",
        message=f"You've been cashed out: {data.chips_count} chips = ${cash_value:.2f} (Net: {'+'if net_result >= 0 else ''}${net_result:.2f})",
        data={"game_id": game_id, "chips": data.chips_count, "cash_value": cash_value, "net_result": net_result}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Add system message to thread
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"💵 {target_user['name'] if target_user else 'Player'} cashed out: {data.chips_count} chips = ${cash_value:.2f} ({'+'if net_result >= 0 else ''}{net_result:.2f})",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {
        "message": "Player cashed out",
        "user_id": data.user_id,
        "chips_returned": data.chips_count,
        "cash_value": cash_value,
        "net_result": net_result
    }

@api_router.post("/games/{game_id}/cash-out")
async def cash_out(game_id: str, data: CashOutRequest, user: User = Depends(get_current_user)):
    """Record cash-out for current user. Calculates winnings based on chips returned."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["status"] not in ["active", "ended"]:
        raise HTTPException(status_code=400, detail="Cannot cash out from this game")
    
    player = await db.players.find_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if not player:
        raise HTTPException(status_code=400, detail="Not a player in this game")
    
    if player.get("cash_out") is not None:
        raise HTTPException(status_code=400, detail="Already cashed out")
    
    # Calculate cash value of chips returned
    chip_value = game.get("chip_value", 1.0)
    cash_out_amount = data.chips_returned * chip_value
    
    # Calculate net result
    net_result = cash_out_amount - player.get("total_buy_in", 0)
    
    # Create transaction
    txn = Transaction(
        game_id=game_id,
        user_id=user.user_id,
        type="cash_out",
        amount=cash_out_amount,
        chips=data.chips_returned,
        chip_value=chip_value
    )
    txn_dict = txn.model_dump()
    txn_dict["timestamp"] = txn_dict["timestamp"].isoformat()
    await db.transactions.insert_one(txn_dict)
    
    await db.players.update_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"$set": {
            "chips_returned": data.chips_returned,
            "cash_out": cash_out_amount,
            "net_result": net_result,
            "cashed_out_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update game's total chips returned
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$inc": {"total_chips_returned": data.chips_returned}}
    )
    
    return {
        "message": "Cash-out recorded",
        "chips_returned": data.chips_returned,
        "cash_out_amount": cash_out_amount,
        "net_result": net_result
    }

@api_router.post("/games/{game_id}/edit-player-chips")
async def edit_player_chips(game_id: str, data: EditPlayerChipsRequest, user: User = Depends(get_current_user)):
    """Host can edit player's chip count after cash-out. Notifies the affected player."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Only host can edit
    if game["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can edit player chips")
    
    # Can only edit after cash-out (ended or settled status also allowed)
    if game["status"] not in ["active", "ended", "settled"]:
        raise HTTPException(status_code=400, detail="Cannot edit chips in this game state")
    
    player = await db.players.find_one(
        {"game_id": game_id, "user_id": data.user_id},
        {"_id": 0}
    )
    
    if not player:
        raise HTTPException(status_code=400, detail="Player not in this game")
    
    # Get previous values for notification
    old_chips = player.get("chips_returned", 0)
    chip_value = game.get("chip_value", 1.0)
    
    # Calculate new cash value and net result
    new_cash_value = data.chips_count * chip_value
    new_net_result = new_cash_value - player.get("total_buy_in", 0)
    
    # Update player record
    await db.players.update_one(
        {"game_id": game_id, "user_id": data.user_id},
        {"$set": {
            "chips_returned": data.chips_count,
            "cash_out": new_cash_value,
            "net_result": new_net_result,
            "cashed_out": True,
            "cashed_out_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Update game's total chips returned
    old_chips = old_chips or 0  # Handle None case
    chip_diff = data.chips_count - old_chips
    if chip_diff != 0:
        await db.game_nights.update_one(
            {"game_id": game_id},
            {"$inc": {"total_chips_returned": chip_diff}}
        )
    
    # Get player info for notifications
    target_user = await db.users.find_one({"user_id": data.user_id}, {"_id": 0, "name": 1, "email": 1})
    player_name = target_user["name"] if target_user else "Player"
    player_email = target_user.get("email") if target_user else None
    
    # Notify the player about the change
    notification = Notification(
        user_id=data.user_id,
        type="chips_edited",
        title="Chip Count Updated",
        message=f"Host updated your chips: {old_chips} → {data.chips_count} chips. New cash-out: ${new_cash_value:.2f}. {f'Reason: {data.reason}' if data.reason else ''}",
        data={"game_id": game_id, "old_chips": old_chips, "new_chips": data.chips_count, "net_result": new_net_result}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    # Send email notification
    if player_email:
        try:
            from email_service import send_chips_edited_email
            asyncio.create_task(send_chips_edited_email(
                player_email,
                player_name,
                game.get("title", "Game"),
                old_chips,
                data.chips_count,
                user.name,
                data.reason
            ))
        except Exception as e:
            logger.warning(f"Failed to send chips edited email: {e}")
    
    # Add system message to thread
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"✏️ {user.name} edited {player_name}'s chips: {old_chips} → {data.chips_count}. {f'Reason: {data.reason}' if data.reason else ''}",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    # Create audit log
    audit = AuditLog(
        entity_type="player",
        entity_id=player.get("player_id", data.user_id),
        action="edit_chips",
        old_value={"chips_returned": old_chips},
        new_value={"chips_returned": data.chips_count},
        changed_by=user.user_id,
        reason=data.reason
    )
    audit_dict = audit.model_dump()
    audit_dict["timestamp"] = audit_dict["timestamp"].isoformat()
    await db.audit_logs.insert_one(audit_dict)
    
    return {
        "message": f"Chips updated for {player_name}",
        "old_chips": old_chips,
        "new_chips": data.chips_count,
        "new_cash_value": new_cash_value,
        "new_net_result": new_net_result
    }

# ============== SETTLEMENT ENDPOINTS ==============

@api_router.post("/games/{game_id}/settle")
async def generate_settlement(game_id: str, user: User = Depends(get_current_user)):
    """Generate settlement (host/admin only). Validates all players cashed out."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Check host or admin
    is_host = game["host_id"] == user.user_id
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not is_host and (not membership or membership["role"] != "admin"):
        raise HTTPException(status_code=403, detail="Only host or admin can generate settlement")
    
    if game["status"] not in ["ended", "settled"]:
        raise HTTPException(status_code=400, detail="Game must be ended first")
    
    # Get all players with buy-ins
    all_players = await db.players.find(
        {"game_id": game_id, "total_buy_in": {"$gt": 0}},
        {"_id": 0}
    ).to_list(100)
    
    if not all_players:
        raise HTTPException(status_code=400, detail="No players with buy-ins found")
    
    # Check that ALL players with buy-ins have cashed out
    not_cashed_out = [p for p in all_players if p.get("cash_out") is None]
    if not_cashed_out:
        player_names = []
        for p in not_cashed_out:
            u = await db.users.find_one({"user_id": p["user_id"]}, {"_id": 0, "name": 1})
            player_names.append(u["name"] if u else "Unknown")
        raise HTTPException(
            status_code=400, 
            detail=f"All players must cash out before settlement. Waiting for: {', '.join(player_names)}"
        )
    
    # Validate chip count (optional warning - can be logged)
    total_distributed = game.get("total_chips_distributed", 0)
    total_returned = sum(p.get("chips_returned", 0) for p in all_players)
    if total_distributed != total_returned:
        logger.warning(f"Chip discrepancy in game {game_id}: distributed={total_distributed}, returned={total_returned}")
    
    # Simple settlement algorithm (debt minimization)
    winners = [(p["user_id"], p["net_result"]) for p in all_players if p.get("net_result", 0) > 0]
    losers = [(p["user_id"], -p["net_result"]) for p in all_players if p.get("net_result", 0) < 0]
    
    settlements = []
    
    # Match losers to winners
    i, j = 0, 0
    while i < len(losers) and j < len(winners):
        loser_id, loser_debt = losers[i]
        winner_id, winner_credit = winners[j]
        
        amount = min(loser_debt, winner_credit)
        
        if amount > 0:
            settlements.append({
                "from_user_id": loser_id,
                "to_user_id": winner_id,
                "amount": round(amount, 2)
            })
        
        losers[i] = (loser_id, loser_debt - amount)
        winners[j] = (winner_id, winner_credit - amount)
        
        if losers[i][1] <= 0.01:
            i += 1
        if winners[j][1] <= 0.01:
            j += 1
    
    # Delete old settlements for this game
    await db.ledger.delete_many({"game_id": game_id})
    
    # Create ledger entries
    for s in settlements:
        entry = LedgerEntry(
            group_id=game["group_id"],
            game_id=game_id,
            from_user_id=s["from_user_id"],
            to_user_id=s["to_user_id"],
            amount=s["amount"]
        )
        entry_dict = entry.model_dump()
        entry_dict["created_at"] = entry_dict["created_at"].isoformat()
        if entry_dict.get("paid_at"):
            entry_dict["paid_at"] = entry_dict["paid_at"].isoformat()
        await db.ledger.insert_one(entry_dict)
    
    # Update game status
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$set": {"status": "settled"}}
    )
    
    return {"settlements": settlements}

@api_router.get("/games/{game_id}/settlement")
async def get_settlement(game_id: str, user: User = Depends(get_current_user)):
    """Get settlement details for a game."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Verify membership
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    entries = await db.ledger.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    
    # Add user info
    for entry in entries:
        from_user = await db.users.find_one(
            {"user_id": entry["from_user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        to_user = await db.users.find_one(
            {"user_id": entry["to_user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        entry["from_user"] = from_user
        entry["to_user"] = to_user
    
    return entries

@api_router.put("/ledger/{ledger_id}/paid")
async def mark_paid(ledger_id: str, data: MarkPaidRequest, user: User = Depends(get_current_user)):
    """Mark a ledger entry as paid."""
    entry = await db.ledger.find_one({"ledger_id": ledger_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found")
    
    # Only from_user or to_user can mark as paid
    if user.user_id not in [entry["from_user_id"], entry["to_user_id"]]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {
        "status": "paid" if data.paid else "pending",
        "paid_at": datetime.now(timezone.utc).isoformat() if data.paid else None,
        "is_locked": True  # Lock after first status change
    }
    
    await db.ledger.update_one(
        {"ledger_id": ledger_id},
        {"$set": update_data}
    )
    
    return {"message": "Status updated"}

@api_router.put("/ledger/{ledger_id}/edit")
async def edit_ledger(ledger_id: str, data: LedgerEditRequest, user: User = Depends(get_current_user)):
    """Edit a locked ledger entry (admin only with reason)."""
    entry = await db.ledger.find_one({"ledger_id": ledger_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found")
    
    # Check admin status
    membership = await db.group_members.find_one(
        {"group_id": entry["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership or membership["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Create audit log
    audit = AuditLog(
        entity_type="ledger",
        entity_id=ledger_id,
        action="update",
        old_value={"amount": entry["amount"]},
        new_value={"amount": data.amount},
        changed_by=user.user_id,
        reason=data.reason
    )
    audit_dict = audit.model_dump()
    audit_dict["timestamp"] = audit_dict["timestamp"].isoformat()
    await db.audit_logs.insert_one(audit_dict)
    
    # Update entry
    await db.ledger.update_one(
        {"ledger_id": ledger_id},
        {"$set": {"amount": data.amount}}
    )
    
    return {"message": "Ledger entry updated"}

# ============== STATS ENDPOINTS ==============

@api_router.get("/stats/me")
async def get_my_stats(user: User = Depends(get_current_user)):
    """Get personal statistics."""
    # Get all player records for this user
    players = await db.players.find(
        {"user_id": user.user_id, "net_result": {"$ne": None}},
        {"_id": 0}
    ).to_list(1000)
    
    if not players:
        return {
            "total_games": 0,
            "total_buy_ins": 0,
            "total_winnings": 0,
            "net_profit": 0,
            "win_rate": 0,
            "biggest_win": 0,
            "biggest_loss": 0,
            "recent_games": []
        }
    
    total_games = len(players)
    total_buy_ins = sum(p.get("total_buy_in", 0) for p in players)
    total_winnings = sum(p.get("cash_out", 0) for p in players)
    net_profit = sum(p.get("net_result", 0) for p in players)
    wins = sum(1 for p in players if p.get("net_result", 0) > 0)
    win_rate = (wins / total_games * 100) if total_games > 0 else 0
    
    results = [p.get("net_result", 0) for p in players]
    biggest_win = max(results) if results else 0
    biggest_loss = min(results) if results else 0
    
    # Get recent games
    recent = sorted(players, key=lambda x: x.get("player_id", ""), reverse=True)[:5]
    recent_games = []
    for p in recent:
        game = await db.game_nights.find_one({"game_id": p["game_id"]}, {"_id": 0})
        if game:
            group = await db.groups.find_one({"group_id": game["group_id"]}, {"_id": 0, "name": 1})
            recent_games.append({
                "game_id": p["game_id"],
                "group_name": group["name"] if group else "Unknown",
                "net_result": p.get("net_result", 0),
                "date": game.get("ended_at") or game.get("started_at")
            })
    
    return {
        "total_games": total_games,
        "total_buy_ins": round(total_buy_ins, 2),
        "total_winnings": round(total_winnings, 2),
        "net_profit": round(net_profit, 2),
        "win_rate": round(win_rate, 1),
        "biggest_win": round(biggest_win, 2),
        "biggest_loss": round(biggest_loss, 2),
        "recent_games": recent_games
    }

@api_router.get("/stats/group/{group_id}")
async def get_group_stats(group_id: str, user: User = Depends(get_current_user)):
    """Get group statistics."""
    # Verify membership
    membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Get all games in group
    games = await db.game_nights.find(
        {"group_id": group_id, "status": {"$in": ["ended", "settled"]}},
        {"_id": 0}
    ).to_list(1000)
    
    game_ids = [g["game_id"] for g in games]
    
    # Get player stats across all games
    pipeline = [
        {"$match": {"game_id": {"$in": game_ids}, "net_result": {"$ne": None}}},
        {"$group": {
            "_id": "$user_id",
            "total_games": {"$sum": 1},
            "total_profit": {"$sum": "$net_result"},
            "total_buy_in": {"$sum": "$total_buy_in"}
        }},
        {"$sort": {"total_profit": -1}}
    ]
    
    leaderboard = await db.players.aggregate(pipeline).to_list(100)
    
    # Add user info
    for entry in leaderboard:
        user_info = await db.users.find_one(
            {"user_id": entry["_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        entry["user"] = user_info
        entry["user_id"] = entry.pop("_id")
    
    return {
        "total_games": len(games),
        "leaderboard": leaderboard
    }

# ============== GAME THREAD ENDPOINTS ==============

@api_router.get("/games/{game_id}/thread")
async def get_thread(game_id: str, user: User = Depends(get_current_user)):
    """Get game thread messages."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Verify membership
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    messages = await db.game_threads.find(
        {"game_id": game_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Add user info
    for msg in messages:
        user_info = await db.users.find_one(
            {"user_id": msg["user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        msg["user"] = user_info
    
    return messages

@api_router.post("/games/{game_id}/thread")
async def post_message(game_id: str, data: ThreadMessageCreate, user: User = Depends(get_current_user)):
    """Post a message to game thread."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    # Verify membership
    membership = await db.group_members.find_one(
        {"group_id": game["group_id"], "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Check if game is archived (settled)
    if game["status"] == "settled":
        raise HTTPException(status_code=400, detail="Thread is archived")
    
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=data.content,
        type="user"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {"message_id": message.message_id}

# ============== NOTIFICATION ENDPOINTS ==============

@api_router.get("/notifications")
async def get_notifications(user: User = Depends(get_current_user)):
    """Get user notifications."""
    notifications = await db.notifications.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return notifications

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: User = Depends(get_current_user)):
    """Mark notification as read."""
    result = await db.notifications.update_one(
        {"notification_id": notification_id, "user_id": user.user_id},
        {"$set": {"read": True}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Marked as read"}

@api_router.put("/notifications/read-all")
async def mark_all_read(user: User = Depends(get_current_user)):
    """Mark all notifications as read."""
    await db.notifications.update_many(
        {"user_id": user.user_id, "read": False},
        {"$set": {"read": True}}
    )
    
    return {"message": "All marked as read"}

# ============== VOICE COMMANDS ENDPOINT ==============

from fastapi import File, UploadFile, Form

@api_router.post("/voice/transcribe")
async def transcribe_voice(
    file: UploadFile = File(...),
    language: Optional[str] = Form(None),
    user: User = Depends(get_current_user)
):
    """Transcribe voice audio to text using Whisper."""
    from emergentintegrations.llm.openai import OpenAISpeechToText
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=503, detail="Voice service not configured")
    
    # Check file type
    allowed_types = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/m4a", "audio/mp4"]
    content_type = file.content_type or ""
    if not any(t in content_type for t in ["audio", "video"]):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be audio file.")
    
    try:
        # Read file content
        audio_content = await file.read()
        
        # Save to temp file
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3") as temp_file:
            temp_file.write(audio_content)
            temp_path = temp_file.name
        
        # Initialize STT
        stt = OpenAISpeechToText(api_key=api_key)
        
        # Transcribe
        with open(temp_path, "rb") as audio_file:
            response = await stt.transcribe(
                file=audio_file,
                model="whisper-1",
                response_format="json",
                language=language  # ISO-639-1 format: en, es, fr, etc.
            )
        
        # Cleanup temp file
        os.unlink(temp_path)
        
        # Parse voice command
        text = response.text.strip().lower()
        command = parse_voice_command(text)
        
        return {
            "text": response.text,
            "command": command,
            "language": language
        }
        
    except Exception as e:
        logger.error(f"Voice transcription error: {e}")
        raise HTTPException(status_code=500, detail="Failed to transcribe audio")

def parse_voice_command(text: str) -> Optional[Dict[str, Any]]:
    """Parse transcribed text into a poker command."""
    text = text.lower().strip()
    
    # Buy-in commands
    if "buy in" in text or "buy-in" in text or "buyin" in text:
        # Extract amount if present
        import re
        amount_match = re.search(r'\$?(\d+)', text)
        amount = int(amount_match.group(1)) if amount_match else None
        return {"type": "buy_in", "amount": amount}
    
    # Rebuy commands
    if "rebuy" in text or "re-buy" in text or "re buy" in text:
        amount_match = re.search(r'\$?(\d+)', text)
        amount = int(amount_match.group(1)) if amount_match else None
        return {"type": "rebuy", "amount": amount}
    
    # Cash out commands
    if "cash out" in text or "cashout" in text or "cash-out" in text:
        chips_match = re.search(r'(\d+)\s*(chips?)?', text)
        chips = int(chips_match.group(1)) if chips_match else None
        return {"type": "cash_out", "chips": chips}
    
    # Start game
    if "start game" in text or "start the game" in text or "begin game" in text:
        return {"type": "start_game"}
    
    # End game
    if "end game" in text or "end the game" in text or "finish game" in text:
        return {"type": "end_game"}
    
    # Check balance
    if "balance" in text or "how much" in text or "my chips" in text:
        return {"type": "check_balance"}
    
    # AI help
    if "help" in text or "suggest" in text or "what should i do" in text:
        return {"type": "ai_help"}
    
    return None

# ============== AI ASSISTANT ENDPOINTS ==============

class AskAssistantRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None

class PokerAnalyzeRequest(BaseModel):
    your_hand: List[str]  # ["A of spades", "K of spades"]
    community_cards: List[str] = []  # ["Q of hearts", "J of diamonds", "10 of clubs"]
    game_id: Optional[str] = None  # Optional link to active game for analytics

@api_router.post("/assistant/ask")
async def ask_assistant(data: AskAssistantRequest, user: User = Depends(get_current_user)):
    """Ask the AI assistant a question."""
    from ai_assistant import get_ai_response, get_quick_answer
    
    # Check for quick answer first (no API call needed)
    quick = get_quick_answer(data.message)
    if quick:
        return {"response": quick, "source": "quick_answer"}
    
    # Use AI for complex questions
    session_id = f"kvitt_{user.user_id}"
    context = data.context or {}
    context["user_role"] = "user"
    
    response = await get_ai_response(data.message, session_id, context)
    return {"response": response, "source": "ai"}

@api_router.post("/poker/analyze")
async def analyze_poker_hand(data: PokerAnalyzeRequest, user: User = Depends(get_current_user)):
    """
    Analyze poker hand using DETERMINISTIC code evaluation.

    Architecture:
    1. Code-based Hand Evaluator - Accurately identifies the poker hand (no LLM errors)
    2. Rule-based Strategy Advisor - Provides action suggestions based on hand strength
    3. Optional LLM Enhancement - Can add contextual advice (future feature)

    This approach eliminates LLM counting/math errors that caused incorrect hand identification.
    """
    from poker_evaluator import evaluate_hand, get_action_suggestion, get_hand_strength

    # Validation
    if len(data.your_hand) != 2:
        raise HTTPException(status_code=400, detail="Must provide exactly 2 hole cards")

    if len(data.community_cards) < 3:
        raise HTTPException(status_code=400, detail="Must provide at least 3 community cards (flop)")

    if len(data.community_cards) > 5:
        raise HTTPException(status_code=400, detail="Cannot have more than 5 community cards")

    # Check for duplicate cards
    all_cards = data.your_hand + data.community_cards
    normalized = [c.lower().strip() for c in all_cards]
    if len(normalized) != len(set(normalized)):
        raise HTTPException(status_code=400, detail="Duplicate cards detected - each card can only appear once")

    # Determine game stage
    stage = "Pre-flop"
    if len(data.community_cards) == 3:
        stage = "Flop"
    elif len(data.community_cards) == 4:
        stage = "Turn"
    elif len(data.community_cards) == 5:
        stage = "River"

    try:
        # Step 1: DETERMINISTIC hand evaluation (no LLM - 100% accurate)
        evaluation = evaluate_hand(data.your_hand, data.community_cards)

        if "error" in evaluation:
            raise HTTPException(status_code=400, detail=evaluation["error"])

        # Step 2: Rule-based action suggestion
        suggestion = get_action_suggestion(evaluation, stage)

        # Build the result
        analysis_result = {
            "action": suggestion["action"],
            "potential": suggestion["potential"],
            "reasoning": suggestion["reasoning"],
            # Include detailed evaluation for transparency
            "hand_details": {
                "hand_name": evaluation["hand_name"],
                "description": evaluation["description"],
                "strength": get_hand_strength(evaluation["hand_rank"])
            }
        }

        # Log the analysis for analytics
        log_entry = {
            "log_id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "user_name": user.name,
            "game_id": data.game_id,
            "timestamp": datetime.utcnow(),
            "stage": stage,
            "hole_cards": data.your_hand,
            "community_cards": data.community_cards,
            "all_cards": all_cards,
            "evaluation": {
                "hand_rank": int(evaluation["hand_rank"]),
                "hand_name": evaluation["hand_name"],
                "description": evaluation["description"]
            },
            "ai_response": analysis_result,
            "model": "deterministic_v1"  # No longer using LLM for hand evaluation
        }
        await db.poker_analysis_logs.insert_one(log_entry)

        return analysis_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Poker analysis error: {e}")
        # Log errors for debugging
        error_log = {
            "log_id": str(uuid.uuid4()),
            "user_id": user.user_id,
            "timestamp": datetime.utcnow(),
            "stage": stage,
            "hole_cards": data.your_hand,
            "community_cards": data.community_cards,
            "error": str(e),
            "model": "deterministic_v1"
        }
        await db.poker_analysis_logs.insert_one(error_log)
        raise HTTPException(status_code=500, detail=f"Failed to analyze hand: {str(e)}")


@api_router.get("/poker/history")
async def get_poker_history(
    limit: int = 20,
    offset: int = 0,
    user: User = Depends(get_current_user)
):
    """Get user's poker analysis history."""
    logs = await db.poker_analysis_logs.find(
        {"user_id": user.user_id, "ai_response": {"$exists": True}},
        {"_id": 0, "raw_response": 0}
    ).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)

    total = await db.poker_analysis_logs.count_documents(
        {"user_id": user.user_id, "ai_response": {"$exists": True}}
    )

    return {
        "history": logs,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@api_router.get("/poker/stats")
async def get_poker_stats(user: User = Depends(get_current_user)):
    """Get user's poker analysis statistics and insights."""
    # Get all user's analyses
    logs = await db.poker_analysis_logs.find(
        {"user_id": user.user_id, "ai_response": {"$exists": True}},
        {"_id": 0}
    ).to_list(1000)

    if not logs:
        return {
            "total_analyses": 0,
            "message": "No poker hands analyzed yet. Use the AI Assistant to get started!"
        }

    # Calculate stats
    total = len(logs)
    actions = {"FOLD": 0, "CHECK": 0, "CALL": 0, "RAISE": 0}
    potentials = {"Low": 0, "Medium": 0, "High": 0}
    stages = {"Pre-flop": 0, "Flop": 0, "Turn": 0, "River": 0}

    for log in logs:
        ai_resp = log.get("ai_response", {})
        action = ai_resp.get("action", "CHECK")
        potential = ai_resp.get("potential", "Medium")
        stage = log.get("stage", "Flop")

        if action in actions:
            actions[action] += 1
        if potential in potentials:
            potentials[potential] += 1
        if stage in stages:
            stages[stage] += 1

    # Most common action
    most_common_action = max(actions, key=actions.get) if any(actions.values()) else None

    # Calculate percentages
    action_pcts = {k: round(v / total * 100, 1) for k, v in actions.items()}
    potential_pcts = {k: round(v / total * 100, 1) for k, v in potentials.items()}

    # Get recent trend (last 10 hands)
    recent = logs[:10] if len(logs) >= 10 else logs
    recent_high_potential = sum(
        1 for l in recent if l.get("ai_response", {}).get("potential") == "High"
    )

    return {
        "total_analyses": total,
        "action_breakdown": actions,
        "action_percentages": action_pcts,
        "potential_breakdown": potentials,
        "potential_percentages": potential_pcts,
        "stage_breakdown": stages,
        "most_common_suggestion": most_common_action,
        "recent_high_potential_hands": recent_high_potential,
        "insights": {
            "aggressive_play": action_pcts.get("RAISE", 0) > 30,
            "conservative_play": action_pcts.get("FOLD", 0) > 40,
            "strong_hands_ratio": potential_pcts.get("High", 0)
        },
        "first_analysis": logs[-1].get("timestamp") if logs else None,
        "last_analysis": logs[0].get("timestamp") if logs else None
    }


# ============== HOST PERSONA / DECISION ENDPOINTS ==============

class HostDecisionRequest(BaseModel):
    decision_id: Optional[str] = None
    decision_ids: Optional[List[str]] = None
    reason: Optional[str] = None


class HostPersonaSettingsRequest(BaseModel):
    auto_approve_standard_buyin: bool = False
    auto_send_reminders: bool = True
    auto_generate_settlement: bool = True
    auto_send_summary: bool = True
    payment_reminder_days: List[int] = [1, 3, 7]
    notify_on_rsvp_change: bool = True
    suggest_next_game: bool = True


@api_router.get("/host/decisions")
async def get_pending_decisions(
    game_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get pending decisions for the host."""
    query = {
        "host_id": user.user_id,
        "status": "pending",
        "expires_at": {"$gt": datetime.now(timezone.utc)}
    }
    if game_id:
        query["game_id"] = game_id

    decisions = await db.host_decisions.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    # Group by type
    grouped = {
        "join_request": [],
        "buy_in": [],
        "cash_out": [],
        "end_game": [],
        "chip_correction": []
    }
    for d in decisions:
        dtype = d.get("decision_type", "other")
        if dtype in grouped:
            grouped[dtype].append(d)

    return {
        "decisions": decisions,
        "grouped": grouped,
        "total": len(decisions)
    }


@api_router.post("/host/decisions/{decision_id}/approve")
async def approve_decision(
    decision_id: str,
    user: User = Depends(get_current_user)
):
    """Approve a pending decision."""
    # Verify ownership
    decision = await db.host_decisions.find_one({
        "decision_id": decision_id,
        "host_id": user.user_id,
        "status": "pending"
    })

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found or already processed")

    # Update status
    await db.host_decisions.update_one(
        {"decision_id": decision_id},
        {
            "$set": {
                "status": "approved",
                "processed_at": datetime.now(timezone.utc)
            }
        }
    )

    # Execute the approved action
    action_result = await _execute_host_decision(decision)

    return {
        "success": True,
        "decision_id": decision_id,
        "decision_type": decision.get("decision_type"),
        "action_result": action_result
    }


@api_router.post("/host/decisions/{decision_id}/reject")
async def reject_decision(
    decision_id: str,
    data: HostDecisionRequest,
    user: User = Depends(get_current_user)
):
    """Reject a pending decision."""
    decision = await db.host_decisions.find_one({
        "decision_id": decision_id,
        "host_id": user.user_id,
        "status": "pending"
    })

    if not decision:
        raise HTTPException(status_code=404, detail="Decision not found or already processed")

    await db.host_decisions.update_one(
        {"decision_id": decision_id},
        {
            "$set": {
                "status": "rejected",
                "rejection_reason": data.reason,
                "processed_at": datetime.now(timezone.utc)
            }
        }
    )

    # Notify player of rejection
    player_id = decision.get("context", {}).get("player_id")
    if player_id:
        await db.notifications.insert_one({
            "notification_id": str(uuid.uuid4()),
            "user_id": player_id,
            "title": "Request Declined",
            "message": f"Your {decision.get('decision_type', 'request').replace('_', ' ')} was declined" +
                      (f": {data.reason}" if data.reason else ""),
            "type": "request_rejected",
            "data": {
                "decision_type": decision.get("decision_type"),
                "game_id": decision.get("game_id"),
                "reason": data.reason
            },
            "read": False,
            "created_at": datetime.now(timezone.utc)
        })

    return {
        "success": True,
        "decision_id": decision_id,
        "reason": data.reason
    }


@api_router.post("/host/decisions/bulk-approve")
async def bulk_approve_decisions(
    data: HostDecisionRequest,
    user: User = Depends(get_current_user)
):
    """Approve multiple decisions at once."""
    if not data.decision_ids:
        raise HTTPException(status_code=400, detail="decision_ids required")

    approved = []
    failed = []

    for decision_id in data.decision_ids:
        decision = await db.host_decisions.find_one({
            "decision_id": decision_id,
            "host_id": user.user_id,
            "status": "pending"
        })

        if decision:
            await db.host_decisions.update_one(
                {"decision_id": decision_id},
                {"$set": {"status": "approved", "processed_at": datetime.now(timezone.utc)}}
            )
            action_result = await _execute_host_decision(decision)
            approved.append({"decision_id": decision_id, "result": action_result})
        else:
            failed.append({"decision_id": decision_id, "error": "Not found or already processed"})

    return {
        "success": len(failed) == 0,
        "approved": approved,
        "failed": failed,
        "total_approved": len(approved),
        "total_failed": len(failed)
    }


@api_router.get("/host/persona/status")
async def get_host_persona_status(
    game_id: Optional[str] = None,
    user: User = Depends(get_current_user)
):
    """Get Host Persona automation status."""
    # Get user's Host Persona settings
    settings = await db.host_persona_settings.find_one(
        {"user_id": user.user_id},
        {"_id": 0}
    )

    # Get pending decision count
    query = {"host_id": user.user_id, "status": "pending"}
    if game_id:
        query["game_id"] = game_id
    pending_count = await db.host_decisions.count_documents(query)

    return {
        "enabled": True,
        "settings": settings or {
            "auto_approve_standard_buyin": False,
            "auto_send_reminders": True,
            "auto_generate_settlement": True,
            "auto_send_summary": True,
            "payment_reminder_days": [1, 3, 7],
            "notify_on_rsvp_change": True,
            "suggest_next_game": True
        },
        "pending_decisions": pending_count
    }


@api_router.put("/host/persona/settings")
async def update_host_persona_settings(
    data: HostPersonaSettingsRequest,
    user: User = Depends(get_current_user)
):
    """Update Host Persona automation settings."""
    settings = data.model_dump()
    settings["user_id"] = user.user_id
    settings["updated_at"] = datetime.now(timezone.utc)

    await db.host_persona_settings.update_one(
        {"user_id": user.user_id},
        {"$set": settings},
        upsert=True
    )

    return {"success": True, "settings": settings}


async def _execute_host_decision(decision: dict) -> dict:
    """Execute the action for an approved decision."""
    decision_type = decision.get("decision_type")
    context = decision.get("context", {})
    game_id = decision.get("game_id")

    if decision_type == "join_request":
        player_entry = {
            "user_id": context.get("player_id"),
            "status": "active",
            "chips": 0,
            "total_buy_in": 0,
            "joined_at": datetime.now(timezone.utc)
        }
        await db.game_nights.update_one(
            {"game_id": game_id},
            {"$push": {"players": player_entry}}
        )
        # Emit WebSocket event
        await sio.emit("game_update", {
            "type": "player_joined",
            "game_id": game_id,
            "player_id": context.get("player_id")
        }, room=game_id)
        return {"action": "player_added", "player_id": context.get("player_id")}

    elif decision_type == "buy_in":
        amount = context.get("amount", 0)
        chips = context.get("chips", 0)
        player_id = context.get("player_id")

        await db.game_nights.update_one(
            {"game_id": game_id, "players.user_id": player_id},
            {
                "$inc": {
                    "players.$.chips": chips,
                    "players.$.total_buy_in": amount
                }
            }
        )
        await sio.emit("game_update", {
            "type": "buy_in_approved",
            "game_id": game_id,
            "player_id": player_id,
            "amount": amount,
            "chips": chips
        }, room=game_id)
        return {"action": "buy_in_processed", "amount": amount, "chips": chips}

    elif decision_type == "cash_out":
        chips = context.get("chips", 0)
        player_id = context.get("player_id")
        cash_amount = context.get("cash_amount", 0)

        await db.game_nights.update_one(
            {"game_id": game_id, "players.user_id": player_id},
            {
                "$set": {
                    "players.$.chips": 0,
                    "players.$.cashed_out": True,
                    "players.$.chips_returned": chips,
                    "players.$.cash_out_amount": cash_amount,
                    "players.$.cashed_out_at": datetime.now(timezone.utc)
                }
            }
        )
        await sio.emit("game_update", {
            "type": "cash_out_approved",
            "game_id": game_id,
            "player_id": player_id,
            "chips": chips,
            "amount": cash_amount
        }, room=game_id)
        return {"action": "cash_out_processed", "chips": chips, "amount": cash_amount}

    elif decision_type == "end_game":
        await db.game_nights.update_one(
            {"game_id": game_id},
            {"$set": {"status": "ended", "ended_at": datetime.now(timezone.utc)}}
        )
        await sio.emit("game_update", {"type": "game_ended", "game_id": game_id}, room=game_id)
        return {"action": "game_ended"}

    elif decision_type == "chip_correction":
        player_id = context.get("player_id")
        new_chips = context.get("new_chips", 0)

        await db.game_nights.update_one(
            {"game_id": game_id, "players.user_id": player_id},
            {"$set": {"players.$.chips": new_chips}}
        )
        await sio.emit("game_update", {
            "type": "chips_corrected",
            "game_id": game_id,
            "player_id": player_id,
            "new_chips": new_chips
        }, room=game_id)
        return {"action": "chips_corrected", "new_chips": new_chips}

    return {"action": "unknown", "decision_type": decision_type}


# ============== SMART DEFAULTS ENDPOINTS ==============

@api_router.get("/groups/{group_id}/smart-defaults")
async def get_smart_defaults(group_id: str, user: User = Depends(get_current_user)):
    """Get smart defaults based on group history (data-driven, no AI)."""
    # Verify membership
    membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    # Get group's game history
    games = await db.game_nights.find(
        {"group_id": group_id, "status": {"$in": ["ended", "settled"]}},
        {"_id": 0, "buy_in_amount": 1, "chips_per_buy_in": 1}
    ).to_list(50)
    
    if not games:
        # Return app defaults if no history
        return {
            "buy_in_amount": 20,
            "chips_per_buy_in": 20,
            "reason": "default",
            "games_analyzed": 0
        }
    
    # Calculate median (most common) values
    buy_ins = sorted([g.get("buy_in_amount", 20) for g in games])
    chips = sorted([g.get("chips_per_buy_in", 20) for g in games])
    
    median_buy_in = buy_ins[len(buy_ins) // 2]
    median_chips = chips[len(chips) // 2]
    
    return {
        "buy_in_amount": median_buy_in,
        "chips_per_buy_in": median_chips,
        "reason": "based_on_history",
        "games_analyzed": len(games)
    }

@api_router.get("/groups/{group_id}/frequent-players")
async def get_frequent_players(group_id: str, user: User = Depends(get_current_user)):
    """Get frequently invited players for quick game setup."""
    # Verify membership
    membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a group member")
    
    # Get all games in this group
    games = await db.game_nights.find(
        {"group_id": group_id},
        {"_id": 0, "game_id": 1}
    ).to_list(100)
    
    if not games:
        return {"players": [], "games_analyzed": 0}
    
    game_ids = [g["game_id"] for g in games]
    
    # Count player appearances
    pipeline = [
        {"$match": {"game_id": {"$in": game_ids}}},
        {"$group": {
            "_id": "$user_id",
            "game_count": {"$sum": 1}
        }},
        {"$sort": {"game_count": -1}},
        {"$limit": 10}
    ]
    
    player_stats = await db.players.aggregate(pipeline).to_list(10)
    
    # Add user info
    for p in player_stats:
        user_info = await db.users.find_one(
            {"user_id": p["_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1}
        )
        p["user"] = user_info
        p["user_id"] = p.pop("_id")
    
    return {
        "players": player_stats,
        "games_analyzed": len(games)
    }

# ============== LEDGER SUMMARY ENDPOINTS ==============

@api_router.get("/ledger/balances")
async def get_balances(user: User = Depends(get_current_user)):
    """Get overall balance summary (who owes/is owed)."""
    # Amounts user owes
    owes = await db.ledger.find(
        {"from_user_id": user.user_id, "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    # Amounts owed to user
    owed = await db.ledger.find(
        {"to_user_id": user.user_id, "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    total_owes = sum(e["amount"] for e in owes)
    total_owed = sum(e["amount"] for e in owed)
    
    # Add user info to entries
    for entry in owes:
        to_user = await db.users.find_one(
            {"user_id": entry["to_user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        entry["to_user"] = to_user
    
    for entry in owed:
        from_user = await db.users.find_one(
            {"user_id": entry["from_user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        entry["from_user"] = from_user
    
    return {
        "total_owes": round(total_owes, 2),
        "total_owed": round(total_owed, 2),
        # Aliases for mobile compatibility
        "you_owe": round(total_owes, 2),
        "owed_to_you": round(total_owed, 2),
        "net_balance": round(total_owed - total_owes, 2),
        "owes": owes,
        "owed": owed
    }


@api_router.get("/ledger/consolidated")
async def get_consolidated_balances(user: User = Depends(get_current_user)):
    """
    Get consolidated balances - debts grouped by person across ALL games.

    This endpoint consolidates multiple game debts between the same two players
    into a single net balance, reducing transaction complexity.

    Example: If you owe John $20 from Game A and John owes you $15 from Game B,
    the consolidated view shows: You owe John $5 (net).
    """
    # Get all pending ledger entries involving this user
    all_entries = await db.ledger.find(
        {
            "$or": [
                {"from_user_id": user.user_id, "status": "pending"},
                {"to_user_id": user.user_id, "status": "pending"}
            ]
        },
        {"_id": 0}
    ).to_list(500)

    # Consolidate by person
    person_balances = {}  # other_user_id -> net_amount (positive = they owe you)

    for entry in all_entries:
        if entry["from_user_id"] == user.user_id:
            # You owe them
            other_user = entry["to_user_id"]
            person_balances[other_user] = person_balances.get(other_user, 0) - entry["amount"]
        else:
            # They owe you
            other_user = entry["from_user_id"]
            person_balances[other_user] = person_balances.get(other_user, 0) + entry["amount"]

    # Build response with user info
    consolidated = []
    for other_user_id, net_amount in person_balances.items():
        if abs(net_amount) < 0.01:
            continue  # Skip settled balances

        other_user = await db.users.find_one(
            {"user_id": other_user_id},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )

        consolidated.append({
            "user": other_user,
            "net_amount": round(net_amount, 2),
            "direction": "owed_to_you" if net_amount > 0 else "you_owe",
            "display_amount": round(abs(net_amount), 2)
        })

    # Sort by absolute amount (largest debts first)
    consolidated.sort(key=lambda x: -x["display_amount"])

    # Calculate totals
    total_you_owe = sum(-b["net_amount"] for b in consolidated if b["net_amount"] < 0)
    total_owed_to_you = sum(b["net_amount"] for b in consolidated if b["net_amount"] > 0)

    return {
        "consolidated": consolidated,
        "total_you_owe": round(total_you_owe, 2),
        "total_owed_to_you": round(total_owed_to_you, 2),
        "net_balance": round(total_owed_to_you - total_you_owe, 2),
        "people_count": len(consolidated)
    }


@api_router.post("/ledger/optimize")
async def optimize_ledger(user: User = Depends(get_current_user)):
    """
    Optimize ledger entries by consolidating cross-game debts between same players.

    This creates new consolidated entries and marks old ones as consolidated.
    Only processes entries where the current user is involved.
    """
    # Get all pending entries for this user
    all_entries = await db.ledger.find(
        {
            "$or": [
                {"from_user_id": user.user_id, "status": "pending"},
                {"to_user_id": user.user_id, "status": "pending"}
            ]
        },
        {"_id": 0}
    ).to_list(500)

    if len(all_entries) <= 1:
        return {"message": "No optimization needed", "optimized": 0}

    # Group by person and calculate net
    person_entries = {}  # other_user_id -> list of ledger_ids
    person_net = {}  # other_user_id -> net_amount

    for entry in all_entries:
        if entry["from_user_id"] == user.user_id:
            other_user = entry["to_user_id"]
            if other_user not in person_entries:
                person_entries[other_user] = []
                person_net[other_user] = 0
            person_entries[other_user].append(entry["ledger_id"])
            person_net[other_user] -= entry["amount"]
        else:
            other_user = entry["from_user_id"]
            if other_user not in person_entries:
                person_entries[other_user] = []
                person_net[other_user] = 0
            person_entries[other_user].append(entry["ledger_id"])
            person_net[other_user] += entry["amount"]

    optimized_count = 0

    for other_user_id, entry_ids in person_entries.items():
        if len(entry_ids) <= 1:
            continue  # Nothing to consolidate

        net = person_net[other_user_id]
        if abs(net) < 0.01:
            # They cancel out - mark all as paid
            await db.ledger.update_many(
                {"ledger_id": {"$in": entry_ids}},
                {"$set": {"status": "consolidated", "consolidated_at": datetime.now(timezone.utc).isoformat()}}
            )
            optimized_count += len(entry_ids)
        else:
            # Create one consolidated entry
            from_user = user.user_id if net < 0 else other_user_id
            to_user = other_user_id if net < 0 else user.user_id

            # Mark old entries as consolidated
            await db.ledger.update_many(
                {"ledger_id": {"$in": entry_ids}},
                {"$set": {"status": "consolidated", "consolidated_at": datetime.now(timezone.utc).isoformat()}}
            )

            # Create new consolidated entry
            new_entry = LedgerEntry(
                group_id="consolidated",
                game_id="consolidated",
                from_user_id=from_user,
                to_user_id=to_user,
                amount=round(abs(net), 2),
                notes=f"Consolidated from {len(entry_ids)} entries"
            )
            entry_dict = new_entry.model_dump()
            entry_dict["created_at"] = entry_dict["created_at"].isoformat()
            if entry_dict.get("paid_at"):
                entry_dict["paid_at"] = entry_dict["paid_at"].isoformat()
            await db.ledger.insert_one(entry_dict)

            optimized_count += len(entry_ids)

    return {
        "message": "Ledger optimized",
        "optimized": optimized_count,
        "entries_consolidated": optimized_count
    }


# ============== STRIPE PAYMENT ENDPOINTS ==============

class StripeCheckoutRequest(BaseModel):
    plan_id: str
    origin_url: str

@api_router.get("/premium/plans")
async def get_premium_plans():
    """Get available premium plans"""
    from stripe_service import PREMIUM_PLANS
    return {"plans": list(PREMIUM_PLANS.values())}

@api_router.post("/premium/checkout")
async def create_premium_checkout(data: StripeCheckoutRequest, user: User = Depends(get_current_user)):
    """Create Stripe checkout session for premium upgrade"""
    from stripe_service import create_stripe_checkout
    
    # Get user email
    user_doc = await db.users.find_one({"user_id": user.user_id}, {"_id": 0, "email": 1})
    user_email = user_doc.get("email", "") if user_doc else ""
    
    result = await create_stripe_checkout(
        plan_id=data.plan_id,
        origin_url=data.origin_url,
        user_id=user.user_id,
        user_email=user_email,
        db=db
    )
    
    return result

@api_router.get("/premium/status/{session_id}")
async def get_premium_payment_status(session_id: str):
    """Check payment status for a checkout session"""
    from stripe_service import check_payment_status
    return await check_payment_status(session_id, db)

@api_router.get("/premium/me")
async def get_my_premium_status(user: User = Depends(get_current_user)):
    """Get current user's premium status"""
    user_doc = await db.users.find_one(
        {"user_id": user.user_id},
        {"_id": 0, "is_premium": 1, "premium_plan": 1, "premium_until": 1}
    )
    
    if not user_doc:
        return {"is_premium": False}
    
    return {
        "is_premium": user_doc.get("is_premium", False),
        "plan": user_doc.get("premium_plan"),
        "until": user_doc.get("premium_until")
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    from stripe_service import handle_stripe_webhook
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    result = await handle_stripe_webhook(body, signature, db)
    return result


# ============== DEBT SETTLEMENT PAYMENTS ==============

@api_router.post("/settlements/{ledger_id}/pay")
async def create_debt_payment(ledger_id: str, data: dict, user: User = Depends(get_current_user)):
    """Create a Stripe payment link for settling a debt"""
    from stripe_service import create_debt_payment_link
    
    # Get ledger entry
    entry = await db.ledger.find_one({"ledger_id": ledger_id}, {"_id": 0})
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found")
    
    # Verify the current user is the one who owes money
    if entry["from_user_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only the debtor can initiate payment")
    
    # Check if already paid
    if entry.get("status") == "paid":
        raise HTTPException(status_code=400, detail="This debt has already been paid")
    
    # Get recipient info
    to_user = await db.users.find_one(
        {"user_id": entry["to_user_id"]},
        {"_id": 0, "name": 1}
    )
    
    origin_url = data.get("origin_url", "")
    if not origin_url:
        raise HTTPException(status_code=400, detail="origin_url required")
    
    result = await create_debt_payment_link(
        ledger_id=ledger_id,
        from_user_id=user.user_id,
        from_user_email=user.email,
        to_user_id=entry["to_user_id"],
        to_user_name=to_user.get("name", "Unknown"),
        amount=entry["amount"],
        game_id=entry["game_id"],
        origin_url=origin_url,
        db=db
    )
    
    return result


@api_router.post("/webhook/stripe-debt")
async def stripe_debt_webhook(request: Request):
    """Handle Stripe webhook events for debt payments"""
    from stripe_service import handle_debt_payment_webhook
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature", "")
    
    result = await handle_debt_payment_webhook(body, signature, db)
    return result


# ============== SPOTIFY INTEGRATION ==============

import spotipy
from spotipy.oauth2 import SpotifyOAuth
import base64

# Spotify config from environment
SPOTIFY_CLIENT_ID = os.environ.get('SPOTIFY_CLIENT_ID', '')
SPOTIFY_CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET', '')
SPOTIFY_REDIRECT_URI = os.environ.get('SPOTIFY_REDIRECT_URI', os.environ.get('APP_URL', '') + '/spotify/callback')

# Spotify scopes needed for playback and library access
SPOTIFY_SCOPES = "user-read-playback-state user-modify-playback-state user-read-private streaming user-read-currently-playing playlist-read-private playlist-read-collaborative user-library-read"

class SpotifyTokenRequest(BaseModel):
    code: str
    redirect_uri: Optional[str] = None

class SpotifyRefreshRequest(BaseModel):
    refresh_token: str

class SpotifyPlayRequest(BaseModel):
    track_uri: Optional[str] = None
    context_uri: Optional[str] = None
    position_ms: int = 0
    device_id: Optional[str] = None

class SpotifyVolumeRequest(BaseModel):
    volume_percent: int
    device_id: Optional[str] = None

@api_router.get("/spotify/auth-url")
async def get_spotify_auth_url(user: User = Depends(get_current_user)):
    """Get Spotify authorization URL for OAuth flow."""
    if not SPOTIFY_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Spotify integration not configured. Please add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to environment.")
    
    # Create state with user_id for security
    state = base64.urlsafe_b64encode(user.user_id.encode()).decode()
    
    auth_url = (
        f"https://accounts.spotify.com/authorize?"
        f"client_id={SPOTIFY_CLIENT_ID}&"
        f"response_type=code&"
        f"redirect_uri={SPOTIFY_REDIRECT_URI}&"
        f"scope={SPOTIFY_SCOPES.replace(' ', '%20')}&"
        f"state={state}"
    )
    
    return {"auth_url": auth_url, "redirect_uri": SPOTIFY_REDIRECT_URI}

@api_router.post("/spotify/token")
async def exchange_spotify_token(data: SpotifyTokenRequest, user: User = Depends(get_current_user)):
    """Exchange authorization code for access token."""
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Spotify integration not configured")
    
    redirect_uri = data.redirect_uri or SPOTIFY_REDIRECT_URI
    
    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        auth_header = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()
        response = await client.post(
            "https://accounts.spotify.com/api/token",
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "grant_type": "authorization_code",
                "code": data.code,
                "redirect_uri": redirect_uri
            }
        )
        
        if response.status_code != 200:
            logger.error(f"Spotify token exchange failed: {response.text}")
            raise HTTPException(status_code=400, detail="Failed to exchange Spotify token")
        
        token_data = response.json()
        
        # Get user profile from Spotify
        profile_response = await client.get(
            "https://api.spotify.com/v1/me",
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        
        spotify_profile = profile_response.json() if profile_response.status_code == 200 else {}
        
        # Store tokens in database
        spotify_data = {
            "user_id": user.user_id,
            "access_token": token_data["access_token"],
            "refresh_token": token_data.get("refresh_token"),
            "expires_in": token_data.get("expires_in", 3600),
            "token_type": token_data.get("token_type", "Bearer"),
            "spotify_user_id": spotify_profile.get("id"),
            "spotify_display_name": spotify_profile.get("display_name"),
            "spotify_product": spotify_profile.get("product", "free"),  # free or premium
            "is_premium": spotify_profile.get("product") == "premium",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Upsert spotify token for user
        await db.spotify_tokens.update_one(
            {"user_id": user.user_id},
            {"$set": spotify_data},
            upsert=True
        )
        
        return {
            "access_token": token_data["access_token"],
            "expires_in": token_data.get("expires_in", 3600),
            "spotify_user": spotify_profile.get("display_name"),
            "is_premium": spotify_profile.get("product") == "premium"
        }

@api_router.post("/spotify/refresh")
async def refresh_spotify_token(data: SpotifyRefreshRequest, user: User = Depends(get_current_user)):
    """Refresh expired Spotify access token."""
    if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
        raise HTTPException(status_code=503, detail="Spotify integration not configured")
    
    async with httpx.AsyncClient() as client:
        auth_header = base64.b64encode(f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}".encode()).decode()
        response = await client.post(
            "https://accounts.spotify.com/api/token",
            headers={
                "Authorization": f"Basic {auth_header}",
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "grant_type": "refresh_token",
                "refresh_token": data.refresh_token
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to refresh token")
        
        token_data = response.json()
        
        # Update stored token
        await db.spotify_tokens.update_one(
            {"user_id": user.user_id},
            {"$set": {
                "access_token": token_data["access_token"],
                "expires_in": token_data.get("expires_in", 3600),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "access_token": token_data["access_token"],
            "expires_in": token_data.get("expires_in", 3600)
        }

@api_router.get("/spotify/status")
async def get_spotify_status(user: User = Depends(get_current_user)):
    """Check if user has Spotify connected."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    
    if not token_data:
        return {"connected": False}
    
    # Check if token needs refresh
    expires_at = token_data.get("expires_at")
    access_token = token_data.get("access_token")
    
    if expires_at and datetime.utcnow().timestamp() > expires_at:
        # Token expired, try to refresh
        refresh_token = token_data.get("refresh_token")
        if refresh_token:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://accounts.spotify.com/api/token",
                        data={
                            "grant_type": "refresh_token",
                            "refresh_token": refresh_token,
                            "client_id": SPOTIFY_CLIENT_ID,
                            "client_secret": SPOTIFY_CLIENT_SECRET,
                        },
                    )
                    if response.status_code == 200:
                        token_info = response.json()
                        access_token = token_info["access_token"]
                        new_expires_at = datetime.utcnow().timestamp() + token_info.get("expires_in", 3600)
                        
                        await db.spotify_tokens.update_one(
                            {"user_id": user.user_id},
                            {"$set": {
                                "access_token": access_token,
                                "expires_at": new_expires_at
                            }}
                        )
            except Exception as e:
                print(f"Error refreshing Spotify token: {e}")
    
    return {
        "connected": True,
        "spotify_user": token_data.get("spotify_display_name"),
        "is_premium": token_data.get("is_premium", False),
        "access_token": access_token
    }

@api_router.delete("/spotify/disconnect")
async def disconnect_spotify(user: User = Depends(get_current_user)):
    """Disconnect Spotify account."""
    await db.spotify_tokens.delete_one({"user_id": user.user_id})
    return {"message": "Spotify disconnected"}

@api_router.get("/spotify/search")
async def search_spotify(q: str, type: str = "track", limit: int = 20, user: User = Depends(get_current_user)):
    """Search Spotify for tracks, albums, or playlists."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.spotify.com/v1/search",
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
            params={"q": q, "type": type, "limit": limit}
        )
        
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Spotify token expired, please refresh")
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Spotify search failed")
        
        return response.json()

@api_router.get("/spotify/playback")
async def get_playback_state(user: User = Depends(get_current_user)):
    """Get current playback state."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.spotify.com/v1/me/player",
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        
        if response.status_code == 204:
            return {"is_playing": False, "device": None, "item": None}
        
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Spotify token expired")
        
        if response.status_code != 200:
            return {"is_playing": False, "device": None, "item": None}
        
        return response.json()

@api_router.put("/spotify/play")
async def start_playback(data: SpotifyPlayRequest, user: User = Depends(get_current_user)):
    """Start or resume playback."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")
    
    if not token_data.get("is_premium"):
        raise HTTPException(status_code=403, detail="Spotify Premium required for playback control")
    
    async with httpx.AsyncClient() as client:
        url = "https://api.spotify.com/v1/me/player/play"
        if data.device_id:
            url += f"?device_id={data.device_id}"
        
        body = {}
        if data.track_uri:
            body["uris"] = [data.track_uri]
        if data.context_uri:
            body["context_uri"] = data.context_uri
        if data.position_ms:
            body["position_ms"] = data.position_ms
        
        response = await client.put(
            url,
            headers={"Authorization": f"Bearer {token_data['access_token']}"},
            json=body if body else None
        )
        
        if response.status_code == 401:
            raise HTTPException(status_code=401, detail="Spotify token expired")
        
        if response.status_code not in [200, 204]:
            logger.error(f"Spotify play failed: {response.status_code} - {response.text}")
            raise HTTPException(status_code=response.status_code, detail="Failed to start playback")
        
        return {"status": "playing"}

@api_router.put("/spotify/pause")
async def pause_playback(device_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Pause playback."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")
    
    async with httpx.AsyncClient() as client:
        url = "https://api.spotify.com/v1/me/player/pause"
        if device_id:
            url += f"?device_id={device_id}"
        
        response = await client.put(
            url,
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        
        if response.status_code not in [200, 204]:
            raise HTTPException(status_code=response.status_code, detail="Failed to pause")
        
        return {"status": "paused"}

@api_router.post("/spotify/next")
async def skip_to_next(device_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Skip to next track."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")
    
    async with httpx.AsyncClient() as client:
        url = "https://api.spotify.com/v1/me/player/next"
        if device_id:
            url += f"?device_id={device_id}"
        
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        
        if response.status_code not in [200, 204]:
            raise HTTPException(status_code=response.status_code, detail="Failed to skip")
        
        return {"status": "skipped"}

@api_router.post("/spotify/previous")
async def skip_to_previous(device_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Skip to previous track."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")
    
    async with httpx.AsyncClient() as client:
        url = "https://api.spotify.com/v1/me/player/previous"
        if device_id:
            url += f"?device_id={device_id}"
        
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        
        if response.status_code not in [200, 204]:
            raise HTTPException(status_code=response.status_code, detail="Failed to go back")
        
        return {"status": "previous"}

@api_router.put("/spotify/volume")
async def set_volume(data: SpotifyVolumeRequest, user: User = Depends(get_current_user)):
    """Set playback volume."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")
    
    async with httpx.AsyncClient() as client:
        url = f"https://api.spotify.com/v1/me/player/volume?volume_percent={data.volume_percent}"
        if data.device_id:
            url += f"&device_id={data.device_id}"
        
        response = await client.put(
            url,
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        
        if response.status_code not in [200, 204]:
            raise HTTPException(status_code=response.status_code, detail="Failed to set volume")
        
        return {"status": "volume_set", "volume": data.volume_percent}

@api_router.put("/spotify/seek")
async def seek_to_position(position_ms: int, device_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Seek to position in current track."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")
    
    async with httpx.AsyncClient() as client:
        url = f"https://api.spotify.com/v1/me/player/seek?position_ms={position_ms}"
        if device_id:
            url += f"&device_id={device_id}"
        
        response = await client.put(
            url,
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        
        if response.status_code not in [200, 204]:
            raise HTTPException(status_code=response.status_code, detail="Failed to seek")
        
        return {"status": "seeked", "position_ms": position_ms}

@api_router.get("/spotify/devices")
async def get_devices(user: User = Depends(get_current_user)):
    """Get available playback devices."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.spotify.com/v1/me/player/devices",
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get devices")
        
        return response.json()

@api_router.put("/spotify/shuffle")
async def set_shuffle(state: bool, device_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Toggle shuffle state."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")

    async with httpx.AsyncClient() as client:
        url = f"https://api.spotify.com/v1/me/player/shuffle?state={str(state).lower()}"
        if device_id:
            url += f"&device_id={device_id}"

        response = await client.put(
            url,
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )

        if response.status_code not in [200, 204]:
            raise HTTPException(status_code=response.status_code, detail="Failed to set shuffle")

        return {"status": "shuffle_set", "state": state}

@api_router.put("/spotify/repeat")
async def set_repeat(state: str, device_id: Optional[str] = None, user: User = Depends(get_current_user)):
    """Set repeat mode: off, context, or track."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")

    if state not in ["off", "context", "track"]:
        raise HTTPException(status_code=400, detail="Invalid repeat state. Must be: off, context, or track")

    async with httpx.AsyncClient() as client:
        url = f"https://api.spotify.com/v1/me/player/repeat?state={state}"
        if device_id:
            url += f"&device_id={device_id}"

        response = await client.put(
            url,
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )

        if response.status_code not in [200, 204]:
            raise HTTPException(status_code=response.status_code, detail="Failed to set repeat")

        return {"status": "repeat_set", "state": state}

@api_router.get("/spotify/me/playlists")
async def get_user_playlists(limit: int = 50, offset: int = 0, user: User = Depends(get_current_user)):
    """Get current user's playlists."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.spotify.com/v1/me/playlists?limit={limit}&offset={offset}",
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get playlists")

        data = response.json()
        # Return simplified playlist data
        playlists = []
        for item in data.get("items", []):
            playlists.append({
                "id": item["id"],
                "name": item["name"],
                "description": item.get("description", ""),
                "image": item["images"][0]["url"] if item.get("images") else None,
                "track_count": item["tracks"]["total"],
                "owner": item["owner"]["display_name"],
                "uri": item["uri"]
            })

        return {
            "playlists": playlists,
            "total": data.get("total", 0),
            "offset": offset,
            "limit": limit
        }

@api_router.get("/spotify/playlists/{playlist_id}/tracks")
async def get_playlist_tracks(playlist_id: str, limit: int = 50, offset: int = 0, user: User = Depends(get_current_user)):
    """Get tracks from a specific playlist."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks?limit={limit}&offset={offset}",
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get playlist tracks")

        data = response.json()
        # Return simplified track data
        tracks = []
        for item in data.get("items", []):
            track = item.get("track")
            if track and track.get("id"):  # Skip local files and null tracks
                tracks.append({
                    "id": track["id"],
                    "name": track["name"],
                    "artists": [a["name"] for a in track.get("artists", [])],
                    "album": track["album"]["name"] if track.get("album") else "",
                    "album_image": track["album"]["images"][0]["url"] if track.get("album", {}).get("images") else None,
                    "duration_ms": track["duration_ms"],
                    "uri": track["uri"]
                })

        return {
            "tracks": tracks,
            "total": data.get("total", 0),
            "offset": offset,
            "limit": limit
        }

@api_router.get("/spotify/me/tracks")
async def get_saved_tracks(limit: int = 50, offset: int = 0, user: User = Depends(get_current_user)):
    """Get user's saved/liked tracks."""
    token_data = await db.spotify_tokens.find_one({"user_id": user.user_id}, {"_id": 0})
    if not token_data:
        raise HTTPException(status_code=401, detail="Spotify not connected")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.spotify.com/v1/me/tracks?limit={limit}&offset={offset}",
            headers={"Authorization": f"Bearer {token_data['access_token']}"}
        )

        if response.status_code != 200:
            raise HTTPException(status_code=response.status_code, detail="Failed to get saved tracks")

        data = response.json()
        # Return simplified track data
        tracks = []
        for item in data.get("items", []):
            track = item.get("track")
            if track and track.get("id"):
                tracks.append({
                    "id": track["id"],
                    "name": track["name"],
                    "artists": [a["name"] for a in track.get("artists", [])],
                    "album": track["album"]["name"] if track.get("album") else "",
                    "album_image": track["album"]["images"][0]["url"] if track.get("album", {}).get("images") else None,
                    "duration_ms": track["duration_ms"],
                    "uri": track["uri"],
                    "added_at": item.get("added_at")
                })

        return {
            "tracks": tracks,
            "total": data.get("total", 0),
            "offset": offset,
            "limit": limit
        }


# ============== ROOT ENDPOINT ==============

@api_router.get("/")
async def root():
    return {"message": "PokerNight API v1.0"}

@api_router.get("/debug/my-data")
async def debug_my_data(user: User = Depends(get_current_user)):
    """Debug endpoint to show all user data"""
    # Current memberships
    memberships = await db.group_members.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)

    membership_groups = []
    for m in memberships:
        group = await db.groups.find_one({"group_id": m["group_id"]}, {"_id": 0})
        membership_groups.append({
            "group_id": m["group_id"],
            "group_name": group["name"] if group else "Unknown",
            "role": m["role"],
            "joined_at": m.get("joined_at")
        })

    # All games played
    players = await db.players.find(
        {"user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)

    games_by_group = {}
    for p in players:
        game = await db.game_nights.find_one(
            {"game_id": p["game_id"]},
            {"_id": 0, "game_id": 1, "group_id": 1, "status": 1, "created_at": 1}
        )
        if game:
            group_id = game["group_id"]
            if group_id not in games_by_group:
                group = await db.groups.find_one({"group_id": group_id}, {"_id": 0})
                is_member = any(m["group_id"] == group_id for m in memberships)
                games_by_group[group_id] = {
                    "group_name": group["name"] if group else "Deleted Group",
                    "is_current_member": is_member,
                    "games": []
                }
            games_by_group[group_id]["games"].append({
                "game_id": p["game_id"],
                "net_result": p.get("net_result"),
                "status": game["status"]
            })

    return {
        "user": {
            "user_id": user.user_id,
            "email": user.email,
            "name": user.name
        },
        "current_memberships": len(memberships),
        "membership_details": membership_groups,
        "total_games_played": len(players),
        "groups_with_games": games_by_group
    }


# ============== SUBSCRIBER ENDPOINTS ==============

class SubscribeRequest(BaseModel):
    email: str
    source: str = "landing"
    interests: List[str] = []

@api_router.post("/subscribe")
async def subscribe(request: Request, data: SubscribeRequest):
    """Subscribe to waitlist/newsletter"""
    import re

    # Validate email
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, data.email):
        raise HTTPException(status_code=400, detail="Invalid email address")

    email_lower = data.email.lower().strip()

    # Check if already subscribed
    existing = await db.subscribers.find_one({"email": email_lower}, {"_id": 0})

    if existing:
        if existing.get("unsubscribed"):
            # Re-subscribe
            await db.subscribers.update_one(
                {"email": email_lower},
                {
                    "$set": {
                        "unsubscribed": False,
                        "unsubscribed_at": None,
                        "subscribed_at": datetime.now(timezone.utc).isoformat()
                    },
                    "$addToSet": {"interests": {"$each": data.interests}}
                }
            )
            return {"status": "resubscribed", "message": "Welcome back! You've been re-subscribed."}
        else:
            # Update interests if new ones provided
            if data.interests:
                await db.subscribers.update_one(
                    {"email": email_lower},
                    {"$addToSet": {"interests": {"$each": data.interests}}}
                )
            return {"status": "exists", "message": "You're already on the list!"}

    # Get client info
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:500]

    # Create new subscriber
    subscriber = Subscriber(
        email=email_lower,
        source=data.source,
        interests=data.interests,
        ip_address=ip_address,
        user_agent=user_agent
    )

    sub_dict = subscriber.model_dump()
    sub_dict["subscribed_at"] = sub_dict["subscribed_at"].isoformat()
    await db.subscribers.insert_one(sub_dict)

    # Send welcome email (async, don't wait)
    from email_service import send_subscriber_welcome_email
    asyncio.create_task(send_subscriber_welcome_email(email_lower, data.source, data.interests))

    return {
        "status": "subscribed",
        "message": "You're in! Check your inbox for confirmation.",
        "subscriber_id": subscriber.subscriber_id
    }


@api_router.get("/subscribers/stats")
async def get_subscriber_stats():
    """Get public subscriber stats for FOMO display"""
    # Total subscribers
    total = await db.subscribers.count_documents({"unsubscribed": {"$ne": True}})

    # Last 24 hours
    yesterday = datetime.now(timezone.utc) - timedelta(hours=24)
    recent = await db.subscribers.count_documents({
        "subscribed_at": {"$gte": yesterday.isoformat()},
        "unsubscribed": {"$ne": True}
    })

    # Interest breakdown
    ai_waitlist = await db.subscribers.count_documents({
        "interests": "ai_assistant",
        "unsubscribed": {"$ne": True}
    })
    music_waitlist = await db.subscribers.count_documents({
        "interests": "music_integration",
        "unsubscribed": {"$ne": True}
    })

    # Add some "social proof" padding for early stage (remove when you have real numbers)
    display_total = max(total, 127)  # Minimum display for social proof
    display_recent = max(recent, 3)  # Minimum recent signups

    return {
        "total_subscribers": display_total,
        "recent_24h": display_recent,
        "ai_waitlist": ai_waitlist,
        "music_waitlist": music_waitlist,
        # Percentage for progress bars
        "ai_waitlist_percent": min(100, int((ai_waitlist / 500) * 100)),  # Goal: 500
        "music_waitlist_percent": min(100, int((music_waitlist / 500) * 100))
    }


@api_router.post("/unsubscribe")
async def unsubscribe(email: str):
    """Unsubscribe from all communications"""
    email_lower = email.lower().strip()

    result = await db.subscribers.update_one(
        {"email": email_lower},
        {
            "$set": {
                "unsubscribed": True,
                "unsubscribed_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Email not found")

    return {"status": "unsubscribed", "message": "You've been unsubscribed. Sorry to see you go!"}


# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
