from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import Date, case, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.automation.model_automation import (
    DomainEventOutbox,
    DomainEventStatus,
)
from src.modules.crm.model_crm import (
    CRMDeal,
    CRMLead,
    DealStage,
    LeadStatus,
)
from src.modules.dashboard.schema_dashboard import (
    DashboardAlert,
    DashboardBreakdownItem,
    DashboardKpis,
    DashboardMetricComparison,
    DashboardPeriodResponse,
    DashboardScope,
    DashboardSummaryResponse,
    DashboardTimeSeriesPoint,
)
from src.modules.finance.model_finance import (
    FinanceInvoice,
    FinanceTransaction,
    InvoiceStatus,
    TransactionStatus,
    TransactionType,
)
from src.modules.hr.model_hr import Employee, EmployeeStatus
from src.modules.products.model_product import Product, ProductStock


@dataclass(frozen=True)
class DashboardPeriod:
    start_date: date
    end_date: date
    previous_start_date: date
    previous_end_date: date

    @property
    def bucket(self) -> str:
        return "day" if (self.end_date - self.start_date).days <= 45 else "month"


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


def apply_company_scope(query, *, model_class: type, company_id: UUID | None):
    if company_id is not None and hasattr(model_class, "company_id"):
        return query.where(model_class.company_id == company_id)
    return query


def apply_scope(
    query,
    *,
    model_class: type,
    company_id: UUID | None,
    exact_branch_id: UUID | None,
    allowed_branch_ids: set[UUID] | None,
):
    return apply_branch_scope(
        apply_company_scope(
            query,
            model_class=model_class,
            company_id=company_id,
        ),
        model_class=model_class,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )


def resolve_dashboard_period(
    *,
    period_start: date | None,
    period_end: date | None,
    today: date | None = None,
) -> DashboardPeriod:
    reference_date = today or date.today()
    effective_end = period_end or reference_date
    effective_start = period_start or effective_end.replace(day=1)

    if effective_start > effective_end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="period_start must be before or equal to period_end",
        )

    if (effective_end - effective_start).days > 366:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Dashboard period cannot exceed 367 days",
        )

    duration_days = (effective_end - effective_start).days + 1
    previous_end = effective_start - timedelta(days=1)
    previous_start = previous_end - timedelta(days=duration_days - 1)

    return DashboardPeriod(
        start_date=effective_start,
        end_date=effective_end,
        previous_start_date=previous_start,
        previous_end_date=previous_end,
    )


def calculate_change_percent(
    current_value: Decimal,
    previous_value: Decimal,
) -> float | None:
    if previous_value == 0:
        if current_value == 0:
            return 0.0
        return None

    change = (
        (current_value - previous_value)
        / abs(previous_value)
        * Decimal("100")
    )
    return float(change.quantize(Decimal("0.01")))


def calculate_revenue_change_percent(
    current_revenue: Decimal,
    previous_revenue: Decimal,
) -> float | None:
    return calculate_change_percent(current_revenue, previous_revenue)


def trend_direction(change_percent: float | None) -> str:
    if change_percent is None:
        return "no_baseline"
    if change_percent > 0:
        return "up"
    if change_percent < 0:
        return "down"
    return "flat"


def build_transaction_total_query(
    *,
    transaction_type: TransactionType,
    company_id: UUID | None,
    exact_branch_id: UUID | None,
    allowed_branch_ids: set[UUID] | None,
    period_start: date,
    period_end: date,
):
    query = select(
        func.coalesce(func.sum(FinanceTransaction.total_amount), 0)
    ).where(
        FinanceTransaction.transaction_type == transaction_type,
        FinanceTransaction.status == TransactionStatus.POSTED,
        FinanceTransaction.transaction_date >= period_start,
        FinanceTransaction.transaction_date <= period_end,
    )

    return apply_scope(
        query,
        model_class=FinanceTransaction,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )


def build_revenue_query(
    *,
    company_id: UUID | None,
    exact_branch_id: UUID | None,
    allowed_branch_ids: set[UUID] | None,
    period_start: date,
    period_end: date,
):
    return build_transaction_total_query(
        transaction_type=TransactionType.INCOME,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
        period_start=period_start,
        period_end=period_end,
    )


async def scalar_decimal(db: AsyncSession, query) -> Decimal:
    return Decimal(str(await db.scalar(query) or 0))


async def scalar_int(db: AsyncSession, query) -> int:
    return int(await db.scalar(query) or 0)


def metric_comparison(current: Decimal, previous: Decimal):
    change = calculate_change_percent(current, previous)
    return DashboardMetricComparison(
        current=float(current),
        previous=float(previous),
        change_percent=change,
        trend=trend_direction(change),
    )


def _format_bucket_label(bucket_date: date, bucket: str) -> str:
    if bucket == "month":
        return bucket_date.strftime("%b %Y")
    return bucket_date.strftime("%d %b")


async def build_cashflow_series(
    *,
    db: AsyncSession,
    company_id: UUID | None,
    exact_branch_id: UUID | None,
    allowed_branch_ids: set[UUID] | None,
    period: DashboardPeriod,
) -> list[DashboardTimeSeriesPoint]:
    bucket = period.bucket
    bucket_expression = cast(
        func.date_trunc(bucket, FinanceTransaction.transaction_date),
        Date,
    ).label("bucket_date")

    query = select(
        bucket_expression,
        FinanceTransaction.transaction_type,
        func.coalesce(func.sum(FinanceTransaction.total_amount), 0),
    ).where(
        FinanceTransaction.status == TransactionStatus.POSTED,
        FinanceTransaction.transaction_type.in_(
            [TransactionType.INCOME, TransactionType.EXPENSE]
        ),
        FinanceTransaction.transaction_date >= period.start_date,
        FinanceTransaction.transaction_date <= period.end_date,
    )
    query = apply_scope(
        query,
        model_class=FinanceTransaction,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    ).group_by(bucket_expression, FinanceTransaction.transaction_type)

    result = await db.execute(query)
    by_date: dict[date, dict[str, Decimal]] = {}

    for bucket_date, transaction_type, amount in result.all():
        if bucket_date is None:
            continue
        record = by_date.setdefault(
            bucket_date,
            {"revenue": Decimal("0"), "expense": Decimal("0")},
        )
        key = (
            "revenue"
            if transaction_type == TransactionType.INCOME
            else "expense"
        )
        record[key] = Decimal(str(amount or 0))

    points: list[DashboardTimeSeriesPoint] = []
    cursor = (
        period.start_date.replace(day=1)
        if bucket == "month"
        else period.start_date
    )

    while cursor <= period.end_date:
        values = by_date.get(
            cursor,
            {"revenue": Decimal("0"), "expense": Decimal("0")},
        )
        revenue = values["revenue"]
        expense = values["expense"]
        points.append(
            DashboardTimeSeriesPoint(
                date=cursor,
                label=_format_bucket_label(cursor, bucket),
                revenue=float(revenue),
                expense=float(expense),
                net=float(revenue - expense),
            )
        )

        if bucket == "month":
            cursor = (
                cursor.replace(year=cursor.year + 1, month=1)
                if cursor.month == 12
                else cursor.replace(month=cursor.month + 1)
            )
        else:
            cursor += timedelta(days=1)

    return points


async def build_crm_pipeline(
    *,
    db: AsyncSession,
    company_id: UUID | None,
    exact_branch_id: UUID | None,
    allowed_branch_ids: set[UUID] | None,
) -> list[DashboardBreakdownItem]:
    query = select(
        CRMDeal.stage,
        func.count(CRMDeal.id),
        func.coalesce(func.sum(CRMDeal.expected_value), 0),
    )
    query = apply_scope(
        query,
        model_class=CRMDeal,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    ).group_by(CRMDeal.stage)

    result = await db.execute(query)
    records = {
        stage.value if hasattr(stage, "value") else str(stage): (
            int(count or 0),
            float(amount or 0),
        )
        for stage, count, amount in result.all()
    }

    labels = {
        DealStage.PROSPECTING.value: "Prospecting",
        DealStage.QUALIFICATION.value: "Qualification",
        DealStage.PROPOSAL.value: "Proposal",
        DealStage.NEGOTIATION.value: "Negotiation",
        DealStage.WON.value: "Won",
        DealStage.LOST.value: "Lost",
    }

    return [
        DashboardBreakdownItem(
            key=stage.value,
            label=labels[stage.value],
            count=records.get(stage.value, (0, 0))[0],
            amount=records.get(stage.value, (0, 0))[1],
        )
        for stage in DealStage
    ]


def build_operational_alerts(kpis: DashboardKpis) -> list[DashboardAlert]:
    alerts: list[DashboardAlert] = []

    if kpis.failed_automation_events > 0:
        alerts.append(
            DashboardAlert(
                id="automation-failed",
                module="automation",
                severity="critical",
                title="Automation membutuhkan perhatian",
                description=(
                    f"{kpis.failed_automation_events} domain event gagal "
                    "diproses dan perlu diperiksa."
                ),
                count=kpis.failed_automation_events,
                href="/automation",
            )
        )

    if kpis.overdue_invoice_count > 0:
        alerts.append(
            DashboardAlert(
                id="invoice-overdue",
                module="finance",
                severity="critical",
                title="Invoice melewati jatuh tempo",
                description=(
                    f"{kpis.overdue_invoice_count} invoice belum lunas "
                    "dan sudah melewati due date."
                ),
                count=kpis.overdue_invoice_count,
                href="/finance/invoices",
            )
        )

    if kpis.low_stock_items > 0:
        alerts.append(
            DashboardAlert(
                id="product-low-stock",
                module="products",
                severity="warning",
                title="Stock perlu diisi ulang",
                description=(
                    f"{kpis.low_stock_items} record stock berada di bawah "
                    "atau sama dengan reorder point."
                ),
                count=kpis.low_stock_items,
                href="/products/stock",
            )
        )

    if not alerts:
        alerts.append(
            DashboardAlert(
                id="operations-normal",
                module="system",
                severity="info",
                title="Tidak ada alert kritis",
                description=(
                    "Invoice, stock, dan automation tidak memiliki alert "
                    "kritis pada scope aktif."
                ),
                count=0,
                href="/dashboard",
            )
        )

    return alerts


async def build_dashboard_summary(
    *,
    db: AsyncSession,
    company_id: UUID | None,
    exact_branch_id: UUID | None,
    allowed_branch_ids: set[UUID] | None,
    period: DashboardPeriod,
) -> DashboardSummaryResponse:
    """Build the dashboard with bounded aggregate queries.

    Counts from the same table are grouped into one conditional-aggregation
    query. This keeps realtime invalidation and polling predictable as data and
    active-user counts grow.
    """

    transaction_query = select(
        func.coalesce(
            func.sum(
                case(
                    (
                        (FinanceTransaction.transaction_type == TransactionType.INCOME)
                        & (FinanceTransaction.transaction_date >= period.start_date)
                        & (FinanceTransaction.transaction_date <= period.end_date),
                        FinanceTransaction.total_amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("current_revenue"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (FinanceTransaction.transaction_type == TransactionType.INCOME)
                        & (FinanceTransaction.transaction_date >= period.previous_start_date)
                        & (FinanceTransaction.transaction_date <= period.previous_end_date),
                        FinanceTransaction.total_amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("previous_revenue"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (FinanceTransaction.transaction_type == TransactionType.EXPENSE)
                        & (FinanceTransaction.transaction_date >= period.start_date)
                        & (FinanceTransaction.transaction_date <= period.end_date),
                        FinanceTransaction.total_amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("current_expense"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (FinanceTransaction.transaction_type == TransactionType.EXPENSE)
                        & (FinanceTransaction.transaction_date >= period.previous_start_date)
                        & (FinanceTransaction.transaction_date <= period.previous_end_date),
                        FinanceTransaction.total_amount,
                    ),
                    else_=0,
                )
            ),
            0,
        ).label("previous_expense"),
    ).where(
        FinanceTransaction.status == TransactionStatus.POSTED,
        FinanceTransaction.transaction_type.in_(
            [TransactionType.INCOME, TransactionType.EXPENSE]
        ),
        FinanceTransaction.transaction_date >= period.previous_start_date,
        FinanceTransaction.transaction_date <= period.end_date,
    )
    transaction_query = apply_scope(
        transaction_query,
        model_class=FinanceTransaction,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    transaction_row = (await db.execute(transaction_query)).one()
    current_revenue = Decimal(str(transaction_row.current_revenue or 0))
    previous_revenue = Decimal(str(transaction_row.previous_revenue or 0))
    current_expense = Decimal(str(transaction_row.current_expense or 0))
    previous_expense = Decimal(str(transaction_row.previous_expense or 0))

    product_query = apply_scope(
        select(func.count(Product.id).label("total_products")),
        model_class=Product,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    total_products = int((await db.execute(product_query)).scalar_one() or 0)

    stock_query = apply_scope(
        select(func.count(ProductStock.id)).where(
            ProductStock.reorder_point > 0,
            ProductStock.quantity_on_hand - ProductStock.reserved_quantity
            <= ProductStock.reorder_point,
        ),
        model_class=ProductStock,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    low_stock_items = int((await db.execute(stock_query)).scalar_one() or 0)

    employee_query = apply_scope(
        select(
            func.count(Employee.id).label("total_employees"),
            func.count(
                case((Employee.status == EmployeeStatus.ACTIVE, 1))
            ).label("active_employees"),
        ),
        model_class=Employee,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    employee_row = (await db.execute(employee_query)).one()

    lead_query = apply_scope(
        select(
            func.count(CRMLead.id).label("total_leads"),
            func.count(
                case(
                    (
                        CRMLead.status.in_(
                            [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.QUALIFIED]
                        ),
                        1,
                    )
                )
            ).label("open_leads"),
        ),
        model_class=CRMLead,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    lead_row = (await db.execute(lead_query)).one()

    deal_query = apply_scope(
        select(
            func.count(CRMDeal.id).label("total_deals"),
            func.count(
                case((CRMDeal.stage.notin_([DealStage.WON, DealStage.LOST]), 1))
            ).label("open_deals"),
            func.count(
                case((CRMDeal.stage == DealStage.WON, 1))
            ).label("won_deals"),
            func.coalesce(
                func.sum(
                    case(
                        (
                            CRMDeal.stage.notin_([DealStage.WON, DealStage.LOST]),
                            CRMDeal.expected_value,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("pipeline_value"),
        ),
        model_class=CRMDeal,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    deal_row = (await db.execute(deal_query)).one()

    invoice_query = apply_scope(
        select(
            func.coalesce(
                func.sum(
                    case(
                        (
                            FinanceInvoice.status.in_(
                                [
                                    InvoiceStatus.SENT,
                                    InvoiceStatus.PARTIALLY_PAID,
                                    InvoiceStatus.OVERDUE,
                                ]
                            ),
                            func.greatest(
                                FinanceInvoice.total_amount - FinanceInvoice.paid_amount,
                                0,
                            ),
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("outstanding_invoice"),
            func.count(
                case(
                    (
                        (FinanceInvoice.due_date.is_not(None))
                        & (FinanceInvoice.due_date < date.today())
                        & FinanceInvoice.status.in_(
                            [
                                InvoiceStatus.SENT,
                                InvoiceStatus.PARTIALLY_PAID,
                                InvoiceStatus.OVERDUE,
                            ]
                        ),
                        1,
                    )
                )
            ).label("overdue_invoice"),
        ),
        model_class=FinanceInvoice,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    invoice_row = (await db.execute(invoice_query)).one()

    failed_query = apply_scope(
        select(func.count(DomainEventOutbox.id)).where(
            DomainEventOutbox.status == DomainEventStatus.FAILED
        ),
        model_class=DomainEventOutbox,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    failed_automation = int((await db.execute(failed_query)).scalar_one() or 0)

    current_net = current_revenue - current_expense
    previous_net = previous_revenue - previous_expense
    kpis = DashboardKpis(
        revenue=metric_comparison(current_revenue, previous_revenue),
        expense=metric_comparison(current_expense, previous_expense),
        net_cashflow=metric_comparison(current_net, previous_net),
        total_products=total_products,
        low_stock_items=low_stock_items,
        total_employees=int(employee_row.total_employees or 0),
        active_employees=int(employee_row.active_employees or 0),
        total_leads=int(lead_row.total_leads or 0),
        open_leads=int(lead_row.open_leads or 0),
        total_deals=int(deal_row.total_deals or 0),
        open_deals=int(deal_row.open_deals or 0),
        won_deals=int(deal_row.won_deals or 0),
        pipeline_value=float(deal_row.pipeline_value or 0),
        outstanding_invoice_amount=float(invoice_row.outstanding_invoice or 0),
        overdue_invoice_count=int(invoice_row.overdue_invoice or 0),
        failed_automation_events=failed_automation,
    )

    cashflow_series = await build_cashflow_series(
        db=db,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
        period=period,
    )
    crm_pipeline = await build_crm_pipeline(
        db=db,
        company_id=company_id,
        exact_branch_id=exact_branch_id,
        allowed_branch_ids=allowed_branch_ids,
    )
    revenue_change = calculate_change_percent(current_revenue, previous_revenue)

    return DashboardSummaryResponse(
        generated_at=datetime.now(timezone.utc),
        scope=DashboardScope(
            company_id=company_id,
            branch_id=exact_branch_id,
            mode="company" if company_id else "all_companies",
        ),
        period=DashboardPeriodResponse(
            start_date=period.start_date,
            end_date=period.end_date,
            previous_start_date=period.previous_start_date,
            previous_end_date=period.previous_end_date,
            bucket=period.bucket,
        ),
        kpis=kpis,
        cashflow_series=cashflow_series,
        crm_pipeline=crm_pipeline,
        operational_alerts=build_operational_alerts(kpis),
        company_id=company_id,
        branch_id=exact_branch_id,
        period_start=period.start_date,
        period_end=period.end_date,
        previous_period_start=period.previous_start_date,
        previous_period_end=period.previous_end_date,
        total_products=kpis.total_products,
        total_employees=kpis.total_employees,
        total_leads=kpis.total_leads,
        total_deals=kpis.total_deals,
        total_revenue=float(current_revenue),
        previous_total_revenue=float(previous_revenue),
        revenue_change_percent=revenue_change,
    )


def _has_module_permission(permissions: set[str], module: str) -> bool:
    return any(permission.startswith(f"{module}.") for permission in permissions)


def filter_dashboard_summary_for_permissions(
    summary: DashboardSummaryResponse,
    *,
    permissions: list[str],
    is_superuser: bool,
) -> DashboardSummaryResponse:
    """Remove KPI domains the authenticated role is not allowed to inspect.

    Tenant scope prevents cross-company reads; this second layer prevents a
    warehouse/HR role from learning finance or CRM aggregates inside its own
    company. The response shape stays stable so the frontend can render zeros
    instead of relying on fragile optional fields.
    """

    if is_superuser:
        return summary

    permission_set = set(permissions)
    can_finance = _has_module_permission(permission_set, "finance")
    can_products = _has_module_permission(permission_set, "products")
    can_hr = _has_module_permission(permission_set, "hr")
    can_crm = _has_module_permission(permission_set, "crm")
    can_automation = can_finance or _has_module_permission(
        permission_set,
        "automation",
    )

    zero_metric = DashboardMetricComparison()
    kpis = summary.kpis.model_copy(deep=True)

    if not can_finance:
        kpis.revenue = zero_metric.model_copy()
        kpis.expense = zero_metric.model_copy()
        kpis.net_cashflow = zero_metric.model_copy()
        kpis.outstanding_invoice_amount = 0
        kpis.overdue_invoice_count = 0

    if not can_products:
        kpis.total_products = 0
        kpis.low_stock_items = 0

    if not can_hr:
        kpis.total_employees = 0
        kpis.active_employees = 0

    if not can_crm:
        kpis.total_leads = 0
        kpis.open_leads = 0
        kpis.total_deals = 0
        kpis.open_deals = 0
        kpis.won_deals = 0
        kpis.pipeline_value = 0

    if not can_automation:
        kpis.failed_automation_events = 0

    allowed_alert_modules = {"system"}
    allowed_alert_modules.update({
        module
        for module, allowed in {
            "finance": can_finance,
            "products": can_products,
            "hr": can_hr,
            "crm": can_crm,
            "automation": can_automation,
        }.items()
        if allowed
    })

    return summary.model_copy(
        update={
            "kpis": kpis,
            "cashflow_series": summary.cashflow_series if can_finance else [],
            "crm_pipeline": summary.crm_pipeline if can_crm else [],
            "operational_alerts": [
                alert
                for alert in summary.operational_alerts
                if alert.module in allowed_alert_modules
            ],
            "total_products": kpis.total_products,
            "total_employees": kpis.total_employees,
            "total_leads": kpis.total_leads,
            "total_deals": kpis.total_deals,
            "total_revenue": summary.total_revenue if can_finance else 0,
            "previous_total_revenue": (
                summary.previous_total_revenue if can_finance else 0
            ),
            "revenue_change_percent": (
                summary.revenue_change_percent if can_finance else 0
            ),
        }
    )
