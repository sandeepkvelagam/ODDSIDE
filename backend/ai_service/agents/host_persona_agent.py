"""
Host Persona Agent

The intelligent AI assistant for game hosts that:
- Automates routine tasks (notifications, reminders, settlements)
- Queues decisions for host approval (buy-ins, join requests)
- Monitors game state and detects anomalies
- Provides smart suggestions and recommendations
- Tracks payments and sends reminders
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta
from .base import BaseAgent, AgentResult


class HostPersonaAgent(BaseAgent):
    """
    Host Persona - The AI-powered game assistant for hosts.

    This agent orchestrates the entire game lifecycle:
    - Pre-game: Smart suggestions, invitations, RSVP tracking
    - During game: Buy-in/cash-out approval queue, monitoring
    - Post-game: Settlement generation, payment tracking
    - Between games: Next game suggestions, analytics
    """

    @property
    def name(self) -> str:
        return "host_persona"

    @property
    def description(self) -> str:
        return "AI-powered personal game assistant for hosts"

    @property
    def capabilities(self) -> List[str]:
        return [
            "Smart game creation with suggestions",
            "Intelligent invitation management",
            "RSVP tracking and backup invites",
            "Buy-in/cash-out approval prompts",
            "Game monitoring and anomaly detection",
            "Automatic settlement generation",
            "Payment tracking and reminders",
            "Game summary and highlights",
            "Next game suggestions",
            "Player engagement tracking"
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "game_manager",
            "notification_sender",
            "scheduler",
            "report_generator",
            "email_sender",
            "host_decision",
            "smart_config",
            "payment_tracker"
        ]

    @property
    def input_schema(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "user_input": {
                    "type": "string",
                    "description": "The host's request, e.g. 'Show pending decisions', 'End the game', 'Send payment reminders'"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID for game-specific operations"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID for group-level operations"
                },
                "host_id": {
                    "type": "string",
                    "description": "Host's user ID"
                },
                "player_id": {
                    "type": "string",
                    "description": "Player user ID for player-specific actions"
                },
                "player_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of player user IDs"
                },
                "decision_id": {
                    "type": "string",
                    "description": "Decision ID to approve or reject"
                },
                "amount": {
                    "type": "number",
                    "description": "Dollar amount for buy-ins or payments"
                },
                "chips": {
                    "type": "integer",
                    "description": "Chip count for cash-out requests"
                },
                "reason": {
                    "type": "string",
                    "description": "Reason for rejection"
                }
            },
            "required": ["user_input"]
        }

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """Execute host persona task based on input"""
        context = context or {}
        steps_taken = []

        try:
            # Parse the user's intent
            intent = self._parse_intent(user_input, context)

            # Route to appropriate handler
            if intent["action"] == "handle_join_request":
                return await self._handle_join_request(context, steps_taken)
            elif intent["action"] == "handle_buy_in_request":
                return await self._handle_buy_in_request(context, steps_taken)
            elif intent["action"] == "handle_cash_out_request":
                return await self._handle_cash_out_request(context, steps_taken)
            elif intent["action"] == "get_pending_decisions":
                return await self._get_pending_decisions(context, steps_taken)
            elif intent["action"] == "approve_decision":
                return await self._approve_decision(context, steps_taken)
            elif intent["action"] == "reject_decision":
                return await self._reject_decision(context, steps_taken)
            elif intent["action"] == "suggest_game_config":
                return await self._suggest_game_config(context, steps_taken)
            elif intent["action"] == "monitor_game":
                return await self._monitor_game(context, steps_taken)
            elif intent["action"] == "generate_settlement":
                return await self._generate_settlement(context, steps_taken)
            elif intent["action"] == "send_payment_reminders":
                return await self._send_payment_reminders(context, steps_taken)
            elif intent["action"] == "generate_summary":
                return await self._generate_summary(context, steps_taken)
            elif intent["action"] == "suggest_next_game":
                return await self._suggest_next_game(context, steps_taken)
            else:
                return await self._handle_general_request(user_input, context, steps_taken)

        except Exception as e:
            return AgentResult(
                success=False,
                error=str(e),
                steps_taken=steps_taken
            )

    def _parse_intent(self, user_input: str, context: Dict) -> Dict:
        """Parse host's intent from input or context"""
        input_lower = user_input.lower() if user_input else ""

        # Check context-driven intents first (from event listener)
        if context.get("event_type") == "player_join_request":
            return {"action": "handle_join_request"}
        if context.get("event_type") == "buy_in_request":
            return {"action": "handle_buy_in_request"}
        if context.get("event_type") == "cash_out_request":
            return {"action": "handle_cash_out_request"}

        # Parse natural language intent
        if any(kw in input_lower for kw in ["pending", "decisions", "requests", "queue"]):
            return {"action": "get_pending_decisions"}
        if any(kw in input_lower for kw in ["approve", "accept", "yes"]):
            return {"action": "approve_decision"}
        if any(kw in input_lower for kw in ["reject", "decline", "no"]):
            return {"action": "reject_decision"}
        if any(kw in input_lower for kw in ["suggest", "recommend", "setup", "create"]):
            return {"action": "suggest_game_config"}
        if any(kw in input_lower for kw in ["monitor", "status", "health", "check"]):
            return {"action": "monitor_game"}
        if any(kw in input_lower for kw in ["settle", "settlement", "end game"]):
            return {"action": "generate_settlement"}
        if any(kw in input_lower for kw in ["payment", "remind", "owed", "pay"]):
            return {"action": "send_payment_reminders"}
        if any(kw in input_lower for kw in ["summary", "recap", "highlights"]):
            return {"action": "generate_summary"}
        if any(kw in input_lower for kw in ["next game", "schedule", "upcoming"]):
            return {"action": "suggest_next_game"}

        return {"action": "general"}

    # ==================== Event Handlers ====================

    async def handle_join_request(self, data: Dict) -> AgentResult:
        """Handle a player join request event (called by EventListener)"""
        context = {
            "event_type": "player_join_request",
            **data
        }
        return await self.execute("", context)

    async def handle_buy_in_request(self, data: Dict) -> AgentResult:
        """Handle a buy-in request event (called by EventListener)"""
        context = {
            "event_type": "buy_in_request",
            **data
        }
        return await self.execute("", context)

    async def handle_cash_out_request(self, data: Dict) -> AgentResult:
        """Handle a cash-out request event (called by EventListener)"""
        context = {
            "event_type": "cash_out_request",
            **data
        }
        return await self.execute("", context)

    # ==================== Core Handlers ====================

    async def _handle_join_request(self, context: Dict, steps: List) -> AgentResult:
        """Process a join request - analyze player and queue for host approval"""
        game_id = context.get("game_id")
        player_id = context.get("player_id")
        host_id = context.get("host_id")

        if not all([game_id, player_id, host_id]):
            return AgentResult(
                success=False,
                error="Missing required context: game_id, player_id, host_id"
            )

        # Analyze the player
        recommendation = await self._analyze_player(player_id, game_id)
        steps.append({"step": "analyze_player", "recommendation": recommendation})

        # Queue decision for host
        result = await self.call_tool(
            "host_decision",
            action="queue_decision",
            host_id=host_id,
            game_id=game_id,
            decision_type="join_request",
            context={"player_id": player_id},
            recommendation=recommendation
        )
        steps.append({"step": "queue_decision", "result": result})

        return AgentResult(
            success=True,
            data={
                "decision_id": result.get("data", {}).get("decision_id"),
                "recommendation": recommendation
            },
            message="Join request queued for host approval",
            steps_taken=steps
        )

    async def _handle_buy_in_request(self, context: Dict, steps: List) -> AgentResult:
        """Process a buy-in request"""
        game_id = context.get("game_id")
        player_id = context.get("player_id")
        host_id = context.get("host_id")
        amount = context.get("amount", 0)
        chips = context.get("chips", 0)

        if not all([game_id, player_id, host_id]):
            return AgentResult(
                success=False,
                error="Missing required context"
            )

        # Check if this is a standard buy-in (could auto-approve in future)
        game = await self._get_game(game_id)
        standard_amount = game.get("buy_in_amount", 20) if game else 20

        if amount == standard_amount:
            recommendation = "STANDARD: Matches game buy-in amount"
        elif amount > standard_amount * 2:
            recommendation = f"CAUTION: ${amount} is more than 2x standard (${standard_amount})"
        else:
            recommendation = f"OK: ${amount} buy-in request"

        steps.append({"step": "validate_amount", "recommendation": recommendation})

        # Queue decision
        result = await self.call_tool(
            "host_decision",
            action="queue_decision",
            host_id=host_id,
            game_id=game_id,
            decision_type="buy_in",
            context={"player_id": player_id, "amount": amount, "chips": chips},
            recommendation=recommendation
        )
        steps.append({"step": "queue_decision", "result": result})

        return AgentResult(
            success=True,
            data={"decision_id": result.get("data", {}).get("decision_id")},
            message=f"Buy-in request (${amount}) queued for approval",
            steps_taken=steps
        )

    async def _handle_cash_out_request(self, context: Dict, steps: List) -> AgentResult:
        """Process a cash-out request"""
        game_id = context.get("game_id")
        player_id = context.get("player_id")
        host_id = context.get("host_id")
        chips = context.get("chips", 0)

        if not all([game_id, player_id, host_id]):
            return AgentResult(
                success=False,
                error="Missing required context"
            )

        # Get player's actual chip count for validation
        game = await self._get_game(game_id)
        player_chips = 0
        if game:
            for p in game.get("players", []):
                if p.get("user_id") == player_id:
                    player_chips = p.get("chips", 0)
                    break

        if chips > player_chips:
            recommendation = f"CAUTION: Requested {chips} chips but player has {player_chips}"
        elif chips == player_chips:
            recommendation = "FULL CASH-OUT: Player cashing out all chips"
        else:
            recommendation = f"PARTIAL: Cashing out {chips} of {player_chips} chips"

        steps.append({"step": "validate_chips", "recommendation": recommendation})

        # Calculate cash value
        chip_value = game.get("chip_value", 1) if game else 1
        cash_amount = chips * chip_value

        result = await self.call_tool(
            "host_decision",
            action="queue_decision",
            host_id=host_id,
            game_id=game_id,
            decision_type="cash_out",
            context={"player_id": player_id, "chips": chips, "cash_amount": cash_amount},
            recommendation=recommendation
        )
        steps.append({"step": "queue_decision", "result": result})

        return AgentResult(
            success=True,
            data={"decision_id": result.get("data", {}).get("decision_id")},
            message=f"Cash-out request ({chips} chips = ${cash_amount}) queued",
            steps_taken=steps
        )

    async def _get_pending_decisions(self, context: Dict, steps: List) -> AgentResult:
        """Get all pending decisions for host"""
        host_id = context.get("host_id")
        game_id = context.get("game_id")

        result = await self.call_tool(
            "host_decision",
            action="get_pending",
            host_id=host_id,
            game_id=game_id
        )
        steps.append({"step": "get_pending", "result": result})

        return AgentResult(
            success=True,
            data=result.get("data"),
            message=result.get("message"),
            steps_taken=steps
        )

    async def _approve_decision(self, context: Dict, steps: List) -> AgentResult:
        """Approve a pending decision"""
        decision_id = context.get("decision_id")
        decision_ids = context.get("decision_ids")

        if decision_ids:
            result = await self.call_tool(
                "host_decision",
                action="bulk_approve",
                decision_ids=decision_ids
            )
        elif decision_id:
            result = await self.call_tool(
                "host_decision",
                action="approve",
                decision_id=decision_id
            )
        else:
            return AgentResult(
                success=False,
                error="No decision_id or decision_ids provided"
            )

        steps.append({"step": "approve", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message=result.get("message"),
            steps_taken=steps
        )

    async def _reject_decision(self, context: Dict, steps: List) -> AgentResult:
        """Reject a pending decision"""
        decision_id = context.get("decision_id")
        reason = context.get("reason", "Declined by host")

        if not decision_id:
            return AgentResult(
                success=False,
                error="No decision_id provided"
            )

        result = await self.call_tool(
            "host_decision",
            action="reject",
            decision_id=decision_id,
            reason=reason
        )
        steps.append({"step": "reject", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message=result.get("message"),
            steps_taken=steps
        )

    async def _suggest_game_config(self, context: Dict, steps: List) -> AgentResult:
        """Suggest game configuration based on group history"""
        group_id = context.get("group_id")

        if not group_id:
            return AgentResult(
                success=False,
                error="group_id is required"
            )

        # Analyze last games for suggestions
        suggestions = await self._analyze_group_history(group_id)
        steps.append({"step": "analyze_history", "suggestions": suggestions})

        return AgentResult(
            success=True,
            data=suggestions,
            message="Here are my suggestions based on your group's history",
            steps_taken=steps,
            next_actions=[
                "Create game with these settings",
                "Modify suggestions",
                "Start from scratch"
            ]
        )

    async def _monitor_game(self, context: Dict, steps: List) -> AgentResult:
        """Monitor game state and report any issues"""
        game_id = context.get("game_id")

        if not game_id:
            return AgentResult(
                success=False,
                error="game_id is required"
            )

        game = await self._get_game(game_id)
        if not game:
            return AgentResult(
                success=False,
                error="Game not found"
            )

        # Analyze game health
        health = await self._analyze_game_health(game)
        steps.append({"step": "analyze_health", "health": health})

        return AgentResult(
            success=True,
            data=health,
            message=health.get("summary", "Game status checked"),
            steps_taken=steps
        )

    async def _generate_settlement(self, context: Dict, steps: List) -> AgentResult:
        """Generate settlement for a game"""
        game_id = context.get("game_id")

        result = await self.call_tool(
            "game_manager",
            action="generate_settlement_preview",
            game_id=game_id
        )
        steps.append({"step": "generate_settlement", "result": result})

        if result.get("success"):
            # Send settlement notifications
            notif_result = await self.call_tool(
                "notification_sender",
                user_ids=context.get("player_ids", []),
                title="Game Settlement Ready",
                message="Check your results and outstanding payments",
                notification_type="settlement",
                data={"game_id": game_id}
            )
            steps.append({"step": "send_notifications", "result": notif_result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message="Settlement generated and notifications sent",
            steps_taken=steps
        )

    async def _send_payment_reminders(self, context: Dict, steps: List) -> AgentResult:
        """Send payment reminders for outstanding balances"""
        game_id = context.get("game_id")
        user_id = context.get("user_id")

        # Get outstanding ledger entries
        if self.db is not None:
            query = {"status": {"$ne": "paid"}}
            if game_id:
                query["game_id"] = game_id
            if user_id:
                query["$or"] = [{"from_user_id": user_id}, {"to_user_id": user_id}]

            ledger_entries = await self.db.ledger.find(query).to_list(100)

            reminders_sent = 0
            for entry in ledger_entries:
                # Send reminder to the person who owes
                await self.call_tool(
                    "notification_sender",
                    user_ids=[entry.get("from_user_id")],
                    title="Payment Reminder",
                    message=f"You owe ${entry.get('amount', 0)} from a recent game",
                    notification_type="reminder",
                    data={"ledger_id": str(entry.get("_id")), "game_id": entry.get("game_id")}
                )
                reminders_sent += 1

            steps.append({"step": "send_reminders", "count": reminders_sent})

            return AgentResult(
                success=True,
                data={"reminders_sent": reminders_sent},
                message=f"Sent {reminders_sent} payment reminders",
                steps_taken=steps
            )

        return AgentResult(
            success=False,
            error="Database not available"
        )

    async def _generate_summary(self, context: Dict, steps: List) -> AgentResult:
        """Generate game summary and highlights"""
        game_id = context.get("game_id")

        result = await self.call_tool(
            "report_generator",
            report_type="game_summary",
            game_id=game_id,
            format="markdown"
        )
        steps.append({"step": "generate_summary", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message="Game summary generated",
            steps_taken=steps
        )

    async def _suggest_next_game(self, context: Dict, steps: List) -> AgentResult:
        """Suggest next game based on group patterns"""
        group_id = context.get("group_id")

        suggestions = await self._analyze_group_history(group_id)
        steps.append({"step": "analyze_patterns", "suggestions": suggestions})

        return AgentResult(
            success=True,
            data={
                "suggested_day": suggestions.get("best_day"),
                "suggested_time": suggestions.get("best_time"),
                "suggested_config": suggestions
            },
            message="Based on your group's patterns, here's my suggestion for the next game",
            steps_taken=steps,
            next_actions=[
                "Create this game",
                "Modify suggestion",
                "Ask players for availability"
            ]
        )

    async def _handle_general_request(self, user_input: str, context: Dict, steps: List) -> AgentResult:
        """Handle general requests that don't fit specific handlers"""
        return AgentResult(
            success=True,
            message="I can help you with:\n"
                    "- View pending decisions (buy-ins, join requests)\n"
                    "- Approve or reject requests\n"
                    "- Monitor game status\n"
                    "- Generate settlements\n"
                    "- Send payment reminders\n"
                    "- Suggest next game settings\n\n"
                    "What would you like to do?",
            steps_taken=steps,
            next_actions=[
                "Show pending decisions",
                "Check game status",
                "Generate settlement",
                "Suggest next game"
            ]
        )

    # ==================== Helper Methods ====================

    async def _get_game(self, game_id: str) -> Optional[Dict]:
        """Get game data from database"""
        if self.db is not None and game_id:
            return await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0}
            )
        return None

    async def _analyze_player(self, player_id: str, game_id: str) -> str:
        """Analyze player and generate recommendation"""
        if self.db is None:
            return "OK: Player analysis unavailable"

        # Check outstanding debts
        outstanding = await self.db.ledger.find({
            "from_user_id": player_id,
            "status": {"$ne": "paid"}
        }).to_list(10)

        total_owed = sum(e.get("amount", 0) for e in outstanding)

        if total_owed > 0:
            return f"CAUTION: Player owes ${total_owed} from previous games"

        # Check player history
        player_games = await self.db.game_nights.count_documents({
            "players.user_id": player_id,
            "status": "settled"
        })

        if player_games > 10:
            return "RECOMMENDED: Reliable player with good history"
        elif player_games > 0:
            return f"OK: Player has {player_games} games played"

        return "NEW: First-time player"

    async def _analyze_group_history(self, group_id: str) -> Dict:
        """Analyze group's game history for suggestions"""
        if self.db is None or not group_id:
            return {
                "buy_in_amount": 20,
                "chips_per_buy_in": 20,
                "best_day": "Saturday",
                "best_time": "19:00",
                "regular_players": []
            }

        # Get last 10 games
        games = await self.db.game_nights.find(
            {"group_id": group_id, "status": {"$in": ["ended", "settled"]}},
            {"_id": 0}
        ).sort("created_at", -1).limit(10).to_list(10)

        if not games:
            return {
                "buy_in_amount": 20,
                "chips_per_buy_in": 20,
                "best_day": "Saturday",
                "best_time": "19:00",
                "regular_players": []
            }

        # Calculate averages
        avg_buy_in = sum(g.get("buy_in_amount", 20) for g in games) / len(games)
        avg_chips = sum(g.get("chips_per_buy_in", 20) for g in games) / len(games)

        # Find most common players
        player_counts = {}
        for game in games:
            for player in game.get("players", []):
                pid = player.get("user_id")
                player_counts[pid] = player_counts.get(pid, 0) + 1

        regular_players = [pid for pid, count in player_counts.items() if count >= len(games) * 0.5]

        return {
            "buy_in_amount": round(avg_buy_in / 5) * 5,  # Round to nearest 5
            "chips_per_buy_in": round(avg_chips / 10) * 10,  # Round to nearest 10
            "best_day": "Saturday",  # Would analyze start times
            "best_time": "19:00",
            "regular_players": regular_players,
            "games_analyzed": len(games)
        }

    async def _analyze_game_health(self, game: Dict) -> Dict:
        """Analyze game health and detect issues"""
        players = game.get("players", [])
        issues = []
        warnings = []

        # Check chip balance
        total_chips = sum(p.get("chips", 0) for p in players)
        total_buy_in_chips = sum(
            p.get("total_buy_in", 0) / game.get("chip_value", 1)
            for p in players
        )

        if abs(total_chips - total_buy_in_chips) > 1:
            issues.append(f"Chip imbalance: {total_chips} chips vs {total_buy_in_chips} expected")

        # Check game duration
        started_at = game.get("started_at")
        if started_at:
            if isinstance(started_at, str):
                started_at = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            duration = datetime.utcnow() - started_at
            if duration > timedelta(hours=6):
                warnings.append(f"Long game: {duration.seconds // 3600} hours")

        # Check for inactive players
        for player in players:
            if player.get("chips", 0) == 0 and not player.get("cashed_out"):
                warnings.append(f"Player has 0 chips but hasn't cashed out")

        status = "healthy" if not issues else "issues_detected"
        if warnings and not issues:
            status = "warnings"

        return {
            "status": status,
            "issues": issues,
            "warnings": warnings,
            "player_count": len(players),
            "total_chips": total_chips,
            "active_players": len([p for p in players if p.get("chips", 0) > 0]),
            "cashed_out": len([p for p in players if p.get("cashed_out")]),
            "summary": f"Game has {len(players)} players, {len(issues)} issues, {len(warnings)} warnings"
        }
