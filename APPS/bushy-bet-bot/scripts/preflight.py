from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from db.database import Database


REQUIRED_VARS = [
    "BOT_TOKEN",
    "BOT_MODE",
    "ADMIN_USER_IDS",
    "WEBHOOK_SECRET",
    "DATABASE_URL",
    "API_FOOTBALL_KEY",
]


def main() -> int:
    load_dotenv()

    missing = [name for name in REQUIRED_VARS if not os.getenv(name, "").strip()]
    if missing:
        print("Preflight failed: missing env vars -> " + ", ".join(missing))
        return 1

    bot_mode = os.getenv("BOT_MODE", "").strip().lower()
    if bot_mode not in {"polling", "webhook"}:
        print("Preflight failed: BOT_MODE must be polling or webhook")
        return 1

    if bot_mode == "webhook" and not os.getenv("WEBHOOK_BASE_URL", "").strip():
        print("Preflight failed: WEBHOOK_BASE_URL is required in webhook mode")
        return 1

    database_url = os.getenv("DATABASE_URL", "").strip()
    try:
        database = Database(database_url)
        database.init_schema()
        with database.connect() as connection:
            connection.execute(text("SELECT 1"))
    except Exception as exc:
        print(f"Preflight failed: database check error: {exc}")
        return 1

    print("Preflight passed: environment and database are ready")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
