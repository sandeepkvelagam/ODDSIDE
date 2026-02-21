"""
Game Planner Agent

Proactively suggests games based on:
- Group patterns (regular game day/time)
- External context (holidays, weather, long weekends)
- Member availability
- Time since last game
"""

from typing import Dict, List, Optional
from datetime import datetime, timezone, timedelta, date
from .base import BaseAgent, AgentResult


class GamePlannerAgent(BaseAgent):
    """
    Proactive game planning agent that suggests optimal game times.

    Triggers:
    - No game in 2+ weeks → suggest one
    - Long weekend coming → suggest a game
    - Bad weather on weekend → suggest a home game
    - Holiday eve → suggest a late night game
    - Regular game day approaching → remind/poll availability

    Outputs:
    - Game suggestions with reasons
    - Availability polls
    - Game creation (with host approval)
    """

    @property
    def name(self) -> str:
        return "game_planner"

    @property
    def description(self) -> str:
        return "proactively suggests and plans game nights based on schedules, weather, and holidays"

    @property
    def capabilities(self) -> List[str]:
        return [
            "Suggest optimal game times based on group patterns",
            "Detect holidays and long weekends for game opportunities",
            "Factor in weather forecasts for home game suggestions",
            "Poll members for availability",
            "Create games with host approval",
            "Send reminders for upcoming games",
            "Re-propose times when initial suggestions don't work",
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "game_manager",
            "scheduler",
            "notification_sender",
            "smart_config",
        ]

    @property
    def input_schema(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "user_input": {
                    "type": "string",
                    "description": "The planning request or trigger description"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID to plan for"
                },
                "trigger_type": {
                    "type": "string",
                    "enum": [
                        "no_recent_game", "long_weekend", "bad_weather",
                        "holiday_eve", "regular_day", "user_request"
                    ],
                    "description": "What triggered this planning action"
                },
                "external_context": {
                    "type": "object",
                    "description": "Context from ContextProvider (holidays, weather, etc.)"
                }
            },
            "required": ["user_input", "group_id"]
        }

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """Execute game planning task."""
        context = context or {}
        steps_taken = []

        try:
            group_id = context.get("group_id")
            if not group_id:
                return AgentResult(
                    success=False,
                    error="group_id is required"
                )

            trigger_type = context.get("trigger_type", "user_request")
            external_context = context.get("external_context", {})

            # Gather group gaming patterns
            patterns = await self._get_group_patterns(group_id)
            steps_taken.append({"step": "gather_patterns", "patterns": patterns})

            # Generate suggestions based on trigger
            if trigger_type == "no_recent_game":
                return await self._suggest_overdue_game(group_id, patterns, external_context, steps_taken)
            elif trigger_type == "long_weekend":
                return await self._suggest_long_weekend_game(group_id, patterns, external_context, steps_taken)
            elif trigger_type == "bad_weather":
                return await self._suggest_weather_game(group_id, patterns, external_context, steps_taken)
            elif trigger_type == "holiday_eve":
                return await self._suggest_holiday_game(group_id, patterns, external_context, steps_taken)
            elif trigger_type == "regular_day":
                return await self._suggest_regular_game(group_id, patterns, external_context, steps_taken)
            else:
                return await self._suggest_next_game(group_id, patterns, external_context, steps_taken)

        except Exception as e:
            return AgentResult(
                success=False,
                error=str(e),
                steps_taken=steps_taken
            )

    async def check_proactive_triggers(self, group_id: str, external_context: Dict) -> List[Dict]:
        """
        Check for proactive game planning triggers.
        Called periodically (e.g., daily) to see if we should suggest a game.

        Returns list of triggers that fired.
        """
        triggers = []

        # Check time since last game
        days_since = await self._days_since_last_game(group_id)
        if days_since is not None and days_since >= 14:
            triggers.append({
                "type": "no_recent_game",
                "days_since": days_since,
                "message": f"It's been {days_since} days since the last game!"
            })

        # Check for game opportunities from context
        opportunities = external_context.get("game_opportunities", [])
        for opp in opportunities:
            if opp.get("priority") in ("high", "medium"):
                triggers.append({
                    "type": opp["type"],
                    "message": opp["message"],
                    "date": opp.get("date"),
                })

        # Check if regular game day is approaching (within 2 days)
        patterns = await self._get_group_patterns(group_id)
        regular_day = patterns.get("regular_day")
        if regular_day is not None:
            today = date.today()
            days_until_regular = (regular_day - today.weekday()) % 7
            if days_until_regular <= 2 and days_until_regular > 0:
                # Check if a game is already scheduled
                has_upcoming = await self._has_upcoming_game(group_id)
                if not has_upcoming:
                    triggers.append({
                        "type": "regular_day",
                        "days_until": days_until_regular,
                        "message": f"Your regular game day is in {days_until_regular} day(s)! No game scheduled yet."
                    })

        return triggers

    # ==================== Suggestion Generators ====================

    async def _suggest_overdue_game(self, group_id: str, patterns: Dict, ext_ctx: Dict, steps: List) -> AgentResult:
        """Suggest a game when it's been too long since the last one."""
        days_since = patterns.get("days_since_last_game", 0)
        suggested_day = patterns.get("regular_day_name", "Saturday")
        suggested_time = patterns.get("regular_time", "7:00 PM")

        message = (
            f"Hey! It's been {days_since} days since the last game. "
            f"How about {suggested_day} at {suggested_time}? Who's in?"
        )

        return AgentResult(
            success=True,
            data={
                "suggestion_type": "overdue",
                "suggested_day": suggested_day,
                "suggested_time": suggested_time,
                "group_id": group_id,
                "chat_message": message,
                "create_poll": True,
            },
            message=message,
            steps_taken=steps
        )

    async def _suggest_long_weekend_game(self, group_id: str, patterns: Dict, ext_ctx: Dict, steps: List) -> AgentResult:
        """Suggest a game for an upcoming long weekend."""
        long_weekends = ext_ctx.get("long_weekends", [])
        if not long_weekends:
            return AgentResult(success=False, error="No long weekends found", steps_taken=steps)

        lw = long_weekends[0]
        message = (
            f"Long weekend coming up ({lw.get('holiday', 'holiday')})! "
            f"Perfect time for a game. Who's free?"
        )

        return AgentResult(
            success=True,
            data={
                "suggestion_type": "long_weekend",
                "holiday": lw.get("holiday"),
                "weekend_start": lw.get("start"),
                "weekend_end": lw.get("end"),
                "group_id": group_id,
                "chat_message": message,
                "create_poll": True,
            },
            message=message,
            steps_taken=steps
        )

    async def _suggest_weather_game(self, group_id: str, patterns: Dict, ext_ctx: Dict, steps: List) -> AgentResult:
        """Suggest a game when bad weather is expected."""
        weather = ext_ctx.get("weather_forecast", {})
        bad_days = weather.get("bad_weather_days", [])
        if not bad_days:
            return AgentResult(success=False, error="No bad weather detected", steps_taken=steps)

        # Find bad weather on a weekend
        weekend_bad = []
        for d_str in bad_days:
            try:
                d = date.fromisoformat(d_str)
                if d.weekday() in (4, 5, 6):
                    weekend_bad.append(d)
            except (ValueError, TypeError):
                continue

        if weekend_bad:
            target = weekend_bad[0]
            message = (
                f"Looks like rough weather on {target.strftime('%A')} — "
                f"nobody's going anywhere. Home game?"
            )
        else:
            message = (
                "Storm's coming this week. Might as well play cards! "
                "Who's down for a game?"
            )

        return AgentResult(
            success=True,
            data={
                "suggestion_type": "weather",
                "bad_weather_days": bad_days,
                "group_id": group_id,
                "chat_message": message,
            },
            message=message,
            steps_taken=steps
        )

    async def _suggest_holiday_game(self, group_id: str, patterns: Dict, ext_ctx: Dict, steps: List) -> AgentResult:
        """Suggest a late-night game on the eve of a holiday."""
        holidays_upcoming = ext_ctx.get("upcoming_holidays", [])
        tomorrow_holidays = [h for h in holidays_upcoming if h.get("days_until") == 1]

        if not tomorrow_holidays:
            return AgentResult(success=False, error="No holidays tomorrow", steps_taken=steps)

        holiday = tomorrow_holidays[0]
        message = (
            f"Tomorrow's {holiday['name']} — no work in the morning! "
            f"Late night game tonight?"
        )

        return AgentResult(
            success=True,
            data={
                "suggestion_type": "holiday_eve",
                "holiday": holiday["name"],
                "group_id": group_id,
                "chat_message": message,
            },
            message=message,
            steps_taken=steps
        )

    async def _suggest_regular_game(self, group_id: str, patterns: Dict, ext_ctx: Dict, steps: List) -> AgentResult:
        """Remind about regular game day approaching."""
        regular_day = patterns.get("regular_day_name", "Friday")
        regular_time = patterns.get("regular_time", "7:00 PM")

        message = (
            f"{regular_day}'s coming up and no game scheduled yet. "
            f"Same time ({regular_time})? Who's in?"
        )

        return AgentResult(
            success=True,
            data={
                "suggestion_type": "regular_day",
                "suggested_day": regular_day,
                "suggested_time": regular_time,
                "group_id": group_id,
                "chat_message": message,
                "create_poll": True,
            },
            message=message,
            steps_taken=steps
        )

    async def _suggest_next_game(self, group_id: str, patterns: Dict, ext_ctx: Dict, steps: List) -> AgentResult:
        """General next game suggestion based on all available context."""
        suggested_day = patterns.get("regular_day_name", "Saturday")
        suggested_time = patterns.get("regular_time", "7:00 PM")

        # Check if there are opportunities to highlight
        opportunities = ext_ctx.get("game_opportunities", [])
        high_priority = [o for o in opportunities if o.get("priority") == "high"]

        if high_priority:
            opp = high_priority[0]
            message = opp.get("message", f"How about a game {suggested_day} at {suggested_time}?")
        else:
            message = f"How about a game {suggested_day} at {suggested_time}? Who's in?"

        return AgentResult(
            success=True,
            data={
                "suggestion_type": "general",
                "suggested_day": suggested_day,
                "suggested_time": suggested_time,
                "group_id": group_id,
                "chat_message": message,
                "opportunities": opportunities,
                "create_poll": True,
            },
            message=message,
            steps_taken=steps
        )

    # ==================== Helper Methods ====================

    async def _get_group_patterns(self, group_id: str) -> Dict:
        """Analyze group's gaming patterns."""
        defaults = {
            "regular_day": 5,  # Saturday
            "regular_day_name": "Saturday",
            "regular_time": "7:00 PM",
            "avg_players": 6,
            "avg_buy_in": 20,
            "days_since_last_game": None,
        }

        if not self.db:
            return defaults

        # Get last 10 games
        games = await self.db.game_nights.find(
            {"group_id": group_id, "status": {"$in": ["ended", "settled", "active"]}},
            {"_id": 0, "created_at": 1, "buy_in_amount": 1, "players": 1}
        ).sort("created_at", -1).limit(10).to_list(10)

        if not games:
            return defaults

        # Calculate days since last game
        last_game = games[0]
        last_date = last_game.get("created_at")
        if isinstance(last_date, str):
            last_date = datetime.fromisoformat(last_date.replace("Z", "+00:00"))
        if last_date:
            defaults["days_since_last_game"] = (datetime.now(timezone.utc) - last_date).days

        # Find most common day
        day_counts = {}
        for g in games:
            created = g.get("created_at")
            if isinstance(created, str):
                created = datetime.fromisoformat(created.replace("Z", "+00:00"))
            if created:
                day = created.weekday()
                day_counts[day] = day_counts.get(day, 0) + 1

        if day_counts:
            regular_day = max(day_counts, key=day_counts.get)
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            defaults["regular_day"] = regular_day
            defaults["regular_day_name"] = day_names[regular_day]

        # Average players and buy-in
        player_counts = [len(g.get("players", [])) for g in games if g.get("players")]
        if player_counts:
            defaults["avg_players"] = round(sum(player_counts) / len(player_counts))

        buy_ins = [g.get("buy_in_amount", 20) for g in games]
        defaults["avg_buy_in"] = round(sum(buy_ins) / len(buy_ins))

        return defaults

    async def _days_since_last_game(self, group_id: str) -> Optional[int]:
        """Get days since the last game in this group."""
        if not self.db:
            return None

        last_game = await self.db.game_nights.find_one(
            {"group_id": group_id},
            {"_id": 0, "created_at": 1},
        )
        if not last_game:
            return None

        last_date = last_game.get("created_at")
        if isinstance(last_date, str):
            last_date = datetime.fromisoformat(last_date.replace("Z", "+00:00"))
        if last_date:
            return (datetime.now(timezone.utc) - last_date).days
        return None

    async def _has_upcoming_game(self, group_id: str) -> bool:
        """Check if there's already an upcoming game scheduled."""
        if not self.db:
            return False

        count = await self.db.game_nights.count_documents({
            "group_id": group_id,
            "status": {"$in": ["pending", "active"]},
        })
        return count > 0
