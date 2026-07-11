from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.modules.automation.schema_automation import (
    DomainEventResponse,
    SalesOrderCreate,
    SalesOrderMonitoringResponse,
    SalesOrderProcessRequest,
    SalesOrderResponse,
)
from src.modules.automation.service_automation import BusinessAutomationService
from src.schemas.pagination import PaginatedResponse
from src.security.dependencies import CurrentUser, require_permission
from src.security.idempotency import (
    build_idempotency_context,
    execute_idempotent,
    get_idempotency_key,
)
from src.security.tenant import (
    ensure_branch_belongs_to_company,
    resolve_company_id,
    tenant_not_found,
)


router = APIRouter(
    prefix="/automation",
    tags=["Business Automation"],
)


def _effective_company_id(
    *,
    current_user: CurrentUser,
    requested_company_id: UUID | None,
) -> UUID:
    company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=requested_company_id,
        required_for_superuser=True,
    )

    if company_id is None:
        raise tenant_not_found("Company not found")

    return company_id


@router.post(
    "/sales-orders",
    response_model=SalesOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_sales_order(
    payload: SalesOrderCreate,
    request: Request,
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.transactions.create")
    ),
):
    context = await build_idempotency_context(
        request=request,
        current_user=current_user,
        raw_key=idempotency_key,
    )

    async def operation():
        company_id = _effective_company_id(
            current_user=current_user,
            requested_company_id=payload.company_id,
        )

        await ensure_branch_belongs_to_company(
            db=db,
            branch_id=payload.branch_id,
            company_id=company_id,
            current_user=current_user,
        )

        service = BusinessAutomationService(db)
        return await service.create_sales_order(
            payload=payload.model_copy(update={"company_id": company_id}),
            company_id=company_id,
            user_id=current_user.user_id,
        )

    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=SalesOrderResponse,
        success_status_code=status.HTTP_201_CREATED,
    )


@router.get(
    "/sales-orders",
    response_model=PaginatedResponse[SalesOrderResponse],
)
async def list_sales_orders(
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    q: str | None = Query(default=None),
    company_id: UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.transactions.view")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = BusinessAutomationService(db)
    return await service.list_orders(
        company_id=effective_company_id,
        page=page,
        limit=limit,
        query_text=q,
    )


@router.get(
    "/sales-orders/{order_id}",
    response_model=SalesOrderResponse,
)
async def get_sales_order(
    order_id: UUID,
    company_id: UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.transactions.view")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = BusinessAutomationService(db)
    order = await service.get_order(
        order_id=order_id,
        company_id=effective_company_id,
    )

    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sales order not found",
        )

    return order


@router.post(
    "/sales-orders/{order_id}/process",
    response_model=SalesOrderResponse,
)
async def process_sales_order(
    order_id: UUID,
    payload: SalesOrderProcessRequest,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.transactions.create")
    ),
):
    del payload

    context = await build_idempotency_context(
        request=request,
        current_user=current_user,
        raw_key=idempotency_key,
    )

    async def operation():
        effective_company_id = _effective_company_id(
            current_user=current_user,
            requested_company_id=company_id,
        )
        service = BusinessAutomationService(db)
        order = await service.get_order(
            order_id=order_id,
            company_id=effective_company_id,
        )

        if order is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Sales order not found",
            )

        await ensure_branch_belongs_to_company(
            db=db,
            branch_id=order.branch_id,
            company_id=effective_company_id,
            current_user=current_user,
        )

        return await service.process_sales_order(
            order_id=order_id,
            company_id=effective_company_id,
            user_id=current_user.user_id,
        )

    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=SalesOrderResponse,
        success_status_code=status.HTTP_200_OK,
    )


@router.get(
    "/monitoring",
    response_model=list[SalesOrderMonitoringResponse],
)
async def list_automation_monitoring(
    company_id: UUID | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.transactions.view")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = BusinessAutomationService(db)
    return await service.list_monitoring(
        company_id=effective_company_id,
        limit=limit,
    )


@router.post(
    "/sales-orders/{order_id}/confirm-payment",
    response_model=SalesOrderMonitoringResponse,
)
async def confirm_sales_order_payment(
    order_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.invoices.update")
    ),
):
    context = await build_idempotency_context(
        request=request,
        current_user=current_user,
        raw_key=idempotency_key,
    )

    async def operation():
        effective_company_id = _effective_company_id(
            current_user=current_user,
            requested_company_id=company_id,
        )
        service = BusinessAutomationService(db)
        return await service.confirm_payment(
            order_id=order_id,
            company_id=effective_company_id,
            user_id=current_user.user_id,
        )

    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=SalesOrderMonitoringResponse,
        success_status_code=status.HTTP_200_OK,
    )


@router.get(
    "/events",
    response_model=list[DomainEventResponse],
)
async def list_domain_events(
    company_id: UUID | None = Query(default=None),
    aggregate_id: UUID | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.transactions.view")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = BusinessAutomationService(db)
    return await service.list_events(
        company_id=effective_company_id,
        aggregate_id=aggregate_id,
        limit=limit,
    )
