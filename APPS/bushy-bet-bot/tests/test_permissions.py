from __future__ import annotations

from bot.commands_admin import admin_authorized
from bot.permissions import parse_admin_user_ids


def test_reject_non_admin_for_admin_command():
    admin_ids = {1111, 2222}
    assert admin_authorized(3333, admin_ids) is False
    assert admin_authorized(1111, admin_ids) is True


def test_parse_admin_user_ids_ignores_invalid_entries():
    parsed = parse_admin_user_ids("1001, abc, ,2002,REQUIRED_SET_NUMERIC_TELEGRAM_IDS")
    assert parsed == {1001, 2002}
