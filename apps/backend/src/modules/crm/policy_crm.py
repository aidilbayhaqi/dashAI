from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.crm.model_crm import CRMDeal, DealStage
from src.security.dependencies import CurrentUser
from src.service.write_policy import CRUDWritePolicy


class CRMDealWritePolicy(CRUDWritePolicy):
    """Keep won/lost transitions inside source-specific CRM commands."""

    async def before_update(
        self,
        *,
        db: AsyncSession,
        existing: CRMDeal,
        data: dict[str, Any],
        current_user: CurrentUser,
    ) -> dict[str, Any]:
        del db, current_user
        requested_stage = data.get("stage")
        if requested_stage in {DealStage.WON, DealStage.LOST, "won", "lost"}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Use Close Won or Close Lost so CRM, invoice, tax, "
                    "Finance, and cashflow remain synchronized"
                ),
            )
        if existing.stage in {DealStage.WON, DealStage.LOST}:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Closed deals are immutable; use a controlled reversal workflow",
            )
        return data

    async def before_delete(
        self,
        *,
        db: AsyncSession,
        existing: CRMDeal,
        current_user: CurrentUser,
    ) -> None:
        del db, current_user
        if (
            existing.stage in {DealStage.WON, DealStage.LOST}
            or existing.finance_transaction_id is not None
            or existing.invoice_id is not None
        ):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Closed or Finance-linked deals cannot be deleted",
            )
