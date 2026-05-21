from __future__ import annotations


def test_calculating_stats(picks_service, stats_service):
    picks_service.create_pick_from_args(
        {
            "league": "La Liga",
            "match": "Real Madrid vs Sevilla",
            "kickoff": "2026-05-24 20:00",
            "market": "Home Win",
            "selection": "Real Madrid",
            "odds": "1.62",
            "confidence": "High",
            "risk": "Low",
            "reason": "Home strength and recent form.",
        }
    )
    second_pick = picks_service.create_pick_from_args(
        {
            "league": "Bundesliga",
            "match": "Dortmund vs Leipzig",
            "kickoff": "2026-05-24 17:30",
            "market": "Both Teams To Score",
            "selection": "Yes",
            "odds": "1.70",
            "confidence": "Medium",
            "risk": "Moderate",
            "reason": "Both teams create and concede.",
        }
    )

    picks_service.set_result(second_pick, "loss")

    overall = stats_service.overall()
    assert overall["total"] == 2
    assert overall["wins"] == 0
    assert overall["losses"] == 1
    assert overall["pending"] == 1
    assert overall["win_rate"] == 0.0
