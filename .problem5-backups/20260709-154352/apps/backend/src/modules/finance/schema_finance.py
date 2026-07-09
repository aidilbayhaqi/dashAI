from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from src.modules.finance.model_finance import (
    AccountType,
    BudgetStatus,
    CashflowActivity,
    InvoiceStatus,
    JournalStatus,
    NormalBalance,
    PeriodStatus,
    TaxRecordStatus,
    TaxType,
    TransactionStatus,
    TransactionType,
    InvoiceStatus,
)


class ORMBase(BaseModel):
    model_config = {
        "from_attributes": True
    }


# =========================================================
# 1. ACCOUNTING PERIOD
# =========================================================

class FinanceAccountingPeriodCreate(BaseModel):
    company_id: UUID
    fiscal_year: int
    period_number: int
    name: str
    start_date: date
    end_date: date
    status: PeriodStatus = PeriodStatus.OPEN
    is_active: bool = True


class FinanceAccountingPeriodUpdate(BaseModel):
    fiscal_year: int | None = None
    period_number: int | None = None
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: PeriodStatus | None = None
    is_active: bool | None = None


class FinanceAccountingPeriodResponse(FinanceAccountingPeriodCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


# =========================================================
# 2. ACCOUNTS / CHART OF ACCOUNTS
# =========================================================

class FinanceAccountCreate(BaseModel):
    company_id: UUID
    parent_account_id: UUID | None = None
    code: str
    name: str
    account_type: AccountType
    normal_balance: NormalBalance
    description: str | None = None
    is_cash_account: bool = False
    is_bank_account: bool = False
    is_tax_account: bool = False
    is_active: bool = True


class FinanceAccountUpdate(BaseModel):
    parent_account_id: UUID | None = None
    code: str | None = None
    name: str | None = None
    account_type: AccountType | None = None
    normal_balance: NormalBalance | None = None
    description: str | None = None
    is_cash_account: bool | None = None
    is_bank_account: bool | None = None
    is_tax_account: bool | None = None
    is_active: bool | None = None


class FinanceAccountResponse(FinanceAccountCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


# =========================================================
# 3. TAX RATES
# =========================================================

class FinanceTaxRateCreate(BaseModel):
    company_id: UUID
    name: str
    tax_type: TaxType
    rate_percent: Decimal = Field(default=Decimal("0.0000"))
    effective_from: date
    effective_to: date | None = None
    is_active: bool = True


class FinanceTaxRateUpdate(BaseModel):
    name: str | None = None
    tax_type: TaxType | None = None
    rate_percent: Decimal | None = None
    effective_from: date | None = None
    effective_to: date | None = None
    is_active: bool | None = None


class FinanceTaxRateResponse(FinanceTaxRateCreate, ORMBase):
    id: UUID
    created_at: datetime


# =========================================================
# 4. CASH ACCOUNTS
# =========================================================

class FinanceCashAccountCreate(BaseModel):
    company_id: UUID
    account_id: UUID
    name: str
    bank_name: str | None = None
    account_number: str | None = None
    account_holder_name: str | None = None
    currency: str = "IDR"
    opening_balance: Decimal = Decimal("0.00")
    current_balance: Decimal = Decimal("0.00")
    is_active: bool = True


class FinanceCashAccountUpdate(BaseModel):
    account_id: UUID | None = None
    name: str | None = None
    bank_name: str | None = None
    account_number: str | None = None
    account_holder_name: str | None = None
    currency: str | None = None
    opening_balance: Decimal | None = None
    current_balance: Decimal | None = None
    is_active: bool | None = None


class FinanceCashAccountResponse(FinanceCashAccountCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


# =========================================================
# 5. TRANSACTIONS
# =========================================================

class FinanceTransactionCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    period_id: UUID | None = None
    cash_account_id: UUID | None = None
    transaction_no: str
    transaction_date: date
    transaction_type: TransactionType
    cashflow_activity: CashflowActivity = CashflowActivity.OPERATING
    status: TransactionStatus = TransactionStatus.DRAFT
    counterparty_name: str | None = None
    reference_no: str | None = None
    proof_url: str | None = None
    attachment_url: str | None = None
    source_module: str | None = None
    source_id: UUID | None = None
    subtotal_amount: Decimal = Decimal("0.00")
    discount_amount: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")
    total_amount: Decimal = Decimal("0.00")
    description: str | None = None
    posted_at: datetime | None = None
    created_by: UUID | None = None


class FinanceTransactionUpdate(BaseModel):
    branch_id: UUID | None = None
    period_id: UUID | None = None
    cash_account_id: UUID | None = None
    transaction_no: str | None = None
    transaction_date: date | None = None
    transaction_type: TransactionType | None = None
    cashflow_activity: CashflowActivity | None = None
    status: TransactionStatus | None = None
    counterparty_name: str | None = None
    reference_no: str | None = None
    proof_url: str | None = None
    attachment_url: str | None = None
    source_module: str | None = None
    source_id: UUID | None = None
    subtotal_amount: Decimal | None = None
    discount_amount: Decimal | None = None
    tax_amount: Decimal | None = None
    total_amount: Decimal | None = None
    description: str | None = None
    posted_at: datetime | None = None
    created_by: UUID | None = None


class FinanceTransactionResponse(FinanceTransactionCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


# =========================================================
# 6. TRANSACTION LINES
# =========================================================

class FinanceTransactionLineCreate(BaseModel):
    transaction_id: UUID
    account_id: UUID
    tax_rate_id: UUID | None = None
    description: str | None = None
    quantity: Decimal = Decimal("1.0000")
    unit_price: Decimal = Decimal("0.00")
    amount: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")
    total_amount: Decimal = Decimal("0.00")


class FinanceTransactionLineUpdate(BaseModel):
    account_id: UUID | None = None
    tax_rate_id: UUID | None = None
    description: str | None = None
    quantity: Decimal | None = None
    unit_price: Decimal | None = None
    amount: Decimal | None = None
    tax_amount: Decimal | None = None
    total_amount: Decimal | None = None


class FinanceTransactionLineResponse(FinanceTransactionLineCreate, ORMBase):
    id: UUID


# =========================================================
# 7. JOURNAL ENTRIES
# =========================================================

class FinanceJournalEntryCreate(BaseModel):
    company_id: UUID
    period_id: UUID | None = None
    transaction_id: UUID | None = None
    journal_no: str
    journal_date: date
    status: JournalStatus = JournalStatus.DRAFT
    memo: str | None = None
    total_debit: Decimal = Decimal("0.00")
    total_credit: Decimal = Decimal("0.00")
    is_balanced: bool = False
    posted_at: datetime | None = None
    created_by: UUID | None = None


class FinanceJournalEntryUpdate(BaseModel):
    period_id: UUID | None = None
    transaction_id: UUID | None = None
    journal_no: str | None = None
    journal_date: date | None = None
    status: JournalStatus | None = None
    memo: str | None = None
    total_debit: Decimal | None = None
    total_credit: Decimal | None = None
    is_balanced: bool | None = None
    posted_at: datetime | None = None
    created_by: UUID | None = None


class FinanceJournalEntryResponse(FinanceJournalEntryCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


# =========================================================
# 8. JOURNAL LINES
# =========================================================

class FinanceJournalLineCreate(BaseModel):
    journal_entry_id: UUID
    account_id: UUID
    description: str | None = None
    debit_amount: Decimal = Decimal("0.00")
    credit_amount: Decimal = Decimal("0.00")


class FinanceJournalLineUpdate(BaseModel):
    account_id: UUID | None = None
    description: str | None = None
    debit_amount: Decimal | None = None
    credit_amount: Decimal | None = None


class FinanceJournalLineResponse(FinanceJournalLineCreate, ORMBase):
    id: UUID


# =========================================================
# 9. TAX RECORDS
# =========================================================

class FinanceTaxRecordCreate(BaseModel):
    company_id: UUID
    period_id: UUID | None = None
    tax_rate_id: UUID | None = None
    transaction_id: UUID | None = None
    tax_type: TaxType
    tax_period: str
    taxable_amount: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")
    paid_amount: Decimal = Decimal("0.00")
    status: TaxRecordStatus = TaxRecordStatus.DRAFT
    due_date: date | None = None
    paid_date: date | None = None
    reported_date: date | None = None
    reference_no: str | None = None
    notes: str | None = None


class FinanceTaxRecordUpdate(BaseModel):
    period_id: UUID | None = None
    tax_rate_id: UUID | None = None
    transaction_id: UUID | None = None
    tax_type: TaxType | None = None
    tax_period: str | None = None
    taxable_amount: Decimal | None = None
    tax_amount: Decimal | None = None
    paid_amount: Decimal | None = None
    status: TaxRecordStatus | None = None
    due_date: date | None = None
    paid_date: date | None = None
    reported_date: date | None = None
    reference_no: str | None = None
    notes: str | None = None


class FinanceTaxRecordResponse(FinanceTaxRecordCreate, ORMBase):
    id: UUID
    created_at: datetime


# =========================================================
# 10. BUDGETS
# =========================================================

class FinanceBudgetCreate(BaseModel):
    company_id: UUID
    name: str
    fiscal_year: int
    status: BudgetStatus = BudgetStatus.DRAFT
    total_budget_amount: Decimal = Decimal("0.00")
    notes: str | None = None


class FinanceBudgetUpdate(BaseModel):
    name: str | None = None
    fiscal_year: int | None = None
    status: BudgetStatus | None = None
    total_budget_amount: Decimal | None = None
    notes: str | None = None


class FinanceBudgetResponse(FinanceBudgetCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime


# =========================================================
# 11. BUDGET LINES
# =========================================================

class FinanceBudgetLineCreate(BaseModel):
    budget_id: UUID
    account_id: UUID
    period_number: int | None = None
    budget_amount: Decimal = Decimal("0.00")
    actual_amount: Decimal = Decimal("0.00")
    variance_amount: Decimal = Decimal("0.00")
    variance_percent: Decimal = Decimal("0.0000")


class FinanceBudgetLineUpdate(BaseModel):
    account_id: UUID | None = None
    period_number: int | None = None
    budget_amount: Decimal | None = None
    actual_amount: Decimal | None = None
    variance_amount: Decimal | None = None
    variance_percent: Decimal | None = None


class FinanceBudgetLineResponse(FinanceBudgetLineCreate, ORMBase):
    id: UUID


# =========================================================
# 12. PROFIT LOSS SNAPSHOTS
# =========================================================

class FinanceProfitLossSnapshotCreate(BaseModel):
    company_id: UUID
    period_id: UUID | None = None
    report_date: date
    total_revenue: Decimal = Decimal("0.00")
    total_cogs: Decimal = Decimal("0.00")
    gross_profit: Decimal = Decimal("0.00")
    operating_expense: Decimal = Decimal("0.00")
    operating_profit: Decimal = Decimal("0.00")
    other_income: Decimal = Decimal("0.00")
    other_expense: Decimal = Decimal("0.00")
    tax_expense: Decimal = Decimal("0.00")
    net_profit: Decimal = Decimal("0.00")
    gross_margin_percent: Decimal = Decimal("0.0000")
    net_margin_percent: Decimal = Decimal("0.0000")


class FinanceProfitLossSnapshotUpdate(BaseModel):
    period_id: UUID | None = None
    report_date: date | None = None
    total_revenue: Decimal | None = None
    total_cogs: Decimal | None = None
    gross_profit: Decimal | None = None
    operating_expense: Decimal | None = None
    operating_profit: Decimal | None = None
    other_income: Decimal | None = None
    other_expense: Decimal | None = None
    tax_expense: Decimal | None = None
    net_profit: Decimal | None = None
    gross_margin_percent: Decimal | None = None
    net_margin_percent: Decimal | None = None


class FinanceProfitLossSnapshotResponse(FinanceProfitLossSnapshotCreate, ORMBase):
    id: UUID
    generated_at: datetime


# =========================================================
# 13. CASHFLOW SNAPSHOTS
# =========================================================

class FinanceCashflowSnapshotCreate(BaseModel):
    company_id: UUID
    period_id: UUID | None = None
    report_date: date
    beginning_cash_balance: Decimal = Decimal("0.00")
    operating_cash_in: Decimal = Decimal("0.00")
    operating_cash_out: Decimal = Decimal("0.00")
    investing_cash_in: Decimal = Decimal("0.00")
    investing_cash_out: Decimal = Decimal("0.00")
    financing_cash_in: Decimal = Decimal("0.00")
    financing_cash_out: Decimal = Decimal("0.00")
    net_cashflow: Decimal = Decimal("0.00")
    ending_cash_balance: Decimal = Decimal("0.00")


class FinanceCashflowSnapshotUpdate(BaseModel):
    period_id: UUID | None = None
    report_date: date | None = None
    beginning_cash_balance: Decimal | None = None
    operating_cash_in: Decimal | None = None
    operating_cash_out: Decimal | None = None
    investing_cash_in: Decimal | None = None
    investing_cash_out: Decimal | None = None
    financing_cash_in: Decimal | None = None
    financing_cash_out: Decimal | None = None
    net_cashflow: Decimal | None = None
    ending_cash_balance: Decimal | None = None


class FinanceCashflowSnapshotResponse(FinanceCashflowSnapshotCreate, ORMBase):
    id: UUID
    generated_at: datetime


# =========================================================
# 14. MARGIN SNAPSHOTS
# =========================================================

class FinanceMarginSnapshotCreate(BaseModel):
    company_id: UUID
    period_id: UUID | None = None
    report_date: date
    object_type: str = "company"
    object_id: UUID | None = None
    object_name: str | None = None
    revenue_amount: Decimal = Decimal("0.00")
    cogs_amount: Decimal = Decimal("0.00")
    gross_profit: Decimal = Decimal("0.00")
    gross_margin_percent: Decimal = Decimal("0.0000")


class FinanceMarginSnapshotUpdate(BaseModel):
    period_id: UUID | None = None
    report_date: date | None = None
    object_type: str | None = None
    object_id: UUID | None = None
    object_name: str | None = None
    revenue_amount: Decimal | None = None
    cogs_amount: Decimal | None = None
    gross_profit: Decimal | None = None
    gross_margin_percent: Decimal | None = None


class FinanceMarginSnapshotResponse(FinanceMarginSnapshotCreate, ORMBase):
    id: UUID
    generated_at: datetime


# =========================================================
# 15. BALANCE SHEET SNAPSHOTS
# =========================================================

class FinanceBalanceSheetSnapshotCreate(BaseModel):
    company_id: UUID
    period_id: UUID | None = None
    report_date: date
    total_assets: Decimal = Decimal("0.00")
    total_liabilities: Decimal = Decimal("0.00")
    total_equity: Decimal = Decimal("0.00")
    retained_earnings: Decimal = Decimal("0.00")
    is_balanced: bool = False


class FinanceBalanceSheetSnapshotUpdate(BaseModel):
    period_id: UUID | None = None
    report_date: date | None = None
    total_assets: Decimal | None = None
    total_liabilities: Decimal | None = None
    total_equity: Decimal | None = None
    retained_earnings: Decimal | None = None
    is_balanced: bool | None = None


class FinanceBalanceSheetSnapshotResponse(FinanceBalanceSheetSnapshotCreate, ORMBase):
    id: UUID
    generated_at: datetime

# =========================================================
# 16. INVOICE STATUS
# =========================================================
class FinanceInvoiceCreate(BaseModel):
    company_id: UUID
    branch_id: UUID | None = None
    invoice_no: str
    client_name: str
    invoice_date: date
    due_date: date | None = None
    subtotal_amount: Decimal = Decimal("0.00")
    tax_amount: Decimal = Decimal("0.00")
    total_amount: Decimal = Decimal("0.00")
    paid_amount: Decimal = Decimal("0.00")
    status: InvoiceStatus = InvoiceStatus.DRAFT
    source_module: str | None = None
    source_id: UUID | None = None
    attachment_url: str | None = None
    notes: str | None = None


class FinanceInvoiceUpdate(BaseModel):
    branch_id: UUID | None = None
    invoice_no: str | None = None
    client_name: str | None = None
    invoice_date: date | None = None
    due_date: date | None = None
    subtotal_amount: Decimal | None = None
    tax_amount: Decimal | None = None
    total_amount: Decimal | None = None
    paid_amount: Decimal | None = None
    status: InvoiceStatus | None = None
    source_module: str | None = None
    source_id: UUID | None = None
    attachment_url: str | None = None
    notes: str | None = None


class FinanceInvoiceResponse(FinanceInvoiceCreate, ORMBase):
    id: UUID
    created_at: datetime
    updated_at: datetime