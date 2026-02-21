"""
Game Setup Agent

Handles end-to-end game creation and setup workflow.
"""

from typing import Dict, List
from .base import BaseAgent, AgentResult


class GameSetupAgent(BaseAgent):
    """
    Agent for setting up poker games.

    This agent orchestrates the entire game setup process:
    1. Create game with configuration
    2. Invite players
    3. Schedule the game
    4. Send notifications
    5. Set up reminders
    """

    @property
    def name(self) -> str:
        return "game_setup"

    @property
    def description(self) -> str:
        return "setting up and managing poker game creation, invites, and scheduling"

    @property
    def capabilities(self) -> List[str]:
        return [
            "Create new poker games",
            "Invite players to games",
            "Schedule games at specific times",
            "Send game invitation notifications",
            "Set up game reminders",
            "Configure game settings (buy-in, chips, etc.)"
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "game_manager",
            "scheduler",
            "notification_sender",
            "email_sender"
        ]

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """Execute game setup based on user input"""
        context = context or {}
        steps_taken = []
        next_actions = []

        try:
            # Parse the user's intent
            intent = self._parse_intent(user_input, context)

            if intent["action"] == "create_full_game":
                return await self._create_full_game(intent, context, steps_taken)
            elif intent["action"] == "invite_players":
                return await self._invite_players_flow(intent, context, steps_taken)
            elif intent["action"] == "schedule_game":
                return await self._schedule_game_flow(intent, context, steps_taken)
            else:
                return AgentResult(
                    success=False,
                    error="Could not understand the request",
                    message="Please specify what you'd like to do: create a game, invite players, or schedule a game.",
                    steps_taken=steps_taken
                )

        except Exception as e:
            return AgentResult(
                success=False,
                error=str(e),
                steps_taken=steps_taken
            )

    def _parse_intent(self, user_input: str, context: Dict) -> Dict:
        """Parse user intent from input"""
        input_lower = user_input.lower()

        # Check for full game creation
        if any(kw in input_lower for kw in ["create game", "new game", "setup game", "start a game"]):
            return {
                "action": "create_full_game",
                "extract_config": True
            }

        # Check for invite
        if any(kw in input_lower for kw in ["invite", "add player"]):
            return {
                "action": "invite_players",
                "game_id": context.get("game_id")
            }

        # Check for scheduling
        if any(kw in input_lower for kw in ["schedule", "when", "time"]):
            return {
                "action": "schedule_game",
                "game_id": context.get("game_id")
            }

        return {"action": "unknown"}

    async def _create_full_game(self, intent: Dict, context: Dict, steps: List) -> AgentResult:
        """Create a full game with all configurations"""

        # Step 1: Create the game
        game_config = {
            "title": context.get("title", "Poker Night"),
            "buy_in_amount": context.get("buy_in_amount", 20),
            "chips_per_buy_in": context.get("chips_per_buy_in", 20),
            "scheduled_time": context.get("scheduled_time")
        }

        game_result = await self.call_tool(
            "game_manager",
            action="create_game",
            group_id=context.get("group_id"),
            host_id=context.get("host_id"),
            game_config=game_config
        )

        steps.append({
            "step": "create_game",
            "result": game_result
        })

        if not game_result.get("success"):
            return AgentResult(
                success=False,
                error=game_result.get("error", "Failed to create game"),
                steps_taken=steps
            )

        game_id = game_result["data"]["game_id"]

        # Step 2: Invite players if provided
        player_ids = context.get("player_ids", [])
        if player_ids:
            invite_result = await self.call_tool(
                "game_manager",
                action="invite_players",
                game_id=game_id,
                player_ids=player_ids
            )
            steps.append({
                "step": "invite_players",
                "result": invite_result
            })

        # Step 3: Send notifications
        if player_ids:
            notif_result = await self.call_tool(
                "notification_sender",
                user_ids=player_ids,
                title=f"Game Invite: {game_config['title']}",
                message=f"You've been invited to {game_config['title']}! Buy-in: ${game_config['buy_in_amount']}",
                notification_type="game_invite",
                channels=["in_app", "push"],
                data={"game_id": game_id}
            )
            steps.append({
                "step": "send_notifications",
                "result": notif_result
            })

        # Step 4: Set up reminder if scheduled
        if context.get("scheduled_time"):
            reminder_result = await self.call_tool(
                "scheduler",
                action="set_reminder",
                game_id=game_id,
                reminder_minutes_before=60
            )
            steps.append({
                "step": "set_reminder",
                "result": reminder_result
            })

        return AgentResult(
            success=True,
            data={
                "game_id": game_id,
                "game": game_result["data"]["game"],
                "players_invited": len(player_ids)
            },
            message=f"Game '{game_config['title']}' created successfully!",
            steps_taken=steps,
            next_actions=[
                "Invite more players" if not player_ids else None,
                "Schedule the game" if not context.get("scheduled_time") else None,
                "Start the game when ready"
            ]
        )

    async def _invite_players_flow(self, intent: Dict, context: Dict, steps: List) -> AgentResult:
        """Handle player invitation flow"""
        game_id = intent.get("game_id") or context.get("game_id")
        player_ids = context.get("player_ids", [])

        if not game_id:
            return AgentResult(
                success=False,
                error="No game specified. Please provide a game_id.",
                steps_taken=steps
            )

        if not player_ids:
            return AgentResult(
                success=False,
                error="No players specified. Please provide player_ids.",
                steps_taken=steps
            )

        # Invite players
        invite_result = await self.call_tool(
            "game_manager",
            action="invite_players",
            game_id=game_id,
            player_ids=player_ids
        )
        steps.append({"step": "invite_players", "result": invite_result})

        if not invite_result.get("success"):
            return AgentResult(
                success=False,
                error=invite_result.get("error"),
                steps_taken=steps
            )

        # Send notifications
        notif_result = await self.call_tool(
            "notification_sender",
            user_ids=player_ids,
            title="Game Invite",
            message="You've been invited to a poker game!",
            notification_type="game_invite",
            data={"game_id": game_id}
        )
        steps.append({"step": "send_notifications", "result": notif_result})

        return AgentResult(
            success=True,
            data={"invited": len(player_ids)},
            message=f"Invited {len(player_ids)} players and sent notifications",
            steps_taken=steps
        )

    async def _schedule_game_flow(self, intent: Dict, context: Dict, steps: List) -> AgentResult:
        """Handle game scheduling flow"""
        game_id = intent.get("game_id") or context.get("game_id")
        scheduled_time = context.get("scheduled_time")

        if not game_id:
            return AgentResult(
                success=False,
                error="No game specified",
                steps_taken=steps
            )

        if not scheduled_time:
            return AgentResult(
                success=False,
                error="No time specified. Please provide scheduled_time.",
                steps_taken=steps
            )

        # Schedule the game
        schedule_result = await self.call_tool(
            "scheduler",
            action="schedule_game",
            game_id=game_id,
            scheduled_time=scheduled_time
        )
        steps.append({"step": "schedule_game", "result": schedule_result})

        # Set reminder
        reminder_result = await self.call_tool(
            "scheduler",
            action="set_reminder",
            game_id=game_id,
            reminder_minutes_before=60
        )
        steps.append({"step": "set_reminder", "result": reminder_result})

        # Send RSVP requests
        rsvp_result = await self.call_tool(
            "scheduler",
            action="send_rsvp_request",
            game_id=game_id
        )
        steps.append({"step": "send_rsvp", "result": rsvp_result})

        return AgentResult(
            success=True,
            data={"scheduled_time": scheduled_time},
            message=f"Game scheduled for {scheduled_time}. RSVP requests sent.",
            steps_taken=steps
        )
