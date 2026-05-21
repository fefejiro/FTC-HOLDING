from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from db.repositories import Repositories


class FootballDataService:
    def __init__(
        self,
        repositories: Repositories,
        api_football_key: str,
        odds_api_key: str | None = None,
        football_api_provider: str = "auto",
    ) -> None:
        self.repositories = repositories
        self.api_football_key = api_football_key
        self.odds_api_key = odds_api_key
        self.football_api_provider = football_api_provider.lower()
        if self.football_api_provider == "auto":
            self.football_api_provider = self._guess_provider(api_football_key)

    def _guess_provider(self, key: str) -> str:
        if re.fullmatch(r"[0-9a-fA-F]{32}", key):
            return "football-data"
        return "api-football"

    def _football_data_headers(self) -> dict[str, str]:
        return {"X-Auth-Token": self.api_football_key}

    def _map_status(self, status: str) -> str:
        status = status.upper().strip()
        mapping = {
            "SCHEDULED": "NS",
            "FINISHED": "FT",
            "IN_PLAY": "LIVE",
            "PAUSED": "HT",
            "POSTPONED": "PST",
            "CANCELLED": "CANC",
            "SUSPENDED": "SUSP",
        }
        return mapping.get(status, status)

    async def sync_upcoming_fixtures(self, days_ahead: int = 3, league_id: int | None = None) -> int:
        run_id = self.repositories.create_sync_run("fixtures", "running", "Sync started")
        if not self.api_football_key:
            self.repositories.create_sync_run("fixtures", "failed", "API_FOOTBALL_KEY missing")
            raise ValueError("API_FOOTBALL_KEY is required for fixture sync")

        now = datetime.now(timezone.utc).date()
        target_end = now + timedelta(days=days_ahead)
        if self.football_api_provider == "football-data":
            params: dict[str, Any] = {
                "dateFrom": now.isoformat(),
                "dateTo": target_end.isoformat(),
            }
        else:
            params = {
                "from": now.isoformat(),
                "to": target_end.isoformat(),
                "timezone": "UTC",
            }
        if league_id:
            if self.football_api_provider == "football-data":
                params["competitions"] = league_id
            else:
                params["league"] = league_id

        try:
            async with httpx.AsyncClient(timeout=25) as client:
                if self.football_api_provider == "football-data":
                    endpoint = "https://api.football-data.org/v4/matches"
                    headers = self._football_data_headers()
                    payload = (await client.get(endpoint, params=params, headers=headers)).json()
                    items = payload.get("matches", [])
                else:
                    endpoint = "https://v3.football.api-sports.io/fixtures"
                    headers = {
                        "x-rapidapi-key": self.api_football_key,
                        "x-rapidapi-host": "v3.football.api-sports.io",
                    }
                    response = await client.get(endpoint, params=params, headers=headers)
                    response.raise_for_status()
                    payload = response.json()
                    items = payload.get("response", [])
        except Exception as exc:
            self.repositories.create_sync_run("fixtures", "failed", f"Run {run_id} failed: {exc}")
            raise

        upserted = 0
        for item in items:
            if self.football_api_provider == "football-data":
                fixture = item
                league_name = fixture.get("competition", {}).get("name") or "Unknown League"
                home_team_name = fixture.get("homeTeam", {}).get("name") or "Home"
                away_team_name = fixture.get("awayTeam", {}).get("name") or "Away"
                kickoff_time = fixture.get("utcDate") or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
                status = self._map_status((fixture.get("status") or "").upper())
                goals = fixture.get("score", {})
                home_goals = goals.get("fullTime", {}).get("home")
                away_goals = goals.get("fullTime", {}).get("away")
                api_fixture_id = fixture.get("id")
            else:
                fixture = item.get("fixture", {})
                league = item.get("league", {})
                teams = item.get("teams", {})
                goals = item.get("goals", {})
                league_name = league.get("name") or "Unknown League"
                home_team_name = (teams.get("home") or {}).get("name") or "Home"
                away_team_name = (teams.get("away") or {}).get("name") or "Away"
                kickoff_time = fixture.get("date") or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
                status = ((fixture.get("status") or {}).get("short") or "NS")
                home_goals = goals.get("home")
                away_goals = goals.get("away")
                api_fixture_id = fixture.get("id")

            fixture_payload = {
                "api_fixture_id": api_fixture_id,
                "league": league_name,
                "home_team": home_team_name,
                "away_team": away_team_name,
                "kickoff_time": kickoff_time,
                "status": status,
                "home_goals": home_goals,
                "away_goals": away_goals,
            }
            self.repositories.upsert_fixture(fixture_payload)
            upserted += 1

        self.repositories.create_sync_run("fixtures", "success", f"Run {run_id} synced={upserted}")
        return upserted

    async def sync_fixture_stats(self, api_fixture_id: int) -> bool:
        if not self.api_football_key:
            return False

        if self.football_api_provider == "football-data":
            return False

        headers = {
            "x-rapidapi-key": self.api_football_key,
            "x-rapidapi-host": "v3.football.api-sports.io",
        }
        async with httpx.AsyncClient(timeout=25) as client:
            response = await client.get(
                "https://v3.football.api-sports.io/fixtures/statistics",
                params={"fixture": api_fixture_id},
                headers=headers,
            )

        if response.status_code != 200:
            return False

        payload = response.json()
        stats_rows = payload.get("response", [])
        fixture = self.repositories.get_fixture_by_api_id(api_fixture_id)
        if not fixture:
            return False

        self.repositories.clear_match_stats(fixture["id"])

        inserted = 0
        for team_stats in stats_rows:
            team_name = (team_stats.get("team") or {}).get("name", "Team")
            for stat in team_stats.get("statistics", []):
                key = f"{team_name}:{stat.get('type', 'Unknown')}"
                value = str(stat.get("value", "N/A"))
                self.repositories.insert_match_stat(fixture["id"], key, value, "api-football")
                inserted += 1

        return inserted > 0

    async def sync_recent_final_scores(self, days_back: int = 2, days_forward: int = 1) -> int:
        run_id = self.repositories.create_sync_run("results", "running", "Result sync started")
        if not self.api_football_key:
            self.repositories.create_sync_run("results", "failed", "API_FOOTBALL_KEY missing")
            raise ValueError("API_FOOTBALL_KEY is required for result sync")

        now = datetime.now(timezone.utc).date()
        start = now - timedelta(days=days_back)
        end = now + timedelta(days=days_forward)

        if self.football_api_provider == "football-data":
            params = {
                "dateFrom": start.isoformat(),
                "dateTo": end.isoformat(),
            }
        else:
            params = {
                "from": start.isoformat(),
                "to": end.isoformat(),
                "timezone": "UTC",
            }

        try:
            async with httpx.AsyncClient(timeout=25) as client:
                if self.football_api_provider == "football-data":
                    endpoint = "https://api.football-data.org/v4/matches"
                    headers = self._football_data_headers()
                    payload = (await client.get(endpoint, params=params, headers=headers)).json()
                    matches = payload.get("matches", [])
                else:
                    endpoint = "https://v3.football.api-sports.io/fixtures"
                    headers = {
                        "x-rapidapi-key": self.api_football_key,
                        "x-rapidapi-host": "v3.football.api-sports.io",
                    }
                    response = await client.get(endpoint, params=params, headers=headers)
                    response.raise_for_status()
                    payload = response.json()
                    matches = payload.get("response", [])
        except Exception as exc:
            self.repositories.create_sync_run("results", "failed", f"Run {run_id} failed: {exc}")
            raise

        updated = 0
        for item in matches:
            if self.football_api_provider == "football-data":
                fixture = item
                league_name = fixture.get("competition", {}).get("name") or "Unknown League"
                home_team_name = fixture.get("homeTeam", {}).get("name") or "Home"
                away_team_name = fixture.get("awayTeam", {}).get("name") or "Away"
                kickoff_time = fixture.get("utcDate") or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
                status = self._map_status((fixture.get("status") or "").upper())
                goals = fixture.get("score", {})
                home_goals = goals.get("fullTime", {}).get("home")
                away_goals = goals.get("fullTime", {}).get("away")
                api_fixture_id = fixture.get("id")
            else:
                fixture = item.get("fixture", {})
                league = item.get("league", {})
                teams = item.get("teams", {})
                goals = item.get("goals", {})
                league_name = league.get("name") or "Unknown League"
                home_team_name = (teams.get("home") or {}).get("name") or "Home"
                away_team_name = (teams.get("away") or {}).get("name") or "Away"
                kickoff_time = fixture.get("date") or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
                status = ((fixture.get("status") or {}).get("short") or "NS")
                home_goals = goals.get("home")
                away_goals = goals.get("away")
                api_fixture_id = fixture.get("id")

            fixture_payload = {
                "api_fixture_id": api_fixture_id,
                "league": league_name,
                "home_team": home_team_name,
                "away_team": away_team_name,
                "kickoff_time": kickoff_time,
                "status": status,
                "home_goals": home_goals,
                "away_goals": away_goals,
            }
            self.repositories.upsert_fixture(fixture_payload)
            updated += 1

        self.repositories.create_sync_run("results", "success", f"Run {run_id} updated={updated}")
        return updated

    def suggest_fixture_for_match(self, match_name: str) -> dict[str, Any] | None:
        candidates = self.repositories.search_upcoming_fixtures_by_match(match_name, limit=1)
        return candidates[0] if candidates else None

    async def enrich_fixture_odds(self, fixture_name: str) -> str | None:
        if not self.odds_api_key:
            return None

        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.get(
                "https://api.the-odds-api.com/v4/sports/soccer_epl/odds",
                params={
                    "apiKey": self.odds_api_key,
                    "regions": "uk",
                    "markets": "h2h",
                    "oddsFormat": "decimal",
                },
            )

        if response.status_code != 200:
            return None

        events = response.json()
        for event in events:
            home = event.get("home_team", "")
            away = event.get("away_team", "")
            event_name = f"{home} vs {away}".lower()
            if fixture_name.lower() in event_name or event_name in fixture_name.lower():
                bookmakers = event.get("bookmakers", [])
                if bookmakers:
                    title = bookmakers[0].get("title", "Bookmaker")
                    return f"Odds source: {title}"
        return None

    def get_upcoming_fixtures(self, limit: int = 8) -> list[dict[str, Any]]:
        return self.repositories.list_upcoming_fixtures(limit=limit)

    def get_match_stats(self, fixture_id: int) -> list[dict[str, Any]]:
        return self.repositories.list_match_stats(fixture_id)

    def settle_picks_from_final_scores(self) -> int:
        run_id = self.repositories.create_sync_run("settlement", "running", "Settlement started")
        settled = 0
        pending_picks = self.repositories.list_pending_picks_with_fixture()
        for pick in pending_picks:
            fixture = self.repositories.get_fixture(pick["fixture_id"])
            if not fixture:
                continue

            if fixture["status"] not in {"FT", "AET", "PEN"}:
                continue

            result = self._derive_result_from_selection(
                selection=pick["selection"],
                market=pick["market"],
                home_goals=fixture.get("home_goals"),
                away_goals=fixture.get("away_goals"),
            )
            if result:
                updated = self.repositories.set_pick_result(pick["id"], result)
                settled += int(updated)
        self.repositories.create_sync_run("settlement", "success", f"Run {run_id} settled={settled}")
        return settled

    @staticmethod
    def _derive_result_from_selection(selection: str, market: str, home_goals: int | None, away_goals: int | None) -> str | None:
        if home_goals is None or away_goals is None:
            return None

        total_goals = home_goals + away_goals
        normalized_selection = selection.lower().strip()
        normalized_market = market.lower().strip()

        if "over 2.5" in normalized_selection or "over 2.5" in normalized_market:
            return "win" if total_goals > 2 else "loss"
        if normalized_selection == "yes" and "both teams" in normalized_market:
            return "win" if home_goals > 0 and away_goals > 0 else "loss"
        return None
