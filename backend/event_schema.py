"""
Game-Agnostic Event Logging Schema
Supports: poker, rummy, and future game types
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime, timezone
import uuid


# Event Types - Game agnostic
EventType = Literal[
    # Player events
    "join",           # Player joins game
    "leave",          # Player leaves game
    "request_join",   # Player requests to join
    "approve_join",   # Host approves join
    "reject_join",    # Host rejects join
    
    # Financial events
    "buy_in",         # Initial or additional buy-in
    "rebuy",          # Rebuy after bust
    "cash_out",       # Player cashes out
    "request_buy_in", # Player requests buy-in
    "approve_buy_in", # Host approves buy-in
    "chips_edit",     # Host edits chip count
    
    # Game events
    "game_create",    # Game created
    "game_start",     # Game starts
    "game_pause",     # Game paused
    "game_resume",    # Game resumed
    "game_end",       # Game ends
    "game_cancel",    # Game cancelled
    "game_settle",    # Game settled
    
    # Settlement events
    "payment_due",    # Payment required
    "payment_made",   # Payment marked as done
    
    # Chat events
    "message",        # Chat message
    "system_message", # System notification
]

# Game Types - Extensible
GameType = Literal["poker", "rummy", "blackjack", "other"]


class GameEvent(BaseModel):
    """
    Universal game event schema
    Works across all game types
    """
    event_id: str = Field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    
    # Core identifiers
    game_id: str
    game_type: GameType = "poker"
    group_id: Optional[str] = None
    
    # Event details
    event_type: EventType
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Actor (who did it)
    actor_id: str  # User who triggered the event
    actor_name: Optional[str] = None
    
    # Target (who it affects) - optional
    target_id: Optional[str] = None  # Affected user (if different from actor)
    target_name: Optional[str] = None
    
    # Financial data (if applicable)
    amount: Optional[float] = None  # Dollar amount
    chips: Optional[int] = None     # Chip count
    chip_value: Optional[float] = None  # Value per chip
    
    # Previous values (for edits/changes)
    previous_amount: Optional[float] = None
    previous_chips: Optional[int] = None
    
    # Context
    reason: Optional[str] = None    # Why this happened
    notes: Optional[str] = None     # Additional notes
    message: Optional[str] = None   # For chat events
    
    # Metadata
    source: str = "app"  # app, api, system, migration
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# Helper functions to create events
def create_join_event(game_id: str, user_id: str, user_name: str, buy_in: float = 0, chips: int = 0, game_type: GameType = "poker") -> GameEvent:
    return GameEvent(
        game_id=game_id,
        game_type=game_type,
        event_type="join",
        actor_id=user_id,
        actor_name=user_name,
        amount=buy_in,
        chips=chips
    )


def create_buy_in_event(game_id: str, user_id: str, user_name: str, amount: float, chips: int, game_type: GameType = "poker", is_rebuy: bool = False) -> GameEvent:
    return GameEvent(
        game_id=game_id,
        game_type=game_type,
        event_type="rebuy" if is_rebuy else "buy_in",
        actor_id=user_id,
        actor_name=user_name,
        amount=amount,
        chips=chips
    )


def create_cash_out_event(game_id: str, user_id: str, user_name: str, chips_returned: int, cash_out: float, net_result: float, game_type: GameType = "poker") -> GameEvent:
    return GameEvent(
        game_id=game_id,
        game_type=game_type,
        event_type="cash_out",
        actor_id=user_id,
        actor_name=user_name,
        chips=chips_returned,
        amount=cash_out,
        notes=f"Net result: ${net_result:.2f}"
    )


def create_chips_edit_event(game_id: str, host_id: str, host_name: str, target_id: str, target_name: str, old_chips: int, new_chips: int, reason: str = None, game_type: GameType = "poker") -> GameEvent:
    return GameEvent(
        game_id=game_id,
        game_type=game_type,
        event_type="chips_edit",
        actor_id=host_id,
        actor_name=host_name,
        target_id=target_id,
        target_name=target_name,
        chips=new_chips,
        previous_chips=old_chips,
        reason=reason
    )


def create_game_state_event(game_id: str, host_id: str, host_name: str, event_type: EventType, game_type: GameType = "poker") -> GameEvent:
    return GameEvent(
        game_id=game_id,
        game_type=game_type,
        event_type=event_type,
        actor_id=host_id,
        actor_name=host_name
    )


def create_message_event(game_id: str, user_id: str, user_name: str, message: str, is_system: bool = False, game_type: GameType = "poker") -> GameEvent:
    return GameEvent(
        game_id=game_id,
        game_type=game_type,
        event_type="system_message" if is_system else "message",
        actor_id=user_id,
        actor_name=user_name,
        message=message
    )


def create_payment_event(game_id: str, from_user_id: str, from_name: str, to_user_id: str, to_name: str, amount: float, is_paid: bool = False, game_type: GameType = "poker") -> GameEvent:
    return GameEvent(
        game_id=game_id,
        game_type=game_type,
        event_type="payment_made" if is_paid else "payment_due",
        actor_id=from_user_id,
        actor_name=from_name,
        target_id=to_user_id,
        target_name=to_name,
        amount=amount
    )
