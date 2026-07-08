"""
Legacy compatibility command.

DashAI tidak lagi membuat schema memakai
Base.metadata.create_all().

Gunakan Alembic agar riwayat schema konsisten
dan dapat di-upgrade atau di-downgrade.
"""

from src.scripts.db_startup import (
    upgrade_database,
)


def init_tables() -> None:
    upgrade_database()


if __name__ == "__main__":
    init_tables()