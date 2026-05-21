from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy import text
from sqlalchemy.engine import Engine


@dataclass(frozen=True)
class Migration:
    version: int
    name: str
    sqlite_sql: str
    postgres_sql: str


def _base_sqlite_schema() -> str:
    return """
    CREATE TABLE IF NOT EXISTS users (
        telegram_user_id INTEGER PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        joined_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS affiliate_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        platform_name TEXT NOT NULL,
        affiliate_url TEXT NOT NULL,
        region TEXT NOT NULL,
        campaign_tag TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS picks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league TEXT NOT NULL,
        match_name TEXT NOT NULL,
        kickoff_time TEXT NOT NULL,
        market TEXT NOT NULL,
        selection TEXT NOT NULL,
        odds TEXT NOT NULL,
        confidence TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        affiliate_link_id INTEGER,
        fixture_id INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        result TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        posted_at TEXT,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id),
        FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_team_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        logo_url TEXT,
        country TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fixtures (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        api_fixture_id INTEGER NOT NULL UNIQUE,
        league TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        kickoff_time TEXT NOT NULL,
        status TEXT NOT NULL,
        home_goals INTEGER,
        away_goals INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fixture_id INTEGER NOT NULL,
        stat_key TEXT NOT NULL,
        stat_value TEXT NOT NULL,
        source TEXT NOT NULL,
        synced_at TEXT NOT NULL,
        FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_type TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_picks_status ON picks(status);
    CREATE INDEX IF NOT EXISTS idx_picks_result ON picks(result);
    CREATE INDEX IF NOT EXISTS idx_picks_kickoff_time ON picks(kickoff_time);
    CREATE INDEX IF NOT EXISTS idx_picks_fixture_id ON picks(fixture_id);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id);
    CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff ON fixtures(kickoff_time);
    CREATE INDEX IF NOT EXISTS idx_sync_runs_type ON sync_runs(sync_type);
    """


def _base_postgres_schema() -> str:
    return """
    CREATE TABLE IF NOT EXISTS users (
        telegram_user_id BIGINT PRIMARY KEY,
        username TEXT,
        first_name TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        joined_at TEXT NOT NULL,
        last_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS affiliate_links (
        id BIGSERIAL PRIMARY KEY,
        platform_name TEXT NOT NULL,
        affiliate_url TEXT NOT NULL,
        region TEXT NOT NULL,
        campaign_tag TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS teams (
        id BIGSERIAL PRIMARY KEY,
        api_team_id BIGINT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        logo_url TEXT,
        country TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fixtures (
        id BIGSERIAL PRIMARY KEY,
        api_fixture_id BIGINT NOT NULL UNIQUE,
        league TEXT NOT NULL,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        kickoff_time TEXT NOT NULL,
        status TEXT NOT NULL,
        home_goals INTEGER,
        away_goals INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS picks (
        id BIGSERIAL PRIMARY KEY,
        league TEXT NOT NULL,
        match_name TEXT NOT NULL,
        kickoff_time TEXT NOT NULL,
        market TEXT NOT NULL,
        selection TEXT NOT NULL,
        odds TEXT NOT NULL,
        confidence TEXT NOT NULL,
        risk_level TEXT NOT NULL,
        reasoning TEXT NOT NULL,
        affiliate_link_id BIGINT,
        fixture_id BIGINT,
        status TEXT NOT NULL DEFAULT 'active',
        result TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        posted_at TEXT,
        updated_at TEXT NOT NULL,
        CONSTRAINT fk_picks_affiliate FOREIGN KEY (affiliate_link_id) REFERENCES affiliate_links(id),
        CONSTRAINT fk_picks_fixture FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
    );

    CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY,
        actor_user_id BIGINT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT,
        details TEXT,
        created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS match_stats (
        id BIGSERIAL PRIMARY KEY,
        fixture_id BIGINT NOT NULL,
        stat_key TEXT NOT NULL,
        stat_value TEXT NOT NULL,
        source TEXT NOT NULL,
        synced_at TEXT NOT NULL,
        CONSTRAINT fk_match_stats_fixture FOREIGN KEY (fixture_id) REFERENCES fixtures(id)
    );

    CREATE TABLE IF NOT EXISTS sync_runs (
        id BIGSERIAL PRIMARY KEY,
        sync_type TEXT NOT NULL,
        status TEXT NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT,
        details TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_picks_status ON picks(status);
    CREATE INDEX IF NOT EXISTS idx_picks_result ON picks(result);
    CREATE INDEX IF NOT EXISTS idx_picks_kickoff_time ON picks(kickoff_time);
    CREATE INDEX IF NOT EXISTS idx_picks_fixture_id ON picks(fixture_id);
    CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id);
    CREATE INDEX IF NOT EXISTS idx_fixtures_kickoff ON fixtures(kickoff_time);
    CREATE INDEX IF NOT EXISTS idx_sync_runs_type ON sync_runs(sync_type);
    """


MIGRATIONS: list[Migration] = [
    Migration(
        version=1,
        name="baseline_core_and_football_tables",
        sqlite_sql=_base_sqlite_schema(),
        postgres_sql=_base_postgres_schema(),
    )
]


def run_migrations(engine: Engine, dialect_name: str) -> None:
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS schema_migrations (
                    version INTEGER PRIMARY KEY,
                    name TEXT NOT NULL,
                    applied_at TEXT NOT NULL
                )
                """
            )
        )

        existing_rows = connection.execute(text("SELECT version FROM schema_migrations")).mappings().all()
        existing = {int(row["version"]) for row in existing_rows}

        for migration in MIGRATIONS:
            if migration.version in existing:
                continue

            sql_to_run = migration.sqlite_sql if dialect_name == "sqlite" else migration.postgres_sql
            for statement in [part.strip() for part in sql_to_run.split(";") if part.strip()]:
                connection.execute(text(statement))

            connection.execute(
                text(
                    """
                    INSERT INTO schema_migrations (version, name, applied_at)
                    VALUES (:version, :name, :applied_at)
                    """
                ),
                {
                    "version": migration.version,
                    "name": migration.name,
                    "applied_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                },
            )
