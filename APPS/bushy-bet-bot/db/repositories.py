from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import text

from db.database import Database


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class Repositories:
    def __init__(self, database: Database) -> None:
        self.database = database

    def _fetch_all(self, sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        with self.database.connect() as connection:
            rows = connection.execute(text(sql), params or {}).mappings().all()
            return [dict(row) for row in rows]

    def _fetch_one(self, sql: str, params: dict[str, Any] | None = None) -> dict[str, Any] | None:
        rows = self._fetch_all(sql, params)
        return rows[0] if rows else None

    def _execute(self, sql: str, params: dict[str, Any] | None = None):
        with self.database.connect() as connection:
            return connection.execute(text(sql), params or {})

    def upsert_user(self, telegram_user_id: int, username: str | None, first_name: str | None, role: str = "user") -> None:
        now = utc_now_iso()
        if self.database.dialect == "sqlite":
            sql = """
            INSERT INTO users (telegram_user_id, username, first_name, role, joined_at, last_seen_at)
            VALUES (:telegram_user_id, :username, :first_name, :role, :joined_at, :last_seen_at)
            ON CONFLICT(telegram_user_id) DO UPDATE SET
                username=excluded.username,
                first_name=excluded.first_name,
                last_seen_at=excluded.last_seen_at
            """
        else:
            sql = """
            INSERT INTO users (telegram_user_id, username, first_name, role, joined_at, last_seen_at)
            VALUES (:telegram_user_id, :username, :first_name, :role, :joined_at, :last_seen_at)
            ON CONFLICT (telegram_user_id) DO UPDATE SET
                username = EXCLUDED.username,
                first_name = EXCLUDED.first_name,
                last_seen_at = EXCLUDED.last_seen_at
            """
        self._execute(
            sql,
            {
                "telegram_user_id": telegram_user_id,
                "username": username,
                "first_name": first_name,
                "role": role,
                "joined_at": now,
                "last_seen_at": now,
            },
        )

    def create_pick(self, payload: dict[str, Any]) -> int:
        now = utc_now_iso()
        sql = """
        INSERT INTO picks (
            league, match_name, kickoff_time, market, selection, odds,
            confidence, risk_level, reasoning, affiliate_link_id, fixture_id,
            status, result, created_at, posted_at, updated_at
        )
        VALUES (
            :league, :match_name, :kickoff_time, :market, :selection, :odds,
            :confidence, :risk_level, :reasoning, :affiliate_link_id, :fixture_id,
            :status, :result, :created_at, :posted_at, :updated_at
        )
        """
        result = self._execute(
            sql,
            {
                "league": payload["league"],
                "match_name": payload["match_name"],
                "kickoff_time": payload["kickoff_time"],
                "market": payload["market"],
                "selection": payload["selection"],
                "odds": payload["odds"],
                "confidence": payload["confidence"],
                "risk_level": payload["risk_level"],
                "reasoning": payload["reasoning"],
                "affiliate_link_id": payload.get("affiliate_link_id"),
                "fixture_id": payload.get("fixture_id"),
                "status": payload.get("status", "active"),
                "result": payload.get("result", "pending"),
                "created_at": now,
                "posted_at": payload.get("posted_at"),
                "updated_at": now,
            },
        )
        pick_id = result.lastrowid
        if pick_id is None:
            latest = self._fetch_one("SELECT id FROM picks ORDER BY id DESC LIMIT 1")
            return int(latest["id"]) if latest else 0
        return int(pick_id)

    def get_pick(self, pick_id: int) -> dict[str, Any] | None:
        return self._fetch_one("SELECT * FROM picks WHERE id = :id", {"id": pick_id})

    def update_pick(self, pick_id: int, updates: dict[str, Any]) -> bool:
        if not updates:
            return False
        updates = {**updates, "updated_at": utc_now_iso()}
        assignments = ", ".join(f"{key} = :{key}" for key in updates)
        sql = f"UPDATE picks SET {assignments} WHERE id = :pick_id"
        result = self._execute(sql, {**updates, "pick_id": pick_id})
        return result.rowcount > 0

    def soft_delete_pick(self, pick_id: int) -> bool:
        return self.update_pick(pick_id, {"status": "inactive"})

    def set_pick_result(self, pick_id: int, result: str) -> bool:
        return self.update_pick(pick_id, {"result": result})

    def list_today_active_picks(self) -> list[dict[str, Any]]:
        start = datetime.now(timezone.utc).date().isoformat()
        end = (datetime.now(timezone.utc).date() + timedelta(days=1)).isoformat()
        sql = """
        SELECT * FROM picks
        WHERE status = 'active' AND kickoff_time >= :start AND kickoff_time < :end
        ORDER BY kickoff_time ASC
        """
        return self._fetch_all(sql, {"start": start, "end": end})

    def list_recent_results(self, limit: int = 10) -> list[dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT * FROM picks
            WHERE status = 'active' AND result IN ('win', 'loss', 'void')
            ORDER BY updated_at DESC
            LIMIT :limit
            """,
            {"limit": limit},
        )

    def count_stats(self, days: int | None = None) -> dict[str, int]:
        params: dict[str, Any] = {}
        date_clause = ""
        if days is not None:
            since = (datetime.now(timezone.utc) - timedelta(days=days)).replace(microsecond=0).isoformat()
            date_clause = " AND created_at >= :since"
            params["since"] = since

        total = self._fetch_one(f"SELECT COUNT(*) AS count FROM picks WHERE status='active'{date_clause}", params)["count"]
        wins = self._fetch_one(
            f"SELECT COUNT(*) AS count FROM picks WHERE status='active' AND result='win'{date_clause}", params
        )["count"]
        losses = self._fetch_one(
            f"SELECT COUNT(*) AS count FROM picks WHERE status='active' AND result='loss'{date_clause}", params
        )["count"]
        voids = self._fetch_one(
            f"SELECT COUNT(*) AS count FROM picks WHERE status='active' AND result='void'{date_clause}", params
        )["count"]
        pending = self._fetch_one(
            f"SELECT COUNT(*) AS count FROM picks WHERE status='active' AND result='pending'{date_clause}", params
        )["count"]

        return {
            "total": int(total),
            "wins": int(wins),
            "losses": int(losses),
            "voids": int(voids),
            "pending": int(pending),
        }

    def add_affiliate_link(self, platform_name: str, affiliate_url: str, region: str, campaign_tag: str | None) -> int:
        result = self._execute(
            """
            INSERT INTO affiliate_links (platform_name, affiliate_url, region, campaign_tag, active, created_at)
            VALUES (:platform_name, :affiliate_url, :region, :campaign_tag, :active, :created_at)
            """,
            {
                "platform_name": platform_name,
                "affiliate_url": affiliate_url,
                "region": region,
                "campaign_tag": campaign_tag,
                "active": 1 if self.database.dialect == "sqlite" else True,
                "created_at": utc_now_iso(),
            },
        )
        affiliate_id = result.lastrowid
        if affiliate_id is None:
            latest = self._fetch_one("SELECT id FROM affiliate_links ORDER BY id DESC LIMIT 1")
            return int(latest["id"]) if latest else 0
        return int(affiliate_id)

    def get_latest_affiliate_link(self) -> dict[str, Any] | None:
        return self._fetch_one(
            "SELECT * FROM affiliate_links WHERE active = :active ORDER BY created_at DESC LIMIT 1",
            {"active": 1 if self.database.dialect == "sqlite" else True},
        )

    def log_audit(
        self,
        actor_user_id: int,
        action: str,
        entity_type: str,
        entity_id: str | None,
        details: dict[str, Any] | str | None,
    ) -> None:
        details_text = details if isinstance(details, str) or details is None else json.dumps(details, ensure_ascii=True)
        self._execute(
            """
            INSERT INTO audit_log (actor_user_id, action, entity_type, entity_id, details, created_at)
            VALUES (:actor_user_id, :action, :entity_type, :entity_id, :details, :created_at)
            """,
            {
                "actor_user_id": actor_user_id,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "details": details_text,
                "created_at": utc_now_iso(),
            },
        )

    def list_recent_picks(self, limit: int = 20) -> list[dict[str, Any]]:
        return self._fetch_all("SELECT * FROM picks ORDER BY created_at DESC LIMIT :limit", {"limit": limit})

    def upsert_fixture(self, payload: dict[str, Any]) -> None:
        now = utc_now_iso()
        sql = """
        INSERT INTO fixtures (
            api_fixture_id, league, home_team, away_team, kickoff_time, status,
            home_goals, away_goals, created_at, updated_at
        ) VALUES (
            :api_fixture_id, :league, :home_team, :away_team, :kickoff_time, :status,
            :home_goals, :away_goals, :created_at, :updated_at
        )
        ON CONFLICT(api_fixture_id) DO UPDATE SET
            league=excluded.league,
            home_team=excluded.home_team,
            away_team=excluded.away_team,
            kickoff_time=excluded.kickoff_time,
            status=excluded.status,
            home_goals=excluded.home_goals,
            away_goals=excluded.away_goals,
            updated_at=excluded.updated_at
        """
        self._execute(
            sql,
            {
                "api_fixture_id": payload["api_fixture_id"],
                "league": payload["league"],
                "home_team": payload["home_team"],
                "away_team": payload["away_team"],
                "kickoff_time": payload["kickoff_time"],
                "status": payload["status"],
                "home_goals": payload.get("home_goals"),
                "away_goals": payload.get("away_goals"),
                "created_at": now,
                "updated_at": now,
            },
        )

    def get_fixture(self, fixture_id: int) -> dict[str, Any] | None:
        return self._fetch_one("SELECT * FROM fixtures WHERE id = :id", {"id": fixture_id})

    def get_fixture_by_api_id(self, api_fixture_id: int) -> dict[str, Any] | None:
        return self._fetch_one("SELECT * FROM fixtures WHERE api_fixture_id = :api_fixture_id", {"api_fixture_id": api_fixture_id})

    def list_upcoming_fixtures(self, limit: int = 8) -> list[dict[str, Any]]:
        now = utc_now_iso()
        return self._fetch_all(
            """
            SELECT * FROM fixtures
            WHERE kickoff_time >= :now
            ORDER BY kickoff_time ASC
            LIMIT :limit
            """,
            {"now": now, "limit": limit},
        )

    def search_upcoming_fixtures_by_match(self, match_name: str, limit: int = 5) -> list[dict[str, Any]]:
        now = utc_now_iso()
        query = f"%{match_name.lower()}%"
        return self._fetch_all(
            """
            SELECT * FROM fixtures
            WHERE kickoff_time >= :now
              AND LOWER(home_team || ' vs ' || away_team) LIKE :query
            ORDER BY kickoff_time ASC
            LIMIT :limit
            """,
            {"now": now, "query": query, "limit": limit},
        )

    def clear_match_stats(self, fixture_id: int) -> None:
        self._execute("DELETE FROM match_stats WHERE fixture_id = :fixture_id", {"fixture_id": fixture_id})

    def insert_match_stat(self, fixture_id: int, stat_key: str, stat_value: str, source: str) -> None:
        self._execute(
            """
            INSERT INTO match_stats (fixture_id, stat_key, stat_value, source, synced_at)
            VALUES (:fixture_id, :stat_key, :stat_value, :source, :synced_at)
            """,
            {
                "fixture_id": fixture_id,
                "stat_key": stat_key,
                "stat_value": stat_value,
                "source": source,
                "synced_at": utc_now_iso(),
            },
        )

    def list_match_stats(self, fixture_id: int) -> list[dict[str, Any]]:
        return self._fetch_all(
            "SELECT stat_key, stat_value, source, synced_at FROM match_stats WHERE fixture_id = :fixture_id",
            {"fixture_id": fixture_id},
        )

    def list_pending_picks_with_fixture(self) -> list[dict[str, Any]]:
        return self._fetch_all(
            "SELECT * FROM picks WHERE result = 'pending' AND fixture_id IS NOT NULL AND status = 'active'"
        )

    def create_sync_run(self, sync_type: str, status: str, details: str | None = None) -> int:
        result = self._execute(
            """
            INSERT INTO sync_runs (sync_type, status, started_at, completed_at, details)
            VALUES (:sync_type, :status, :started_at, :completed_at, :details)
            """,
            {
                "sync_type": sync_type,
                "status": status,
                "started_at": utc_now_iso(),
                "completed_at": utc_now_iso() if status in {"success", "failed"} else None,
                "details": details,
            },
        )
        run_id = result.lastrowid
        if run_id is None:
            latest = self._fetch_one("SELECT id FROM sync_runs ORDER BY id DESC LIMIT 1")
            return int(latest["id"]) if latest else 0
        return int(run_id)

    def list_recent_sync_runs(self, limit: int = 10) -> list[dict[str, Any]]:
        return self._fetch_all(
            """
            SELECT id, sync_type, status, started_at, completed_at, details
            FROM sync_runs
            ORDER BY id DESC
            LIMIT :limit
            """,
            {"limit": limit},
        )
