from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.security.dependencies import CurrentUser
from src.security.tenant import (
    ensure_branch_belongs_to_company,
    resolve_branch_query_scope,
    resolve_company_id,
)


MONEY_QUANT = Decimal("0.01")


def money(value: Decimal | int | float | str) -> Decimal:
    return Decimal(str(value)).quantize(MONEY_QUANT, rounding=ROUND_HALF_UP)


async def resolve_ai_action_scope(
    *,
    db: AsyncSession,
    current_user: CurrentUser,
    company_id: UUID | None,
    branch_id: UUID | None,
) -> tuple[UUID, UUID | None]:
    effective_company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=company_id,
        required_for_superuser=True,
    )
    if effective_company_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Company harus dipilih.",
        )

    effective_branch_id, _ = resolve_branch_query_scope(
        current_user=current_user,
        requested_branch_id=branch_id,
    )
    if effective_branch_id is not None:
        await ensure_branch_belongs_to_company(
            db=db,
            branch_id=effective_branch_id,
            company_id=effective_company_id,
            current_user=current_user,
        )

    return effective_company_id, effective_branch_id
