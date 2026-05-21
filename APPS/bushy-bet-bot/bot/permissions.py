from __future__ import annotations

import logging
from typing import Iterable


LOGGER = logging.getLogger(__name__)


def parse_admin_user_ids(raw_admin_ids: str) -> set[int]:
    result: set[int] = set()
    for part in raw_admin_ids.split(","):
        value = part.strip()
        if not value:
            continue
        try:
            result.add(int(value))
        except ValueError:
            LOGGER.warning("Skipping invalid ADMIN_USER_IDS entry: %s", value)
    return result


def is_admin_user(user_id: int | None, admin_user_ids: Iterable[int]) -> bool:
    if user_id is None:
        return False
    return int(user_id) in set(admin_user_ids)
