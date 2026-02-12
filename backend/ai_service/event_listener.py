"""
Event Listener Service

Listens to game events (WebSocket, API) and routes them to the Host Persona Agent
for intelligent processing and automation.
"""

from typing import Dict, Optional, Callable, List
from datetime import datetime
import logging
import asyncio

logger = logging.getLogger(__name__)


class EventListenerService:
    """
    Central event listener that routes game events to the Host Persona Agent.

    Supported Events:
    - player_join_request: Player wants to join a game
    - buy_in_request: Player requests a buy-in
    - cash_out_request: Player requests to cash out
    - game_started: Game has started
    - game_ended: Game has ended
    - player_cashed_out: Player has cashed out
    - all_players_cashed_out: All players have cashed out
    - chip_discrepancy: Chip count doesn't match expected
    - game_stale: No activity for extended period
    """

    def __init__(self, orchestrator=None, db=None):
        self.orchestrator = orchestrator
        self.db = db
        self.host_persona = None
        self._event_handlers: Dict[str, List[Callable]] = {}
        self._is_running = False

        # Register default handlers
        self._setup_default_handlers()

    def _setup_default_handlers(self):
        """Setup default event handlers"""
        self.register_handler("player_join_request", self._handle_join_request)
        self.register_handler("buy_in_request", self._handle_buy_in_request)
        self.register_handler("cash_out_request", self._handle_cash_out_request)
        self.register_handler("game_started", self._handle_game_started)
        self.register_handler("game_ended", self._handle_game_ended)
        self.register_handler("all_players_cashed_out", self._handle_all_cashed_out)
        self.register_handler("chip_discrepancy", self._handle_chip_discrepancy)
        self.register_handler("game_stale", self._handle_game_stale)
        self.register_handler("rsvp_response", self._handle_rsvp_response)
        self.register_handler("payment_received", self._handle_payment_received)

    def set_orchestrator(self, orchestrator):
        """Set the AI orchestrator and get host persona agent"""
        self.orchestrator = orchestrator
        if orchestrator and orchestrator.agent_registry:
            self.host_persona = orchestrator.agent_registry.get("host_persona")

    def register_handler(self, event_type: str, handler: Callable):
        """Register a handler for an event type"""
        if event_type not in self._event_handlers:
            self._event_handlers[event_type] = []
        self._event_handlers[event_type].append(handler)

    async def emit(self, event_type: str, data: Dict):
        """
        Emit an event to all registered handlers.

        Args:
            event_type: Type of event (e.g., "buy_in_request")
            data: Event data including game_id, player_id, host_id, etc.
        """
        logger.info(f"Event received: {event_type} - {data.get('game_id', 'no game')}")

        # Log the event
        if self.db:
            await self.db.event_logs.insert_one({
                "event_type": event_type,
                "data": data,
                "timestamp": datetime.utcnow()
            })

        # Call registered handlers
        handlers = self._event_handlers.get(event_type, [])
        for handler in handlers:
            try:
                await handler(data)
            except Exception as e:
                logger.error(f"Handler error for {event_type}: {e}")

    # ==================== Default Event Handlers ====================

    async def _handle_join_request(self, data: Dict):
        """Handle player join request - route to Host Persona"""
        if not self.host_persona:
            logger.warning("Host Persona not available for join request")
            return

        result = await self.host_persona.handle_join_request(data)
        logger.info(f"Join request processed: {result.success}")

    async def _handle_buy_in_request(self, data: Dict):
        """Handle buy-in request - route to Host Persona"""
        if not self.host_persona:
            logger.warning("Host Persona not available for buy-in request")
            return

        result = await self.host_persona.handle_buy_in_request(data)
        logger.info(f"Buy-in request processed: {result.success}")

    async def _handle_cash_out_request(self, data: Dict):
        """Handle cash-out request - route to Host Persona"""
        if not self.host_persona:
            logger.warning("Host Persona not available for cash-out request")
            return

        result = await self.host_persona.handle_cash_out_request(data)
        logger.info(f"Cash-out request processed: {result.success}")

    async def _handle_game_started(self, data: Dict):
        """Handle game started - send notifications"""
        game_id = data.get("game_id")
        if not self.orchestrator:
            return

        # Get game details
        if self.db:
            game = await self.db.game_nights.find_one({"game_id": game_id})
            if game:
                player_ids = [p.get("user_id") for p in game.get("players", [])]

                # Send start notification
                notification_tool = self.orchestrator.tool_registry.get("notification_sender")
                if notification_tool:
                    await notification_tool.execute(
                        user_ids=player_ids,
                        title=f"Game Started: {game.get('title', 'Poker Night')}",
                        message="The game is now live! Good luck!",
                        notification_type="game_starting",
                        data={"game_id": game_id}
                    )

    async def _handle_game_ended(self, data: Dict):
        """Handle game ended - trigger settlement"""
        game_id = data.get("game_id")
        host_id = data.get("host_id")

        if self.host_persona:
            # Generate settlement automatically
            result = await self.host_persona.execute(
                "Generate settlement",
                context={
                    "game_id": game_id,
                    "host_id": host_id,
                    "player_ids": data.get("player_ids", [])
                }
            )
            logger.info(f"Settlement generated: {result.success}")

    async def _handle_all_cashed_out(self, data: Dict):
        """Handle when all players have cashed out"""
        game_id = data.get("game_id")
        host_id = data.get("host_id")

        if not self.host_persona or not self.orchestrator:
            return

        # Queue end game decision for host
        decision_tool = self.orchestrator.tool_registry.get("host_decision")
        if decision_tool:
            await decision_tool.execute(
                action="queue_decision",
                host_id=host_id,
                game_id=game_id,
                decision_type="end_game",
                context={"all_cashed_out": True},
                recommendation="All players have cashed out. Ready to end game and generate settlement."
            )

    async def _handle_chip_discrepancy(self, data: Dict):
        """Handle chip discrepancy detection"""
        game_id = data.get("game_id")
        host_id = data.get("host_id")
        expected = data.get("expected_chips", 0)
        actual = data.get("actual_chips", 0)
        difference = actual - expected

        if not self.orchestrator:
            return

        # Send alert to host
        notification_tool = self.orchestrator.tool_registry.get("notification_sender")
        if notification_tool:
            await notification_tool.execute(
                user_ids=[host_id],
                title="Chip Discrepancy Detected",
                message=f"Expected {expected} chips, found {actual} ({'+' if difference > 0 else ''}{difference})",
                notification_type="general",
                data={"game_id": game_id, "discrepancy": difference}
            )

    async def _handle_game_stale(self, data: Dict):
        """Handle stale game (no activity)"""
        game_id = data.get("game_id")
        host_id = data.get("host_id")
        minutes_inactive = data.get("minutes_inactive", 30)

        if not self.orchestrator:
            return

        # Send reminder to host
        notification_tool = self.orchestrator.tool_registry.get("notification_sender")
        if notification_tool:
            await notification_tool.execute(
                user_ids=[host_id],
                title="Game Inactive",
                message=f"No activity in {minutes_inactive} minutes. Is the game still running?",
                notification_type="reminder",
                data={"game_id": game_id}
            )

    async def _handle_rsvp_response(self, data: Dict):
        """Handle RSVP response from player"""
        game_id = data.get("game_id")
        host_id = data.get("host_id")
        player_id = data.get("player_id")
        response = data.get("response")  # "confirmed" or "declined"

        if not self.orchestrator:
            return

        # Notify host of RSVP change
        notification_tool = self.orchestrator.tool_registry.get("notification_sender")
        if notification_tool:
            # Get player name
            player_name = "A player"
            if self.db:
                player = await self.db.users.find_one({"user_id": player_id})
                if player:
                    player_name = player.get("name") or player.get("email", "A player")

            status_text = "confirmed" if response == "confirmed" else "declined"
            await notification_tool.execute(
                user_ids=[host_id],
                title=f"RSVP: {player_name} {status_text}",
                message=f"{player_name} has {status_text} for the game",
                notification_type="general",
                data={"game_id": game_id, "player_id": player_id, "response": response}
            )

    async def _handle_payment_received(self, data: Dict):
        """Handle payment confirmation"""
        ledger_id = data.get("ledger_id")
        from_user_id = data.get("from_user_id")
        to_user_id = data.get("to_user_id")
        amount = data.get("amount", 0)

        if not self.orchestrator:
            return

        # Notify recipient
        notification_tool = self.orchestrator.tool_registry.get("notification_sender")
        if notification_tool:
            await notification_tool.execute(
                user_ids=[to_user_id],
                title="Payment Received",
                message=f"${amount} payment has been confirmed",
                notification_type="settlement",
                data={"ledger_id": ledger_id, "amount": amount}
            )


# Global singleton instance
_event_listener: Optional[EventListenerService] = None


def get_event_listener() -> EventListenerService:
    """Get the global event listener instance"""
    global _event_listener
    if _event_listener is None:
        _event_listener = EventListenerService()
    return _event_listener


def init_event_listener(orchestrator=None, db=None) -> EventListenerService:
    """Initialize the global event listener with dependencies"""
    global _event_listener
    _event_listener = EventListenerService(orchestrator=orchestrator, db=db)
    if orchestrator:
        _event_listener.set_orchestrator(orchestrator)
    return _event_listener
