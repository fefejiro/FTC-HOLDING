from __future__ import annotations

from db.repositories import Repositories


class StatsService:
    def __init__(self, repositories: Repositories) -> None:
        self.repositories = repositories

    @staticmethod
    def _with_win_rate(values: dict[str, int]) -> dict[str, float | int]:
        settled = values["wins"] + values["losses"]
        win_rate = (values["wins"] / settled * 100.0) if settled > 0 else 0.0
        return {**values, "win_rate": round(win_rate, 2)}

    def overall(self) -> dict[str, float | int]:
        return self._with_win_rate(self.repositories.count_stats())

    def last_7_days(self) -> dict[str, float | int]:
        return self._with_win_rate(self.repositories.count_stats(days=7))

    def last_30_days(self) -> dict[str, float | int]:
        return self._with_win_rate(self.repositories.count_stats(days=30))
