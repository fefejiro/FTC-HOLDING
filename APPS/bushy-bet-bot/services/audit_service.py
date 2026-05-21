from __future__ import annotations

from typing import Any

from db.repositories import Repositories


class AuditService:
    def __init__(self, repositories: Repositories) -> None:
        self.repositories = repositories

    def log(self, actor_user_id: int, action: str, entity_type: str, entity_id: str | None, details: dict[str, Any] | str | None) -> None:
        self.repositories.log_audit(actor_user_id, action, entity_type, entity_id, details)
