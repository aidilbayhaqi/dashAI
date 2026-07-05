from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.modules.crm.model_crm import CRMDeal, CRMLead
from src.modules.finance.model_finance import FinanceTransaction
from src.modules.hr.model_hr import Employee
from src.modules.products.model_product import Product
from src.security.dependencies import CurrentUser, get_current_user


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


def resolve_dashboard_company_id(
    current_user: CurrentUser,
    requested_company_id: UUID | None,
) -> UUID | None:
    if current_user.is_superuser:
        return requested_company_id

    return current_user.company_id


@router.get("/summary")
async def dashboard_summary(
    company_id: UUID | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    effective_company_id = resolve_dashboard_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )

    product_query = select(func.count()).select_from(Product)
    employee_query = select(func.count()).select_from(Employee)
    lead_query = select(func.count()).select_from(CRMLead)
    deal_query = select(func.count()).select_from(CRMDeal)
    revenue_query = select(func.coalesce(func.sum(FinanceTransaction.total_amount), 0))

    if effective_company_id:
        product_query = product_query.where(Product.company_id == effective_company_id)
        employee_query = employee_query.where(Employee.company_id == effective_company_id)
        lead_query = lead_query.where(CRMLead.company_id == effective_company_id)
        deal_query = deal_query.where(CRMDeal.company_id == effective_company_id)
        revenue_query = revenue_query.where(
            FinanceTransaction.company_id == effective_company_id
        )

    total_products = await db.scalar(product_query)
    total_employees = await db.scalar(employee_query)
    total_leads = await db.scalar(lead_query)
    total_deals = await db.scalar(deal_query)
    total_revenue = await db.scalar(revenue_query)

    return {
        "company_id": str(effective_company_id) if effective_company_id else None,
        "total_products": total_products or 0,
        "total_employees": total_employees or 0,
        "total_leads": total_leads or 0,
        "total_deals": total_deals or 0,
        "total_revenue": float(total_revenue or 0),
    }