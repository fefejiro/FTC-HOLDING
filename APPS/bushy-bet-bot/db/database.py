from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.engine import Connection, Engine

from db.migrations import run_migrations


def _to_sqlalchemy_url(database_url: str) -> str:
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if database_url.startswith("sqlite://"):
        return database_url
    return f"sqlite:///{database_url}"


class Database:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self.engine: Engine = create_engine(_to_sqlalchemy_url(database_url), future=True)
        self.dialect = self.engine.dialect.name

    @contextmanager
    def connect(self) -> Iterator[Connection]:
        with self.engine.begin() as connection:
            yield connection

    def init_schema(self) -> None:
        run_migrations(self.engine, self.dialect)
