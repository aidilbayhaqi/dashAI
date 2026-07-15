from __future__ import annotations

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.security.dependencies import CurrentUser


class CRUDWritePolicy:
    """Optional domain guard used by generic CRUD routers.

    Generic list/read behavior stays reusable while sensitive write domains can
    block protected fields and enforce state transitions.
    """

    async def before_create(
        self,
        *,
        db: AsyncSession,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del db, current_user
        return data

    async def before_update(
        self,
        *,
        db: AsyncSession,
        existing: Any,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del db, existing, current_user
        return data

    async def before_delete(
        self,
        *,
        db: AsyncSession,
        existing: Any,
        current_user: CurrentUser,
    ) -> None:
        del db, existing, current_user
