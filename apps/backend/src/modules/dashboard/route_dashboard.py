from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.modules.crm.model_crm import CRMDeal, CRMLead
from src.modules.finance.model_finance import FinanceTransaction
from src.modules.hr.model_hr import Employee
from src.modules.products.model_product import Product
from src.security.dependencies import CurrentUser, get_current_user
from src.security.tenant import (
    ensure_branch_belongs_to_company,
    resolve_branch_query_scope,
    resolve_company_id,
)


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


def apply_branch_scope(
    query,
    *,
    model_class: type,
    exact_branch_id: UUID | None,
    allowed_branch_ids: set[UUID] | None,
):
    if not hasattr(model_class, "branch_id"):
        return query

    branch_column = model_class.branch_id

    if exact_branch_id is not None:
        return query.where(branch_column == exact_branch_id)

    if allowed_branch_ids is None:
        return query

    if allowed_branch_ids:
        return query.where(
            or_(
                branch_column.is_(None),
                branch_column.in_(list(allowed_branch_ids)),
            )
        )

    return query.where(branch_column.is_(None))


@router.get("/summary")
async def dashboard_summary(
    company_id: UUID | None = Query(default=None),
    branch_id: UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    effective_company_id = resolve_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )

    effective_branch_id, allowed_branch_ids = resolve_branch_query_scope(
        current_user=current_user,
        requested_branch_id=branch_id,
    )

    if effective_branch_id is not None and effective_company_id is not None:
        await ensure_branch_belongs_to_company(
            db=db,
            branch_id=effective_branch_id,
            company_id=effective_company_id,
            current_user=current_user,
        )

    product_query = select(func.count()).select_from(Product)
    employee_query = select(func.count()).select_from(Employee)
    lead_query = select(func.count()).select_from(CRMLead)
    deal_query = select(func.count()).select_from(CRMDeal)
    revenue_query = select(
        func.coalesce(func.sum(FinanceTransaction.total_amount), 0)
    )

    if effective_company_id is not None:
        product_query = product_query.where(
            Product.company_id == effective_company_id
        )
        employee_query = employee_query.where(
            Employee.company_id == effective_company_id
        )
        lead_query = lead_query.where(
            CRMLead.company_id == effective_company_id
        )
        deal_query = deal_query.where(
            CRMDeal.company_id == effective_company_id
        )
        revenue_query = revenue_query.where(
            FinanceTransaction.company_id == effective_company_id
        )

    product_query = apply_branch_scope(
        product_query,
        model_class=Product,
        exact_branch_id=effective_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    employee_query = apply_branch_scope(
        employee_query,
        model_class=Employee,
        exact_branch_id=effective_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    lead_query = apply_branch_scope(
        lead_query,
        model_class=CRMLead,
        exact_branch_id=effective_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    deal_query = apply_branch_scope(
        deal_query,
        model_class=CRMDeal,
        exact_branch_id=effective_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    revenue_query = apply_branch_scope(
        revenue_query,
        model_class=FinanceTransaction,
        exact_branch_id=effective_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )

    total_products = await db.scalar(product_query)
    total_employees = await db.scalar(employee_query)
    total_leads = await db.scalar(lead_query)
    total_deals = await db.scalar(deal_query)
    total_revenue = await db.scalar(revenue_query)

    return {
        "company_id": (
            str(effective_company_id)
            if effective_company_id
            else None
        ),
        "branch_id": (
            str(effective_branch_id)
            if effective_branch_id
            else None
        ),
        "total_products": total_products or 0,
        "total_employees": total_employees or 0,
        "total_leads": total_leads or 0,
        "total_deals": total_deals or 0,
        "total_revenue": float(total_revenue or 0),
    }
