"""
WebSocket Manager for Real-Time Game Updates
Uses Socket.IO for bidirectional communication
"""

import socketio
import logging
import jwt
import os
from datetime import datetime, timezone
from typing import Optional
from jwt import PyJWKClient

logger = logging.getLogger(__name__)

# Get Supabase configuration from environment
SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET', '')
SUPABASE_URL = os.environ.get('SUPABASE_URL', '')

# JWKS client factory for clean refresh
def make_jwks_client():
    """Create JWKS client with 12-hour cache"""
    jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/jwks"
    return PyJWKClient(jwks_url, cache_keys=True, lifespan=43200)

# Initialize JWKS client for RS256 verification (new Supabase signing keys)
jwks_client = None
if SUPABASE_URL:
    try:
        jwks_client = make_jwks_client()
        logger.info(f"✅ JWKS client initialized (TTL: 12h)")
    except Exception as e:
        logger.warning(f"Failed to initialize JWKS client: {e}")

# Create Socket.IO server with CORS
sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=False,
    engineio_logger=False
)

# Track connected users: {user_id: set(sid)}
connected_users: dict[str, set[str]] = {}

# Track game rooms: {game_id: set(user_id)}
game_rooms: dict[str, set[str]] = {}

# Track group rooms: {group_id: set(user_id)}
group_rooms: dict[str, set[str]] = {}

# Track sid to user_id mapping
sid_to_user: dict[str, str] = {}


async def verify_supabase_jwt(token: str) -> Optional[dict]:
    """
    Verify Supabase JWT using either:
    1. New JWKS method (RS256) - auto-fetches public keys with retry on unknown kid
    2. Legacy secret method (HS256) - uses shared secret
    """
    global jwks_client

    # Try new JWKS method first (RS256)
    if jwks_client:
        for attempt in range(2):
            try:
                signing_key = jwks_client.get_signing_key_from_jwt(token)
                payload = jwt.decode(
                    token,
                    signing_key.key,
                    algorithms=["RS256"],
                    audience="authenticated"
                )
                logger.debug(f"JWT verified using JWKS (RS256)")
                return payload
            except jwt.exceptions.PyJWKClientError as e:
                # Unknown kid - recreate client (clean refresh) and retry once
                if attempt == 0 and "Unable to find" in str(e):
                    logger.warning(f"Unknown kid, refreshing JWKS client (attempt {attempt + 1}/2)")
                    try:
                        jwks_client = make_jwks_client()
                        continue
                    except Exception as refresh_err:
                        logger.error(f"Failed to refresh JWKS client: {refresh_err}")
                        break
                logger.debug(f"JWKS verification failed: {e}")
                break
            except Exception as e:
                logger.debug(f"JWKS verification failed: {e}")
                break

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
        except Exception as e:
            logger.debug(f"Legacy secret verification failed: {e}")

    return None


@sio.event
async def connect(sid, environ, auth):
    """Handle new connection with JWT verification"""
    token = (auth or {}).get('token')

    # If no token provided, reject connection
    if not token:
        logger.warning(f"Connection rejected - no token (sid: {sid})")
        return False

    # Check if we have any verification method configured
    if not jwks_client and not SUPABASE_JWT_SECRET:
        logger.warning(f"Connection rejected - no JWT verification method configured (sid: {sid})")
        logger.warning("Set either SUPABASE_URL (for JWKS) or SUPABASE_JWT_SECRET (legacy)")
        return False

    try:
        # Verify JWT token
        payload = await verify_supabase_jwt(token)

        if not payload:
            logger.warning(f"Connection rejected - JWT verification failed (sid: {sid})")
            return False

        supabase_id = payload.get("sub")
        if not supabase_id:
            logger.warning(f"Connection rejected - no sub in token (sid: {sid})")
            return False

        # Store user_id (using supabase_id as the user identifier)
        user_id = supabase_id

        # Track connection
        if user_id not in connected_users:
            connected_users[user_id] = set()
        connected_users[user_id].add(sid)
        sid_to_user[sid] = user_id

        # Save session
        await sio.save_session(sid, {'user_id': user_id, 'supabase_id': supabase_id})

        logger.info(f"✅ User {user_id[:8]}... connected (sid: {sid})")
        return True

    except jwt.ExpiredSignatureError:
        logger.warning(f"Connection rejected - token expired (sid: {sid})")
        return False
    except jwt.InvalidTokenError as e:
        logger.warning(f"Connection rejected - invalid token (sid: {sid}): {e}")
        return False
    except Exception as e:
        logger.error(f"Connection error (sid: {sid}): {e}")
        return False


@sio.event
async def disconnect(sid):
    """Handle disconnection"""
    # Get user_id from sid mapping
    user_id = sid_to_user.get(sid)

    if user_id:
        # Clean up connected_users tracking
        if user_id in connected_users:
            connected_users[user_id].discard(sid)
            if not connected_users[user_id]:
                del connected_users[user_id]

        # Leave all game rooms
        for game_id, users in list(game_rooms.items()):
            if user_id in users:
                users.discard(user_id)
                await sio.leave_room(sid, f"game_{game_id}")
                if not users:
                    del game_rooms[game_id]

        # Leave all group rooms
        for group_id, users in list(group_rooms.items()):
            if user_id in users:
                users.discard(user_id)
                await sio.leave_room(sid, f"group_{group_id}")
                if not users:
                    del group_rooms[group_id]

        # Clean up sid mapping
        del sid_to_user[sid]

        logger.info(f"User {user_id} disconnected (sid: {sid})")
    else:
        logger.info(f"Disconnected (sid: {sid})")


@sio.event
async def join_game(sid, data):
    """User joins a game room for real-time updates"""
    from motor.motor_asyncio import AsyncIOMotorClient
    import os

    session = await sio.get_session(sid)
    user_id = session.get('user_id') if session else None
    game_id = data.get('game_id')

    if not user_id or not game_id:
        logger.warning(f"join_game rejected - missing user_id or game_id (sid: {sid})")
        return {'error': 'Missing user_id or game_id'}

    # AUTHORIZATION: Verify user has access to this game
    try:
        # Get database connection
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'oddside')
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]

        # Check if user is in the game's group or is a player in the game
        game = await db.game_nights.find_one({'game_id': game_id})
        if not game:
            logger.warning(f"join_game rejected - game {game_id} not found (user: {user_id})")
            return {'error': 'Game not found'}

        group_id = game.get('group_id')
        if not group_id:
            logger.warning(f"join_game rejected - game {game_id} has no group_id")
            return {'error': 'Invalid game'}

        # Check if user is a member of the group
        membership = await db.group_members.find_one({
            'group_id': group_id,
            'user_id': user_id,
            'status': 'active'
        })

        if not membership:
            # Also check if user is a player in this specific game (invited)
            player = await db.players.find_one({
                'game_id': game_id,
                'user_id': user_id
            })

            if not player:
                logger.warning(f"join_game rejected - user {user_id} not authorized for game {game_id}")
                return {'error': 'Not authorized to join this game'}

        # Authorization passed - join room
        room = f"game_{game_id}"
        await sio.enter_room(sid, room)

        if game_id not in game_rooms:
            game_rooms[game_id] = set()
        game_rooms[game_id].add(user_id)

        logger.info(f"✅ User {user_id} joined game room {game_id}")
        return {'status': 'joined', 'room': room}

    except Exception as e:
        logger.error(f"join_game error for user {user_id}, game {game_id}: {e}")
        return {'error': 'Authorization check failed'}


@sio.event
async def leave_game(sid, data):
    """User leaves a game room"""
    session = await sio.get_session(sid)
    user_id = session.get('user_id') if session else None
    game_id = data.get('game_id')
    
    if game_id:
        room = f"game_{game_id}"
        await sio.leave_room(sid, room)
        
        if game_id in game_rooms and user_id:
            game_rooms[game_id].discard(user_id)
            if not game_rooms[game_id]:
                del game_rooms[game_id]
    
    return {'status': 'left'}


@sio.event
async def join_group(sid, data):
    """User joins a group's chat room for real-time messages"""
    from motor.motor_asyncio import AsyncIOMotorClient
    import os

    session = await sio.get_session(sid)
    user_id = session.get('user_id') if session else None
    group_id = data.get('group_id')

    if not user_id or not group_id:
        logger.warning(f"join_group rejected - missing user_id or group_id (sid: {sid})")
        return {'error': 'Missing user_id or group_id'}

    # Verify user is a member of the group
    try:
        mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
        db_name = os.environ.get('DB_NAME', 'oddside')
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]

        membership = await db.group_members.find_one({
            'group_id': group_id,
            'user_id': user_id,
            'status': 'active'
        })

        if not membership:
            logger.warning(f"join_group rejected - user {user_id} not member of group {group_id}")
            return {'error': 'Not a member of this group'}

        # Join the group room
        room = f"group_{group_id}"
        await sio.enter_room(sid, room)

        if group_id not in group_rooms:
            group_rooms[group_id] = set()
        group_rooms[group_id].add(user_id)

        logger.info(f"User {user_id[:8]}... joined group room {group_id}")
        return {'status': 'joined', 'room': room}

    except Exception as e:
        logger.error(f"join_group error for user {user_id}, group {group_id}: {e}")
        return {'error': 'Authorization check failed'}


@sio.event
async def leave_group(sid, data):
    """User leaves a group's chat room"""
    session = await sio.get_session(sid)
    user_id = session.get('user_id') if session else None
    group_id = data.get('group_id')

    if group_id:
        room = f"group_{group_id}"
        await sio.leave_room(sid, room)

        if group_id in group_rooms and user_id:
            group_rooms[group_id].discard(user_id)
            if not group_rooms[group_id]:
                del group_rooms[group_id]

    return {'status': 'left'}


@sio.event
async def group_typing(sid, data):
    """Broadcast typing indicator to group room"""
    session = await sio.get_session(sid)
    user_id = session.get('user_id') if session else None
    group_id = data.get('group_id')
    user_name = data.get('user_name', 'Someone')

    if user_id and group_id:
        await sio.emit('group_typing', {
            'group_id': group_id,
            'user_id': user_id,
            'user_name': user_name
        }, room=f"group_{group_id}", skip_sid=sid)


# ============== EVENT EMITTERS ==============

async def emit_game_event(game_id: str, event_type: str, data: dict, exclude_user: Optional[str] = None):
    """
    Emit a game event to all users in the game room
    
    Event types:
    - player_joined: New player joined
    - player_left: Player left
    - buy_in: Player bought in
    - rebuy: Player rebought
    - cash_out: Player cashed out
    - chips_edited: Host edited chips
    - game_started: Game started
    - game_ended: Game ended
    - message: New chat message
    """
    room = f"game_{game_id}"
    
    event_data = {
        'type': event_type,
        'game_id': game_id,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        **data
    }
    
    await sio.emit('game_update', event_data, room=room)
    logger.info(f"Emitted {event_type} to game {game_id}")


async def emit_to_user(user_id: str, event_type: str, data: dict):
    """Emit event to a specific user (all their connections)"""
    if user_id in connected_users:
        event_data = {
            'type': event_type,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            **data
        }
        
        for sid in connected_users[user_id]:
            await sio.emit('notification', event_data, to=sid)
        
        logger.info(f"Emitted {event_type} to user {user_id}")


async def emit_notification(user_id: str, notification: dict):
    """Emit a notification to a user"""
    await emit_to_user(user_id, 'new_notification', notification)


# ============== GAME EVENT HELPERS ==============

async def notify_player_joined(game_id: str, player_name: str, user_id: str, buy_in: float, chips: int):
    """Notify all players that someone joined"""
    await emit_game_event(game_id, 'player_joined', {
        'player_name': player_name,
        'user_id': user_id,
        'buy_in': buy_in,
        'chips': chips
    })


async def notify_buy_in(game_id: str, player_name: str, user_id: str, amount: float, chips: int, total_buy_in: float):
    """Notify all players of a buy-in"""
    await emit_game_event(game_id, 'buy_in', {
        'player_name': player_name,
        'user_id': user_id,
        'amount': amount,
        'chips': chips,
        'total_buy_in': total_buy_in
    })


async def notify_cash_out(game_id: str, player_name: str, user_id: str, chips_returned: int, cash_out: float, net_result: float):
    """Notify all players of a cash-out"""
    await emit_game_event(game_id, 'cash_out', {
        'player_name': player_name,
        'user_id': user_id,
        'chips_returned': chips_returned,
        'cash_out': cash_out,
        'net_result': net_result
    })


async def notify_chips_edited(game_id: str, player_name: str, user_id: str, old_chips: int, new_chips: int, reason: str):
    """Notify all players that chips were edited"""
    await emit_game_event(game_id, 'chips_edited', {
        'player_name': player_name,
        'user_id': user_id,
        'old_chips': old_chips,
        'new_chips': new_chips,
        'reason': reason
    })


async def notify_game_message(game_id: str, sender_name: str, message: str, message_type: str = 'chat'):
    """Notify all players of a new message"""
    await emit_game_event(game_id, 'message', {
        'sender_name': sender_name,
        'content': message,
        'message_type': message_type
    })


async def notify_game_state_change(game_id: str, new_status: str, message: str = None):
    """Notify all players of game state change"""
    await emit_game_event(game_id, 'game_state', {
        'status': new_status,
        'message': message
    })


# ============== GROUP CHAT EMITTERS ==============

async def emit_group_message(group_id: str, message_data: dict):
    """Broadcast a message to all group members in the room"""
    event_data = {
        'group_id': group_id,
        'timestamp': datetime.now(timezone.utc).isoformat(),
        **message_data
    }
    await sio.emit('group_message', event_data, room=f"group_{group_id}")
    logger.info(f"Emitted group_message to group {group_id}")


async def emit_group_typing(group_id: str, user_id: str, user_name: str):
    """Broadcast typing indicator to group room"""
    await sio.emit('group_typing', {
        'group_id': group_id,
        'user_id': user_id,
        'user_name': user_name
    }, room=f"group_{group_id}")
