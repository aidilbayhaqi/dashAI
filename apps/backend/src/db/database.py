from collections.abc import (
    AsyncGenerator,
)

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from src.core.config import settings


engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DB_ECHO,
    future=True,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=(
        settings.DB_MAX_OVERFLOW
    ),
    pool_timeout=(
        settings.DB_POOL_TIMEOUT
    ),
    pool_recycle=(
        settings.DB_POOL_RECYCLE
    ),
)


AsyncSessionLocal = (
    async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
        autocommit=False,
    )
)


async def get_db() -> (
    AsyncGenerator[
        AsyncSession,
        None,
    ]
):
    async with AsyncSessionLocal() as session:
        try:
            yield session

        except Exception:
            await session.rollback()
            raise

        finally:
            await session.close()


async def check_database_connection() -> bool:
    async with engine.connect() as connection:
        result = await connection.execute(
            text("SELECT 1")
        )

        return (
            result.scalar_one()
            == 1
        )