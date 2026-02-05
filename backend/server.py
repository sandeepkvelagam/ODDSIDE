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
from datetime import datetime, timezone, timedelta
import httpx
import jwt

ROOT_DIR = Path(__file__).parent
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

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Group(BaseModel):
    model_config = ConfigDict(extra="ignore")
    group_id: str = Field(default_factory=lambda: f"grp_{uuid.uuid4().hex[:12]}")
    name: str
    description: Optional[str] = None
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    default_buy_in: float = 20.0
    currency: str = "USD"

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
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    status: str = "scheduled"  # scheduled, active, ended, settled
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_finalized: bool = False

class Player(BaseModel):
    model_config = ConfigDict(extra="ignore")
    player_id: str = Field(default_factory=lambda: f"plr_{uuid.uuid4().hex[:12]}")
    game_id: str
    user_id: str
    total_buy_in: float = 0.0
    cash_out: Optional[float] = None
    net_result: Optional[float] = None
    rsvp_status: str = "pending"  # pending, yes, maybe, no

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    transaction_id: str = Field(default_factory=lambda: f"txn_{uuid.uuid4().hex[:12]}")
    game_id: str
    user_id: str
    type: str  # buy_in, cash_out
    amount: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    default_buy_in: float = 20.0
    currency: str = "USD"

class GroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    default_buy_in: Optional[float] = None

class GameNightCreate(BaseModel):
    group_id: str
    title: Optional[str] = None
    scheduled_at: Optional[datetime] = None

class BuyInRequest(BaseModel):
    amount: float

class CashOutRequest(BaseModel):
    amount: float

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

# ============== AUTH HELPERS ==============

async def get_current_user(request: Request) -> User:
    """Get current authenticated user from session token."""
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Fallback to Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Find session
    session_doc = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    # Get user
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0}
    )
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user_doc)

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/session")
async def create_session(request: SessionRequest, response: Response):
    """Exchange session_id for session_token after OAuth."""
    try:
        async with httpx.AsyncClient() as client_http:
            resp = await client_http.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
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
    group = Group(
        name=data.name,
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
    
    # Get members with user info
    members = await db.group_members.find(
        {"group_id": group_id},
        {"_id": 0}
    ).to_list(100)
    
    for member in members:
        user_info = await db.users.find_one(
            {"user_id": member["user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "email": 1, "picture": 1}
        )
        member["user"] = user_info
    
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
    """Invite a user to group by email."""
    membership = await db.group_members.find_one(
        {"group_id": group_id, "user_id": user.user_id},
        {"_id": 0}
    )
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this group")
    
    # Find user by email
    invited_user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not invited_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already a member
    existing = await db.group_members.find_one(
        {"group_id": group_id, "user_id": invited_user["user_id"]},
        {"_id": 0}
    )
    if existing:
        raise HTTPException(status_code=400, detail="User already a member")
    
    # Add member
    member = GroupMember(
        group_id=group_id,
        user_id=invited_user["user_id"],
        role="member"
    )
    member_dict = member.model_dump()
    member_dict["joined_at"] = member_dict["joined_at"].isoformat()
    await db.group_members.insert_one(member_dict)
    
    # Create notification
    group = await db.groups.find_one({"group_id": group_id}, {"_id": 0, "name": 1})
    notification = Notification(
        user_id=invited_user["user_id"],
        type="group_invite",
        title="Group Invitation",
        message=f"You've been added to {group['name']}",
        data={"group_id": group_id}
    )
    notif_dict = notification.model_dump()
    notif_dict["created_at"] = notif_dict["created_at"].isoformat()
    await db.notifications.insert_one(notif_dict)
    
    return {"message": "Member invited successfully"}

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
    
    game = GameNight(
        group_id=data.group_id,
        host_id=user.user_id,
        title=data.title,
        scheduled_at=data.scheduled_at,
        status="scheduled" if data.scheduled_at else "active",
        started_at=None if data.scheduled_at else datetime.now(timezone.utc)
    )
    
    game_dict = game.model_dump()
    for key in ["scheduled_at", "started_at", "ended_at", "created_at"]:
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
    await db.players.insert_one(player_dict)
    
    # Notify group members
    members = await db.group_members.find(
        {"group_id": data.group_id, "user_id": {"$ne": user.user_id}},
        {"_id": 0}
    ).to_list(100)
    
    group = await db.groups.find_one({"group_id": data.group_id}, {"_id": 0, "name": 1})
    
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
    
    # Add group name and player count
    for game in games:
        group = await db.groups.find_one({"group_id": game["group_id"]}, {"_id": 0, "name": 1})
        game["group_name"] = group["name"] if group else "Unknown"
        
        player_count = await db.players.count_documents({"game_id": game["game_id"]})
        game["player_count"] = player_count
        
        # Check if user is player
        player = await db.players.find_one(
            {"game_id": game["game_id"], "user_id": user.user_id},
            {"_id": 0}
        )
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
    
    # Get players with user info
    players = await db.players.find({"game_id": game_id}, {"_id": 0}).to_list(100)
    for player in players:
        user_info = await db.users.find_one(
            {"user_id": player["user_id"]},
            {"_id": 0, "user_id": 1, "name": 1, "picture": 1}
        )
        player["user"] = user_info
        
        # Get transactions
        txns = await db.transactions.find(
            {"game_id": game_id, "user_id": player["user_id"]},
            {"_id": 0}
        ).to_list(100)
        player["transactions"] = txns
    
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
    
    # Get current user's player record
    current_player = await db.players.find_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"_id": 0}
    )
    game["current_player"] = current_player
    
    return game

@api_router.post("/games/{game_id}/start")
async def start_game(game_id: str, user: User = Depends(get_current_user)):
    """Start a scheduled game (host only)."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can start game")
    
    if game["status"] != "scheduled":
        raise HTTPException(status_code=400, detail="Game already started or ended")
    
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$set": {
            "status": "active",
            "started_at": datetime.now(timezone.utc).isoformat()
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
    
    return {"message": "Game started"}

@api_router.post("/games/{game_id}/end")
async def end_game(game_id: str, user: User = Depends(get_current_user)):
    """End an active game (host only)."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can end game")
    
    if game["status"] != "active":
        raise HTTPException(status_code=400, detail="Game not active")
    
    await db.game_nights.update_one(
        {"game_id": game_id},
        {"$set": {
            "status": "ended",
            "ended_at": datetime.now(timezone.utc).isoformat()
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
    """Add a buy-in for current user."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["status"] != "active":
        raise HTTPException(status_code=400, detail="Game not active")
    
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
            total_buy_in=0
        )
        await db.players.insert_one(player_doc.model_dump())
        player = player_doc.model_dump()
    
    # Create transaction
    txn = Transaction(
        game_id=game_id,
        user_id=user.user_id,
        type="buy_in",
        amount=data.amount
    )
    txn_dict = txn.model_dump()
    txn_dict["timestamp"] = txn_dict["timestamp"].isoformat()
    await db.transactions.insert_one(txn_dict)
    
    # Update player total
    new_total = player.get("total_buy_in", 0) + data.amount
    await db.players.update_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"$set": {"total_buy_in": new_total}}
    )
    
    return {"message": "Buy-in added", "total_buy_in": new_total}

@api_router.post("/games/{game_id}/cash-out")
async def cash_out(game_id: str, data: CashOutRequest, user: User = Depends(get_current_user)):
    """Record cash-out for current user."""
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
    
    # Create transaction
    txn = Transaction(
        game_id=game_id,
        user_id=user.user_id,
        type="cash_out",
        amount=data.amount
    )
    txn_dict = txn.model_dump()
    txn_dict["timestamp"] = txn_dict["timestamp"].isoformat()
    await db.transactions.insert_one(txn_dict)
    
    # Calculate net result
    net_result = data.amount - player.get("total_buy_in", 0)
    
    await db.players.update_one(
        {"game_id": game_id, "user_id": user.user_id},
        {"$set": {
            "cash_out": data.amount,
            "net_result": net_result
        }}
    )
    
    return {"message": "Cash-out recorded", "net_result": net_result}

# ============== SETTLEMENT ENDPOINTS ==============

@api_router.post("/games/{game_id}/settle")
async def generate_settlement(game_id: str, user: User = Depends(get_current_user)):
    """Generate settlement (host only)."""
    game = await db.game_nights.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    
    if game["host_id"] != user.user_id:
        raise HTTPException(status_code=403, detail="Only host can generate settlement")
    
    if game["status"] not in ["ended", "settled"]:
        raise HTTPException(status_code=400, detail="Game must be ended first")
    
    # Get players with results
    players = await db.players.find(
        {"game_id": game_id, "cash_out": {"$ne": None}},
        {"_id": 0}
    ).to_list(100)
    
    if not players:
        raise HTTPException(status_code=400, detail="No players have cashed out")
    
    # Simple settlement algorithm (debt minimization)
    # Separate winners and losers
    winners = [(p["user_id"], p["net_result"]) for p in players if p.get("net_result", 0) > 0]
    losers = [(p["user_id"], -p["net_result"]) for p in players if p.get("net_result", 0) < 0]
    
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
