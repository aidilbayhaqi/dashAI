from __future__ import annotations

import argparse
import ast
import sys
import time
from pathlib import Path
from typing import Iterable

from alembic import command
from alembic.config import Config
from alembic.migration import (
    MigrationContext,
)
from alembic.script import (
    ScriptDirectory,
)
from sqlalchemy import (
    create_engine,
    text,
)
from sqlalchemy.engine import Engine
from sqlalchemy.exc import (
    OperationalError,
)

from src.core.config import settings
from src.db.base import Base
import src.db.model_registry  # noqa: F401


BACKEND_DIR = (
    Path(__file__)
    .resolve()
    .parents[2]
)

ALEMBIC_INI_PATH = (
    BACKEND_DIR
    / "alembic.ini"
)

MIGRATIONS_DIR = (
    BACKEND_DIR
    / "migrations"
)

VERSIONS_DIR = (
    MIGRATIONS_DIR
    / "versions"
)


class MigrationStartupError(
    RuntimeError
):
    """
    Error ketika status migration tidak aman
    untuk menjalankan aplikasi.
    """


def build_alembic_config() -> Config:
    config = Config(
        str(ALEMBIC_INI_PATH)
    )

    config.set_main_option(
        "script_location",
        str(MIGRATIONS_DIR),
    )

    config.set_main_option(
        "sqlalchemy.url",
        settings.DATABASE_URL,
    )

    return config


def iter_revision_files() -> Iterable[Path]:
    if not VERSIONS_DIR.exists():
        return []

    return sorted(
        path
        for path in VERSIONS_DIR.glob(
            "*.py"
        )
        if path.name != "__init__.py"
    )


def function_has_operations(
    node: ast.FunctionDef,
) -> bool:
    meaningful_nodes: list[
        ast.stmt
    ] = []

    for statement in node.body:
        is_docstring = (
            isinstance(
                statement,
                ast.Expr,
            )
            and isinstance(
                statement.value,
                ast.Constant,
            )
            and isinstance(
                statement.value.value,
                str,
            )
        )

        if is_docstring:
            continue

        meaningful_nodes.append(
            statement
        )

    if not meaningful_nodes:
        return False

    only_pass_statements = all(
        isinstance(
            statement,
            ast.Pass,
        )
        for statement
        in meaningful_nodes
    )

    return not only_pass_statements


def find_empty_upgrade_revisions() -> list[Path]:
    empty_revisions: list[
        Path
    ] = []

    for revision_path in iter_revision_files():
        source = revision_path.read_text(
            encoding="utf-8"
        )

        tree = ast.parse(
            source,
            filename=str(
                revision_path
            ),
        )

        upgrade_function = next(
            (
                node
                for node in tree.body
                if (
                    isinstance(
                        node,
                        ast.FunctionDef,
                    )
                    and node.name
                    == "upgrade"
                )
            ),
            None,
        )

        if (
            upgrade_function is None
            or not function_has_operations(
                upgrade_function
            )
        ):
            empty_revisions.append(
                revision_path
            )

    return empty_revisions


def validate_migration_files() -> (
    ScriptDirectory
):
    if not ALEMBIC_INI_PATH.exists():
        raise MigrationStartupError(
            "Alembic config tidak ditemukan: "
            f"{ALEMBIC_INI_PATH}"
        )

    if not VERSIONS_DIR.exists():
        raise MigrationStartupError(
            "Folder migration version "
            "tidak ditemukan: "
            f"{VERSIONS_DIR}"
        )

    revision_files = list(
        iter_revision_files()
    )

    if not revision_files:
        raise MigrationStartupError(
            "Belum ada revision Alembic. "
            "Buat initial migration dengan "
            "`alembic revision "
            '--autogenerate -m '
            '"initial complete schema"`.'
        )

    if not Base.metadata.tables:
        raise MigrationStartupError(
            "SQLAlchemy metadata kosong. "
            "Pastikan src.db.model_registry "
            "mengimpor semua model."
        )

    empty_revisions = (
        find_empty_upgrade_revisions()
    )

    if empty_revisions:
        file_list = ", ".join(
            path.name
            for path
            in empty_revisions
        )

        raise MigrationStartupError(
            "Ditemukan migration dengan "
            "upgrade() kosong: "
            f"{file_list}. "
            "Hapus revision kosong tersebut "
            "dan generate ulang initial "
            "migration dari database kosong."
        )

    config = build_alembic_config()

    script = (
        ScriptDirectory
        .from_config(config)
    )

    heads = script.get_heads()

    if len(heads) != 1:
        raise MigrationStartupError(
            "DashAI harus memiliki tepat "
            "satu Alembic head. "
            "Head yang ditemukan: "
            f"{heads or 'tidak ada'}."
        )

    return script


def create_sync_engine() -> Engine:
    return create_engine(
        settings.sync_database_url,
        pool_pre_ping=True,
        future=True,
    )


def wait_for_database(
    *,
    max_attempts: int = 30,
    retry_seconds: float = 2.0,
) -> None:
    engine = create_sync_engine()

    try:
        for attempt in range(
            1,
            max_attempts + 1,
        ):
            try:
                with engine.connect() as connection:
                    connection.execute(
                        text("SELECT 1")
                    )

                print(
                    "✅ Database siap "
                    "menerima koneksi."
                )

                return

            except OperationalError as exc:
                if attempt >= max_attempts:
                    raise MigrationStartupError(
                        "Database tidak siap "
                        f"setelah {max_attempts} "
                        "percobaan. "
                        "Error terakhir: "
                        f"{exc}"
                    ) from exc

                print(
                    "⏳ Menunggu database "
                    f"({attempt}/"
                    f"{max_attempts})..."
                )

                time.sleep(
                    retry_seconds
                )

    finally:
        engine.dispose()


def get_database_revisions(
    engine: Engine,
) -> set[str]:
    with engine.connect() as connection:
        migration_context = (
            MigrationContext.configure(
                connection
            )
        )

        return set(
            migration_context
            .get_current_heads()
        )


def assert_database_at_head(
    script: ScriptDirectory,
) -> None:
    expected_heads = set(
        script.get_heads()
    )

    engine = create_sync_engine()

    try:
        current_heads = (
            get_database_revisions(
                engine
            )
        )

    finally:
        engine.dispose()

    if current_heads != expected_heads:
        raise MigrationStartupError(
            "Revision database belum sama "
            "dengan revision aplikasi. "
            f"Database="
            f"{sorted(current_heads)}, "
            f"code="
            f"{sorted(expected_heads)}."
        )

    print(
        "✅ Database berada pada "
        "Alembic head: "
        + ", ".join(
            sorted(expected_heads)
        )
    )


def upgrade_database() -> None:
    script = (
        validate_migration_files()
    )

    wait_for_database()

    config = build_alembic_config()

    command.upgrade(
        config,
        "head",
    )

    assert_database_at_head(
        script
    )


def verify_database() -> None:
    script = (
        validate_migration_files()
    )

    wait_for_database()

    assert_database_at_head(
        script
    )


def show_status() -> None:
    script = (
        validate_migration_files()
    )

    wait_for_database()

    engine = create_sync_engine()

    try:
        current_heads = (
            get_database_revisions(
                engine
            )
        )

    finally:
        engine.dispose()

    print(
        "Model tables : "
        f"{len(Base.metadata.tables)}"
    )

    print(
        "Code heads   : "
        + ", ".join(
            script.get_heads()
        )
    )

    print(
        "DB heads     : "
        + (
            ", ".join(
                sorted(current_heads)
            )
            if current_heads
            else "belum di-stamp"
        )
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "DashAI database migration "
            "startup helper"
        )
    )

    parser.add_argument(
        "command",
        choices=(
            "check-files",
            "upgrade",
            "verify",
            "status",
        ),
    )

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        if (
            args.command
            == "check-files"
        ):
            script = (
                validate_migration_files()
            )

            print(
                "✅ Migration files valid. "
                "Head: "
                + ", ".join(
                    script.get_heads()
                )
            )

        elif (
            args.command
            == "upgrade"
        ):
            upgrade_database()

        elif (
            args.command
            == "verify"
        ):
            verify_database()

        elif (
            args.command
            == "status"
        ):
            show_status()

    except MigrationStartupError as exc:
        print(
            "❌ Migration startup gagal: "
            f"{exc}",
            file=sys.stderr,
        )

        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )