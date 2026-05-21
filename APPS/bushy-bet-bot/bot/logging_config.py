from __future__ import annotations

import json
import logging
import os
from typing import Any


SENSITIVE_KEYS = {"bot_token", "database_url", "api_football_key", "webhook_secret", "authorization"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "time": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
        }
        return json.dumps(payload, ensure_ascii=True)


class RedactSecretsFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        message = str(record.msg)
        for key in SENSITIVE_KEYS:
            env_value = os.getenv(key.upper())
            if env_value:
                message = message.replace(env_value, "[REDACTED]")
        record.msg = message
        return True


def configure_logging(level: str = "INFO") -> None:
    root = logging.getLogger()
    root.handlers.clear()
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    handler.addFilter(RedactSecretsFilter())
    root.addHandler(handler)
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
