"""
Smart Configuration Tool

Provides intelligent game configuration suggestions based on group history,
player preferences, and optimal timing analysis.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import Counter
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class SmartConfigTool(BaseTool):
    """
    Tool for intelligent game configuration suggestions.

    Analyzes group history to suggest:
    - Optimal game settings (buy-in, chips per buy-in)
    - Best players to invite
    - Optimal time slots based on availability patterns
    """

    @property
    def name(self) -> str:
        return "smart_config"

    @property
    def description(self) -> str:
        return "Generate intelligent game configuration suggestions based on group history"

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform",
                    "enum": [
                        "suggest_game_config",
                        "suggest_players",
                        "suggest_time",
                        "analyze_player",
                        "get_group_patterns"
                    ],
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID",
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID (for player analysis)",
                },
                "game_type": {
                    "type": "string",
                    "description": "Type of game (poker, etc.)",
                }
            },
            "required": ["action", "group_id"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute smart config action"""
        action = kwargs.get("action")

        if action == "suggest_game_config":
            return await self._suggest_game_config(kwargs.get("group_id"))
        elif action == "suggest_players":
            return await self._suggest_players(
                kwargs.get("group_id"),
                kwargs.get("game_type")
            )
        elif action == "suggest_time":
            return await self._suggest_time(kwargs.get("group_id"))
        elif action == "analyze_player":
            return await self._analyze_player(
                kwargs.get("user_id"),
                kwargs.get("group_id")
            )
        elif action == "get_group_patterns":
            return await self._get_group_patterns(kwargs.get("group_id"))
        else:
            return ToolResult(
                success=False,
                error=f"Unknown action: {action}"
            )

    async def _suggest_game_config(self, group_id: str) -> ToolResult:
        """
        Suggest optimal game configuration based on group history.

        Returns:
            ToolResult with suggested buy-in, chips per buy-in, and title
        """
        if self.db is None:
            return ToolResult(
                success=False,
                error="Database not available"
            )

        try:
            # Get last 10 games for this group
            games = await self.db.game_nights.find(
                {"group_id": group_id}
            ).sort("created_at", -1).limit(10).to_list(length=10)

            if not games:
                # Default suggestions for new groups
                return ToolResult(
                    success=True,
                    data={
                        "suggested_config": {
                            "buy_in_amount": 20,
                            "chips_per_buy_in": 100,
                            "title": "Poker Night",
                            "confidence": "low"
                        },
                        "reason": "No previous games found. Using default settings."
                    }
                )

            # Analyze patterns
            buy_ins = [g.get("buy_in_amount", 20) for g in games if g.get("buy_in_amount")]
            chips = [g.get("chips_per_buy_in", 100) for g in games if g.get("chips_per_buy_in")]

            # Most common buy-in and chips
            most_common_buy_in = Counter(buy_ins).most_common(1)[0][0] if buy_ins else 20
            most_common_chips = Counter(chips).most_common(1)[0][0] if chips else 100

            # Get group name for title suggestion
            group = await self.db.groups.find_one({"group_id": group_id})
            group_name = group.get("name", "Poker") if group else "Poker"

            # Generate title suggestions
            weekday = datetime.now().strftime("%A")
            title_suggestions = [
                f"{group_name} {weekday} Game",
                f"{weekday} Night Poker",
                f"{group_name} Poker Night"
            ]

            return ToolResult(
                success=True,
                data={
                    "suggested_config": {
                        "buy_in_amount": most_common_buy_in,
                        "chips_per_buy_in": most_common_chips,
                        "title": title_suggestions[0],
                        "title_alternatives": title_suggestions[1:],
                        "confidence": "high" if len(games) >= 5 else "medium"
                    },
                    "historical_data": {
                        "games_analyzed": len(games),
                        "buy_in_range": {
                            "min": min(buy_ins) if buy_ins else 20,
                            "max": max(buy_ins) if buy_ins else 20,
                            "average": sum(buy_ins) / len(buy_ins) if buy_ins else 20
                        },
                        "chips_range": {
                            "min": min(chips) if chips else 100,
                            "max": max(chips) if chips else 100
                        }
                    },
                    "reason": f"Based on {len(games)} previous games. Most common buy-in: ${most_common_buy_in}."
                }
            )

        except Exception as e:
            logger.error(f"Error suggesting game config: {e}")
            return ToolResult(success=False, error=str(e))

    async def _suggest_players(
        self,
        group_id: str,
        game_type: str = None
    ) -> ToolResult:
        """
        Suggest optimal players to invite based on participation patterns.

        Returns:
            ToolResult with ranked list of suggested players
        """
        if self.db is None:
            return ToolResult(
                success=False,
                error="Database not available"
            )

        try:
            # Get group members
            group = await self.db.groups.find_one({"group_id": group_id})
            if not group:
                return ToolResult(success=False, error="Group not found")

            members = group.get("members", [])
            member_ids = [m.get("user_id") for m in members]

            # Get last 20 games
            games = await self.db.game_nights.find(
                {"group_id": group_id}
            ).sort("created_at", -1).limit(20).to_list(length=20)

            # Calculate participation scores
            player_scores = {}
            for member_id in member_ids:
                player_scores[member_id] = {
                    "user_id": member_id,
                    "games_played": 0,
                    "attendance_rate": 0,
                    "payment_reliability": 100,
                    "last_played": None,
                    "total_score": 0
                }

            # Analyze participation
            for game in games:
                players = game.get("players", [])
                player_ids = [p.get("user_id") for p in players]

                for pid in player_ids:
                    if pid in player_scores:
                        player_scores[pid]["games_played"] += 1
                        game_date = game.get("created_at")
                        if game_date:
                            if not player_scores[pid]["last_played"] or game_date > player_scores[pid]["last_played"]:
                                player_scores[pid]["last_played"] = game_date

            # Calculate attendance rate and scores
            total_games = len(games) if games else 1
            for member_id, scores in player_scores.items():
                scores["attendance_rate"] = round(
                    (scores["games_played"] / total_games) * 100, 1
                )

                # Check payment history
                outstanding = await self.db.ledger_entries.count_documents({
                    "from_user_id": member_id,
                    "group_id": group_id,
                    "status": "pending"
                })
                if outstanding > 0:
                    scores["payment_reliability"] = max(0, 100 - (outstanding * 20))

                # Calculate total score
                # Weight: attendance (40%), payment reliability (30%), recency (30%)
                recency_score = 100
                if scores["last_played"]:
                    days_since = (datetime.utcnow() - scores["last_played"]).days
                    recency_score = max(0, 100 - (days_since * 2))

                scores["total_score"] = (
                    scores["attendance_rate"] * 0.4 +
                    scores["payment_reliability"] * 0.3 +
                    recency_score * 0.3
                )

            # Sort by score
            sorted_players = sorted(
                player_scores.values(),
                key=lambda x: x["total_score"],
                reverse=True
            )

            # Get user names
            for player in sorted_players:
                user = await self.db.users.find_one({"user_id": player["user_id"]})
                if user:
                    player["name"] = user.get("name") or user.get("email", "Unknown")
                    player["email"] = user.get("email")

            # Categorize suggestions
            regulars = [p for p in sorted_players if p["attendance_rate"] >= 50]
            occasional = [p for p in sorted_players if 20 <= p["attendance_rate"] < 50]
            inactive = [p for p in sorted_players if p["attendance_rate"] < 20]

            return ToolResult(
                success=True,
                data={
                    "suggested_players": sorted_players[:8],  # Top 8
                    "categories": {
                        "regulars": regulars,
                        "occasional": occasional,
                        "inactive": inactive
                    },
                    "total_members": len(member_ids),
                    "recommendation": f"Invite {len(regulars)} regular players for best turnout."
                }
            )

        except Exception as e:
            logger.error(f"Error suggesting players: {e}")
            return ToolResult(success=False, error=str(e))

    async def _suggest_time(self, group_id: str) -> ToolResult:
        """
        Suggest optimal game time based on historical patterns.

        Returns:
            ToolResult with suggested day and time
        """
        if self.db is None:
            return ToolResult(
                success=False,
                error="Database not available"
            )

        try:
            # Get last 20 games with good attendance
            games = await self.db.game_nights.find({
                "group_id": group_id,
                "status": {"$in": ["ended", "settled"]}
            }).sort("created_at", -1).limit(20).to_list(length=20)

            if not games:
                # Default suggestion
                return ToolResult(
                    success=True,
                    data={
                        "suggested_time": {
                            "day_of_week": "Friday",
                            "hour": 19,
                            "confidence": "low"
                        },
                        "reason": "No game history. Friday evening is a popular choice."
                    }
                )

            # Analyze patterns
            day_counts = Counter()
            hour_counts = Counter()
            day_attendance = {}

            for game in games:
                start_time = game.get("started_at") or game.get("created_at")
                if start_time:
                    day = start_time.strftime("%A")
                    hour = start_time.hour
                    player_count = len(game.get("players", []))

                    day_counts[day] += 1
                    hour_counts[hour] += 1

                    if day not in day_attendance:
                        day_attendance[day] = []
                    day_attendance[day].append(player_count)

            # Find best day (by frequency and attendance)
            best_day = None
            best_day_score = 0

            for day, count in day_counts.items():
                avg_attendance = (
                    sum(day_attendance.get(day, [0])) /
                    len(day_attendance.get(day, [1]))
                )
                score = count * avg_attendance
                if score > best_day_score:
                    best_day_score = score
                    best_day = day

            # Find best hour
            best_hour = hour_counts.most_common(1)[0][0] if hour_counts else 19

            # Calculate next occurrence of best day
            today = datetime.now()
            days_ahead = {
                "Monday": 0, "Tuesday": 1, "Wednesday": 2, "Thursday": 3,
                "Friday": 4, "Saturday": 5, "Sunday": 6
            }
            current_day_num = today.weekday()
            target_day_num = days_ahead.get(best_day, 4)  # Default Friday

            days_until = (target_day_num - current_day_num) % 7
            if days_until == 0:
                days_until = 7  # Next week

            suggested_date = today + timedelta(days=days_until)

            return ToolResult(
                success=True,
                data={
                    "suggested_time": {
                        "day_of_week": best_day or "Friday",
                        "hour": best_hour,
                        "suggested_date": suggested_date.strftime("%Y-%m-%d"),
                        "formatted": f"{best_day or 'Friday'} at {best_hour}:00",
                        "confidence": "high" if len(games) >= 5 else "medium"
                    },
                    "patterns": {
                        "days": dict(day_counts),
                        "popular_hours": dict(hour_counts.most_common(3)),
                        "avg_attendance_by_day": {
                            day: round(sum(att) / len(att), 1)
                            for day, att in day_attendance.items()
                        }
                    },
                    "reason": f"Based on {len(games)} games. {best_day}s have the best attendance."
                }
            )

        except Exception as e:
            logger.error(f"Error suggesting time: {e}")
            return ToolResult(success=False, error=str(e))

    async def _analyze_player(
        self,
        user_id: str,
        group_id: str
    ) -> ToolResult:
        """
        Analyze a player's history and reliability.

        Returns:
            ToolResult with player analysis
        """
        if self.db is None or not user_id:
            return ToolResult(
                success=False,
                error="Database or user_id not available"
            )

        try:
            # Get user info
            user = await self.db.users.find_one({"user_id": user_id})
            if not user:
                return ToolResult(success=False, error="User not found")

            # Get game history
            games = await self.db.game_nights.find({
                "group_id": group_id,
                "players.user_id": user_id
            }).to_list(length=100)

            # Calculate statistics
            total_games = len(games)
            total_buy_in = 0
            total_cash_out = 0
            wins = 0
            losses = 0

            for game in games:
                for player in game.get("players", []):
                    if player.get("user_id") == user_id:
                        buy_in = player.get("total_buy_in", 0)
                        cash_out = player.get("cash_out_chips", 0)
                        chips_per = game.get("chips_per_buy_in", 100)

                        total_buy_in += buy_in
                        cash_out_value = (cash_out / chips_per) * game.get("buy_in_amount", 20) if chips_per else 0
                        total_cash_out += cash_out_value

                        if cash_out_value > buy_in:
                            wins += 1
                        elif cash_out_value < buy_in:
                            losses += 1

            # Check payment history
            pending_payments = await self.db.ledger_entries.count_documents({
                "from_user_id": user_id,
                "group_id": group_id,
                "status": "pending"
            })

            total_paid = await self.db.ledger_entries.count_documents({
                "from_user_id": user_id,
                "group_id": group_id,
                "status": "paid"
            })

            payment_rate = (
                (total_paid / (total_paid + pending_payments)) * 100
                if (total_paid + pending_payments) > 0
                else 100
            )

            # Calculate reliability score
            reliability_factors = []
            if payment_rate >= 95:
                reliability_factors.append("Excellent payment history")
            elif payment_rate >= 80:
                reliability_factors.append("Good payment history")
            else:
                reliability_factors.append(f"Payment rate: {payment_rate:.0f}%")

            if total_games >= 10:
                reliability_factors.append("Active regular player")
            elif total_games >= 5:
                reliability_factors.append("Occasional player")
            else:
                reliability_factors.append("New to the group")

            # Generate recommendation
            reliability_score = (payment_rate * 0.5) + (min(total_games, 20) * 2.5)

            if reliability_score >= 90:
                recommendation = "HIGHLY RECOMMENDED"
            elif reliability_score >= 70:
                recommendation = "RECOMMENDED"
            elif reliability_score >= 50:
                recommendation = "OK"
            else:
                recommendation = "CAUTION"

            return ToolResult(
                success=True,
                data={
                    "user_id": user_id,
                    "name": user.get("name") or user.get("email", "Unknown"),
                    "statistics": {
                        "total_games": total_games,
                        "wins": wins,
                        "losses": losses,
                        "win_rate": round((wins / total_games) * 100, 1) if total_games else 0,
                        "total_buy_in": round(total_buy_in, 2),
                        "total_cash_out": round(total_cash_out, 2),
                        "net_profit": round(total_cash_out - total_buy_in, 2)
                    },
                    "payment": {
                        "rate": round(payment_rate, 1),
                        "pending": pending_payments,
                        "completed": total_paid
                    },
                    "reliability": {
                        "score": round(reliability_score, 1),
                        "recommendation": recommendation,
                        "factors": reliability_factors
                    }
                }
            )

        except Exception as e:
            logger.error(f"Error analyzing player: {e}")
            return ToolResult(success=False, error=str(e))

    async def _get_group_patterns(self, group_id: str) -> ToolResult:
        """
        Get comprehensive group patterns and analytics.

        Returns:
            ToolResult with group patterns
        """
        if self.db is None:
            return ToolResult(
                success=False,
                error="Database not available"
            )

        try:
            # Get all games
            games = await self.db.game_nights.find({
                "group_id": group_id
            }).sort("created_at", -1).to_list(length=100)

            if not games:
                return ToolResult(
                    success=True,
                    data={
                        "patterns": None,
                        "message": "No game history found"
                    }
                )

            # Analyze patterns
            total_games = len(games)
            total_pot = 0
            avg_players = 0
            avg_duration = 0
            durations = []

            for game in games:
                players = game.get("players", [])
                avg_players += len(players)

                for player in players:
                    total_pot += player.get("total_buy_in", 0)

                if game.get("started_at") and game.get("ended_at"):
                    duration = (game["ended_at"] - game["started_at"]).total_seconds() / 60
                    durations.append(duration)

            avg_players = avg_players / total_games if total_games else 0
            avg_duration = sum(durations) / len(durations) if durations else 0

            # Calculate frequency
            if len(games) >= 2:
                first_game = games[-1].get("created_at")
                last_game = games[0].get("created_at")
                if first_game and last_game:
                    days_span = (last_game - first_game).days or 1
                    games_per_month = (total_games / days_span) * 30
                else:
                    games_per_month = 0
            else:
                games_per_month = 0

            return ToolResult(
                success=True,
                data={
                    "patterns": {
                        "total_games": total_games,
                        "games_per_month": round(games_per_month, 1),
                        "avg_players": round(avg_players, 1),
                        "avg_duration_minutes": round(avg_duration, 0),
                        "total_pot_all_time": round(total_pot, 2),
                        "avg_pot_per_game": round(total_pot / total_games, 2) if total_games else 0
                    },
                    "health": {
                        "status": "active" if games_per_month >= 2 else "moderate" if games_per_month >= 0.5 else "inactive",
                        "last_game": games[0].get("created_at").isoformat() if games else None,
                        "recommendation": self._get_group_recommendation(games_per_month, avg_players)
                    }
                }
            )

        except Exception as e:
            logger.error(f"Error getting group patterns: {e}")
            return ToolResult(success=False, error=str(e))

    def _get_group_recommendation(self, games_per_month: float, avg_players: float) -> str:
        """Generate recommendation for group health"""
        if games_per_month >= 4 and avg_players >= 5:
            return "Healthy and active group! Keep it up."
        elif games_per_month >= 2:
            return "Good activity. Consider inviting more players for variety."
        elif games_per_month >= 0.5:
            return "Consider scheduling more regular games to keep engagement high."
        else:
            return "Group seems inactive. Send a reminder or schedule a game to re-engage."
