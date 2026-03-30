"""
conftest.py — pytest async fixtures for job-search-app integration tests.

Strategy
--------
* Uses an **in-memory SQLite** database via aiosqlite by default.
  Override with ``TEST_DATABASE_URL`` env-var to target a real PostgreSQL
  instance (e.g. in CI with a running Docker service).

* PostgreSQL-specific SQLAlchemy dialect types (JSONB, ARRAY, UUID) are
  monkey-patched to generic equivalents **before** any app module is
  imported.  This works because Python's import system caches modules:
  patching ``sqlalchemy.dialects.postgresql.JSONB`` before the first
  ``from sqlalchemy.dialects.postgresql import JSONB`` call in the app
  models means those names resolve to the patched types.

* Each test function gets its own ``db_session`` that is **rolled back**
  on teardown, keeping the in-memory DB clean between tests.

* The ``client`` fixture wires a ``httpx.AsyncClient`` to the FastAPI app
  via ``ASGITransport`` and overrides the ``get_db`` dependency so every
  request reuses the same test session (no auto-commit, full rollback).
"""

import os
from typing import AsyncGenerator

# ── 1. Patch PostgreSQL dialect types BEFORE any app imports ─────────────────
import sqlalchemy.dialects.postgresql as _pg
from sqlalchemy import JSON as _JSON, String as _String


class _JSONArray(_JSON):
    """SQLite-compatible substitute for ``ARRAY`` columns (stored as JSON)."""

    inherit_cache = True

    def __init__(
        self,
        item_type=None,
        as_tuple: bool = False,
        dimensions=None,
        zero_indexes: bool = False,
    ) -> None:
        super().__init__()


class _UUIDString(_String):
    """SQLite-compatible substitute for ``UUID`` columns (stored as VARCHAR(36))."""

    inherit_cache = True

    def __init__(self, as_uuid: bool = False) -> None:
        super().__init__(length=36)


_pg.JSONB = _JSON          # type: ignore[assignment]
_pg.ARRAY = _JSONArray     # type: ignore[assignment]
_pg.UUID = _UUIDString     # type: ignore[assignment]

# ── 2. Now safe to import app code ────────────────────────────────────────────
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

# ── 3. Test-database URL ──────────────────────────────────────────────────────
TEST_DATABASE_URL: str = os.getenv(
    "TEST_DATABASE_URL",
    "sqlite+aiosqlite:///:memory:",
)

_IS_SQLITE = TEST_DATABASE_URL.startswith("sqlite")


# ── 4. Fixtures ───────────────────────────────────────────────────────────────


@pytest.fixture(scope="session")
async def test_engine():
    """
    Session-scoped async engine.
    Creates all tables once at the start of the test session and drops
    them at the end.
    """
    kwargs: dict = {"echo": False}
    if _IS_SQLITE:
        # StaticPool + check_same_thread=False → all test coroutines share
        # the single in-memory connection, which is required for SQLite.
        kwargs["connect_args"] = {"check_same_thread": False}
        kwargs["poolclass"] = StaticPool

    engine = create_async_engine(TEST_DATABASE_URL, **kwargs)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Function-scoped database session.

    Changes made during a test (flush but not commit) are rolled back on
    teardown so every test starts with a clean slate.
    """
    SessionLocal = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=True,
    )
    async with SessionLocal() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    ``httpx.AsyncClient`` pointed at the FastAPI app.
    The ``get_db`` dependency is overridden to reuse the test session so
    every request participates in the same (rollback-able) transaction.
    """

    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),  # type: ignore[arg-type]
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()
