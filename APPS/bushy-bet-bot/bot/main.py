from __future__ import annotations

import logging
import os

from dotenv import load_dotenv
from telegram.ext import Application, CommandHandler
import uvicorn

from bot.commands_admin import (
    add_affiliate,
    add_pick,
    admin_health,
    broadcast,
    delete_pick,
    edit_pick,
    post_pick,
    report,
    set_result,
    settle,
    sync_fixtures,
    whoami,
)
from bot.commands_user import fixtures, help_command, matchstats, results, risk, start, stats, today, vip
from bot.logging_config import configure_logging
from bot.permissions import parse_admin_user_ids
from bot.settings import Settings, load_settings
from bot.webhook_app import create_webhook_app
from db.database import Database
from db.repositories import Repositories
from services.affiliate_service import AffiliateService
from services.audit_service import AuditService
from services.football_data_service import FootballDataService
from services.picks_service import PicksService
from services.scheduler_service import SchedulerService
from services.stats_service import StatsService


LOGGER = logging.getLogger(__name__)


def create_application(settings: Settings) -> tuple[Application, SchedulerService]:
    admin_user_ids = parse_admin_user_ids(settings.admin_user_ids_raw)

    database = Database(settings.database_url)
    database.init_schema()

    repositories = Repositories(database)
    picks_service = PicksService(repositories)
    stats_service = StatsService(repositories)
    affiliate_service = AffiliateService(repositories)
    audit_service = AuditService(repositories)
    football_data_service = FootballDataService(
        repositories=repositories,
        api_football_key=settings.api_football_key,
        odds_api_key=settings.odds_api_key,
    )
    scheduler_service = SchedulerService(football_data_service)

    app = Application.builder().token(settings.bot_token).build()
    app.bot_data["admin_user_ids"] = admin_user_ids
    app.bot_data["channel_id"] = settings.channel_id
    app.bot_data["repositories"] = repositories
    app.bot_data["picks_service"] = picks_service
    app.bot_data["stats_service"] = stats_service
    app.bot_data["affiliate_service"] = affiliate_service
    app.bot_data["audit_service"] = audit_service
    app.bot_data["football_data_service"] = football_data_service
    app.bot_data["affiliate_default_url"] = settings.affiliate_default_url

    app.add_handler(CommandHandler("start", start))
    app.add_handler(CommandHandler("today", today))
    app.add_handler(CommandHandler("results", results))
    app.add_handler(CommandHandler("stats", stats))
    app.add_handler(CommandHandler("risk", risk))
    app.add_handler(CommandHandler("vip", vip))
    app.add_handler(CommandHandler("help", help_command))
    app.add_handler(CommandHandler("fixtures", fixtures))
    app.add_handler(CommandHandler("matchstats", matchstats))

    app.add_handler(CommandHandler("addpick", add_pick))
    app.add_handler(CommandHandler("editpick", edit_pick))
    app.add_handler(CommandHandler("deletepick", delete_pick))
    app.add_handler(CommandHandler("postpick", post_pick))
    app.add_handler(CommandHandler("setresult", set_result))
    app.add_handler(CommandHandler("report", report))
    app.add_handler(CommandHandler("broadcast", broadcast))
    app.add_handler(CommandHandler("addaffiliate", add_affiliate))
    app.add_handler(CommandHandler("syncfixtures", sync_fixtures))
    app.add_handler(CommandHandler("settle", settle))
    app.add_handler(CommandHandler("whoami", whoami))
    app.add_handler(CommandHandler("health", admin_health))

    return app, scheduler_service


def _health_provider(repositories: Repositories) -> dict[str, str]:
    try:
        repositories.list_recent_picks(1)
        return {"status": "ok", "database": "up"}
    except Exception:
        LOGGER.exception("Health probe failed")
        return {"status": "degraded", "database": "down"}


def run() -> None:
    load_dotenv()
    settings = load_settings()
    configure_logging(settings.log_level)

    application, scheduler_service = create_application(settings)

    if settings.bot_mode == "polling":
        scheduler_service.start()
        application.run_polling()
        return

    if not settings.webhook_base_url:
        raise ValueError("WEBHOOK_BASE_URL is required when BOT_MODE=webhook")

    repositories: Repositories = application.bot_data["repositories"]
    fastapi_app = create_webhook_app(
        telegram_application=application,
        webhook_secret=settings.webhook_secret,
        webhook_url=settings.webhook_url,
        health_provider=lambda: _health_provider(repositories),
    )
    scheduler_service.start()
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(fastapi_app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    run()
