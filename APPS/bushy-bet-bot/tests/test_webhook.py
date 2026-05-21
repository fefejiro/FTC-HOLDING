from __future__ import annotations

from fastapi.testclient import TestClient

from bot.webhook_app import create_webhook_app


class StubTelegramApp:
    def __init__(self) -> None:
        self.bot = object()
        self.received_updates = []

    async def initialize(self) -> None:
        return None

    async def start(self) -> None:
        return None

    async def stop(self) -> None:
        return None

    async def shutdown(self) -> None:
        return None

    async def process_update(self, update) -> None:
        self.received_updates.append(update)


class DummyBot:
    async def set_webhook(self, url: str, secret_token: str) -> None:
        return None

    async def delete_webhook(self, drop_pending_updates: bool = False) -> None:
        return None


def test_health_route():
    app = StubTelegramApp()
    app.bot = DummyBot()
    web = create_webhook_app(app, "secret123", None, lambda: {"status": "ok", "database": "up"})
    client = TestClient(web)

    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_webhook_rejects_invalid_secret():
    app = StubTelegramApp()
    app.bot = DummyBot()
    web = create_webhook_app(app, "right", None, lambda: {"status": "ok"})
    client = TestClient(web)

    response = client.post("/webhook/wrong", json={"update_id": 123})
    assert response.status_code == 403
