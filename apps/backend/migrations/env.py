from __future__ import annotations

import asyncio
import logging
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config


BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


from src.core.config import settings  # noqa: E402
from src.core.database_url import normalize_async_database_url  # noqa: E402
from src.db.base import Base  # noqa: E402
import src.db.model_registry  # noqa: F401,E402


logger = logging.getLogger("alembic.env")
config = context.config


if config.config_file_name is not None:
    fileConfig(config.config_file_name)


config.set_main_option(
    "sqlalchemy.url",
    normalize_async_database_url(settings.DATABASE_URL),
)

target_metadata = Base.metadata


def include_object(
    object_,
    name: str | None,
    type_: str,
    reflected: bool,
    compare_to,
) -> bool:
    """
    Menentukan object database yang ikut dibandingkan
    saat Alembic autogenerate dijalankan.
    """

    del object_, reflected, compare_to

    if (
        type_ == "table"
        and name == "alembic_version"
    ):
        return False

    return True


def prevent_empty_autogenerate(
    migration_context,
    revision,
    directives,
) -> None:
    """
    Mencegah Alembic membuat revision kosong ketika
    tidak ada perubahan schema.
    """

    del migration_context, revision

    command_options = getattr(
        config,
        "cmd_opts",
        None,
    )

    is_autogenerate = bool(
        command_options
        and getattr(
            command_options,
            "autogenerate",
            False,
        )
    )

    if (
        not is_autogenerate
        or not directives
    ):
        return

    generated_script = directives[0]

    if generated_script.upgrade_ops.is_empty():
        directives[:] = []

        logger.info(
            "Tidak ada perubahan schema; "
            "revision kosong tidak dibuat."
        )


def configure_context(
    **kwargs,
) -> None:
    context.configure(
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
        include_object=include_object,
        process_revision_directives=(
            prevent_empty_autogenerate
        ),
        transaction_per_migration=True,
        version_table="alembic_version",
        **kwargs,
    )


def run_migrations_offline() -> None:
    configure_context(
        url=normalize_async_database_url(settings.DATABASE_URL),
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named",
        },
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(
    connection: Connection,
) -> None:
    configure_context(
        connection=connection,
    )

    with context.begin_transaction():
        context.run_migrations()



async def run_async_migrations() -> None:
    configuration = config.get_section(
        config.config_ini_section,
        {},
    )

    configuration["sqlalchemy.url"] = (
        normalize_async_database_url(
            settings.DATABASE_URL
        )
    )

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    try:
        async with connectable.connect() as connection:
            await connection.run_sync(
                do_run_migrations
            )

    finally:
        await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(
        run_async_migrations()
    )


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()