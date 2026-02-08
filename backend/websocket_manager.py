"""
WebSocket Manager for Real-Time Game Updates
Uses Socket.IO for bidirectional communication
"""

import socketio
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

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


@sio.event
async def connect(sid, environ, auth):
    """Handle new connection"""
    user_id = auth.get('user_id') if auth else None
    if user_id:
        if user_id not in connected_users:
            connected_users[user_id] = set()
        connected_users[user_id].add(sid)
        await sio.save_session(sid, {'user_id': user_id})
        logger.info(f"User {user_id} connected (sid: {sid})")
    else:
        logger.info(f"Anonymous connection (sid: {sid})")


@sio.event
async def disconnect(sid):
    """Handle disconnection"""
    session = await sio.get_session(sid)
    user_id = session.get('user_id') if session else None
    
    if user_id and user_id in connected_users:
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
    
    logger.info(f"Disconnected (sid: {sid})")


@sio.event
async def join_game(sid, data):
    """User joins a game room for real-time updates"""
    session = await sio.get_session(sid)
    user_id = session.get('user_id') if session else None
    game_id = data.get('game_id')
    
    if not user_id or not game_id:
        return {'error': 'Missing user_id or game_id'}
    
    room = f"game_{game_id}"
    await sio.enter_room(sid, room)
    
    if game_id not in game_rooms:
        game_rooms[game_id] = set()
    game_rooms[game_id].add(user_id)
    
    logger.info(f"User {user_id} joined game room {game_id}")
    return {'status': 'joined', 'room': room}


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
