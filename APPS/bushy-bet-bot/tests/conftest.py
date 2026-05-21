from __future__ import annotations

import sys
from pathlib import Path

import pytest


PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from db.database import Database
from db.repositories import Repositories
from services.picks_service import PicksService
from services.stats_service import StatsService


@pytest.fixture()
def repositories(tmp_path: Path) -> Repositories:
    db_path = tmp_path / "test_bushy_bet.db"
    database = Database(str(db_path))
    database.init_schema()
    return Repositories(database)


@pytest.fixture()
def picks_service(repositories: Repositories) -> PicksService:
    return PicksService(repositories)


@pytest.fixture()
def stats_service(repositories: Repositories) -> StatsService:
    return StatsService(repositories)
