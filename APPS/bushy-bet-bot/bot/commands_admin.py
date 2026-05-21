from __future__ import annotations

import shlex
from typing import Any

from telegram import Update
from telegram.ext import ContextTypes

from bot import formatters
from bot.permissions import is_admin_user
from db.repositories import utc_now_iso


ADD_PICK_USAGE = (
    "Usage:\n"
    "/addpick league=\"Premier League\" match=\"Arsenal vs Chelsea\" kickoff=\"2026-05-22 15:00\" "
    "market=\"Over 2.5 Goals\" selection=\"Over 2.5\" odds=\"1.85\" confidence=\"Medium\" "
    "risk=\"Moderate\" reason=\"Both teams create high chances and concede in transition.\""
)

EDIT_PICK_USAGE = "Usage: /editpick id=\"12\" market=\"Both Teams To Score\" odds=\"1.90\""
DELETE_PICK_USAGE = "Usage: /deletepick id=\"12\""
POST_PICK_USAGE = "Usage: /postpick id=\"12\""
SET_RESULT_USAGE = "Usage: /setresult id=\"12\" result=\"win|loss|void|pending\""
ADD_AFFILIATE_USAGE = "Usage: /addaffiliate platform=\"Brand\" url=\"https://example.com\" region=\"NG\" campaign=\"may-launch\""
BROADCAST_USAGE = "Usage: /broadcast message=\"Your text here\""


def _parse_command_kv(text: str) -> dict[str, str]:
    payload = text.partition(" ")[2].strip()
    if not payload:
        return {}

    parsed: dict[str, str] = {}
    for token in shlex.split(payload):
        if "=" not in token:
            raise ValueError("Each argument must be key=value")
        key, value = token.split("=", 1)
        parsed[key.strip().lower()] = value.strip()
    return parsed


def _ensure_admin(update: Update, context: ContextTypes.DEFAULT_TYPE) -> bool:
    admin_ids = context.application.bot_data["admin_user_ids"]
    user_id = update.effective_user.id if update.effective_user else None
    return is_admin_user(user_id, admin_ids)


async def add_pick(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _ensure_admin(update, context):
        await update.message.reply_text("Admin only command.")
        return

    picks_service = context.application.bot_data["picks_service"]
    audit_service = context.application.bot_data["audit_service"]
    football_data_service = context.application.bot_data["football_data_service"]
    actor_id = update.effective_user.id

    try:
        args = _parse_command_kv(update.message.text or "")
        if not args.get("fixture_id") and args.get("match"):
            suggested = football_data_service.suggest_fixture_for_match(args["match"])
            if suggested:
                args["fixture_id"] = str(suggested["id"])
        pick_id = picks_service.create_pick_from_args(args)
        audit_service.log(actor_id, "create", "pick", str(pick_id), {"source": "addpick", "fixture_id": args.get("fixture_id")})
        fixture_note = f" (fixture_id={args.get('fixture_id')})" if args.get("fixture_id") else ""
        await update.message.reply_text(f"Pick created with id={pick_id}{fixture_note}")
    except Exception as exc:
        await update.message.reply_text(f"{ADD_PICK_USAGE}\n\nError: {exc}")


async def edit_pick(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _ensure_admin(update, context):
        await update.message.reply_text("Admin only command.")
        return

    picks_service = context.application.bot_data["picks_service"]
    audit_service = context.application.bot_data["audit_service"]
    actor_id = update.effective_user.id

    try:
        args = _parse_command_kv(update.message.text or "")
        pick_id = int(args.pop("id"))
        mapped_updates: dict[str, Any] = {}
        field_map = {
            "league": "league",
            "match": "match_name",
            "kickoff": "kickoff_time",
            "market": "market",
            "selection": "selection",
            "odds": "odds",
            "confidence": "confidence",
            "risk": "risk_level",
            "reason": "reasoning",
            "affiliate_id": "affiliate_link_id",
            "status": "status",
        }
        for key, value in args.items():
            if key in field_map:
                mapped_updates[field_map[key]] = value

        if not mapped_updates:
            raise ValueError("No editable fields provided")

        success = picks_service.update_pick(pick_id, mapped_updates)
        if not success:
            await update.message.reply_text("Pick not found.")
            return

        audit_service.log(actor_id, "update", "pick", str(pick_id), mapped_updates)
        await update.message.reply_text(f"Pick {pick_id} updated.")
    except Exception as exc:
        await update.message.reply_text(f"{EDIT_PICK_USAGE}\n\nError: {exc}")


async def delete_pick(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _ensure_admin(update, context):
        await update.message.reply_text("Admin only command.")
        return

    picks_service = context.application.bot_data["picks_service"]
    audit_service = context.application.bot_data["audit_service"]

    try:
        args = _parse_command_kv(update.message.text or "")
        pick_id = int(args["id"])
        success = picks_service.delete_pick(pick_id)
        if not success:
            await update.message.reply_text("Pick not found.")
            return

        audit_service.log(update.effective_user.id, "delete", "pick", str(pick_id), {"mode": "soft-delete"})
        await update.message.reply_text(f"Pick {pick_id} marked inactive.")
    except Exception as exc:
        await update.message.reply_text(f"{DELETE_PICK_USAGE}\n\nError: {exc}")


async def post_pick(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _ensure_admin(update, context):
        await update.message.reply_text("Admin only command.")
        return

    picks_service = context.application.bot_data["picks_service"]
    audit_service = context.application.bot_data["audit_service"]
    repositories = context.application.bot_data["repositories"]
    channel_id = context.application.bot_data.get("channel_id")
    football_data_service = context.application.bot_data["football_data_service"]
    affiliate_default_url = context.application.bot_data.get("affiliate_default_url")

    try:
        args = _parse_command_kv(update.message.text or "")
        pick_id = int(args["id"])
        pick = picks_service.get_pick(pick_id)
        if not pick:
            await update.message.reply_text("Pick not found.")
            return

        affiliate = repositories.get_latest_affiliate_link()
        pick["affiliate_url"] = (affiliate or {}).get("affiliate_url") or affiliate_default_url
        if pick.get("fixture_id"):
            stats_rows = football_data_service.get_match_stats(int(pick["fixture_id"]))
            if stats_rows:
                sample = ", ".join(f"{row['stat_key']}={row['stat_value']}" for row in stats_rows[:2])
                pick["stats_summary"] = sample

        card = formatters.format_pick_card(pick)
        if channel_id:
            await context.bot.send_message(chat_id=channel_id, text=card)
            picks_service.update_pick(pick_id, {"posted_at": utc_now_iso(), "status": "active"})
            await update.message.reply_text(f"Pick {pick_id} posted to channel.")
        else:
            await update.message.reply_text("CHANNEL_ID not configured. Pick preview:\n\n" + card)

        audit_service.log(update.effective_user.id, "post", "pick", str(pick_id), {"channel_configured": bool(channel_id)})
    except Exception as exc:
        await update.message.reply_text(f"{POST_PICK_USAGE}\n\nError: {exc}")


async def set_result(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _ensure_admin(update, context):
        await update.message.reply_text("Admin only command.")
        return

    picks_service = context.application.bot_data["picks_service"]
    audit_service = context.application.bot_data["audit_service"]

    try:
        args = _parse_command_kv(update.message.text or "")
        pick_id = int(args["id"])
        result_value = args["result"]
        success = picks_service.set_result(pick_id, result_value)
        if not success:
            await update.message.reply_text("Pick not found.")
            return

        audit_service.log(update.effective_user.id, "setresult", "pick", str(pick_id), {"result": result_value})
        await update.message.reply_text(f"Pick {pick_id} result set to {result_value}.")
    except Exception as exc:
        await update.message.reply_text(f"{SET_RESULT_USAGE}\n\nError: {exc}")


async def report(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _ensure_admin(update, context):
        await update.message.reply_text("Admin only command.")
        return

    stats_service = context.application.bot_data["stats_service"]
    repositories = context.application.bot_data["repositories"]

    overall = stats_service.overall()
    recent = repositories.list_recent_picks(10)
    recent_sync_runs = repositories.list_recent_sync_runs(5)
    lines = [
        "Admin Report",
        formatters.format_stats_block("Overall", overall),
        "Recent picks:",
    ]
    for item in recent:
        lines.append(f"- id={item['id']} {item['match_name']} [{item['result']}] status={item['status']}")
    lines.append("Recent sync runs:")
    for run in recent_sync_runs:
        lines.append(f"- #{run['id']} {run['sync_type']} {run['status']} ({run['started_at']})")
    await update.message.reply_text("\n".join(lines))


async def broadcast(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _ensure_admin(update, context):
        await update.message.reply_text("Admin only command.")
        return

    audit_service = context.application.bot_data["audit_service"]
    channel_id = context.application.bot_data.get("channel_id")

    try:
        args = _parse_command_kv(update.message.text or "")
        message = args["message"].strip()
        guardrail = (
            "\n\n18+ only. Bet responsibly. No guaranteed wins. "
            "Use licensed platforms available in your region."
        )
        final_message = message + guardrail

        if channel_id:
            await context.bot.send_message(chat_id=channel_id, text=final_message)
            await update.message.reply_text("Broadcast sent.")
        else:
            await update.message.reply_text("CHANNEL_ID not configured. Broadcast preview:\n\n" + final_message)

        audit_service.log(update.effective_user.id, "broadcast", "message", None, {"channel_configured": bool(channel_id)})
    except Exception as exc:
        await update.message.reply_text(f"{BROADCAST_USAGE}\n\nError: {exc}")


async def add_affiliate(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _ensure_admin(update, context):
        await update.message.reply_text("Admin only command.")
        return

    affiliate_service = context.application.bot_data["affiliate_service"]
    audit_service = context.application.bot_data["audit_service"]

    try:
        args = _parse_command_kv(update.message.text or "")
        platform_name = args["platform"]
        affiliate_url = args["url"]
        region = args["region"]
        campaign = args.get("campaign")

        affiliate_id = affiliate_service.add_link(platform_name, affiliate_url, region, campaign)
        audit_service.log(update.effective_user.id, "create", "affiliate_link", str(affiliate_id), {"platform": platform_name})
        await update.message.reply_text(f"Affiliate link created with id={affiliate_id}")
    except Exception as exc:
        await update.message.reply_text(f"{ADD_AFFILIATE_USAGE}\n\nError: {exc}")


def admin_authorized(user_id: int | None, admin_user_ids: list[int] | set[int]) -> bool:
    return is_admin_user(user_id, admin_user_ids)


async def sync_fixtures(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _ensure_admin(update, context):
        await update.message.reply_text("Admin only command.")
        return

    football_data_service = context.application.bot_data["football_data_service"]
    audit_service = context.application.bot_data["audit_service"]

    try:
        synced = await football_data_service.sync_upcoming_fixtures()
        audit_service.log(update.effective_user.id, "syncfixtures", "fixtures", None, {"synced": synced})
        await update.message.reply_text(f"Fixture sync complete. Synced: {synced}")
    except Exception as exc:
        await update.message.reply_text(f"Fixture sync failed: {exc}")


async def settle(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _ensure_admin(update, context):
        await update.message.reply_text("Admin only command.")
        return

    football_data_service = context.application.bot_data["football_data_service"]
    audit_service = context.application.bot_data["audit_service"]
    try:
        refreshed = await football_data_service.sync_recent_final_scores()
    except Exception as exc:
        await update.message.reply_text(f"Settlement pre-sync failed: {exc}")
        return
    settled_count = football_data_service.settle_picks_from_final_scores()
    audit_service.log(update.effective_user.id, "settle", "pick", None, {"settled": settled_count, "refreshed": refreshed})
    await update.message.reply_text(f"Settlement complete. Fixtures refreshed: {refreshed}. Updated picks: {settled_count}")


async def whoami(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    user = update.effective_user
    if not user:
        await update.message.reply_text("User context unavailable.")
        return
    admin_ids = context.application.bot_data["admin_user_ids"]
    role = "admin" if is_admin_user(user.id, admin_ids) else "user"
    await update.message.reply_text(f"Telegram ID: {user.id}\nUsername: @{user.username or '-'}\nRole: {role}")


async def admin_health(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    repositories = context.application.bot_data["repositories"]
    try:
        repositories.list_recent_picks(1)
        await update.message.reply_text("Bushy Bet health: OK")
    except Exception:
        await update.message.reply_text("Bushy Bet health: DEGRADED")
