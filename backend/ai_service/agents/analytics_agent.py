"""
Analytics Agent

Handles reporting, statistics, and analytics generation.
"""

from typing import Dict, List
from .base import BaseAgent, AgentResult


class AnalyticsAgent(BaseAgent):
    """
    Agent for generating reports and analytics.

    Handles all reporting and statistics requests.
    """

    @property
    def name(self) -> str:
        return "analytics"

    @property
    def description(self) -> str:
        return "generating reports, statistics, and analytics for games and players"

    @property
    def capabilities(self) -> List[str]:
        return [
            "Generate game summary reports",
            "Calculate player statistics",
            "Create leaderboards",
            "Analyze group performance",
            "Generate settlement reports",
            "Track historical trends"
        ]

    @property
    def available_tools(self) -> List[str]:
        return [
            "report_generator",
            "poker_evaluator"
        ]

    async def execute(self, user_input: str, context: Dict = None) -> AgentResult:
        """Execute analytics tasks"""
        context = context or {}
        steps_taken = []

        try:
            intent = self._parse_intent(user_input, context)

            if intent["report_type"] == "game_summary":
                return await self._generate_game_summary(context, steps_taken)
            elif intent["report_type"] == "player_stats":
                return await self._generate_player_stats(context, steps_taken)
            elif intent["report_type"] == "leaderboard":
                return await self._generate_leaderboard(context, steps_taken)
            elif intent["report_type"] == "group_analytics":
                return await self._generate_group_analytics(context, steps_taken)
            else:
                return AgentResult(
                    success=False,
                    error="Unknown report type",
                    message="Please specify: game summary, player stats, leaderboard, or group analytics",
                    steps_taken=steps_taken
                )

        except Exception as e:
            return AgentResult(
                success=False,
                error=str(e),
                steps_taken=steps_taken
            )

    def _parse_intent(self, user_input: str, context: Dict) -> Dict:
        """Parse analytics intent"""
        input_lower = user_input.lower()

        if any(kw in input_lower for kw in ["game summary", "game report"]):
            return {"report_type": "game_summary"}
        elif any(kw in input_lower for kw in ["my stats", "player stats", "how am i doing"]):
            return {"report_type": "player_stats"}
        elif any(kw in input_lower for kw in ["leaderboard", "ranking", "who's winning"]):
            return {"report_type": "leaderboard"}
        elif any(kw in input_lower for kw in ["group", "analytics", "overview"]):
            return {"report_type": "group_analytics"}

        # Default based on context
        if context.get("game_id"):
            return {"report_type": "game_summary"}
        elif context.get("user_id"):
            return {"report_type": "player_stats"}
        elif context.get("group_id"):
            return {"report_type": "group_analytics"}

        return {"report_type": "unknown"}

    async def _generate_game_summary(self, context: Dict, steps: List) -> AgentResult:
        """Generate game summary report"""
        game_id = context.get("game_id")

        if not game_id:
            return AgentResult(
                success=False,
                error="No game_id provided",
                steps_taken=steps
            )

        result = await self.call_tool(
            "report_generator",
            report_type="game_summary",
            game_id=game_id,
            format=context.get("format", "json")
        )
        steps.append({"step": "generate_summary", "result": result})

        if not result.get("success"):
            return AgentResult(
                success=False,
                error=result.get("error"),
                steps_taken=steps
            )

        # Format a nice response
        data = result.get("data", {})
        summary_text = self._format_game_summary(data)

        return AgentResult(
            success=True,
            data=data,
            message=summary_text,
            steps_taken=steps
        )

    async def _generate_player_stats(self, context: Dict, steps: List) -> AgentResult:
        """Generate player statistics"""
        user_id = context.get("user_id")
        group_id = context.get("group_id")
        time_period = context.get("time_period", "month")

        if not user_id:
            return AgentResult(
                success=False,
                error="No user_id provided",
                steps_taken=steps
            )

        result = await self.call_tool(
            "report_generator",
            report_type="player_stats",
            user_id=user_id,
            group_id=group_id,
            time_period=time_period
        )
        steps.append({"step": "generate_stats", "result": result})

        if not result.get("success"):
            return AgentResult(
                success=False,
                error=result.get("error"),
                steps_taken=steps
            )

        data = result.get("data", {})
        summary_text = self._format_player_stats(data)

        return AgentResult(
            success=True,
            data=data,
            message=summary_text,
            steps_taken=steps
        )

    async def _generate_leaderboard(self, context: Dict, steps: List) -> AgentResult:
        """Generate leaderboard"""
        group_id = context.get("group_id")
        time_period = context.get("time_period", "month")

        if not group_id:
            return AgentResult(
                success=False,
                error="No group_id provided",
                steps_taken=steps
            )

        result = await self.call_tool(
            "report_generator",
            report_type="leaderboard",
            group_id=group_id,
            time_period=time_period
        )
        steps.append({"step": "generate_leaderboard", "result": result})

        if not result.get("success"):
            return AgentResult(
                success=False,
                error=result.get("error"),
                steps_taken=steps
            )

        data = result.get("data", {})
        summary_text = self._format_leaderboard(data)

        return AgentResult(
            success=True,
            data=data,
            message=summary_text,
            steps_taken=steps
        )

    async def _generate_group_analytics(self, context: Dict, steps: List) -> AgentResult:
        """Generate group analytics"""
        group_id = context.get("group_id")
        time_period = context.get("time_period", "month")

        if not group_id:
            return AgentResult(
                success=False,
                error="No group_id provided",
                steps_taken=steps
            )

        result = await self.call_tool(
            "report_generator",
            report_type="group_analytics",
            group_id=group_id,
            time_period=time_period
        )
        steps.append({"step": "generate_analytics", "result": result})

        return AgentResult(
            success=result.get("success", False),
            data=result.get("data"),
            message="Group analytics generated",
            steps_taken=steps
        )

    def _format_game_summary(self, data: Dict) -> str:
        """Format game summary as readable text"""
        highlights = data.get("highlights", {})
        financials = data.get("financials", {})
        players = data.get("players", {})

        return f"""
📊 **Game Summary: {data.get('title', 'Poker Night')}**

⏱️ Duration: {data.get('duration_minutes', 'N/A')} minutes
👥 Players: {players.get('total', 0)}
💰 Total Pot: ${financials.get('total_pot', 0)}

🏆 Biggest Winner: ${highlights.get('biggest_winner', {}).get('net_result', 0):.2f}
📉 Biggest Loser: ${highlights.get('biggest_loser', {}).get('net_result', 0):.2f}
        """.strip()

    def _format_player_stats(self, data: Dict) -> str:
        """Format player stats as readable text"""
        return f"""
📊 **Your Stats ({data.get('time_period', 'All Time')})**

🎮 Games Played: {data.get('games_played', 0)}
🏆 Games Won: {data.get('games_won', 0)} ({data.get('win_rate', 0)}%)
💰 Total Profit: ${data.get('total_profit', 0):.2f}
📈 ROI: {data.get('roi', 0)}%
        """.strip()

    def _format_leaderboard(self, data: Dict) -> str:
        """Format leaderboard as readable text"""
        leaderboard = data.get("leaderboard", [])[:5]  # Top 5

        lines = ["🏆 **Leaderboard**\n"]
        medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"]

        for i, player in enumerate(leaderboard):
            medal = medals[i] if i < len(medals) else f"{i+1}."
            lines.append(f"{medal} Player: ${player.get('total_profit', 0):.2f}")

        return "\n".join(lines)
