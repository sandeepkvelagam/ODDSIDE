"""
Smart Scheduler Service

Generates intelligent, scored time suggestions for poker games by combining:
1. Group history (usual day/time, frequency)
2. Holiday calendar (upcoming long weekends, holidays)
3. Weather forecasts (bad weather = stay-home opportunity)
4. Time since last game (overdue = higher urgency)
5. Day-of-week preferences (weekend vs weeknight)
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone, date, timedelta

logger = logging.getLogger(__name__)


class TimeSuggestion:
    """A scored time suggestion with reasoning."""

    def __init__(self, dt: datetime, label: str):
        self.datetime = dt
        self.label = label
        self.score = 0.0
        self.factors: List[str] = []
        self.reason_parts: List[str] = []

    def add_factor(self, name: str, weight: float, reason: str):
        self.score += weight
        self.factors.append(name)
        self.reason_parts.append(reason)

    def to_dict(self) -> Dict:
        return {
            "datetime": self.datetime.isoformat(),
            "day_label": self.datetime.strftime("%A"),
            "date_label": self.datetime.strftime("%b %d"),
            "time_label": self.datetime.strftime("%I:%M %p").lstrip("0"),
            "label": self.label,
            "score": round(self.score, 2),
            "factors": self.factors,
            "reason": " ".join(self.reason_parts),
        }


class SmartSchedulerService:
    """
    Generates ranked time suggestions by scoring candidate slots
    against multiple signals: group patterns, weather, holidays,
    and recency.
    """

    # Score weights
    WEIGHT_REGULAR_DAY = 0.30
    WEIGHT_REGULAR_TIME = 0.15
    WEIGHT_WEEKEND = 0.10
    WEIGHT_OVERDUE = 0.20
    WEIGHT_BAD_WEATHER = 0.15
    WEIGHT_HOLIDAY = 0.25
    WEIGHT_LONG_WEEKEND = 0.25
    WEIGHT_HOLIDAY_EVE = 0.20
    WEIGHT_NO_WORK_NEXT = 0.10

    # Default game time if no pattern
    DEFAULT_HOUR = 19  # 7 PM
    DEFAULT_MINUTE = 0

    def __init__(self, db=None, context_provider=None):
        self.db = db
        self.context_provider = context_provider

    async def suggest_times(
        self,
        group_id: str,
        num_suggestions: int = 3,
        days_ahead: int = 14,
        external_context: Dict = None,
    ) -> List[Dict]:
        """
        Generate ranked time suggestions for the next game.

        Returns a sorted list of suggestions (highest score first),
        each with datetime, label, score, factors, and reason.
        """
        # Gather group patterns
        patterns = await self._get_group_patterns(group_id)

        # Gather external context (holidays, weather)
        if external_context is None and self.context_provider:
            external_context = await self.context_provider.get_context(group_id=group_id)
        external_context = external_context or {}

        # Generate candidate time slots
        candidates = self._generate_candidates(patterns, days_ahead)

        # Score each candidate
        scored = []
        for candidate in candidates:
            suggestion = self._score_candidate(candidate, patterns, external_context)
            scored.append(suggestion)

        # Sort by score (descending) and return top N
        scored.sort(key=lambda s: s.score, reverse=True)
        return [s.to_dict() for s in scored[:num_suggestions]]

    def _generate_candidates(self, patterns: Dict, days_ahead: int) -> List[datetime]:
        """Generate candidate datetime slots for the next N days."""
        candidates = []
        today = date.today()
        game_hour = patterns.get("regular_hour", self.DEFAULT_HOUR)
        game_minute = patterns.get("regular_minute", self.DEFAULT_MINUTE)

        for day_offset in range(1, days_ahead + 1):
            candidate_date = today + timedelta(days=day_offset)
            weekday = candidate_date.weekday()

            # Only consider Thu-Sun (poker-friendly days) + regular day
            regular_day = patterns.get("regular_day")
            if weekday in (3, 4, 5, 6) or weekday == regular_day:
                dt = datetime(
                    candidate_date.year, candidate_date.month, candidate_date.day,
                    game_hour, game_minute,
                    tzinfo=timezone.utc
                )
                candidates.append(dt)

        return candidates

    def _score_candidate(
        self, dt: datetime, patterns: Dict, external_context: Dict
    ) -> TimeSuggestion:
        """Score a candidate time slot against all signals."""
        d = dt.date()
        weekday = d.weekday()
        label = f"{d.strftime('%A %b %d')} at {dt.strftime('%I:%M %p').lstrip('0')}"
        suggestion = TimeSuggestion(dt, label)

        # Factor 1: Regular game day match
        regular_day = patterns.get("regular_day")
        if regular_day is not None and weekday == regular_day:
            day_name = patterns.get("regular_day_name", d.strftime("%A"))
            suggestion.add_factor(
                "regular_day", self.WEIGHT_REGULAR_DAY,
                f"Your group usually plays on {day_name}s."
            )

        # Factor 2: Weekend bonus
        if weekday in (4, 5):  # Fri, Sat
            suggestion.add_factor(
                "weekend", self.WEIGHT_WEEKEND,
                "Weekend evening — prime poker time."
            )

        # Factor 3: No work next day
        if weekday in (4, 5):  # Fri, Sat (Sunday's next day is Monday)
            suggestion.add_factor(
                "no_work_next", self.WEIGHT_NO_WORK_NEXT,
                "No work the next morning."
            )

        # Factor 4: Overdue bonus (applies to all candidates)
        days_since = patterns.get("days_since_last_game")
        if days_since is not None and days_since >= 14:
            suggestion.add_factor(
                "overdue", self.WEIGHT_OVERDUE,
                f"It's been {days_since} days since your last game."
            )

        # Factor 5: Bad weather
        bad_weather_days = external_context.get("weather_forecast", {}).get("bad_weather_days", [])
        d_str = d.isoformat()
        if d_str in bad_weather_days:
            suggestion.add_factor(
                "bad_weather", self.WEIGHT_BAD_WEATHER,
                "Bad weather expected — perfect excuse for a home game."
            )

        # Factor 6: Holiday
        holidays = external_context.get("upcoming_holidays", [])
        for h in holidays:
            if h.get("date") == d_str:
                suggestion.add_factor(
                    "holiday", self.WEIGHT_HOLIDAY,
                    f"{h['name']} — day off for most people."
                )

        # Factor 7: Long weekend
        long_weekends = external_context.get("long_weekends", [])
        for lw in long_weekends:
            start = lw.get("start", "")
            end = lw.get("end", "")
            if start <= d_str <= end:
                suggestion.add_factor(
                    "long_weekend", self.WEIGHT_LONG_WEEKEND,
                    f"Part of a {lw.get('days', 3)}-day weekend ({lw.get('holiday', 'holiday')})."
                )
                break

        # Factor 8: Holiday eve (night before a holiday)
        tomorrow_str = (d + timedelta(days=1)).isoformat()
        for h in holidays:
            if h.get("date") == tomorrow_str:
                suggestion.add_factor(
                    "holiday_eve", self.WEIGHT_HOLIDAY_EVE,
                    f"Night before {h['name']} — late game, no alarm!"
                )

        return suggestion

    async def _get_group_patterns(self, group_id: str) -> Dict:
        """Analyze group's game history for scheduling patterns."""
        defaults = {
            "regular_day": 5,  # Saturday
            "regular_day_name": "Saturday",
            "regular_hour": self.DEFAULT_HOUR,
            "regular_minute": self.DEFAULT_MINUTE,
            "avg_frequency_days": None,
            "days_since_last_game": None,
        }

        if self.db is None:
            return defaults

        # Get recent games (last 20) for pattern analysis
        games = await self.db.game_nights.find(
            {"group_id": group_id},
            {"_id": 0, "created_at": 1, "scheduled_at": 1}
        ).sort("created_at", -1).to_list(20)

        if not games:
            return defaults

        # Find most common day of week
        day_counts = {}
        for g in games:
            game_date = g.get("scheduled_at") or g.get("created_at")
            if isinstance(game_date, str):
                try:
                    game_date = datetime.fromisoformat(game_date.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    continue
            if game_date:
                wd = game_date.weekday()
                day_counts[wd] = day_counts.get(wd, 0) + 1

        if day_counts:
            regular_day = max(day_counts, key=day_counts.get)
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            defaults["regular_day"] = regular_day
            defaults["regular_day_name"] = day_names[regular_day]

        # Calculate days since last game
        last_game_date = games[0].get("created_at")
        if isinstance(last_game_date, str):
            try:
                last_game_date = datetime.fromisoformat(last_game_date.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                last_game_date = None
        if last_game_date:
            defaults["days_since_last_game"] = (datetime.now(timezone.utc) - last_game_date).days

        # Average game frequency
        if len(games) >= 2:
            dates = []
            for g in games:
                gd = g.get("created_at")
                if isinstance(gd, str):
                    try:
                        dates.append(datetime.fromisoformat(gd.replace("Z", "+00:00")))
                    except (ValueError, TypeError):
                        continue
                elif gd:
                    dates.append(gd)
            if len(dates) >= 2:
                dates.sort()
                gaps = [(dates[i+1] - dates[i]).days for i in range(len(dates)-1)]
                defaults["avg_frequency_days"] = round(sum(gaps) / len(gaps))

        return defaults
