from __future__ import annotations

import asyncio
import logging

from apscheduler.schedulers.background import BackgroundScheduler

from services.football_data_service import FootballDataService


LOGGER = logging.getLogger(__name__)


class SchedulerService:
    def __init__(self, football_data_service: FootballDataService) -> None:
        self.football_data_service = football_data_service
        self.scheduler = BackgroundScheduler(timezone="UTC")

    def start(self) -> None:
        self.scheduler.add_job(self._sync_fixtures, "interval", hours=6, id="sync_fixtures", replace_existing=True)
        self.scheduler.add_job(self._sync_results_and_settle, "interval", minutes=30, id="sync_results", replace_existing=True)
        self.scheduler.start()

    def shutdown(self) -> None:
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    def _sync_fixtures(self) -> None:
        try:
            asyncio.run(self.football_data_service.sync_upcoming_fixtures())
        except Exception as exc:
            LOGGER.warning("Fixture sync failed: %s", exc)

    def _sync_results_and_settle(self) -> None:
        try:
            asyncio.run(self.football_data_service.sync_recent_final_scores())
            settled = self.football_data_service.settle_picks_from_final_scores()
            LOGGER.info("Settlement run completed, settled=%s", settled)
        except Exception as exc:
            LOGGER.warning("Settlement sync failed: %s", exc)
