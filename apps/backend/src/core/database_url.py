from __future__ import annotations


def normalize_async_database_url(url: str) -> str:
    """Normalize common hosted PostgreSQL URLs for SQLAlchemy asyncpg.

    Railway and other platforms commonly expose ``postgres://`` or
    ``postgresql://`` URLs. The backend uses SQLAlchemy's async engine, so the
    driver must be explicit. Keeping this conversion in one module prevents
    Alembic and runtime configuration from drifting apart.
    """

    normalized = str(url or "").strip()

    replacements = (
        ("postgres://", "postgresql+asyncpg://"),
        ("postgresql://", "postgresql+asyncpg://"),
        ("postgresql+psycopg2://", "postgresql+asyncpg://"),
    )

    for source, target in replacements:
        if normalized.startswith(source):
            return normalized.replace(source, target, 1)

    return normalized


def normalize_sync_database_url(url: str) -> str:
    """Normalize a PostgreSQL URL for synchronous migration/admin clients."""

    normalized = str(url or "").strip()

    replacements = (
        ("postgres://", "postgresql+psycopg2://"),
        ("postgresql://", "postgresql+psycopg2://"),
        ("postgresql+asyncpg://", "postgresql+psycopg2://"),
    )

    for source, target in replacements:
        if normalized.startswith(source):
            return normalized.replace(source, target, 1)

    return normalized
