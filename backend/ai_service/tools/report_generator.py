"""
Report Generator Tool

Generates various reports: game summaries, player stats, settlement reports, etc.
"""

from typing import List, Dict, Optional
from .base import BaseTool, ToolResult
from datetime import datetime, timedelta


class ReportGeneratorTool(BaseTool):
    """
    Generates reports and analytics for games and players.

    Capabilities:
    - Game summary reports
    - Player performance statistics
    - Settlement reports
    - Group analytics
    - Historical trends
    """

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "report_generator"

    @property
    def description(self) -> str:
        return """Generates reports and analytics for poker games.
        Can create game summaries, player stats, settlement reports, and trend analysis.
        Use this when users ask for reports, summaries, or analytics."""

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "report_type": {
                    "type": "string",
                    "enum": [
                        "game_summary",
                        "player_stats",
                        "group_analytics",
                        "settlement_report",
                        "leaderboard",
                        "historical_trends"
                    ],
                    "description": "Type of report to generate"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID for game-specific reports"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID for group-level reports"
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID for player-specific reports"
                },
                "time_period": {
                    "type": "string",
                    "enum": ["week", "month", "quarter", "year", "all_time"],
                    "description": "Time period for historical reports",
                    "default": "month"
                },
                "format": {
                    "type": "string",
                    "enum": ["json", "text", "markdown"],
                    "description": "Output format for the report",
                    "default": "json"
                }
            },
            "required": ["report_type"]
        }

    async def execute(
        self,
        report_type: str,
        game_id: str = None,
        group_id: str = None,
        user_id: str = None,
        time_period: str = "month",
        format: str = "json"
    ) -> ToolResult:
        """Generate the requested report"""
        try:
            if report_type == "game_summary":
                return await self._game_summary(game_id, format)
            elif report_type == "player_stats":
                return await self._player_stats(user_id, group_id, time_period, format)
            elif report_type == "group_analytics":
                return await self._group_analytics(group_id, time_period, format)
            elif report_type == "settlement_report":
                return await self._settlement_report(game_id, format)
            elif report_type == "leaderboard":
                return await self._leaderboard(group_id, time_period, format)
            elif report_type == "historical_trends":
                return await self._historical_trends(group_id, user_id, time_period, format)
            else:
                return ToolResult(
                    success=False,
                    error=f"Unknown report type: {report_type}"
                )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e)
            )

    async def _game_summary(self, game_id: str, format: str) -> ToolResult:
        """Generate a game summary report"""
        if not game_id:
            return ToolResult(
                success=False,
                error="game_id is required for game summary"
            )

        if not self.db:
            return ToolResult(
                success=False,
                error="Database not available"
            )

        game = await self.db.game_nights.find_one(
            {"game_id": game_id},
            {"_id": 0}
        )

        if not game:
            return ToolResult(
                success=False,
                error="Game not found"
            )

        players = game.get("players", [])

        # Calculate stats
        total_buy_ins = sum(p.get("total_buy_in", 0) for p in players)
        total_chips = sum(p.get("total_chips", 0) for p in players)

        # Duration
        started_at = game.get("started_at")
        ended_at = game.get("ended_at")
        duration = None
        if started_at and ended_at:
            duration = (ended_at - started_at).total_seconds() / 60  # minutes

        # Winners and losers
        sorted_players = sorted(
            [p for p in players if p.get("cashed_out")],
            key=lambda x: x.get("net_result", 0),
            reverse=True
        )

        biggest_winner = sorted_players[0] if sorted_players else None
        biggest_loser = sorted_players[-1] if sorted_players else None

        summary = {
            "game_id": game_id,
            "title": game.get("title", "Poker Night"),
            "status": game.get("status"),
            "date": game.get("scheduled_time"),
            "duration_minutes": duration,
            "players": {
                "total": len(players),
                "cashed_out": len([p for p in players if p.get("cashed_out")])
            },
            "financials": {
                "total_pot": total_buy_ins,
                "chip_value": game.get("chip_value", 1),
                "total_chips_distributed": total_chips
            },
            "highlights": {
                "biggest_winner": {
                    "user_id": biggest_winner.get("user_id") if biggest_winner else None,
                    "net_result": biggest_winner.get("net_result", 0) if biggest_winner else 0
                },
                "biggest_loser": {
                    "user_id": biggest_loser.get("user_id") if biggest_loser else None,
                    "net_result": biggest_loser.get("net_result", 0) if biggest_loser else 0
                }
            },
            "player_results": [
                {
                    "user_id": p.get("user_id"),
                    "buy_in": p.get("total_buy_in", 0),
                    "chips_returned": p.get("chips_returned", 0),
                    "net_result": p.get("net_result", 0)
                }
                for p in sorted_players
            ]
        }

        if format == "markdown":
            return self._format_as_markdown(summary, "Game Summary")
        elif format == "text":
            return self._format_as_text(summary)

        return ToolResult(
            success=True,
            data=summary,
            message="Game summary generated"
        )

    async def _player_stats(self, user_id: str, group_id: str, time_period: str, format: str) -> ToolResult:
        """Generate player statistics"""
        if not user_id:
            return ToolResult(
                success=False,
                error="user_id is required for player stats"
            )

        if not self.db:
            return ToolResult(
                success=False,
                error="Database not available"
            )

        # Get time filter
        time_filter = self._get_time_filter(time_period)

        query = {"players.user_id": user_id, "status": {"$in": ["ended", "settled"]}}
        if group_id:
            query["group_id"] = group_id
        if time_filter:
            query["ended_at"] = time_filter

        games = await self.db.game_nights.find(query, {"_id": 0}).to_list(1000)

        total_games = len(games)
        total_profit = 0
        total_buy_ins = 0
        wins = 0

        for game in games:
            for player in game.get("players", []):
                if player.get("user_id") == user_id:
                    net = player.get("net_result", 0)
                    total_profit += net
                    total_buy_ins += player.get("total_buy_in", 0)
                    if net > 0:
                        wins += 1

        stats = {
            "user_id": user_id,
            "time_period": time_period,
            "games_played": total_games,
            "games_won": wins,
            "win_rate": round(wins / total_games * 100, 1) if total_games > 0 else 0,
            "total_profit": total_profit,
            "total_invested": total_buy_ins,
            "roi": round(total_profit / total_buy_ins * 100, 1) if total_buy_ins > 0 else 0,
            "average_profit_per_game": round(total_profit / total_games, 2) if total_games > 0 else 0
        }

        return ToolResult(
            success=True,
            data=stats,
            message=f"Player stats for {time_period}"
        )

    async def _leaderboard(self, group_id: str, time_period: str, format: str) -> ToolResult:
        """Generate group leaderboard"""
        if not group_id:
            return ToolResult(
                success=False,
                error="group_id is required for leaderboard"
            )

        if not self.db:
            return ToolResult(
                success=False,
                error="Database not available"
            )

        time_filter = self._get_time_filter(time_period)

        query = {"group_id": group_id, "status": {"$in": ["ended", "settled"]}}
        if time_filter:
            query["ended_at"] = time_filter

        games = await self.db.game_nights.find(query, {"_id": 0}).to_list(1000)

        player_stats = {}
        for game in games:
            for player in game.get("players", []):
                uid = player.get("user_id")
                if uid not in player_stats:
                    player_stats[uid] = {
                        "user_id": uid,
                        "games": 0,
                        "wins": 0,
                        "total_profit": 0
                    }

                player_stats[uid]["games"] += 1
                net = player.get("net_result", 0)
                player_stats[uid]["total_profit"] += net
                if net > 0:
                    player_stats[uid]["wins"] += 1

        # Sort by total profit
        leaderboard = sorted(
            player_stats.values(),
            key=lambda x: x["total_profit"],
            reverse=True
        )

        # Add rankings
        for i, player in enumerate(leaderboard):
            player["rank"] = i + 1

        return ToolResult(
            success=True,
            data={"leaderboard": leaderboard, "time_period": time_period, "total_games": len(games)},
            message=f"Leaderboard for {time_period}"
        )

    async def _group_analytics(self, group_id: str, time_period: str, format: str) -> ToolResult:
        """Generate group analytics"""
        if not group_id:
            return ToolResult(
                success=False,
                error="group_id is required for group analytics"
            )

        if not self.db:
            return ToolResult(
                success=False,
                error="Database not available"
            )

        time_filter = self._get_time_filter(time_period)

        query = {"group_id": group_id, "status": {"$in": ["ended", "settled"]}}
        if time_filter:
            query["ended_at"] = time_filter

        games = await self.db.game_nights.find(query, {"_id": 0}).to_list(1000)

        total_pot = sum(
            sum(p.get("total_buy_in", 0) for p in g.get("players", []))
            for g in games
        )

        analytics = {
            "group_id": group_id,
            "time_period": time_period,
            "total_games": len(games),
            "total_pot_all_games": total_pot,
            "average_pot_per_game": round(total_pot / len(games), 2) if games else 0,
            "average_players_per_game": round(
                sum(len(g.get("players", [])) for g in games) / len(games), 1
            ) if games else 0
        }

        return ToolResult(
            success=True,
            data=analytics,
            message=f"Group analytics for {time_period}"
        )

    async def _settlement_report(self, game_id: str, format: str) -> ToolResult:
        """Generate settlement report"""
        if not game_id:
            return ToolResult(
                success=False,
                error="game_id is required for settlement report"
            )

        if not self.db:
            return ToolResult(
                success=False,
                error="Database not available"
            )

        settlement = await self.db.settlements.find_one(
            {"game_id": game_id},
            {"_id": 0}
        )

        if not settlement:
            return ToolResult(
                success=False,
                error="Settlement not found"
            )

        return ToolResult(
            success=True,
            data=settlement,
            message="Settlement report generated"
        )

    async def _historical_trends(self, group_id: str, user_id: str, time_period: str, format: str) -> ToolResult:
        """Generate historical trends"""
        # Placeholder for trend analysis
        return ToolResult(
            success=True,
            data={"note": "Historical trends feature coming soon"},
            message="Trends analysis"
        )

    def _get_time_filter(self, time_period: str) -> Optional[Dict]:
        """Get MongoDB time filter based on period"""
        now = datetime.utcnow()
        if time_period == "week":
            return {"$gte": now - timedelta(days=7)}
        elif time_period == "month":
            return {"$gte": now - timedelta(days=30)}
        elif time_period == "quarter":
            return {"$gte": now - timedelta(days=90)}
        elif time_period == "year":
            return {"$gte": now - timedelta(days=365)}
        return None

    def _format_as_markdown(self, data: Dict, title: str) -> ToolResult:
        """Format report as markdown"""
        md = f"# {title}\n\n"
        for key, value in data.items():
            md += f"**{key}**: {value}\n"
        return ToolResult(
            success=True,
            data={"markdown": md, "raw": data},
            message=f"{title} generated"
        )

    def _format_as_text(self, data: Dict) -> ToolResult:
        """Format report as plain text"""
        text = "\n".join(f"{k}: {v}" for k, v in data.items())
        return ToolResult(
            success=True,
            data={"text": text, "raw": data},
            message="Report generated"
        )
