from __future__ import annotations

import json
import logging
import os
import re
from typing import Any


SENSITIVE_KEYS = {"bot_token", "database_url", "api_football_key", "webhook_secret", "authorization"}
TELEGRAM_BOT_TOKEN_RE = re.compile(r"bot\d+:[A-Za-z0-9_-]+")


def redact_secrets(value: str) -> str:
    redacted = value
    for key in SENSITIVE_KEYS:
        env_value = os.getenv(key.upper())
        if env_value:
            redacted = redacted.replace(env_value, "[REDACTED]")
    return TELEGRAM_BOT_TOKEN_RE.sub("bot[REDACTED]", redacted)


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": redact_secrets(record.getMessage()),
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
        }
        return json.dumps(payload, ensure_ascii=True)


class RedactSecretsFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.msg = redact_secrets(str(record.msg))
        return True


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.handlers.clear()
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RedactSecretsFilter())
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
