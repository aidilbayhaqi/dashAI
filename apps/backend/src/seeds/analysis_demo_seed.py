from __future__ import annotations

from calendar import monthrange
from datetime import date, datetime, time

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.crm.model_crm import (
    CRMActivity,
    CRMActivityStatus,
    CRMActivityType,
    CRMCampaign,
    CRMContact,
    CRMDeal,
    CRMDealItem,
    CRMLead,
    CampaignStatus,
    DealStage,
    LeadStatus,
)
from src.modules.finance.model_finance import (
    BudgetStatus,
    CashflowActivity,
    FinanceBudget,
    FinanceBudgetLine,
    FinanceCashAccount,
    FinanceCashflowSnapshot,
    FinanceInvoice,
    FinanceJournalEntry,
    FinanceJournalLine,
    FinanceProfitLossSnapshot,
    FinanceTaxRecord,
    FinanceTransaction,
    FinanceTransactionLine,
    InvoiceStatus,
    JournalStatus,
    TaxRecordStatus,
    TaxType,
    TransactionStatus,
    TransactionType,
)
from src.modules.hr.model_hr import (
    ApprovalStatus,
    HRTask,
    KPIIndicator,
    KPIReview,
    KPIReviewItem,
    LeaveRequest,
    LeaveType,
    PayrollRun,
    PayrollSlip,
    PayrollStatus,
    TaskStatus,
)
from src.modules.products.model_product import (
    Product,
    ProductCategory,
    ProductStatus,
    ProductStock,
    ProductStockMovement,
    ProductSupplier,
    ProductSupplierStatus,
    ProductType,
    StockMovementType,
)
from src.seeds.context import CompanySeedContext
from src.seeds.utils import D, add_many_if_missing, sid


async def _seed_products_and_suppliers(
    db: AsyncSession,
    ctx: CompanySeedContext,
) -> None:
    category_id = sid(f"product-category:{ctx.code}:office")
    product_id = sid(f"product:{ctx.code}:prd-005")

    await add_many_if_missing(
        db,
        [
            ProductCategory(
                id=category_id,
                company_id=ctx.company_id,
                parent_category_id=None,
                code=f"{ctx.code.upper()}-OFFICE",
                name="Office & Operational",
                description="Perlengkapan operasional untuk data demo.",
                is_active=True,
            ),
            Product(
                id=product_id,
                company_id=ctx.company_id,
                branch_id=None,
                category_id=category_id,
                created_by_id=ctx.user_ids["admin"],
                sku=f"{ctx.code.upper()}-OPS-005",
                barcode=f"BAR-{ctx.code.upper()}-OPS-005",
                name=f"Operational Starter Kit {ctx.code.upper()}",
                description="Produk fisik kelima untuk pengujian inventory.",
                product_type=ProductType.PHYSICAL,
                unit="set",
                cost_price=D("350000"),
                selling_price=D("625000"),
                track_stock=True,
                status=ProductStatus.ACTIVE,
                image_url=None,
            ),
        ],
    )
    await db.flush()

    suppliers = []
    for index in range(1, 6):
        suppliers.append(
            ProductSupplier(
                id=sid(f"product-supplier:{ctx.code}:{index:02d}"),
                company_id=ctx.company_id,
                name=f"Supplier Demo {ctx.code.upper()} {index}",
                category=("Hardware", "Material", "Office", "Service", "General")[index - 1],
                contact_person=f"Kontak Supplier {index}",
                email=f"supplier{index}@{ctx.code}.demo",
                phone=f"+62-812-55{index:02d}-0000",
                address=f"Alamat supplier demo nomor {index}",
                lead_time_days=2 + index,
                status=ProductSupplierStatus.ACTIVE,
            )
        )

    stocks = []
    movements = []
    for branch_key, quantity in (("hq", "30"), ("wh", "85")):
        stocks.append(
            ProductStock(
                id=sid(f"product-stock:{ctx.code}:prd-005:{branch_key}"),
                company_id=ctx.company_id,
                product_id=product_id,
                branch_id=ctx.branch_ids[branch_key],
                quantity_on_hand=D(quantity),
                reserved_quantity=D("3"),
                reorder_point=D("12"),
            )
        )
        movements.append(
            ProductStockMovement(
                id=sid(f"product-stock-movement:{ctx.code}:prd-005:{branch_key}:opening"),
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids[branch_key],
                product_id=product_id,
                created_by_id=ctx.user_ids["warehouse"],
                movement_type=StockMovementType.IN,
                movement_date=datetime(2026, 2, 3, 9, 0),
                quantity=D(quantity),
                unit_cost=D("350000"),
                total_cost=D(quantity) * D("350000"),
                source_module="seed",
                source_id=None,
                notes="Opening stock demo product kelima.",
            )
        )

    await add_many_if_missing(db, suppliers)
    await add_many_if_missing(db, stocks)
    await add_many_if_missing(db, movements)
    await db.flush()


async def _seed_crm_history(
    db: AsyncSession,
    ctx: CompanySeedContext,
) -> None:
    lead_statuses = [
        LeadStatus.NEW,
        LeadStatus.CONTACTED,
        LeadStatus.QUALIFIED,
        LeadStatus.CONVERTED,
        LeadStatus.UNQUALIFIED,
    ]
    deal_stages = [
        DealStage.PROSPECTING,
        DealStage.QUALIFICATION,
        DealStage.PROPOSAL,
        DealStage.NEGOTIATION,
        DealStage.WON,
    ]
    campaign_statuses = [
        CampaignStatus.COMPLETED,
        CampaignStatus.COMPLETED,
        CampaignStatus.ACTIVE,
        CampaignStatus.ACTIVE,
        CampaignStatus.DRAFT,
    ]

    leads = []
    contacts = []
    deals = []
    items = []
    activities = []
    campaigns = []

    product_ids = [
        ctx.product_ids["prd-001"],
        ctx.product_ids["prd-002"],
        ctx.product_ids["prd-003"],
        ctx.product_ids["prd-004"],
        sid(f"product:{ctx.code}:prd-005"),
    ]

    for index in range(1, 6):
        lead_id = sid(f"crm-lead:{ctx.code}:lead-{index:03d}")
        contact_id = sid(f"crm-contact:{ctx.code}:contact-{index:03d}")
        deal_id = sid(f"crm-deal:{ctx.code}:deal-{index:03d}")
        month = index
        amount = D(str(8_000_000 + index * 5_500_000))
        tax = amount * D("0.11")

        leads.append(
            CRMLead(
                id=lead_id,
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                owner_user_id=ctx.user_ids["sales"],
                name=f"Prospek Demo {index}",
                company_name=f"PT Customer Analitik {index}",
                email=f"prospek{index}@{ctx.code}.demo",
                phone=f"+62-811-70{index:02d}-0000",
                source=("website", "referral", "event", "social_media", "outbound")[index - 1],
                status=lead_statuses[index - 1],
                score=48 + index * 9,
                estimated_value=amount,
                next_follow_up_at=datetime(2026, month, 12, 10, 0),
                notes=f"Lead bulan {month} untuk bahan analisis pipeline.",
                created_at=datetime(2026, month, 4, 9, 0),
                updated_at=datetime(2026, month, 10, 14, 0),
            )
        )
        contacts.append(
            CRMContact(
                id=contact_id,
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                lead_id=lead_id,
                owner_user_id=ctx.user_ids["sales"],
                name=f"PIC Customer {index}",
                company_name=f"PT Customer Analitik {index}",
                position="Decision Maker",
                email=f"pic{index}@{ctx.code}.demo",
                phone=f"+62-811-71{index:02d}-0000",
                created_at=datetime(2026, month, 5, 9, 0),
            )
        )
        deals.append(
            CRMDeal(
                id=deal_id,
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                lead_id=lead_id,
                contact_id=contact_id,
                owner_user_id=ctx.user_ids["sales"],
                title=f"Deal Analitik Bulan {month}",
                stage=deal_stages[index - 1],
                expected_value=amount,
                probability_percent=D(str(35 + index * 11)),
                expected_close_date=date(2026, month, 24),
                closed_at=(datetime(2026, month, 25, 16, 0) if index == 5 else None),
                won_lost_reason=("Deal berhasil dikonversi." if index == 5 else None),
                finance_transaction_id=None,
                invoice_id=None,
                created_at=datetime(2026, month, 6, 9, 0),
                updated_at=datetime(2026, month, 15, 13, 0),
            )
        )
        items.append(
            CRMDealItem(
                id=sid(f"crm-deal-item:{ctx.code}:analysis:{index}"),
                deal_id=deal_id,
                product_id=product_ids[index - 1],
                description=f"Produk/jasa untuk deal bulan {month}",
                quantity=D("1"),
                unit_price=amount,
                discount_amount=D("0"),
                tax_amount=tax,
                total_amount=amount + tax,
            )
        )
        activities.append(
            CRMActivity(
                id=sid(f"crm-activity:{ctx.code}:analysis:{index}"),
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                lead_id=lead_id,
                contact_id=contact_id,
                deal_id=deal_id,
                assigned_user_id=ctx.user_ids["sales"],
                activity_type=(
                    CRMActivityType.CALL if index % 2 else CRMActivityType.MEETING
                ),
                status=(CRMActivityStatus.DONE if index <= 3 else CRMActivityStatus.PLANNED),
                subject=f"Follow-up prospek analitik {index}",
                due_at=datetime(2026, month, 14, 10, 0),
                completed_at=(datetime(2026, month, 14, 11, 0) if index <= 3 else None),
                notes="Aktivitas CRM untuk data demo lintas bulan.",
                created_at=datetime(2026, month, 7, 9, 0),
            )
        )
        campaigns.append(
            CRMCampaign(
                id=sid(f"crm-campaign:{ctx.code}:analysis:{index}"),
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                name=f"Campaign Growth Bulan {month}",
                channel=("Email", "Instagram", "Webinar", "Referral", "LinkedIn")[index - 1],
                budget_amount=D(str(2_000_000 + index * 750_000)),
                leads_count=8 + index * 4,
                start_date=date(2026, month, 1),
                end_date=date(2026, month, min(28, 18 + index)),
                status=campaign_statuses[index - 1],
                notes="Campaign historis untuk analisis performa marketing.",
                created_at=datetime(2026, month, 1, 8, 0),
                updated_at=datetime(2026, month, 20, 17, 0),
            )
        )

    await add_many_if_missing(db, leads)
    await db.flush()
    await add_many_if_missing(db, contacts)
    await db.flush()
    await add_many_if_missing(db, deals)
    await db.flush()
    await add_many_if_missing(db, items)
    await add_many_if_missing(db, activities)
    await add_many_if_missing(db, campaigns)
    await db.flush()


async def _seed_finance_history(
    db: AsyncSession,
    ctx: CompanySeedContext,
    created_by_id,
) -> None:
    cash_accounts = [
        FinanceCashAccount(
            id=sid(f"cash-account:{ctx.code}:bank-secondary"),
            company_id=ctx.company_id,
            account_id=ctx.account_ids["1120"],
            name="Bank Operasional Sekunder",
            bank_name="Bank Nusantara",
            account_number=f"9900-{ctx.code.upper()}-002",
            account_holder_name=f"Company {ctx.code.upper()}",
            currency="IDR",
            opening_balance=D("50000000"),
            current_balance=D("50000000"),
            is_active=True,
            is_default=False,
        ),
        FinanceCashAccount(
            id=sid(f"cash-account:{ctx.code}:sales-cash"),
            company_id=ctx.company_id,
            account_id=ctx.account_ids["1110"],
            name="Kas Penjualan",
            bank_name=None,
            account_number=None,
            account_holder_name=None,
            currency="IDR",
            opening_balance=D("5000000"),
            current_balance=D("5000000"),
            is_active=True,
            is_default=False,
        ),
        FinanceCashAccount(
            id=sid(f"cash-account:{ctx.code}:project-cash"),
            company_id=ctx.company_id,
            account_id=ctx.account_ids["1110"],
            name="Kas Proyek",
            bank_name=None,
            account_number=None,
            account_holder_name=None,
            currency="IDR",
            opening_balance=D("8000000"),
            current_balance=D("8000000"),
            is_active=True,
            is_default=False,
        ),
    ]
    await add_many_if_missing(db, cash_accounts)
    await db.flush()

    transactions = []
    transaction_lines = []
    journals = []
    journal_lines = []
    invoices = []
    tax_records = []
    cashflow_snapshots = []
    profit_loss_snapshots = []
    budgets = []
    budget_lines = []

    running_cash = D("250000000")

    for month in range(1, 6):
        income_id = sid(f"finance-transaction:{ctx.code}:analysis-income:{month}")
        expense_id = sid(f"finance-transaction:{ctx.code}:analysis-expense:{month}")
        invoice_id = sid(f"finance-invoice:{ctx.code}:analysis:{month}")
        income_journal_id = sid(f"finance-journal:{ctx.code}:analysis-income:{month}")
        expense_journal_id = sid(f"finance-journal:{ctx.code}:analysis-expense:{month}")
        budget_id = sid(f"finance-budget:{ctx.code}:analysis:{month}")

        income_subtotal = D(str(14_000_000 + month * 6_250_000))
        income_tax = income_subtotal * D("0.11")
        income_total = income_subtotal + income_tax
        expense_subtotal = D(str(6_500_000 + month * 1_850_000))
        expense_tax = expense_subtotal * D("0.11")
        expense_total = expense_subtotal + expense_tax
        transaction_date = date(2026, month, 10)
        expense_date = date(2026, month, 19)

        transactions.extend(
            [
                FinanceTransaction(
                    id=income_id,
                    company_id=ctx.company_id,
                    period_id=ctx.period_ids[month],
                    branch_id=ctx.branch_ids["hq"],
                    cash_account_id=ctx.cash_account_ids["main_bank"],
                    transaction_no=f"INC-{ctx.code.upper()}-2026-{month:03d}-A",
                    transaction_date=transaction_date,
                    transaction_type=TransactionType.INCOME,
                    cashflow_activity=CashflowActivity.OPERATING,
                    status=TransactionStatus.POSTED,
                    counterparty_name=f"Customer Bulan {month}",
                    reference_no=f"INV-{ctx.code.upper()}-2026-{month:03d}-A",
                    source_module="analysis_seed",
                    source_id=None,
                    subtotal_amount=income_subtotal,
                    discount_amount=D("0"),
                    tax_amount=income_tax,
                    total_amount=income_total,
                    description=f"Pendapatan historis bulan {month}",
                    posted_at=datetime.combine(transaction_date, time(10, 0)),
                    created_by=created_by_id,
                    created_at=datetime.combine(transaction_date, time(9, 30)),
                    updated_at=datetime.combine(transaction_date, time(10, 0)),
                ),
                FinanceTransaction(
                    id=expense_id,
                    company_id=ctx.company_id,
                    period_id=ctx.period_ids[month],
                    branch_id=ctx.branch_ids["hq"],
                    cash_account_id=ctx.cash_account_ids["main_bank"],
                    transaction_no=f"EXP-{ctx.code.upper()}-2026-{month:03d}-A",
                    transaction_date=expense_date,
                    transaction_type=TransactionType.EXPENSE,
                    cashflow_activity=CashflowActivity.OPERATING,
                    status=TransactionStatus.POSTED,
                    counterparty_name=f"Vendor Operasional Bulan {month}",
                    reference_no=f"BILL-{ctx.code.upper()}-2026-{month:03d}-A",
                    source_module="analysis_seed",
                    source_id=None,
                    subtotal_amount=expense_subtotal,
                    discount_amount=D("0"),
                    tax_amount=expense_tax,
                    total_amount=expense_total,
                    description=f"Pengeluaran historis bulan {month}",
                    posted_at=datetime.combine(expense_date, time(14, 0)),
                    created_by=created_by_id,
                    created_at=datetime.combine(expense_date, time(13, 30)),
                    updated_at=datetime.combine(expense_date, time(14, 0)),
                ),
            ]
        )

        transaction_lines.extend(
            [
                FinanceTransactionLine(
                    id=sid(f"finance-transaction-line:{ctx.code}:analysis-income:{month}"),
                    transaction_id=income_id,
                    account_id=ctx.account_ids["4100"],
                    tax_rate_id=ctx.tax_rate_ids["ppn"],
                    description=f"Pendapatan bulan {month}",
                    quantity=D("1"),
                    unit_price=income_subtotal,
                    amount=income_subtotal,
                    tax_amount=income_tax,
                    total_amount=income_total,
                ),
                FinanceTransactionLine(
                    id=sid(f"finance-transaction-line:{ctx.code}:analysis-expense:{month}"),
                    transaction_id=expense_id,
                    account_id=ctx.account_ids["6000"],
                    tax_rate_id=ctx.tax_rate_ids["ppn"],
                    description=f"Pengeluaran bulan {month}",
                    quantity=D("1"),
                    unit_price=expense_subtotal,
                    amount=expense_subtotal,
                    tax_amount=expense_tax,
                    total_amount=expense_total,
                ),
            ]
        )

        journals.extend(
            [
                FinanceJournalEntry(
                    id=income_journal_id,
                    company_id=ctx.company_id,
                    period_id=ctx.period_ids[month],
                    transaction_id=income_id,
                    journal_no=f"JRN-INC-{ctx.code.upper()}-{month:03d}-A",
                    journal_date=transaction_date,
                    status=JournalStatus.POSTED,
                    memo=f"Jurnal pendapatan bulan {month}",
                    total_debit=income_total,
                    total_credit=income_total,
                    is_balanced=True,
                    posted_at=datetime.combine(transaction_date, time(10, 5)),
                    created_by=created_by_id,
                ),
                FinanceJournalEntry(
                    id=expense_journal_id,
                    company_id=ctx.company_id,
                    period_id=ctx.period_ids[month],
                    transaction_id=expense_id,
                    journal_no=f"JRN-EXP-{ctx.code.upper()}-{month:03d}-A",
                    journal_date=expense_date,
                    status=JournalStatus.POSTED,
                    memo=f"Jurnal pengeluaran bulan {month}",
                    total_debit=expense_total,
                    total_credit=expense_total,
                    is_balanced=True,
                    posted_at=datetime.combine(expense_date, time(14, 5)),
                    created_by=created_by_id,
                ),
            ]
        )
        journal_lines.extend(
            [
                FinanceJournalLine(
                    id=sid(f"finance-journal-line:{ctx.code}:analysis-income:{month}:cash"),
                    journal_entry_id=income_journal_id,
                    account_id=ctx.account_ids["1120"],
                    description="Debit bank",
                    debit_amount=income_total,
                    credit_amount=D("0"),
                ),
                FinanceJournalLine(
                    id=sid(f"finance-journal-line:{ctx.code}:analysis-income:{month}:revenue"),
                    journal_entry_id=income_journal_id,
                    account_id=ctx.account_ids["4100"],
                    description="Kredit pendapatan",
                    debit_amount=D("0"),
                    credit_amount=income_subtotal,
                ),
                FinanceJournalLine(
                    id=sid(f"finance-journal-line:{ctx.code}:analysis-income:{month}:tax"),
                    journal_entry_id=income_journal_id,
                    account_id=ctx.account_ids["2200"],
                    description="Kredit PPN keluaran",
                    debit_amount=D("0"),
                    credit_amount=income_tax,
                ),
                FinanceJournalLine(
                    id=sid(f"finance-journal-line:{ctx.code}:analysis-expense:{month}:expense"),
                    journal_entry_id=expense_journal_id,
                    account_id=ctx.account_ids["6000"],
                    description="Debit beban operasional",
                    debit_amount=expense_total,
                    credit_amount=D("0"),
                ),
                FinanceJournalLine(
                    id=sid(f"finance-journal-line:{ctx.code}:analysis-expense:{month}:cash"),
                    journal_entry_id=expense_journal_id,
                    account_id=ctx.account_ids["1120"],
                    description="Kredit bank",
                    debit_amount=D("0"),
                    credit_amount=expense_total,
                ),
            ]
        )

        status_value = (
            InvoiceStatus.PAID
            if month <= 3
            else InvoiceStatus.SENT
            if month == 4
            else InvoiceStatus.OVERDUE
        )
        paid_amount = income_total if status_value == InvoiceStatus.PAID else D("0")
        invoices.append(
            FinanceInvoice(
                id=invoice_id,
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                invoice_no=f"INV-{ctx.code.upper()}-2026-{month:03d}-A",
                client_name=f"PT Customer Analitik {month}",
                invoice_date=transaction_date,
                due_date=date(2026, month, min(28, 24)),
                subtotal_amount=income_subtotal,
                tax_amount=income_tax,
                total_amount=income_total,
                paid_amount=paid_amount,
                status=status_value,
                source_module="analysis_seed",
                source_id=None,
                creation_mode="manual",
                attachment_url=None,
                notes=f"Invoice historis bulan {month} untuk analisis AI.",
                created_at=datetime.combine(transaction_date, time(9, 0)),
                updated_at=datetime.combine(transaction_date, time(10, 0)),
            )
        )
        tax_records.append(
            FinanceTaxRecord(
                id=sid(f"finance-tax-record:{ctx.code}:analysis:{month}"),
                company_id=ctx.company_id,
                period_id=ctx.period_ids[month],
                tax_rate_id=ctx.tax_rate_ids["ppn"],
                transaction_id=income_id,
                invoice_id=invoice_id,
                tax_type=TaxType.PPN,
                tax_period=f"2026-{month:02d}",
                taxable_amount=income_subtotal,
                tax_amount=income_tax,
                paid_amount=(income_tax if month <= 2 else D("0")),
                status=(TaxRecordStatus.PAID if month <= 2 else TaxRecordStatus.ACCRUED),
                due_date=date(2026, month + 1, 15),
                paid_date=(date(2026, month + 1, 10) if month <= 2 else None),
                reported_date=(date(2026, month + 1, 12) if month <= 2 else None),
                reference_no=f"PPN-{ctx.code.upper()}-2026-{month:02d}-A",
                notes="PPN data historis untuk analisis.",
            )
        )

        beginning_cash = running_cash
        net_cashflow = income_total - expense_total
        running_cash += net_cashflow
        report_date = date(2026, month, monthrange(2026, month)[1])
        cashflow_snapshots.append(
            FinanceCashflowSnapshot(
                id=sid(f"finance-cashflow-snapshot:{ctx.code}:analysis:{month}"),
                company_id=ctx.company_id,
                period_id=ctx.period_ids[month],
                report_date=report_date,
                beginning_cash_balance=beginning_cash,
                operating_cash_in=income_total,
                operating_cash_out=expense_total,
                investing_cash_in=D("0"),
                investing_cash_out=D("0"),
                financing_cash_in=D("0"),
                financing_cash_out=D("0"),
                net_cashflow=net_cashflow,
                ending_cash_balance=running_cash,
                generated_at=datetime.combine(report_date, time(23, 0)),
            )
        )
        gross_profit = income_subtotal * D("0.55")
        net_profit = gross_profit - expense_subtotal - income_tax
        profit_loss_snapshots.append(
            FinanceProfitLossSnapshot(
                id=sid(f"finance-profit-loss-snapshot:{ctx.code}:analysis:{month}"),
                company_id=ctx.company_id,
                period_id=ctx.period_ids[month],
                report_date=report_date,
                total_revenue=income_subtotal,
                total_cogs=income_subtotal * D("0.45"),
                gross_profit=gross_profit,
                operating_expense=expense_subtotal,
                operating_profit=gross_profit - expense_subtotal,
                other_income=D("0"),
                other_expense=D("0"),
                tax_expense=income_tax,
                net_profit=net_profit,
                gross_margin_percent=D("55.0000"),
                net_margin_percent=(net_profit / income_subtotal * D("100")),
                generated_at=datetime.combine(report_date, time(23, 5)),
            )
        )

        budget_amount = D(str(45_000_000 + month * 5_000_000))
        actual_amount = expense_subtotal
        variance = budget_amount - actual_amount
        budgets.append(
            FinanceBudget(
                id=budget_id,
                company_id=ctx.company_id,
                name=f"Budget Operasional Bulan {month}",
                fiscal_year=2026,
                status=BudgetStatus.ACTIVE,
                total_budget_amount=budget_amount,
                notes="Budget bulanan untuk dataset analisis.",
                created_at=datetime(2026, month, 1, 8, 0),
                updated_at=datetime(2026, month, 20, 17, 0),
            )
        )
        budget_lines.append(
            FinanceBudgetLine(
                id=sid(f"finance-budget-line:{ctx.code}:analysis:{month}"),
                budget_id=budget_id,
                account_id=ctx.account_ids["6000"],
                period_number=month,
                budget_amount=budget_amount,
                actual_amount=actual_amount,
                variance_amount=variance,
                variance_percent=(variance / budget_amount * D("100")),
            )
        )

    await add_many_if_missing(db, transactions)
    await db.flush()
    await add_many_if_missing(db, transaction_lines)
    await add_many_if_missing(db, journals)
    await db.flush()
    await add_many_if_missing(db, journal_lines)
    await add_many_if_missing(db, invoices)
    await db.flush()
    await add_many_if_missing(db, tax_records)
    await add_many_if_missing(db, cashflow_snapshots)
    await add_many_if_missing(db, profit_loss_snapshots)
    await add_many_if_missing(db, budgets)
    await db.flush()
    await add_many_if_missing(db, budget_lines)
    await db.flush()


async def _seed_hr_history(
    db: AsyncSession,
    ctx: CompanySeedContext,
) -> None:
    extra_leave_types = [
        LeaveType(
            id=sid(f"leave-type:{ctx.code}:special"),
            company_id=ctx.company_id,
            code="SPECIAL",
            name="Cuti Khusus",
            default_days_per_year=D("3"),
            is_paid=True,
            is_active=True,
        ),
        LeaveType(
            id=sid(f"leave-type:{ctx.code}:maternity"),
            company_id=ctx.company_id,
            code="MATERNITY",
            name="Cuti Melahirkan",
            default_days_per_year=D("90"),
            is_paid=True,
            is_active=True,
        ),
    ]
    await add_many_if_missing(db, extra_leave_types)

    tasks = []
    leave_requests = []
    indicators = []
    reviews = []
    review_items = []
    payroll_runs = []
    payroll_slips = []

    employee_keys = ["admin", "finance", "hr", "sales", "warehouse"]

    for index, employee_key in enumerate(employee_keys, start=1):
        employee_id = ctx.employee_ids[employee_key]
        month = index
        tasks.append(
            HRTask(
                id=sid(f"hr-task:{ctx.code}:analysis:{index}"),
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                employee_id=employee_id,
                assigned_by_id=ctx.user_ids["owner"],
                title=f"Target Operasional Bulan {month}",
                description="Task historis untuk monitoring KPI.",
                status=(TaskStatus.DONE if index <= 3 else TaskStatus.IN_PROGRESS),
                priority=("medium" if index <= 2 else "high"),
                due_date=date(2026, month, 25),
                weight_score=D("100"),
                completion_score=D(str(60 + index * 7)),
                created_at=datetime(2026, month, 2, 9, 0),
                updated_at=datetime(2026, month, 22, 16, 0),
            )
        )
        leave_requests.append(
            LeaveRequest(
                id=sid(f"leave-request:{ctx.code}:analysis:{index}"),
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                employee_id=employee_id,
                leave_type_id=ctx.leave_type_ids["annual"],
                approved_by_id=ctx.user_ids["hr"],
                start_date=date(2026, month, 14),
                end_date=date(2026, month, 14),
                total_days=D("1"),
                status=(ApprovalStatus.APPROVED if index <= 4 else ApprovalStatus.SUBMITTED),
                reason=f"Cuti demo bulan {month}",
                created_at=datetime(2026, month, 5, 9, 0),
                approved_at=(datetime(2026, month, 7, 10, 0) if index <= 4 else None),
            )
        )

        indicator_id = sid(f"kpi-indicator:{ctx.code}:analysis:{index}")
        review_id = sid(f"kpi-review:{ctx.code}:analysis:{index}")
        indicators.append(
            KPIIndicator(
                id=indicator_id,
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                code=f"KPI-{index:02d}",
                name=(
                    "Revenue Growth",
                    "Cost Efficiency",
                    "Attendance Quality",
                    "Customer Conversion",
                    "Inventory Accuracy",
                )[index - 1],
                category=("Finance", "Finance", "HR", "CRM", "Inventory")[index - 1],
                weight_percent=D("20"),
                target_value=D("100"),
                is_active=True,
            )
        )
        score = D(str(68 + index * 5))
        reviews.append(
            KPIReview(
                id=review_id,
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                employee_id=employee_id,
                reviewer_user_id=ctx.user_ids["owner"],
                period_start=date(2026, month, 1),
                period_end=date(2026, month, monthrange(2026, month)[1]),
                total_score=score,
                rating=("good" if score >= D("75") else "needs_improvement"),
                status=ApprovalStatus.APPROVED,
                created_at=datetime(2026, month, 28, 15, 0),
            )
        )
        review_items.append(
            KPIReviewItem(
                id=sid(f"kpi-review-item:{ctx.code}:analysis:{index}"),
                review_id=review_id,
                indicator_id=indicator_id,
                target_value=D("100"),
                actual_value=score,
                score=score,
                weighted_score=score * D("0.20"),
            )
        )

    # Existing base seed creates June. February-May add four more, resulting
    # in five monthly payroll runs (Feb-Jun).
    for month in range(2, 7):
        payroll_id = sid(f"payroll-run:{ctx.code}:2026-{month:02d}")
        gross = D("0")
        deductions = D("0")
        taxes = D("0")
        net = D("0")

        for employee_key in ["owner", "admin", "finance", "hr", "sales", "warehouse"]:
            base = D("15000000") if employee_key == "owner" else D("7500000")
            allowance = D("1000000") if employee_key in {"sales", "warehouse"} else D("750000")
            bonus = D(str(month * 100000)) if employee_key == "sales" else D("0")
            deduction = D("150000")
            tax = D("250000")
            employee_net = base + allowance + bonus - deduction - tax
            gross += base + allowance + bonus
            deductions += deduction
            taxes += tax
            net += employee_net
            payroll_slips.append(
                PayrollSlip(
                    id=sid(f"payroll-slip:{ctx.code}:2026-{month:02d}:{employee_key}"),
                    payroll_run_id=payroll_id,
                    employee_id=ctx.employee_ids[employee_key],
                    base_salary=base,
                    allowance_amount=allowance,
                    bonus_amount=bonus,
                    overtime_amount=D("0"),
                    deduction_amount=deduction,
                    tax_amount=tax,
                    net_pay=employee_net,
                )
            )

        last_day = monthrange(2026, month)[1]
        payroll_runs.append(
            PayrollRun(
                id=payroll_id,
                company_id=ctx.company_id,
                branch_id=ctx.branch_ids["hq"],
                created_by_id=ctx.user_ids["finance"],
                payroll_no=f"PAY-{ctx.code.upper()}-2026-{month:02d}",
                period_start=date(2026, month, 1),
                period_end=date(2026, month, last_day),
                status=PayrollStatus.PAID,
                total_gross=gross,
                total_deductions=deductions,
                total_tax=taxes,
                total_net=net,
                finance_transaction_id=None,
                created_at=datetime(2026, month, last_day, 14, 0),
                paid_at=datetime(2026, month, last_day, 15, 0),
            )
        )

    await add_many_if_missing(db, tasks)
    await add_many_if_missing(db, leave_requests)
    await add_many_if_missing(db, indicators)
    await db.flush()
    await add_many_if_missing(db, reviews)
    await db.flush()
    await add_many_if_missing(db, review_items)
    await add_many_if_missing(db, payroll_runs)
    await db.flush()
    await add_many_if_missing(db, payroll_slips)
    await db.flush()


async def seed_analysis_demo_data(
    db: AsyncSession,
    contexts: dict[str, CompanySeedContext],
    system_user_ids: dict[str, object],
) -> None:
    """Add idempotent five-period demo data for dashboard and AI analysis."""

    for ctx in contexts.values():
        await _seed_products_and_suppliers(db, ctx)
        await _seed_crm_history(db, ctx)
        await _seed_finance_history(db, ctx, system_user_ids["superuser"])
        await _seed_hr_history(db, ctx)

    await db.flush()
