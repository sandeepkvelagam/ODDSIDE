"""
Context Provider Service

Provides external context for the AI agents:
- Holiday calendar (Python holidays package)
- Weather forecasts (Open-Meteo API — free, no key)
- Long weekend detection
- Group gaming patterns
"""

import logging
from typing import Dict, List, Optional
from datetime import datetime, timezone, date, timedelta
import httpx

logger = logging.getLogger(__name__)

# Try to import holidays package
try:
    import holidays
    HOLIDAYS_AVAILABLE = True
except ImportError:
    HOLIDAYS_AVAILABLE = False
    logger.warning("holidays package not installed. Holiday detection will be disabled.")


class ContextProvider:
    """
    Provides external context (holidays, weather, long weekends) that
    the AI agents can use to make smarter game suggestions.

    Weather source: Open-Meteo API (free, no API key, 10k req/day)
    Holiday source: Python `holidays` package (offline, 249 countries)
    """

    # Open-Meteo API endpoint
    OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

    # Default location (can be overridden per group)
    DEFAULT_LAT = 40.7128  # New York City
    DEFAULT_LON = -74.0060

    # WMO weather codes that indicate bad weather (good for home games!)
    BAD_WEATHER_CODES = {
        51, 53, 55,  # Drizzle
        61, 63, 65,  # Rain
        66, 67,      # Freezing rain
        71, 73, 75,  # Snowfall
        77,           # Snow grains
        80, 81, 82,  # Rain showers
        85, 86,      # Snow showers
        95, 96, 99,  # Thunderstorm
    }

    def __init__(self, db=None, country: str = "US"):
        self.db = db
        self.country = country
        self._weather_cache: Dict[str, Dict] = {}  # key: "lat,lon" → forecast
        self._cache_times: Dict[str, datetime] = {}  # key: "lat,lon" → cache time
        self._cache_ttl = timedelta(hours=6)

    async def get_context(self, group_id: str = None, lat: float = None, lon: float = None) -> Dict:
        """
        Get all available external context.

        Returns:
            Dict with holidays, weather, long_weekends, and suggestions.
        """
        lat = lat or self.DEFAULT_LAT
        lon = lon or self.DEFAULT_LON

        context = {
            "upcoming_holidays": self.get_upcoming_holidays(days_ahead=30),
            "long_weekends": self.get_upcoming_long_weekends(days_ahead=45),
            "weather_forecast": await self.get_weather_forecast(lat, lon),
            "today": date.today().isoformat(),
        }

        # Generate game opportunity suggestions
        context["game_opportunities"] = self._find_game_opportunities(context)

        return context

    # ==================== Holiday Detection ====================

    def get_upcoming_holidays(self, days_ahead: int = 30) -> List[Dict]:
        """Get upcoming holidays within the specified days."""
        if not HOLIDAYS_AVAILABLE:
            return []

        today = date.today()
        end_date = today + timedelta(days=days_ahead)

        country_holidays = holidays.country_holidays(self.country, years=[today.year, today.year + 1])

        upcoming = []
        for holiday_date, holiday_name in sorted(country_holidays.items()):
            if today <= holiday_date <= end_date:
                days_until = (holiday_date - today).days
                upcoming.append({
                    "name": holiday_name,
                    "date": holiday_date.isoformat(),
                    "day_of_week": holiday_date.strftime("%A"),
                    "days_until": days_until,
                })

        return upcoming

    def get_upcoming_long_weekends(self, days_ahead: int = 45) -> List[Dict]:
        """
        Detect upcoming long weekends (holiday adjacent to Sat/Sun).
        """
        if not HOLIDAYS_AVAILABLE:
            return []

        today = date.today()
        end_date = today + timedelta(days=days_ahead)

        country_holidays = holidays.country_holidays(self.country, years=[today.year, today.year + 1])
        long_weekends = []

        for holiday_date, holiday_name in sorted(country_holidays.items()):
            if today <= holiday_date <= end_date:
                weekday = holiday_date.weekday()  # 0=Mon, 6=Sun

                # Monday holiday → Sat-Mon long weekend
                if weekday == 0:
                    long_weekends.append({
                        "holiday": holiday_name,
                        "start": (holiday_date - timedelta(days=2)).isoformat(),
                        "end": holiday_date.isoformat(),
                        "days": 3,
                        "description": f"3-day weekend ({holiday_name} Monday)"
                    })
                # Friday holiday → Fri-Sun long weekend
                elif weekday == 4:
                    long_weekends.append({
                        "holiday": holiday_name,
                        "start": holiday_date.isoformat(),
                        "end": (holiday_date + timedelta(days=2)).isoformat(),
                        "days": 3,
                        "description": f"3-day weekend ({holiday_name} Friday)"
                    })
                # Thursday holiday → potential 4-day weekend
                elif weekday == 3:
                    long_weekends.append({
                        "holiday": holiday_name,
                        "start": holiday_date.isoformat(),
                        "end": (holiday_date + timedelta(days=3)).isoformat(),
                        "days": 4,
                        "description": f"Potential 4-day weekend ({holiday_name} Thursday)"
                    })

        return long_weekends

    # ==================== Weather Forecast ====================

    async def get_weather_forecast(self, lat: float, lon: float, days: int = 7) -> Dict:
        """
        Get weather forecast from Open-Meteo API.
        Free, no API key required, 10k requests/day.
        """
        cache_key = f"{lat},{lon}"

        # Check cache (per-key timestamps)
        cache_time = self._cache_times.get(cache_key)
        if (cache_time and
            cache_key in self._weather_cache and
            datetime.now(timezone.utc) - cache_time < self._cache_ttl):
            return self._weather_cache[cache_key]

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(self.OPEN_METEO_URL, params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max",
                    "timezone": "auto",
                    "forecast_days": days
                })
                response.raise_for_status()
                data = response.json()

            daily = data.get("daily", {})
            dates = daily.get("time", [])
            codes = daily.get("weather_code", [])
            temp_max = daily.get("temperature_2m_max", [])
            temp_min = daily.get("temperature_2m_min", [])
            precip = daily.get("precipitation_sum", [])
            wind = daily.get("windspeed_10m_max", [])

            forecast_days = []
            bad_weather_days = []

            for i, d in enumerate(dates):
                code = codes[i] if i < len(codes) else 0
                is_bad = code in self.BAD_WEATHER_CODES
                day_data = {
                    "date": d,
                    "weather_code": code,
                    "temp_high": temp_max[i] if i < len(temp_max) else None,
                    "temp_low": temp_min[i] if i < len(temp_min) else None,
                    "precipitation_mm": precip[i] if i < len(precip) else 0,
                    "wind_max_kmh": wind[i] if i < len(wind) else 0,
                    "is_bad_weather": is_bad,
                }
                forecast_days.append(day_data)
                if is_bad:
                    bad_weather_days.append(d)

            result = {
                "forecast": forecast_days,
                "bad_weather_days": bad_weather_days,
                "summary": self._weather_summary(forecast_days),
            }

            # Cache it
            self._weather_cache[cache_key] = result
            self._cache_times[cache_key] = datetime.now(timezone.utc)

            return result

        except Exception as e:
            logger.error(f"Weather API error: {e}")
            return {"forecast": [], "bad_weather_days": [], "summary": "Weather data unavailable"}

    def _weather_summary(self, forecast_days: List[Dict]) -> str:
        """Generate a human-readable weather summary."""
        bad_days = [d for d in forecast_days if d.get("is_bad_weather")]
        if not bad_days:
            return "Clear weather ahead this week"

        if len(bad_days) == 1:
            return f"Bad weather expected on {bad_days[0]['date']} — perfect excuse for a home game!"
        return f"Rough weather on {len(bad_days)} days this week — great time for indoor poker!"

    # ==================== Game Opportunity Detection ====================

    def _find_game_opportunities(self, context: Dict) -> List[Dict]:
        """
        Identify game opportunities based on external context.

        Key insight: bad weather + free time = great poker conditions.
        """
        opportunities = []

        # Long weekend opportunities
        for lw in context.get("long_weekends", []):
            opportunities.append({
                "type": "long_weekend",
                "date": lw["start"],
                "reason": lw["description"],
                "message": f"Long weekend coming up ({lw['holiday']})! Perfect time for a game.",
                "priority": "high"
            })

        # Bad weather + weekend = great home game
        bad_days = context.get("weather_forecast", {}).get("bad_weather_days", [])
        for bad_day in bad_days:
            try:
                d = date.fromisoformat(bad_day)
                if d.weekday() in (4, 5, 6):  # Fri, Sat, Sun
                    opportunities.append({
                        "type": "weather",
                        "date": bad_day,
                        "reason": "Bad weather on weekend",
                        "message": f"Looks like bad weather on {d.strftime('%A')} — nobody's going out anyway, why not play?",
                        "priority": "medium"
                    })
            except (ValueError, TypeError):
                continue

        # Holiday eve opportunities
        for holiday in context.get("upcoming_holidays", []):
            if holiday.get("days_until", 999) == 1:
                opportunities.append({
                    "type": "holiday_eve",
                    "date": date.today().isoformat(),
                    "reason": f"Night before {holiday['name']}",
                    "message": f"Tomorrow's {holiday['name']} — no work! Late night game tonight?",
                    "priority": "high"
                })

        return opportunities
