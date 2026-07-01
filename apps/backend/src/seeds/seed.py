from __future__ import annotations

import asyncio

from src.db.base import Base
from src.db.database import AsyncSessionLocal, engine
from src.db import model_registry  # noqa: F401

from src.seeds.company_seed import seed_companies
from src.seeds.crm_seed import seed_crm
from src.seeds.finance_seed import seed_finance
from src.seeds.hr_seed import seed_hr
from src.seeds.product_seed import seed_products
from src.seeds.user_seed import seed_users_and_access


async def run_all_seeds(create_tables: bool = True):
    if create_tables:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        try:
            print("🚀 START SEED DASHAI ERP")

            contexts = await seed_companies(db)
            system_user_ids = await seed_users_and_access(db, contexts)

            await seed_finance(db, contexts, system_user_ids)
            await seed_products(db, contexts)
            await seed_hr(db, contexts)
            await seed_crm(db, contexts)

            await db.commit()

            print("✅ SEED SUCCESS")
            print("Login:")
            print("  superadmin@dashai.test / admin123")
            print("  owner@nud.test / admin123")
            print("  admin@bkm.test / admin123")
            print("  finance@nud.test / admin123")
            print("  sales@bkm.test / admin123")

        except Exception as exc:
            await db.rollback()
            print("❌ SEED FAILED:", repr(exc))
            raise


if __name__ == "__main__":
    asyncio.run(run_all_seeds())