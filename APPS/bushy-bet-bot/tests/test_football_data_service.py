from __future__ import annotations

import asyncio

from services.football_data_service import FootballDataService


def test_football_api_unavailable_state(repositories):
    service = FootballDataService(repositories=repositories, api_football_key="")
    assert service.get_upcoming_fixtures(limit=5) == []
    assert service.get_match_stats(1) == []
    assert asyncio.run(service.sync_fixture_stats(12345)) is False


def test_football_data_provider_detection(repositories):
    football_data_key = "0123456789abcdef0123456789abcdef"
    service = FootballDataService(repositories=repositories, api_football_key=football_data_key)
    assert service.football_api_provider == "football-data"

    api_football_key = "not-a-hex-key"
    service2 = FootballDataService(repositories=repositories, api_football_key=api_football_key)
    assert service2.football_api_provider == "api-football"
