from __future__ import annotations

import logging
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from telegram import Update
from telegram.ext import Application


LOGGER = logging.getLogger(__name__)


def create_webhook_app(
    telegram_application: Application,
    webhook_secret: str,
    webhook_url: str | None,
    health_provider: Callable[[], dict[str, Any]],
) -> FastAPI:
    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        await telegram_application.initialize()
        await telegram_application.start()
        if webhook_url:
            await telegram_application.bot.set_webhook(url=webhook_url, secret_token=webhook_secret)
            LOGGER.info("Webhook configured")
        try:
            yield
        finally:
            if webhook_url:
                await telegram_application.bot.delete_webhook(drop_pending_updates=False)
            await telegram_application.stop()
            await telegram_application.shutdown()

    app = FastAPI(title="Bushy Bet Bot", version="1.0.0", lifespan=lifespan)

    @app.get("/health")
    async def health() -> dict[str, Any]:
        return health_provider()

    @app.post("/webhook/{secret}")
    async def webhook(secret: str, request: Request) -> dict[str, bool]:
        if secret != webhook_secret:
            raise HTTPException(status_code=403, detail="Invalid webhook secret")

        payload = await request.json()
        update = Update.de_json(payload, telegram_application.bot)
        await telegram_application.process_update(update)
        return {"ok": True}

    return app
