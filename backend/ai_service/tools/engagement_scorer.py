"""
Engagement Scorer Tool

Scores user and group activity levels to identify engagement opportunities.
Used by the EngagementAgent to detect inactive users, group milestones,
big winners, and other triggers for intelligent nudges.
"""

from typing import Dict, List, Optional
from datetime import datetime, timedelta, timezone
import logging

from .base import BaseTool, ToolResult

logger = logging.getLogger(__name__)


class EngagementScorerTool(BaseTool):
    """
    Tool for scoring and analyzing user/group engagement levels.

    Features:
    - Score individual user activity (games played, frequency, recency)
    - Score group activity (games per week, active member ratio)
    - Detect inactive users who haven't played in N days
    - Detect inactive groups with no games in N days
    - Identify milestones (5th game, 10th game, 50th, 100th)
    - Identify big winners from recent games
    - Generate engagement opportunity reports
    """

    def __init__(self, db=None):
        self.db = db

    @property
    def name(self) -> str:
        return "engagement_scorer"

    @property
    def description(self) -> str:
        return (
            "Score user and group engagement levels, detect inactive users/groups, "
            "identify milestones and big winners for re-engagement nudges"
        )

    @property
    def parameters(self) -> Dict:
        return {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "Action to perform",
                    "enum": [
                        "score_user",
                        "score_group",
                        "find_inactive_users",
                        "find_inactive_groups",
                        "check_milestones",
                        "find_big_winners",
                        "get_engagement_report"
                    ]
                },
                "user_id": {
                    "type": "string",
                    "description": "User ID for user-specific scoring"
                },
                "group_id": {
                    "type": "string",
                    "description": "Group ID for group-specific scoring"
                },
                "game_id": {
                    "type": "string",
                    "description": "Game ID for game-specific checks"
                },
                "inactive_days": {
                    "type": "integer",
                    "description": "Number of days to consider inactive (default: 14 for groups, 30 for users)"
                }
            },
            "required": ["action"]
        }

    async def execute(self, **kwargs) -> ToolResult:
        """Execute engagement scorer action."""
        action = kwargs.get("action")

        if action == "score_user":
            return await self._score_user(kwargs.get("user_id"), kwargs.get("group_id"))
        elif action == "score_group":
            return await self._score_group(kwargs.get("group_id"))
        elif action == "find_inactive_users":
            return await self._find_inactive_users(
                kwargs.get("group_id"),
                kwargs.get("inactive_days", 30)
            )
        elif action == "find_inactive_groups":
            return await self._find_inactive_groups(
                kwargs.get("inactive_days", 14)
            )
        elif action == "check_milestones":
            return await self._check_milestones(
                kwargs.get("user_id"),
                kwargs.get("group_id"),
                kwargs.get("game_id")
            )
        elif action == "find_big_winners":
            return await self._find_big_winners(kwargs.get("game_id"))
        elif action == "get_engagement_report":
            return await self._get_engagement_report(kwargs.get("group_id"))
        else:
            return ToolResult(success=False, error=f"Unknown action: {action}")

    async def _score_user(self, user_id: str, group_id: str = None) -> ToolResult:
        """
        Calculate engagement score for a user (0-100).

        Factors:
        - Recency: days since last game (0-30 points)
        - Frequency: games per month (0-30 points)
        - Consistency: regular play pattern (0-20 points)
        - Social: number of groups active in (0-20 points)
        """
        if not self.db or not user_id:
            return ToolResult(success=False, error="Database or user_id not available")

        try:
            now = datetime.now(timezone.utc)

            # Get user's game history
            query = {"players.user_id": user_id, "status": {"$in": ["ended", "settled"]}}
            if group_id:
                query["group_id"] = group_id

            games = await self.db.game_nights.find(
                query,
                {"_id": 0, "game_id": 1, "created_at": 1, "group_id": 1, "ended_at": 1}
            ).sort("created_at", -1).to_list(100)

            total_games = len(games)

            if total_games == 0:
                return ToolResult(
                    success=True,
                    data={
                        "user_id": user_id,
                        "score": 0,
                        "level": "new",
                        "total_games": 0,
                        "days_since_last_game": None,
                        "games_per_month": 0,
                        "components": {
                            "recency": {"score": 0, "max": 30, "weight": 0.30},
                            "frequency": {"score": 0, "max": 30, "weight": 0.30},
                            "consistency": {"score": 0, "max": 20, "weight": 0.20},
                            "social": {"score": 0, "max": 20, "weight": 0.20}
                        },
                        "reasons": ["No games played yet"],
                        "recommendations": [
                            {"action": "nudge_user", "reason": "New user with no games — invite to first game"}
                        ],
                        "factors": {
                            "recency": 0,
                            "frequency": 0,
                            "consistency": 0,
                            "social": 0
                        }
                    }
                )

            # Recency score (0-30)
            last_game_date = self._parse_date(games[0].get("created_at"))
            days_since_last = (now - last_game_date).days if last_game_date else 999
            recency_score = max(0, 30 - days_since_last)

            # Frequency score (0-30): games in last 30 days
            thirty_days_ago = now - timedelta(days=30)
            recent_games = [
                g for g in games
                if self._parse_date(g.get("created_at")) and
                self._parse_date(g.get("created_at")) > thirty_days_ago
            ]
            games_per_month = len(recent_games)
            frequency_score = min(30, games_per_month * 6)  # 5+ games/month = max

            # Consistency score (0-20): regular intervals between games
            consistency_score = 0
            if total_games >= 3:
                intervals = []
                for i in range(min(len(games) - 1, 10)):
                    d1 = self._parse_date(games[i].get("created_at"))
                    d2 = self._parse_date(games[i + 1].get("created_at"))
                    if d1 and d2:
                        intervals.append((d1 - d2).days)

                if intervals:
                    avg_interval = sum(intervals) / len(intervals)
                    variance = sum((i - avg_interval) ** 2 for i in intervals) / len(intervals)
                    # Lower variance = more consistent = higher score
                    consistency_score = max(0, min(20, int(20 - (variance ** 0.5) / 2)))

            # Social score (0-20): unique groups played in
            unique_groups = len(set(g.get("group_id") for g in games if g.get("group_id")))
            social_score = min(20, unique_groups * 5)  # 4+ groups = max

            total_score = recency_score + frequency_score + consistency_score + social_score

            # Determine level
            if total_score >= 80:
                level = "highly_active"
            elif total_score >= 60:
                level = "active"
            elif total_score >= 40:
                level = "moderate"
            elif total_score >= 20:
                level = "low"
            else:
                level = "inactive"

            # Build explainable reasons
            reasons = []
            if days_since_last > 30:
                reasons.append(f"Last game {days_since_last} days ago")
            elif days_since_last > 14:
                reasons.append(f"No games in {days_since_last} days")
            if games_per_month == 0:
                reasons.append("No games in the last 30 days")
            elif games_per_month <= 1:
                reasons.append(f"Only {games_per_month} game in the last month")
            if consistency_score < 5 and total_games >= 3:
                reasons.append("Irregular play schedule")
            if unique_groups <= 1:
                reasons.append("Only active in 1 group")
            if total_score >= 60 and games_per_month >= 3:
                reasons.append(f"Strong activity: {games_per_month} games this month")
            if not reasons:
                reasons.append(f"Score {total_score}/100 — {level} engagement")

            # Build recommendations
            recommendations = []
            if days_since_last > 30:
                recommendations.append({
                    "action": "nudge_user",
                    "reason": f"Inactive for {days_since_last} days — send re-engagement nudge"
                })
            elif days_since_last > 14:
                recommendations.append({
                    "action": "nudge_user",
                    "reason": "Approaching inactivity threshold — light reminder"
                })
            if games_per_month == 0 and total_games > 0:
                recommendations.append({
                    "action": "fomo_nudge",
                    "reason": "Lapsed player — show group activity they missed"
                })
            if total_score >= 80:
                recommendations.append({
                    "action": "milestone_check",
                    "reason": "Highly active — check for upcoming milestones"
                })

            return ToolResult(
                success=True,
                data={
                    "user_id": user_id,
                    "score": total_score,
                    "level": level,
                    "total_games": total_games,
                    "days_since_last_game": days_since_last,
                    "games_per_month": games_per_month,
                    "components": {
                        "recency": {"score": recency_score, "max": 30, "weight": 0.30},
                        "frequency": {"score": frequency_score, "max": 30, "weight": 0.30},
                        "consistency": {"score": consistency_score, "max": 20, "weight": 0.20},
                        "social": {"score": social_score, "max": 20, "weight": 0.20}
                    },
                    "reasons": reasons,
                    "recommendations": recommendations,
                    "factors": {
                        "recency": recency_score,
                        "frequency": frequency_score,
                        "consistency": consistency_score,
                        "social": social_score
                    }
                }
            )

        except Exception as e:
            logger.error(f"Error scoring user engagement: {e}")
            return ToolResult(success=False, error=str(e))

    async def _score_group(self, group_id: str) -> ToolResult:
        """
        Calculate engagement score for a group (0-100).

        Factors:
        - Recency: days since last game (0-30 points)
        - Frequency: games per month (0-30 points)
        - Participation: avg. player count per game (0-20 points)
        - Growth: new members in last 30 days (0-20 points)
        """
        if not self.db or not group_id:
            return ToolResult(success=False, error="Database or group_id not available")

        try:
            now = datetime.now(timezone.utc)

            # Get group's game history
            games = await self.db.game_nights.find(
                {"group_id": group_id, "status": {"$in": ["ended", "settled"]}},
                {"_id": 0, "game_id": 1, "created_at": 1, "players": 1}
            ).sort("created_at", -1).to_list(100)

            total_games = len(games)

            # Get group member count
            member_count = await self.db.group_members.count_documents({
                "group_id": group_id
            })

            if total_games == 0:
                reasons = ["No games played yet"]
                recs = []
                if member_count >= 3:
                    reasons.append(f"{member_count} members ready to play")
                    recs.append({"action": "nudge_group", "reason": "Group has members but no games — prompt host to schedule"})
                elif member_count > 0:
                    recs.append({"action": "grow_group", "reason": "Need more members before first game"})
                return ToolResult(
                    success=True,
                    data={
                        "group_id": group_id,
                        "score": 5 if member_count > 0 else 0,
                        "level": "new",
                        "total_games": 0,
                        "member_count": member_count,
                        "days_since_last_game": None,
                        "games_per_month": 0,
                        "avg_players_per_game": 0,
                        "components": {
                            "recency": {"score": 0, "max": 30, "weight": 0.30},
                            "frequency": {"score": 0, "max": 30, "weight": 0.30},
                            "participation": {"score": 5 if member_count > 0 else 0, "max": 20, "weight": 0.20},
                            "growth": {"score": 0, "max": 20, "weight": 0.20}
                        },
                        "reasons": reasons,
                        "recommendations": recs,
                        "factors": {
                            "recency": 0,
                            "frequency": 0,
                            "participation": 5 if member_count > 0 else 0,
                            "growth": 0
                        }
                    }
                )

            # Recency (0-30)
            last_game_date = self._parse_date(games[0].get("created_at"))
            days_since_last = (now - last_game_date).days if last_game_date else 999
            recency_score = max(0, 30 - days_since_last)

            # Frequency (0-30): games in last 30 days
            thirty_days_ago = now - timedelta(days=30)
            recent_games = [
                g for g in games
                if self._parse_date(g.get("created_at")) and
                self._parse_date(g.get("created_at")) > thirty_days_ago
            ]
            games_per_month = len(recent_games)
            frequency_score = min(30, games_per_month * 8)  # 4+ games/month = max

            # Participation (0-20): avg players per game
            player_counts = [len(g.get("players", [])) for g in games[:10]]
            avg_players = sum(player_counts) / len(player_counts) if player_counts else 0
            participation_score = min(20, int(avg_players * 3))  # 7+ avg = max

            # Growth (0-20): new members in last 30 days
            new_members = await self.db.group_members.count_documents({
                "group_id": group_id,
                "joined_at": {"$gte": thirty_days_ago.isoformat()}
            })
            growth_score = min(20, new_members * 5)

            total_score = recency_score + frequency_score + participation_score + growth_score

            # Determine level
            if total_score >= 80:
                level = "thriving"
            elif total_score >= 60:
                level = "active"
            elif total_score >= 40:
                level = "moderate"
            elif total_score >= 20:
                level = "cooling"
            else:
                level = "dormant"

            # Build explainable reasons
            reasons = []
            if days_since_last > 30:
                reasons.append(f"No games in {days_since_last} days")
            elif days_since_last > 14:
                reasons.append(f"Last game {days_since_last} days ago")
            if games_per_month == 0:
                reasons.append("Zero games this month")
            elif games_per_month <= 1:
                reasons.append(f"Only {games_per_month} game this month")
            if avg_players < 3 and total_games > 0:
                reasons.append(f"Low turnout: avg {avg_players:.1f} players/game")
            if member_count > 0 and avg_players > 0 and avg_players / member_count < 0.5:
                active_pct = int((avg_players / member_count) * 100)
                reasons.append(f"Only {active_pct}% of {member_count} members playing")
            if total_score >= 60:
                reasons.append(f"Healthy group activity: {games_per_month} games/month")
            if not reasons:
                reasons.append(f"Score {total_score}/100 — {level}")

            # Build recommendations
            recommendations = []
            if days_since_last > 21:
                recommendations.append({
                    "action": "nudge_group",
                    "reason": f"Inactive for {days_since_last} days — propose a date"
                })
            elif days_since_last > 14:
                recommendations.append({
                    "action": "nudge_admin",
                    "reason": "Approaching inactivity — remind host to schedule"
                })
            if avg_players < 3 and member_count >= 4:
                recommendations.append({
                    "action": "boost_participation",
                    "reason": "Low participation rate — encourage more members to join"
                })
            if growth_score == 0 and member_count < 6:
                recommendations.append({
                    "action": "grow_group",
                    "reason": "No new members recently — suggest inviting friends"
                })

            return ToolResult(
                success=True,
                data={
                    "group_id": group_id,
                    "score": total_score,
                    "level": level,
                    "total_games": total_games,
                    "member_count": member_count,
                    "days_since_last_game": days_since_last,
                    "games_per_month": games_per_month,
                    "avg_players_per_game": round(avg_players, 1),
                    "components": {
                        "recency": {"score": recency_score, "max": 30, "weight": 0.30},
                        "frequency": {"score": frequency_score, "max": 30, "weight": 0.30},
                        "participation": {"score": participation_score, "max": 20, "weight": 0.20},
                        "growth": {"score": growth_score, "max": 20, "weight": 0.20}
                    },
                    "reasons": reasons,
                    "recommendations": recommendations,
                    "factors": {
                        "recency": recency_score,
                        "frequency": frequency_score,
                        "participation": participation_score,
                        "growth": growth_score
                    }
                }
            )

        except Exception as e:
            logger.error(f"Error scoring group engagement: {e}")
            return ToolResult(success=False, error=str(e))

    async def _find_inactive_users(
        self,
        group_id: str = None,
        inactive_days: int = 30
    ) -> ToolResult:
        """
        Find users who haven't played in the specified number of days.
        Optionally scoped to a specific group.
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            now = datetime.now(timezone.utc)
            cutoff = now - timedelta(days=inactive_days)

            # Get all members of the group (or all users)
            if group_id:
                members = await self.db.group_members.find(
                    {"group_id": group_id},
                    {"_id": 0, "user_id": 1}
                ).to_list(200)
                user_ids = [m["user_id"] for m in members]
            else:
                users = await self.db.users.find(
                    {},
                    {"_id": 0, "user_id": 1}
                ).to_list(500)
                user_ids = [u["user_id"] for u in users]

            inactive_users = []

            for uid in user_ids:
                # Find most recent game for this user
                query = {
                    "players.user_id": uid,
                    "status": {"$in": ["ended", "settled"]}
                }
                if group_id:
                    query["group_id"] = group_id

                last_game = await self.db.game_nights.find_one(
                    query,
                    {"_id": 0, "game_id": 1, "created_at": 1, "title": 1},
                    sort=[("created_at", -1)]
                )

                if last_game:
                    last_played = self._parse_date(last_game.get("created_at"))
                    if last_played and last_played < cutoff:
                        days_inactive = (now - last_played).days
                        inactive_users.append({
                            "user_id": uid,
                            "days_inactive": days_inactive,
                            "last_game_id": last_game.get("game_id"),
                            "last_game_title": last_game.get("title", "Poker Night")
                        })
                else:
                    # Never played — also considered inactive
                    inactive_users.append({
                        "user_id": uid,
                        "days_inactive": None,
                        "last_game_id": None,
                        "last_game_title": None
                    })

            # Sort by days inactive (most inactive first, None at end)
            inactive_users.sort(
                key=lambda x: x["days_inactive"] if x["days_inactive"] is not None else 9999,
                reverse=True
            )

            return ToolResult(
                success=True,
                data={
                    "inactive_users": inactive_users,
                    "count": len(inactive_users),
                    "threshold_days": inactive_days,
                    "group_id": group_id
                }
            )

        except Exception as e:
            logger.error(f"Error finding inactive users: {e}")
            return ToolResult(success=False, error=str(e))

    async def _find_inactive_groups(self, inactive_days: int = 14) -> ToolResult:
        """
        Find groups that haven't had a game in the specified number of days.
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            now = datetime.now(timezone.utc)
            cutoff = now - timedelta(days=inactive_days)

            groups = await self.db.groups.find(
                {},
                {"_id": 0, "group_id": 1, "name": 1}
            ).to_list(200)

            inactive_groups = []

            for group in groups:
                gid = group["group_id"]

                # Check for upcoming/active games
                active_game = await self.db.game_nights.find_one({
                    "group_id": gid,
                    "status": {"$in": ["pending", "active", "scheduled"]}
                })
                if active_game:
                    continue  # Skip groups with active games

                # Find most recent completed game
                last_game = await self.db.game_nights.find_one(
                    {"group_id": gid, "status": {"$in": ["ended", "settled"]}},
                    {"_id": 0, "game_id": 1, "created_at": 1, "title": 1},
                    sort=[("created_at", -1)]
                )

                if last_game:
                    last_played = self._parse_date(last_game.get("created_at"))
                    if last_played and last_played < cutoff:
                        days_inactive = (now - last_played).days
                        member_count = await self.db.group_members.count_documents(
                            {"group_id": gid}
                        )
                        inactive_groups.append({
                            "group_id": gid,
                            "group_name": group.get("name", "Unknown"),
                            "days_inactive": days_inactive,
                            "member_count": member_count,
                            "last_game_title": last_game.get("title")
                        })
                else:
                    # Group with no games at all
                    member_count = await self.db.group_members.count_documents(
                        {"group_id": gid}
                    )
                    if member_count >= 2:  # Only flag groups with enough members
                        inactive_groups.append({
                            "group_id": gid,
                            "group_name": group.get("name", "Unknown"),
                            "days_inactive": None,
                            "member_count": member_count,
                            "last_game_title": None
                        })

            # Sort by days inactive
            inactive_groups.sort(
                key=lambda x: x["days_inactive"] if x["days_inactive"] is not None else 9999,
                reverse=True
            )

            return ToolResult(
                success=True,
                data={
                    "inactive_groups": inactive_groups,
                    "count": len(inactive_groups),
                    "threshold_days": inactive_days
                }
            )

        except Exception as e:
            logger.error(f"Error finding inactive groups: {e}")
            return ToolResult(success=False, error=str(e))

    async def _check_milestones(
        self,
        user_id: str = None,
        group_id: str = None,
        game_id: str = None
    ) -> ToolResult:
        """
        Check for user/group milestones after a game ends.

        Milestones:
        - User: 5th, 10th, 25th, 50th, 100th game
        - Group: 10th, 25th, 50th, 100th game
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            milestones = []
            user_milestones = [5, 10, 25, 50, 100, 200, 500]
            group_milestones = [10, 25, 50, 100, 200, 500]

            # Check user milestone
            if user_id:
                query = {
                    "players.user_id": user_id,
                    "status": {"$in": ["ended", "settled"]}
                }
                if group_id:
                    query["group_id"] = group_id

                user_game_count = await self.db.game_nights.count_documents(query)

                if user_game_count in user_milestones:
                    # Get user name
                    user = await self.db.users.find_one(
                        {"user_id": user_id},
                        {"_id": 0, "name": 1, "email": 1}
                    )
                    user_name = user.get("name") if user else "Player"

                    milestones.append({
                        "type": "user_milestone",
                        "milestone": user_game_count,
                        "user_id": user_id,
                        "user_name": user_name,
                        "message": f"{user_name} just played their {self._ordinal(user_game_count)} game!"
                    })

            # Check group milestone
            if group_id:
                group_game_count = await self.db.game_nights.count_documents({
                    "group_id": group_id,
                    "status": {"$in": ["ended", "settled"]}
                })

                if group_game_count in group_milestones:
                    group = await self.db.groups.find_one(
                        {"group_id": group_id},
                        {"_id": 0, "name": 1}
                    )
                    group_name = group.get("name") if group else "Your group"

                    milestones.append({
                        "type": "group_milestone",
                        "milestone": group_game_count,
                        "group_id": group_id,
                        "group_name": group_name,
                        "message": f"{group_name} just completed their {self._ordinal(group_game_count)} game!"
                    })

            return ToolResult(
                success=True,
                data={
                    "milestones": milestones,
                    "has_milestones": len(milestones) > 0
                }
            )

        except Exception as e:
            logger.error(f"Error checking milestones: {e}")
            return ToolResult(success=False, error=str(e))

    async def _find_big_winners(self, game_id: str) -> ToolResult:
        """
        Find the big winner(s) from a game for celebration nudges.
        """
        if not self.db or not game_id:
            return ToolResult(success=False, error="Database or game_id not available")

        try:
            game = await self.db.game_nights.find_one(
                {"game_id": game_id},
                {"_id": 0, "game_id": 1, "title": 1, "players": 1, "group_id": 1}
            )

            if not game:
                return ToolResult(success=False, error="Game not found")

            players = game.get("players", [])
            if not players:
                return ToolResult(
                    success=True,
                    data={"big_winners": [], "game_id": game_id}
                )

            # Calculate net results
            results = []
            for player in players:
                total_buy_in = player.get("total_buy_in", 0)
                cash_out = player.get("cash_out", 0)
                net = cash_out - total_buy_in

                user = await self.db.users.find_one(
                    {"user_id": player.get("user_id")},
                    {"_id": 0, "name": 1, "email": 1}
                )
                user_name = user.get("name") if user else "Player"

                results.append({
                    "user_id": player.get("user_id"),
                    "user_name": user_name,
                    "net_result": net,
                    "total_buy_in": total_buy_in,
                    "cash_out": cash_out
                })

            # Sort by net result (highest first)
            results.sort(key=lambda x: x["net_result"], reverse=True)

            # Big winner = won more than 2x their buy-in OR won $50+
            big_winners = [
                r for r in results
                if r["net_result"] > 0 and (
                    (r["total_buy_in"] > 0 and r["cash_out"] >= r["total_buy_in"] * 2) or
                    r["net_result"] >= 50
                )
            ]

            return ToolResult(
                success=True,
                data={
                    "big_winners": big_winners,
                    "all_results": results,
                    "game_id": game_id,
                    "game_title": game.get("title", "Poker Night"),
                    "group_id": game.get("group_id")
                }
            )

        except Exception as e:
            logger.error(f"Error finding big winners: {e}")
            return ToolResult(success=False, error=str(e))

    async def _get_engagement_report(self, group_id: str = None) -> ToolResult:
        """
        Generate a comprehensive engagement report for a group or globally.
        Includes nudge effectiveness outcomes from engagement_events.
        """
        if not self.db:
            return ToolResult(success=False, error="Database not available")

        try:
            now = datetime.now(timezone.utc)
            seven_days_ago = now - timedelta(days=7)
            thirty_days_ago = now - timedelta(days=30)
            report = {}

            if group_id:
                # Group-specific report
                group_score = await self._score_group(group_id)
                inactive_users = await self._find_inactive_users(group_id, inactive_days=30)

                # Outcome tracking: nudges sent vs games started within 7 days
                nudges_sent_30d = await self.db.engagement_events.count_documents({
                    "group_id": group_id,
                    "event_type": "nudge_sent",
                    "created_at": {"$gte": thirty_days_ago.isoformat()}
                })
                games_after_nudge = await self.db.engagement_events.count_documents({
                    "group_id": group_id,
                    "event_type": "game_started_after_nudge",
                    "created_at": {"$gte": thirty_days_ago.isoformat()}
                })
                mutes_30d = await self.db.engagement_events.count_documents({
                    "group_id": group_id,
                    "event_type": "nudge_muted",
                    "created_at": {"$gte": thirty_days_ago.isoformat()}
                })

                report = {
                    "group_id": group_id,
                    "group_score": group_score.data if group_score.success else None,
                    "inactive_users": inactive_users.data if inactive_users.success else None,
                    "outcomes": {
                        "period_days": 30,
                        "nudges_sent": nudges_sent_30d,
                        "games_after_nudge": games_after_nudge,
                        "conversion_rate": round(games_after_nudge / nudges_sent_30d, 2) if nudges_sent_30d > 0 else None,
                        "mutes": mutes_30d,
                        "mute_rate": round(mutes_30d / nudges_sent_30d, 2) if nudges_sent_30d > 0 else None,
                    }
                }
            else:
                # Global report
                inactive_groups = await self._find_inactive_groups(inactive_days=14)

                # Global outcomes
                total_nudges = await self.db.engagement_events.count_documents({
                    "event_type": "nudge_sent",
                    "created_at": {"$gte": thirty_days_ago.isoformat()}
                })
                total_conversions = await self.db.engagement_events.count_documents({
                    "event_type": "game_started_after_nudge",
                    "created_at": {"$gte": thirty_days_ago.isoformat()}
                })
                total_mutes = await self.db.engagement_events.count_documents({
                    "event_type": "nudge_muted",
                    "created_at": {"$gte": thirty_days_ago.isoformat()}
                })

                report = {
                    "inactive_groups": inactive_groups.data if inactive_groups.success else None,
                    "outcomes": {
                        "period_days": 30,
                        "nudges_sent": total_nudges,
                        "games_after_nudge": total_conversions,
                        "conversion_rate": round(total_conversions / total_nudges, 2) if total_nudges > 0 else None,
                        "mutes": total_mutes,
                        "mute_rate": round(total_mutes / total_nudges, 2) if total_nudges > 0 else None,
                    }
                }

            return ToolResult(
                success=True,
                data=report
            )

        except Exception as e:
            logger.error(f"Error generating engagement report: {e}")
            return ToolResult(success=False, error=str(e))

    # ==================== Helpers ====================

    def _parse_date(self, value) -> Optional[datetime]:
        """Parse a date value that could be a datetime, string, or None."""
        if value is None:
            return None
        if isinstance(value, datetime):
            if value.tzinfo is None:
                return value.replace(tzinfo=timezone.utc)
            return value
        if isinstance(value, str):
            try:
                dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt
            except (ValueError, TypeError):
                return None
        return None

    def _ordinal(self, n: int) -> str:
        """Convert number to ordinal string (1st, 2nd, 3rd, etc.)."""
        if 11 <= (n % 100) <= 13:
            suffix = "th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(n % 10, "th")
        return f"{n}{suffix}"
