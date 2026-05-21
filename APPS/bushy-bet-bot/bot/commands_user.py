from __future__ import annotations

from pathlib import Path

from telegram import Update
from telegram.ext import ContextTypes

from bot import formatters


LOGO_PATH = Path(__file__).resolve().parents[1] / "assets" / "bushy-bet-logo.png"


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    repos = context.application.bot_data["repositories"]
    user = update.effective_user
    if user is not None:
        repos.upsert_user(user.id, user.username, user.first_name)
    if update.message and LOGO_PATH.exists():
        with LOGO_PATH.open("rb") as logo_file:
            await update.message.reply_photo(photo=logo_file, caption="BUSHY BET")
    await update.message.reply_text(formatters.format_start())


async def today(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    picks_service = context.application.bot_data["picks_service"]
    picks = picks_service.get_today_picks()
    await update.message.reply_text(formatters.format_today_picks(picks))


async def results(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    picks_service = context.application.bot_data["picks_service"]
    recent = picks_service.get_recent_results()
    await update.message.reply_text(formatters.format_results(recent))


async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    stats_service = context.application.bot_data["stats_service"]
    overall = stats_service.overall()
    week = stats_service.last_7_days()
    month = stats_service.last_30_days()

    message = "\n\n".join(
        [
            formatters.format_stats_block("Overall", overall),
            formatters.format_stats_block("Last 7 Days", week),
            formatters.format_stats_block("Last 30 Days", month),
        ]
    )
    await update.message.reply_text(message)


async def risk(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(formatters.format_risk())


async def vip(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(formatters.format_vip())


async def help_command(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text(formatters.format_help())


async def fixtures(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    football_data_service = context.application.bot_data["football_data_service"]
    try:
        fixture_rows = football_data_service.get_upcoming_fixtures(limit=10)
        await update.message.reply_text(formatters.format_fixtures(fixture_rows))
    except Exception:
        await update.message.reply_text("Fixtures unavailable right now. Please try again shortly.")


async def matchstats(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    football_data_service = context.application.bot_data["football_data_service"]
    text = update.message.text or ""
    payload = text.partition(" ")[2].strip()
    if not payload:
        await update.message.reply_text("Usage: /matchstats fixture_id")
        return

    try:
        fixture_id = int(payload)
    except ValueError:
        await update.message.reply_text("Usage: /matchstats fixture_id")
        return

    stats_rows = football_data_service.get_match_stats(fixture_id)
    await update.message.reply_text(formatters.format_match_stats(fixture_id, stats_rows))
