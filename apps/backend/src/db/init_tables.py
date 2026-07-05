import asyncio

from src.db.base import Base
from src.db.database import engine

# Penting: import semua model agar terdaftar ke Base.metadata
import src.db.model_registry  # noqa: F401


async def init_tables():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("✅ Database tables created successfully.")


if __name__ == "__main__":
    asyncio.run(init_tables())