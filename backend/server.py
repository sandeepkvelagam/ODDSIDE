from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
import random
from datetime import datetime, timezone, timedelta
import httpx
import jwt

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

# Create the main app
app = FastAPI(title="ODDSIDE API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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

# ============== AUTH HELPERS ==============

async def verify_supabase_jwt(token: str) -> dict:
    """Verify Supabase JWT token and return claims."""
    if not SUPABASE_JWT_SECRET:
        return None
    
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.error(f"JWT verification failed: {e}")
        return None

async def get_current_user(request: Request) -> User:
    """Get current authenticated user from session token or Supabase JWT."""
    # Check Authorization header first for JWT
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        
        # Try Supabase JWT first
        if SUPABASE_JWT_SECRET:
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
        
        # TODO: Send email notification here (would need email service)
        # For now, the invite will be waiting when they register
        
        return {
            "message": f"Invite created for {data.email}. They'll see it when they register!",
            "status": "pending_registration",
            "note": "User not registered yet. Invite will be waiting when they sign up."
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
    
    game = GameNight(
        group_id=data.group_id,
        host_id=user.user_id,
        title=data.title,
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
    
    # Add host as player
    player = Player(
        game_id=game.game_id,
        user_id=user.user_id,
        rsvp_status="yes"
    )
    player_dict = player.model_dump()
    player_dict["joined_at"] = player_dict["joined_at"].isoformat()
    await db.players.insert_one(player_dict)
    
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
    
    # Get all groups at once
    groups = await db.groups.find(
        {"group_id": {"$in": unique_group_ids}},
        {"_id": 0, "group_id": 1, "name": 1}
    ).to_list(100)
    group_map = {g["group_id"]: g for g in groups}
    
    # Get player counts using aggregation
    player_counts = await db.players.aggregate([
        {"$match": {"game_id": {"$in": game_ids}}},
        {"$group": {"_id": "$game_id", "count": {"$sum": 1}}}
    ]).to_list(100)
    count_map = {pc["_id"]: pc["count"] for pc in player_counts}
    
    # Get user's player records for all games
    user_players = await db.players.find(
        {"game_id": {"$in": game_ids}, "user_id": user.user_id},
        {"_id": 0}
    ).to_list(100)
    player_map = {p["game_id"]: p for p in user_players}
    
    # Apply to games
    for game in games:
        group = group_map.get(game["group_id"])
        game["group_name"] = group["name"] if group else "Unknown"
        game["player_count"] = count_map.get(game["game_id"], 0)
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
    
    return {"message": "Game ended"}

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

@api_router.post("/games/{game_id}/add-player")
async def add_player_to_game(game_id: str, data: AddPlayerRequest, user: User = Depends(get_current_user)):
    """Add a player to an active game (host/admin only)."""
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
        raise HTTPException(status_code=403, detail="Only host or admin can add players")
    
    if game["status"] not in ["active", "scheduled"]:
        raise HTTPException(status_code=400, detail="Can only add players to active or scheduled games")
    
    # Check max players (20)
    current_players = await db.players.count_documents({"game_id": game_id})
    if current_players >= 20:
        raise HTTPException(status_code=400, detail="Maximum 20 players per game")
    
    # Check if player is a group member
    is_group_member = await db.group_members.find_one({
        "group_id": game["group_id"],
        "user_id": data.user_id
    }, {"_id": 0})
    if not is_group_member:
        raise HTTPException(status_code=400, detail="User must be a group member")
    
    # Check if already a player
    existing = await db.players.find_one({
        "game_id": game_id,
        "user_id": data.user_id
    }, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="User already in game")
    
    player = Player(
        game_id=game_id,
        user_id=data.user_id,
        rsvp_status="yes"
    )
    player_dict = player.model_dump()
    player_dict["joined_at"] = player_dict["joined_at"].isoformat()
    await db.players.insert_one(player_dict)
    
    # Get user name for message
    added_user = await db.users.find_one({"user_id": data.user_id}, {"_id": 0, "name": 1})
    
    # Add system message
    message = GameThread(
        game_id=game_id,
        user_id=user.user_id,
        content=f"{added_user['name'] if added_user else 'Player'} joined the game",
        type="system"
    )
    msg_dict = message.model_dump()
    msg_dict["created_at"] = msg_dict["created_at"].isoformat()
    await db.game_threads.insert_one(msg_dict)
    
    return {"message": "Player added"}

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
    """Join an active game."""
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
    
    # Check if already a player
    existing = await db.players.find_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"_id": 0}
    )
    
    if existing:
        await db.players.update_one(
            {"game_id": game_id, "user_id": user.user_id},
            {"$set": {"rsvp_status": "yes"}}
        )
    else:
        player = Player(
            game_id=game_id,
            user_id=user.user_id,
            rsvp_status="yes"
        )
        await db.players.insert_one(player.model_dump())
    
    return {"message": "Joined game"}

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
        "net_balance": round(total_owed - total_owes, 2),
        "owes": owes,
        "owed": owed
    }

# ============== ROOT ENDPOINT ==============

@api_router.get("/")
async def root():
    return {"message": "PokerNight API v1.0"}

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
