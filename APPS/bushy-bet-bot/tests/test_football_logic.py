from __future__ import annotations

from services.football_data_service import FootballDataService


class _StubRepo:
    def create_sync_run(self, sync_type: str, status: str, details: str | None = None) -> int:
        return 1

    def list_pending_picks_with_fixture(self):
        return []


def test_over_2_5_settlement_logic_win():
    result = FootballDataService._derive_result_from_selection(
        selection="Over 2.5",
        market="Over 2.5 Goals",
        home_goals=2,
        away_goals=1,
    )
    assert result == "win"


def test_btts_yes_settlement_logic_loss():
    result = FootballDataService._derive_result_from_selection(
        selection="Yes",
        market="Both Teams To Score",
        home_goals=1,
        away_goals=0,
    )
    assert result == "loss"


def test_fixture_suggestion_empty_when_none_found():
    class Repo(_StubRepo):
        def search_upcoming_fixtures_by_match(self, match_name: str, limit: int = 1):
            return []

    service = FootballDataService(repositories=Repo(), api_football_key="key")
    assert service.suggest_fixture_for_match("Arsenal vs Chelsea") is None
