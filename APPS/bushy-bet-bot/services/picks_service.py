from __future__ import annotations

from typing import Any

from db.repositories import Repositories


REQUIRED_PICK_FIELDS = {
    "league": "league",
    "match": "match_name",
    "kickoff": "kickoff_time",
    "market": "market",
    "selection": "selection",
    "odds": "odds",
    "confidence": "confidence",
    "risk": "risk_level",
    "reason": "reasoning",
}


class PicksService:
    def __init__(self, repositories: Repositories) -> None:
        self.repositories = repositories

    def create_pick_from_args(self, args: dict[str, str]) -> int:
        missing = [key for key in REQUIRED_PICK_FIELDS if key not in args]
        if missing:
            raise ValueError(f"Missing required fields: {', '.join(missing)}")

        payload: dict[str, Any] = {}
        for arg_name, db_name in REQUIRED_PICK_FIELDS.items():
            payload[db_name] = args[arg_name]

        if "affiliate_id" in args and args["affiliate_id"].strip():
            payload["affiliate_link_id"] = int(args["affiliate_id"])
        if "fixture_id" in args and args["fixture_id"].strip():
            payload["fixture_id"] = int(args["fixture_id"])

        return self.repositories.create_pick(payload)

    def update_pick(self, pick_id: int, updates: dict[str, Any]) -> bool:
        return self.repositories.update_pick(pick_id, updates)

    def delete_pick(self, pick_id: int) -> bool:
        return self.repositories.soft_delete_pick(pick_id)

    def set_result(self, pick_id: int, result: str) -> bool:
        normalized = result.lower().strip()
        if normalized not in {"win", "loss", "void", "pending"}:
            raise ValueError("Result must be one of: win, loss, void, pending")
        return self.repositories.set_pick_result(pick_id, normalized)

    def get_pick(self, pick_id: int) -> dict[str, Any] | None:
        return self.repositories.get_pick(pick_id)

    def get_today_picks(self) -> list[dict[str, Any]]:
        return self.repositories.list_today_active_picks()

    def get_recent_results(self) -> list[dict[str, Any]]:
        return self.repositories.list_recent_results()
