from __future__ import annotations

from bot.formatters import RESPONSIBLE_GAMBLING_FOOTER, format_pick_card


def test_create_pick(picks_service):
    pick_id = picks_service.create_pick_from_args(
        {
            "league": "Premier League",
            "match": "Arsenal vs Chelsea",
            "kickoff": "2026-05-22 15:00",
            "market": "Over 2.5 Goals",
            "selection": "Over 2.5",
            "odds": "1.85",
            "confidence": "Medium",
            "risk": "Moderate",
            "reason": "Both teams create high chances and concede in transition.",
        }
    )
    assert pick_id > 0

    pick = picks_service.get_pick(pick_id)
    assert pick is not None
    assert pick["match_name"] == "Arsenal vs Chelsea"
    assert pick["result"] == "pending"


def test_update_result(picks_service):
    pick_id = picks_service.create_pick_from_args(
        {
            "league": "Serie A",
            "match": "Inter vs Napoli",
            "kickoff": "2026-05-23 17:00",
            "market": "Both Teams To Score",
            "selection": "Yes",
            "odds": "1.78",
            "confidence": "High",
            "risk": "Moderate",
            "reason": "Both sides have consistent xG creation.",
        }
    )

    updated = picks_service.set_result(pick_id, "win")
    assert updated is True

    pick = picks_service.get_pick(pick_id)
    assert pick is not None
    assert pick["result"] == "win"


def test_pick_card_contains_responsible_footer():
    message = format_pick_card(
        {
            "match_name": "Milan vs Roma",
            "league": "Serie A",
            "market": "Over 2.5 Goals",
            "selection": "Over 2.5",
            "odds": "1.82",
            "confidence": "Medium",
            "risk_level": "Moderate",
            "reasoning": "Open transitions and high shot volume.",
        }
    )
    assert RESPONSIBLE_GAMBLING_FOOTER in message
