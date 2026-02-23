"""
Event Listener Service

Listens to game events and group chat messages, routing them to the appropriate
AI agents for intelligent processing and automation.

Handles:
- Game events → Host Persona Agent
- Group chat messages → ChatWatcher → GroupChatAgent
- Proactive triggers → GamePlannerAgent
"""

from typing import Dict, Optional, Callable, List
from datetime import datetime, timezone, timedelta
import logging
import asyncio
import uuid

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
        self.group_chat_agent = None
        self.game_planner = None
        self.engagement_agent = None
        self.feedback_agent = None
        self.payment_reconciliation_agent = None
        self.user_automation_agent = None
        self.chat_watcher = None
        self.host_update_service = None
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
        self.register_handler("group_message", self._handle_group_message)
        self.register_handler("game_ended", self._handle_post_game_engagement)
        self.register_handler("settlement_generated", self._handle_post_game_engagement)
        self.register_handler("game_started", self._handle_engagement_outcome_tracking)
        self.register_handler("game_ended", self._handle_post_game_survey)
        self.register_handler("feedback_submitted", self._handle_feedback_submitted)
        # Payment reconciliation handlers
        self.register_handler("settlement_generated", self._handle_post_settlement_reminders)
        self.register_handler("stripe_payment_received", self._handle_stripe_payment)
        self.register_handler("payment_received", self._handle_payment_reconciliation)
        # User automation handlers — fan-out events to user-defined automations
        self.register_handler("game_ended", self._handle_user_automations)
        self.register_handler("game_created", self._handle_user_automations)
        self.register_handler("game_started", self._handle_user_automations)
        self.register_handler("settlement_generated", self._handle_user_automations)
        self.register_handler("payment_received", self._handle_user_automations)
        self.register_handler("rsvp_response", self._handle_user_automations)

    def set_orchestrator(self, orchestrator):
        """Set the AI orchestrator and get agents"""
        self.orchestrator = orchestrator
        if orchestrator and orchestrator.agent_registry:
            self.host_persona = orchestrator.agent_registry.get("host_persona")
            self.group_chat_agent = orchestrator.agent_registry.get("group_chat")
            self.game_planner = orchestrator.agent_registry.get("game_planner")
            self.engagement_agent = orchestrator.agent_registry.get("engagement")
            self.feedback_agent = orchestrator.agent_registry.get("feedback")
            self.payment_reconciliation_agent = orchestrator.agent_registry.get("payment_reconciliation")
            self.user_automation_agent = orchestrator.agent_registry.get("user_automation")

        # Initialize ChatWatcher
        from .chat_watcher import ChatWatcherService
        self.chat_watcher = ChatWatcherService(db=self.db)

        # Initialize HostUpdateService
        from .host_update_service import HostUpdateService
        self.host_update_service = HostUpdateService(db=self.db)

        # Initialize RSVPTracker
        from .rsvp_tracker import RSVPTrackerService
        self.rsvp_tracker = RSVPTrackerService(
            db=self.db,
            host_update_service=self.host_update_service
        )

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

        Automatically assigns:
        - event_id: unique ID for idempotency (if not already set)
        - event_type: tagged into data for downstream handlers
        """
        # Generate event_id for idempotency if not already present
        if "event_id" not in data:
            data["event_id"] = f"evt_{uuid.uuid4().hex[:16]}"

        logger.info(
            f"Event received: {event_type} - "
            f"{data.get('game_id', 'no game')} "
            f"[event_id={data['event_id']}]"
        )

        # Tag event_type into data for downstream handlers
        data["event_type"] = event_type

        # Log the event
        if self.db:
            await self.db.event_logs.insert_one({
                "event_type": event_type,
                "event_id": data["event_id"],
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
        """Handle RSVP response from player — uses RSVPTracker for smart handling."""
        game_id = data.get("game_id")
        host_id = data.get("host_id")
        player_id = data.get("player_id")
        response = data.get("response")  # "confirmed" or "declined"
        group_id = data.get("group_id")

        # Use RSVPTracker if available (handles host notifications + backup suggestions)
        if hasattr(self, 'rsvp_tracker') and self.rsvp_tracker:
            await self.rsvp_tracker.track_rsvp(
                game_id=game_id,
                player_id=player_id,
                response=response,
                group_id=group_id
            )
            return

        # Fallback: basic notification
        if not self.orchestrator:
            return

        notification_tool = self.orchestrator.tool_registry.get("notification_sender")
        if notification_tool:
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

    # ==================== Engagement Handlers ====================

    async def _handle_post_game_engagement(self, data: Dict):
        """
        Handle post-game engagement checks (milestones, big winners).
        Triggered by game_ended and settlement_generated events.
        """
        if not self.engagement_agent:
            logger.debug("EngagementAgent not available, skipping post-game engagement")
            return

        game_id = data.get("game_id")
        group_id = data.get("group_id")
        player_ids = data.get("player_ids", [])

        # If player_ids not provided, fetch from game
        if not player_ids and game_id and self.db:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "players": 1, "group_id": 1}
            )
            if game:
                player_ids = [p.get("user_id") for p in game.get("players", []) if p.get("user_id")]
                if not group_id:
                    group_id = game.get("group_id")

        # Check engagement settings for this group
        if group_id and self.db:
            settings = await self.db.engagement_settings.find_one(
                {"group_id": group_id},
                {"_id": 0}
            )
            if settings and not settings.get("engagement_enabled", True):
                logger.debug(f"Engagement disabled for group {group_id}")
                return

        try:
            result = await self.engagement_agent.execute(
                "Post-game engagement check",
                context={
                    "action": "post_game_check",
                    "game_id": game_id,
                    "group_id": group_id,
                    "player_ids": player_ids
                }
            )
            logger.info(
                f"Post-game engagement for game {game_id}: "
                f"{result.message if result.success else result.error}"
            )
        except Exception as e:
            logger.error(f"Post-game engagement error: {e}")

    async def _handle_engagement_outcome_tracking(self, data: Dict):
        """
        Track engagement outcomes: when a game starts, check if there was
        a recent nudge for that group and record the conversion.
        """
        if not self.db or not self.engagement_agent:
            return

        group_id = data.get("group_id")
        if not group_id:
            return

        try:
            # Find recent nudges for this group (within last 7 days)
            from datetime import timedelta
            cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
            recent_nudges = await self.db.engagement_events.find(
                {
                    "group_id": group_id,
                    "event_type": "nudge_sent",
                    "category": {"$in": ["inactive_group", "inactive_user"]},
                    "created_at": {"$gte": cutoff},
                    "game_started_within_7d": None,  # Not yet tracked
                }
            ).to_list(10)

            for nudge in recent_nudges:
                plan_id = nudge.get("plan_id")
                if plan_id:
                    await self.engagement_agent.record_outcome(
                        plan_id=plan_id,
                        outcome_type="game_started",
                        data={"group_id": group_id, "game_id": data.get("game_id")}
                    )
                    logger.info(f"Recorded engagement conversion: nudge {plan_id} → game started")
        except Exception as e:
            logger.error(f"Engagement outcome tracking error: {e}")

    # ==================== Feedback Handlers ====================

    async def _handle_post_game_survey(self, data: Dict):
        """
        Trigger post-game survey prompts when a game ends.

        Survey Delay Policy (emotional timing):
        - Winners (profit > 0): send immediately (positive emotion → higher ratings)
        - Breakeven (profit = 0): send after 30 min
        - Losers (profit < 0): delay 2 hours (cool-down period)
        - Rage-quit (left early): delay 12 hours

        This improves average survey quality without manipulating results —
        just gives players time to process emotions before rating.
        """
        if not self.feedback_agent:
            logger.debug("FeedbackAgent not available, skipping post-game survey")
            return

        game_id = data.get("game_id")
        group_id = data.get("group_id")
        player_ids = data.get("player_ids", [])

        # If player_ids not provided, fetch from game
        if not player_ids and game_id and self.db:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "players": 1, "group_id": 1}
            )
            if game:
                player_ids = [
                    p.get("user_id") for p in game.get("players", [])
                    if p.get("user_id")
                ]
                if not group_id:
                    group_id = game.get("group_id")

        # Check if feedback surveys are enabled for this group
        if group_id and self.db:
            settings = await self.db.engagement_settings.find_one(
                {"group_id": group_id}, {"_id": 0}
            )
            if settings and not settings.get("post_game_surveys", True):
                logger.debug(f"Post-game surveys disabled for group {group_id}")
                return

        # Apply Survey Delay Policy: partition players by emotional state
        immediate_ids = []
        delayed_groups = []  # list of (player_ids, delay_minutes)

        if game_id and self.db:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "players": 1}
            )
            players_data = {
                p.get("user_id"): p for p in (game or {}).get("players", [])
                if p.get("user_id")
            }

            winners = []
            breakeven = []
            losers = []
            rage_quit = []

            for pid in player_ids:
                pdata = players_data.get(pid, {})
                buy_in = pdata.get("total_buy_in", 0)
                cash_out = pdata.get("cash_out", 0)
                net = cash_out - buy_in

                if pdata.get("left_early"):
                    rage_quit.append(pid)
                elif net > 0:
                    winners.append(pid)
                elif net == 0:
                    breakeven.append(pid)
                else:
                    losers.append(pid)

            immediate_ids = winners
            if breakeven:
                delayed_groups.append((breakeven, 30))    # 30 min delay
            if losers:
                delayed_groups.append((losers, 120))      # 2 hour delay
            if rage_quit:
                delayed_groups.append((rage_quit, 720))   # 12 hour delay
        else:
            immediate_ids = player_ids

        try:
            # Send immediately to winners
            if immediate_ids:
                result = await self.feedback_agent.execute(
                    "Trigger post-game survey",
                    context={
                        "action": "trigger_post_game_survey",
                        "game_id": game_id,
                        "group_id": group_id,
                        "player_ids": immediate_ids
                    }
                )
                logger.info(
                    f"Post-game survey (immediate) for game {game_id}: "
                    f"sent to {len(immediate_ids)} winners"
                )

            # Schedule delayed surveys
            for delayed_ids, delay_minutes in delayed_groups:
                send_at = (
                    datetime.now(timezone.utc) + timedelta(minutes=delay_minutes)
                ).isoformat()

                await self.db.scheduled_jobs.insert_one({
                    "job_type": "delayed_survey",
                    "game_id": game_id,
                    "group_id": group_id,
                    "player_ids": delayed_ids,
                    "send_at": send_at,
                    "delay_minutes": delay_minutes,
                    "status": "pending",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                })
                logger.info(
                    f"Post-game survey (delayed {delay_minutes}m) for game {game_id}: "
                    f"scheduled for {len(delayed_ids)} players"
                )

        except Exception as e:
            logger.error(f"Post-game survey trigger error: {e}")

    async def _handle_feedback_submitted(self, data: Dict):
        """
        Handle new feedback submission event.
        Classifies and attempts auto-fix through the FeedbackAgent pipeline.
        """
        if not self.feedback_agent:
            logger.debug("FeedbackAgent not available, skipping feedback processing")
            return

        feedback_id = data.get("feedback_id")
        if not feedback_id:
            return

        try:
            result = await self.feedback_agent.execute(
                "Process feedback",
                context={
                    "action": "process_feedback",
                    "feedback_id": feedback_id
                }
            )
            logger.info(
                f"Feedback {feedback_id} processed: "
                f"{result.message if result.success else result.error}"
            )
        except Exception as e:
            logger.error(f"Feedback processing error: {e}")

    # ==================== Payment Reconciliation Handlers ====================

    async def _handle_post_settlement_reminders(self, data: Dict):
        """
        After a settlement is generated, schedule payment reminders.
        Triggered by settlement_generated event.
        """
        if not self.payment_reconciliation_agent:
            logger.debug("PaymentReconciliationAgent not available, skipping settlement reminders")
            return

        game_id = data.get("game_id")
        group_id = data.get("group_id")

        if not game_id:
            return

        try:
            # Schedule reminders for all pending payments in this game
            result = await self.payment_reconciliation_agent.execute(
                "Scan and send reminders for settled game",
                context={
                    "action": "scan_and_remind",
                    "game_id": game_id,
                    "group_id": group_id,
                    "overdue_days": 0,  # Include brand new entries (day 0 = gentle)
                }
            )
            logger.info(
                f"Post-settlement reminders for game {game_id}: "
                f"{result.message if result.success else result.error}"
            )
        except Exception as e:
            logger.error(f"Post-settlement reminder error: {e}")

    async def _handle_stripe_payment(self, data: Dict):
        """
        Handle incoming Stripe payment webhook.
        Routes to PaymentReconciliationAgent for matching and auto-marking.
        """
        if not self.payment_reconciliation_agent:
            logger.debug("PaymentReconciliationAgent not available, skipping Stripe match")
            return

        try:
            result = await self.payment_reconciliation_agent.execute(
                "Match Stripe payment",
                context={
                    "action": "match_stripe_payment",
                    "stripe_event": data,
                }
            )
            logger.info(
                f"Stripe payment match: "
                f"{result.message if result.success else result.error}"
            )
        except Exception as e:
            logger.error(f"Stripe payment match error: {e}")

    async def _handle_payment_reconciliation(self, data: Dict):
        """
        When a manual payment is received, check if there are
        remaining debts to consolidate or additional reconciliation needed.
        """
        if not self.payment_reconciliation_agent or not self.db:
            return

        group_id = data.get("group_id")
        if not group_id:
            # Try to get group_id from ledger entry
            ledger_id = data.get("ledger_id")
            if ledger_id:
                entry = await self.db.ledger_entries.find_one(
                    {"_id": ledger_id} if not isinstance(ledger_id, str)
                    else {"ledger_id": ledger_id},
                    {"_id": 0, "group_id": 1}
                )
                if entry:
                    group_id = entry.get("group_id")

        if not group_id:
            return

        try:
            # Check remaining debts for consolidation opportunities
            remaining = await self.db.ledger_entries.count_documents({
                "group_id": group_id,
                "status": "pending",
            })

            # Only suggest consolidation if there are multiple pending entries
            if remaining >= 3:
                result = await self.payment_reconciliation_agent.execute(
                    "Check consolidation after payment",
                    context={
                        "action": "consolidate_debts",
                        "group_id": group_id,
                    }
                )
                logger.info(
                    f"Payment consolidation check for group {group_id}: "
                    f"{result.message if result.success else result.error}"
                )
        except Exception as e:
            logger.error(f"Payment reconciliation check error: {e}")

    # ==================== User Automation Handlers ====================

    async def _handle_user_automations(self, data: Dict):
        """
        Fan-out handler: route events to UserAutomationAgent so user-defined
        automations can fire. The agent handles matching, policy checks,
        and execution internally.
        """
        if not self.user_automation_agent:
            return

        # Determine trigger type from the event
        # The event_type isn't passed directly; we infer it from the handler
        # registration. We'll tag it in the data.
        event_type = data.get("event_type")
        if not event_type:
            # Try to infer from data shape
            if data.get("stripe_event"):
                event_type = "stripe_payment_received"
            elif data.get("response") in ("confirmed", "declined"):
                event_type = "player_confirmed"
            elif "settlement" in str(data.get("action", "")):
                event_type = "settlement_generated"
            else:
                # Generic — let the agent figure it out
                event_type = "unknown"

        group_id = data.get("group_id")

        # If no group_id, try to get from game
        if not group_id and data.get("game_id") and self.db:
            game = await self.db.game_nights.find_one(
                {"game_id": data["game_id"]},
                {"_id": 0, "group_id": 1}
            )
            if game:
                group_id = game.get("group_id")

        try:
            result = await self.user_automation_agent.execute(
                "Trigger user automations",
                context={
                    "action": "trigger_automations",
                    "trigger_type": event_type,
                    "event_data": data,
                    "group_id": group_id,
                    "event_id": data.get("event_id"),
                    # causation_run_id: not set here — these are organic events.
                    # Only automation-generated events would carry a causation_run_id.
                }
            )
            if result.data and result.data.get("executed", 0) > 0:
                logger.info(
                    f"User automations for '{event_type}': "
                    f"{result.message}"
                )
            else:
                logger.debug(
                    f"User automations for '{event_type}': no matches"
                )
        except Exception as e:
            logger.error(f"User automation trigger error: {e}")

    # ==================== Group Chat Handlers ====================

    async def _handle_group_message(self, data: Dict):
        """
        Handle a new group chat message.
        Pipeline: ChatWatcher decides → GroupChatAgent responds → post to chat.
        """
        if not self.chat_watcher or not self.group_chat_agent:
            logger.debug("Group chat AI not configured, skipping")
            return

        group_id = data.get("group_id")
        message = data.get("message", {})

        # Skip AI messages to avoid loops
        if message.get("user_id") == "ai_assistant" or message.get("type") == "ai":
            return

        try:
            # Step 1: Ask ChatWatcher if we should respond
            decision = await self.chat_watcher.should_respond(message, group_id)

            if not decision.get("respond"):
                logger.debug(f"ChatWatcher: skip ({decision.get('reason')}) for group {group_id}")
                return

            logger.info(f"ChatWatcher: respond ({decision.get('reason')}, priority={decision.get('priority')})")

            # Step 2: Gather context for the response
            context = await self.chat_watcher.get_message_context(group_id)

            # Step 3: Add external context if available
            try:
                from .context_provider import ContextProvider
                ctx_provider = ContextProvider(db=self.db)
                external = await ctx_provider.get_context(group_id=group_id)
                context["external_context"] = external
            except Exception as e:
                logger.warning(f"Context provider error: {e}")
                context["external_context"] = {}

            # Step 4: Generate AI response
            result = await self.group_chat_agent.execute(
                user_input=message.get("content", ""),
                context={
                    "group_id": group_id,
                    **context
                }
            )

            if not result.success or not result.data:
                logger.debug("GroupChatAgent: no response generated")
                return

            response_text = result.data.get("response_text", "")
            should_respond = result.data.get("should_respond", False)

            if not should_respond or not response_text:
                logger.debug("GroupChatAgent: decided not to respond")
                return

            # Step 5: Post the AI message to the group
            await self._post_ai_message(group_id, response_text, result.data)

        except Exception as e:
            logger.error(f"Group message handler error: {e}")

    async def _post_ai_message(self, group_id: str, content: str, agent_data: Dict):
        """Post an AI-generated message to the group chat."""
        if not self.db:
            return

        import uuid
        message_id = f"gmsg_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()

        msg_doc = {
            "message_id": message_id,
            "group_id": group_id,
            "user_id": "ai_assistant",
            "content": content,
            "type": "ai",
            "reply_to": None,
            "metadata": {
                "action": agent_data.get("action"),
                "action_params": agent_data.get("action_params"),
            },
            "created_at": now,
            "edited_at": None,
            "deleted": False,
        }
        await self.db.group_messages.insert_one(msg_doc)
        msg_doc.pop("_id", None)

        # Broadcast via WebSocket
        try:
            from websocket_manager import emit_group_message
            await emit_group_message(group_id, {
                **msg_doc,
                "user": {"user_id": "ai_assistant", "name": "ODDSIDE", "picture": None}
            })
        except Exception as e:
            logger.error(f"Failed to broadcast AI message: {e}")

        logger.info(f"AI posted message in group {group_id}: {content[:50]}...")

        # Notify host about AI action
        if self.host_update_service:
            try:
                # Find group admin(s)
                admins = await self.db.group_members.find(
                    {"group_id": group_id, "role": "admin"},
                    {"_id": 0, "user_id": 1}
                ).to_list(5)
                for admin in admins:
                    await self.host_update_service.notify_ai_action(
                        group_id=group_id,
                        host_id=admin["user_id"],
                        action="Group Chat Response",
                        description=f"AI posted in group chat: \"{content[:80]}...\"" if len(content) > 80 else f"AI posted in group chat: \"{content}\"",
                        data={"message_id": message_id}
                    )
            except Exception as e:
                logger.debug(f"Host notification failed: {e}")


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
