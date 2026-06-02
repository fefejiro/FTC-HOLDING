import json
import logging

from bot.logging_config import JsonFormatter, redact_secrets


def test_redacts_telegram_bot_token_urls(monkeypatch):
    monkeypatch.setenv("BOT_TOKEN", "123456:ABC_secret-token")

    message = "POST https://api.telegram.org/bot123456:ABC_secret-token/getMe"

    assert "123456:ABC_secret-token" not in redact_secrets(message)
    assert "bot[REDACTED]/getMe" in redact_secrets(message)


def test_json_formatter_redacts_formatted_log_args(monkeypatch):
    monkeypatch.setenv("BOT_TOKEN", "123456:ABC_secret-token")
    record = logging.LogRecord(
        name="httpx",
        level=logging.INFO,
        pathname=__file__,
        lineno=1,
        msg="HTTP Request: %s",
        args=("https://api.telegram.org/bot123456:ABC_secret-token/setWebhook",),
        exc_info=None,
    )

    payload = json.loads(JsonFormatter().format(record))

    assert "123456:ABC_secret-token" not in payload["message"]
    assert "bot[REDACTED]/setWebhook" in payload["message"]
