from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.routes.crud_factory import create_crud_router
from src.modules.crm.model_crm import CRMActivity, CRMContact, CRMDeal, CRMLead, CRMCampaign
from src.modules.crm.schema_crm import (
    CRMActivityCreate,
    CRMActivityUpdate,
    CRMActivityResponse,
    CRMContactCreate,
    CRMContactResponse,
    CRMDealCreate,
    CRMDealUpdate,
    CRMDealPaymentRequest,
    CRMDealResponse,
    CRMDealItemCreate,
    CRMDealItemResponse,
    CRMLeadCreate,
    CRMLeadUpdate,
    CRMLeadResponse,
    CRMCampaignCreate,
    CRMCampaignUpdate,
    CRMCampaignResponse
)
from src.modules.crm.service_crm import CRMDealItemService, CRMDealService
from src.modules.products.model_product import Product
from src.security.dependencies import CurrentUser, require_permission
from src.security.idempotency import (
    build_idempotency_context,
    execute_idempotent,
    get_idempotency_key,
)
from src.security.tenant import (
    ensure_item_access,
    get_record_or_404,
    tenant_not_found,
)


router = APIRouter(tags=["CRM"])


router.include_router(
    create_crud_router(
        prefix="/crm/leads",
        tags=["CRM Leads"],
        permission_prefix="crm.leads",
        model_class=CRMLead,
        create_schema=CRMLeadCreate,
        update_schema=CRMLeadUpdate,
        response_schema=CRMLeadResponse,
        search_fields=[
            "name",
            "company_name",
            "email",
            "phone",
            "source",
            "notes",
        ],
    )
)

router.include_router(
    create_crud_router(
        prefix="/crm/contacts",
        tags=["CRM Contacts"],
        permission_prefix="crm.contacts",
        model_class=CRMContact,
        create_schema=CRMContactCreate,
        update_schema=CRMContactCreate,
        response_schema=CRMContactResponse,
        search_fields=[
            "name",
            "company_name",
            "position",
            "email",
            "phone",
        ],
    )
)

router.include_router(
    create_crud_router(
        prefix="/crm/deals",
        tags=["CRM Deals"],
        permission_prefix="crm.deals",
        model_class=CRMDeal,
        create_schema=CRMDealCreate,
        update_schema=CRMDealUpdate,
        response_schema=CRMDealResponse,
        search_fields=["title", "won_lost_reason"],
        date_filter_field="created_at",
    )
)

router.include_router(
    create_crud_router(
        prefix="/crm/activities",
        tags=["CRM Activities"],
        permission_prefix="crm.activities",
        model_class=CRMActivity,
        create_schema=CRMActivityCreate,
        update_schema=CRMActivityUpdate,
        response_schema=CRMActivityResponse,
        search_fields=["subject", "description", "notes"],
        date_filter_field="scheduled_at",
    )
)

router.include_router(
    create_crud_router(
        prefix="/crm/campaigns",
        tags=["CRM Campaigns"],
        permission_prefix="crm.campaigns",
        model_class=CRMCampaign,
        create_schema=CRMCampaignCreate,
        update_schema=CRMCampaignUpdate,
        response_schema=CRMCampaignResponse,
        search_fields=["name", "channel", "notes"],
        date_filter_field="start_date",
    )
)

@router.post(
    "/crm/deal-items",
    response_model=CRMDealItemResponse,
)
async def create_deal_item(
    payload: CRMDealItemCreate,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("crm.deals.create")
    ),
):
    deal = await get_record_or_404(
        db=db,
        model_class=CRMDeal,
        item_id=payload.deal_id,
        detail="Deal not found",
    )

    company_id, _ = await ensure_item_access(
        db=db,
        item=deal,
        current_user=current_user,
        detail="Deal not found",
    )

    if payload.product_id is not None:
        product = await get_record_or_404(
            db=db,
            model_class=Product,
            item_id=payload.product_id,
            detail="Product not found",
        )

        product_company_id, _ = await ensure_item_access(
            db=db,
            item=product,
            current_user=current_user,
            detail="Product not found",
        )

        if product_company_id != company_id:
            raise tenant_not_found("Product not found")

    service = CRMDealItemService(db)
    return await service.create_item(payload)


@router.post(
    "/crm/deals/{deal_id}/close-won",
    response_model=CRMDealResponse,
)
async def close_deal_won(
    deal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("crm.deals.update")
    ),
):
    deal = await get_record_or_404(
        db=db,
        model_class=CRMDeal,
        item_id=deal_id,
        detail="Deal not found",
    )

    await ensure_item_access(
        db=db,
        item=deal,
        current_user=current_user,
        detail="Deal not found",
    )

    service = CRMDealService(db)
    result = await service.close_won(deal.id)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Deal not found",
        )

    return result


@router.post(
    "/crm/deals/{deal_id}/confirm-payment",
    response_model=CRMDealResponse,
)
async def confirm_deal_payment(
    deal_id: UUID,
    payload: CRMDealPaymentRequest,
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
        deal = await get_record_or_404(
            db=db,
            model_class=CRMDeal,
            item_id=deal_id,
            detail="Deal not found",
        )
        await ensure_item_access(
            db=db,
            item=deal,
            current_user=current_user,
            detail="Deal not found",
        )
        service = CRMDealService(db)
        result = await service.confirm_payment(
            deal_id=deal.id,
            cash_account_id=payload.cash_account_id,
            payment_date=payload.payment_date,
            reference_no=payload.reference_no,
            notes=payload.notes,
        )
        if result is None:
            raise HTTPException(status_code=404, detail="Deal not found")
        return result

    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=CRMDealResponse,
    )


@router.post(
    "/crm/deals/{deal_id}/close-lost",
    response_model=CRMDealResponse,
)
async def close_deal_lost(
    deal_id: UUID,
    reason: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("crm.deals.update")
    ),
):
    deal = await get_record_or_404(
        db=db,
        model_class=CRMDeal,
        item_id=deal_id,
        detail="Deal not found",
    )

    await ensure_item_access(
        db=db,
        item=deal,
        current_user=current_user,
        detail="Deal not found",
    )

    service = CRMDealService(db)
    result = await service.close_lost(deal.id, reason)

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Deal not found",
        )

    return result
