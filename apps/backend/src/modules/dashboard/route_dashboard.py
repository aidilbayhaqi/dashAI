from fastapi import APIRouter, Depends
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


@router.get("/summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(get_current_user),
):
    company_id = current_user.company_id

    product_query = select(func.count()).select_from(Product)
    employee_query = select(func.count()).select_from(Employee)
    lead_query = select(func.count()).select_from(CRMLead)
    deal_query = select(func.count()).select_from(CRMDeal)
    revenue_query = select(func.coalesce(func.sum(FinanceTransaction.total_amount), 0))

    if company_id and not current_user.is_superuser:
        product_query = product_query.where(Product.company_id == company_id)
        employee_query = employee_query.where(Employee.company_id == company_id)
        lead_query = lead_query.where(CRMLead.company_id == company_id)
        deal_query = deal_query.where(CRMDeal.company_id == company_id)
        revenue_query = revenue_query.where(FinanceTransaction.company_id == company_id)

    total_products = await db.scalar(product_query)
    total_employees = await db.scalar(employee_query)
    total_leads = await db.scalar(lead_query)
    total_deals = await db.scalar(deal_query)
    total_revenue = await db.scalar(revenue_query)

    return {
        "total_products": total_products or 0,
        "total_employees": total_employees or 0,
        "total_leads": total_leads or 0,
        "total_deals": total_deals or 0,
        "total_revenue": float(total_revenue or 0),
    }