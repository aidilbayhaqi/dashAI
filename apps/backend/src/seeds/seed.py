from __future__ import annotations

import asyncio

from src.db.database import (
    AsyncSessionLocal,
)
from src.scripts.db_startup import (
    assert_database_at_head,
    validate_migration_files,
)
from src.seeds.company_seed import (
    seed_companies,
)
from src.seeds.crm_seed import (
    seed_crm,
)
from src.seeds.finance_seed import (
    seed_finance,
)
from src.seeds.hr_seed import (
    seed_hr,
)
from src.seeds.product_seed import (
    seed_products,
)
from src.seeds.user_seed import (
    seed_users_and_access,
)


async def ensure_schema_is_migrated() -> None:
    script = (
        validate_migration_files()
    )

    await asyncio.to_thread(
        assert_database_at_head,
        script,
    )


async def run_all_seeds() -> None:
    await ensure_schema_is_migrated()

    async with AsyncSessionLocal() as db:
        try:
            print(
                "🚀 START SEED "
                "DASHAI ERP"
            )

            contexts = (
                await seed_companies(
                    db
                )
            )

            system_user_ids = (
                await seed_users_and_access(
                    db,
                    contexts,
                )
            )

            await seed_finance(
                db,
                contexts,
                system_user_ids,
            )

            await seed_products(
                db,
                contexts,
            )

            await seed_hr(
                db,
                contexts,
            )

            await seed_crm(
                db,
                contexts,
            )

            await db.commit()

            print(
                "✅ SEED SUCCESS"
            )

            print(
                "Login development:"
            )

            print(
                "  superadmin@dashai.test "
                "/ admin123"
            )

            print(
                "  owner@nud.test "
                "/ admin123"
            )

            print(
                "  admin@bkm.test "
                "/ admin123"
            )

            print(
                "  finance@nud.test "
                "/ admin123"
            )

            print(
                "  sales@bkm.test "
                "/ admin123"
            )

        except Exception as exc:
            await db.rollback()

            print(
                "❌ SEED FAILED:",
                repr(exc),
            )

            raise


if __name__ == "__main__":
    asyncio.run(
        run_all_seeds()
    )