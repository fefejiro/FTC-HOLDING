from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    bot_token: str
    bot_mode: str
    admin_user_ids_raw: str
    channel_id: str | None
    webhook_base_url: str | None
    webhook_secret: str
    database_url: str
    api_football_key: str
    odds_api_key: str | None
    affiliate_default_url: str | None
    log_level: str

    @property
    def webhook_url(self) -> str | None:
        if not self.webhook_base_url:
            return None
        return f"{self.webhook_base_url.rstrip('/')}/webhook/{self.webhook_secret}"


def load_settings() -> Settings:
    bot_token = os.getenv("BOT_TOKEN", "").strip()
    if not bot_token:
        raise ValueError("BOT_TOKEN is required")

    bot_mode = os.getenv("BOT_MODE", "polling").strip().lower()
    if bot_mode not in {"polling", "webhook"}:
        raise ValueError("BOT_MODE must be either 'polling' or 'webhook'")

    webhook_secret = os.getenv("WEBHOOK_SECRET", "").strip()
    if bot_mode == "webhook" and not webhook_secret:
        raise ValueError("WEBHOOK_SECRET is required when BOT_MODE=webhook")

    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        database_path = os.getenv("DATABASE_PATH", "./bushy_bet.db").strip()
        database_url = database_path

    return Settings(
        bot_token=bot_token,
        bot_mode=bot_mode,
        admin_user_ids_raw=os.getenv("ADMIN_USER_IDS", ""),
        channel_id=os.getenv("CHANNEL_ID", "").strip() or None,
        webhook_base_url=os.getenv("WEBHOOK_BASE_URL", "").strip() or None,
        webhook_secret=webhook_secret,
        database_url=database_url,
        api_football_key=os.getenv("API_FOOTBALL_KEY", "").strip(),
        odds_api_key=os.getenv("ODDS_API_KEY", "").strip() or None,
        affiliate_default_url=os.getenv("AFFILIATE_DEFAULT_URL", "").strip() or None,
        log_level=os.getenv("LOG_LEVEL", "INFO").strip() or "INFO",
    )
