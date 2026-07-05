import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class AccountType(str, enum.Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    REVENUE = "revenue"
    EXPENSE = "expense"
    COST_OF_GOODS_SOLD = "cost_of_goods_sold"
    TAX = "tax"


class NormalBalance(str, enum.Enum):
    DEBIT = "debit"
    CREDIT = "credit"


class PeriodStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    LOCKED = "locked"


class TransactionType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"
    TRANSFER = "transfer"
    TAX_PAYMENT = "tax_payment"
    REFUND = "refund"
    ADJUSTMENT = "adjustment"


class TransactionStatus(str, enum.Enum):
    DRAFT = "draft"
    POSTED = "posted"
    VOID = "void"
    CANCELLED = "cancelled"


class JournalStatus(str, enum.Enum):
    DRAFT = "draft"
    POSTED = "posted"
    REVERSED = "reversed"


class TaxType(str, enum.Enum):
    PPN = "ppn"
    PPH_21 = "pph_21"
    PPH_22 = "pph_22"
    PPH_23 = "pph_23"
    PPH_25 = "pph_25"
    PPH_FINAL = "pph_final"
    OTHER = "other"


class TaxRecordStatus(str, enum.Enum):
    DRAFT = "draft"
    ACCRUED = "accrued"
    PAID = "paid"
    REPORTED = "reported"
    CANCELLED = "cancelled"


class CashflowActivity(str, enum.Enum):
    OPERATING = "operating"
    INVESTING = "investing"
    FINANCING = "financing"


class BudgetStatus(str, enum.Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    CLOSED = "closed"
    CANCELLED = "cancelled"

class InvoiceStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


class FinanceAccountingPeriod(Base):
    __tablename__ = "finance_accounting_periods"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)
    period_number: Mapped[int] = mapped_column(Integer, nullable=False)

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)

    status: Mapped[PeriodStatus] = mapped_column(
        Enum(PeriodStatus, name="period_status_enum"),
        nullable=False,
        default=PeriodStatus.OPEN,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    company = relationship("Company")

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "fiscal_year",
            "period_number",
            name="uq_finance_period_company_year_period",
        ),
    )


class FinanceAccount(Base):
    __tablename__ = "finance_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    parent_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    code: Mapped[str] = mapped_column(String(50), nullable=False)
    name: Mapped[str] = mapped_column(String(150), nullable=False)

    account_type: Mapped[AccountType] = mapped_column(
        Enum(AccountType, name="finance_account_type_enum"),
        nullable=False,
    )

    normal_balance: Mapped[NormalBalance] = mapped_column(
        Enum(NormalBalance, name="finance_normal_balance_enum"),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_cash_account: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_bank_account: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_tax_account: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    company = relationship("Company")
    parent_account = relationship("FinanceAccount", remote_side=[id])

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "code",
            name="uq_finance_account_company_code",
        ),
        Index("ix_finance_accounts_company_type", "company_id", "account_type"),
    )


class FinanceTaxRate(Base):
    __tablename__ = "finance_tax_rates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)

    tax_type: Mapped[TaxType] = mapped_column(
        Enum(TaxType, name="finance_tax_type_enum"),
        nullable=False,
    )

    rate_percent: Mapped[Decimal] = mapped_column(
        Numeric(7, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )

    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    company = relationship("Company")

    __table_args__ = (
        Index("ix_finance_tax_rates_company_type", "company_id", "tax_type"),
    )


class FinanceCashAccount(Base):
    __tablename__ = "finance_cash_accounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)

    bank_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    account_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    account_holder_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="IDR")

    opening_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    current_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    company = relationship("Company")
    account = relationship("FinanceAccount")

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "name",
            name="uq_finance_cash_account_company_name",
        ),
    )


class FinanceTransaction(Base):
    __tablename__ = "finance_transactions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounting_periods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("company_branches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    cash_account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_cash_accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    transaction_no: Mapped[str] = mapped_column(String(100), nullable=False)
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False)

    transaction_type: Mapped[TransactionType] = mapped_column(
        Enum(TransactionType, name="finance_transaction_type_enum"),
        nullable=False,
    )

    cashflow_activity: Mapped[CashflowActivity] = mapped_column(
        Enum(CashflowActivity, name="finance_cashflow_activity_enum"),
        nullable=False,
        default=CashflowActivity.OPERATING,
    )

    status: Mapped[TransactionStatus] = mapped_column(
        Enum(TransactionStatus, name="finance_transaction_status_enum"),
        nullable=False,
        default=TransactionStatus.DRAFT,
    )

    counterparty_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    reference_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    proof_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    source_module: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    subtotal_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    discount_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    posted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    company = relationship("Company")
    period = relationship("FinanceAccountingPeriod")
    cash_account = relationship("FinanceCashAccount")
    lines = relationship(
        "FinanceTransactionLine",
        back_populates="transaction",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "transaction_no",
            name="uq_finance_transaction_company_no",
        ),
        Index(
            "ix_finance_transactions_company_date_type",
            "company_id",
            "transaction_date",
            "transaction_type",
        ),
    )

class FinanceInvoice(Base):
    __tablename__ = "finance_invoices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    branch_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("company_branches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    invoice_no: Mapped[str] = mapped_column(String(100), nullable=False)
    client_name: Mapped[str] = mapped_column(String(150), nullable=False)

    invoice_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    subtotal_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    tax_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    total_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))
    paid_amount: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False, default=Decimal("0.00"))

    status: Mapped[InvoiceStatus] = mapped_column(
        Enum(InvoiceStatus, name="finance_invoice_status_enum"),
        nullable=False,
        default=InvoiceStatus.DRAFT,
    )

    source_module: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    attachment_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    company = relationship("Company")
    branch = relationship("CompanyBranch")

    __table_args__ = (
        UniqueConstraint("company_id", "invoice_no", name="uq_finance_invoice_company_no"),
        Index("ix_finance_invoices_company_status", "company_id", "status"),
        Index("ix_finance_invoices_company_due", "company_id", "due_date"),
    )
    
class FinanceTransactionLine(Base):
    __tablename__ = "finance_transaction_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    transaction_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_transactions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    tax_rate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_tax_rates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    quantity: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
        default=Decimal("1.0000"),
    )

    unit_price: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    total_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    transaction = relationship("FinanceTransaction", back_populates="lines")
    account = relationship("FinanceAccount")
    tax_rate = relationship("FinanceTaxRate")


class FinanceJournalEntry(Base):
    __tablename__ = "finance_journal_entries"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounting_periods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    journal_no: Mapped[str] = mapped_column(String(100), nullable=False)
    journal_date: Mapped[date] = mapped_column(Date, nullable=False)

    status: Mapped[JournalStatus] = mapped_column(
        Enum(JournalStatus, name="finance_journal_status_enum"),
        nullable=False,
        default=JournalStatus.DRAFT,
    )

    memo: Mapped[str | None] = mapped_column(Text, nullable=True)

    total_debit: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    total_credit: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    is_balanced: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    posted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    company = relationship("Company")
    period = relationship("FinanceAccountingPeriod")
    transaction = relationship("FinanceTransaction")
    lines = relationship(
        "FinanceJournalLine",
        back_populates="journal_entry",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "journal_no",
            name="uq_finance_journal_company_no",
        ),
        Index(
            "ix_finance_journal_company_date",
            "company_id",
            "journal_date",
        ),
    )


class FinanceJournalLine(Base):
    __tablename__ = "finance_journal_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    journal_entry_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_journal_entries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    debit_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    credit_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    journal_entry = relationship("FinanceJournalEntry", back_populates="lines")
    account = relationship("FinanceAccount")


class FinanceTaxRecord(Base):
    __tablename__ = "finance_tax_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounting_periods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    tax_rate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_tax_rates.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    transaction_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_transactions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    tax_type: Mapped[TaxType] = mapped_column(
        Enum(TaxType, name="finance_tax_record_type_enum"),
        nullable=False,
    )

    tax_period: Mapped[str] = mapped_column(String(20), nullable=False)

    taxable_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    tax_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    paid_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    status: Mapped[TaxRecordStatus] = mapped_column(
        Enum(TaxRecordStatus, name="finance_tax_record_status_enum"),
        nullable=False,
        default=TaxRecordStatus.DRAFT,
    )

    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    paid_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    reported_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    reference_no: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    company = relationship("Company")
    period = relationship("FinanceAccountingPeriod")
    tax_rate = relationship("FinanceTaxRate")
    transaction = relationship("FinanceTransaction")

    __table_args__ = (
        Index(
            "ix_finance_tax_records_company_period_type",
            "company_id",
            "tax_period",
            "tax_type",
        ),
    )


class FinanceBudget(Base):
    __tablename__ = "finance_budgets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)

    fiscal_year: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[BudgetStatus] = mapped_column(
        Enum(BudgetStatus, name="finance_budget_status_enum"),
        nullable=False,
        default=BudgetStatus.DRAFT,
    )

    total_budget_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    company = relationship("Company")
    lines = relationship(
        "FinanceBudgetLine",
        back_populates="budget",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "fiscal_year",
            "name",
            name="uq_finance_budget_company_year_name",
        ),
    )


class FinanceBudgetLine(Base):
    __tablename__ = "finance_budget_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    budget_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_budgets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    account_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounts.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    period_number: Mapped[int | None] = mapped_column(Integer, nullable=True)

    budget_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    actual_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    variance_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    variance_percent: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )

    budget = relationship("FinanceBudget", back_populates="lines")
    account = relationship("FinanceAccount")


class FinanceProfitLossSnapshot(Base):
    __tablename__ = "finance_profit_loss_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounting_periods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    report_date: Mapped[date] = mapped_column(Date, nullable=False)

    total_revenue: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    total_cogs: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    gross_profit: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    operating_expense: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    operating_profit: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    other_income: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    other_expense: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    tax_expense: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    net_profit: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    gross_margin_percent: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )

    net_margin_percent: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )

    generated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    company = relationship("Company")
    period = relationship("FinanceAccountingPeriod")

    __table_args__ = (
        Index(
            "ix_finance_pl_snapshots_company_date",
            "company_id",
            "report_date",
        ),
    )


class FinanceCashflowSnapshot(Base):
    __tablename__ = "finance_cashflow_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounting_periods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    report_date: Mapped[date] = mapped_column(Date, nullable=False)

    beginning_cash_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    operating_cash_in: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    operating_cash_out: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    investing_cash_in: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    investing_cash_out: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    financing_cash_in: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    financing_cash_out: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    net_cashflow: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    ending_cash_balance: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    generated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    company = relationship("Company")
    period = relationship("FinanceAccountingPeriod")

    __table_args__ = (
        Index(
            "ix_finance_cashflow_snapshots_company_date",
            "company_id",
            "report_date",
        ),
    )


class FinanceMarginSnapshot(Base):
    __tablename__ = "finance_margin_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounting_periods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    report_date: Mapped[date] = mapped_column(Date, nullable=False)

    object_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="company",
    )

    object_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
        index=True,
    )

    object_name: Mapped[str | None] = mapped_column(String(150), nullable=True)

    revenue_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    cogs_amount: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    gross_profit: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    gross_margin_percent: Mapped[Decimal] = mapped_column(
        Numeric(10, 4),
        nullable=False,
        default=Decimal("0.0000"),
    )

    generated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    company = relationship("Company")
    period = relationship("FinanceAccountingPeriod")

    __table_args__ = (
        Index(
            "ix_finance_margin_snapshots_company_object",
            "company_id",
            "object_type",
            "object_id",
        ),
    )

class FinanceBalanceSheetSnapshot(Base):
    __tablename__ = "finance_balance_sheet_snapshots"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    period_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("finance_accounting_periods.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    report_date: Mapped[date] = mapped_column(Date, nullable=False)

    total_assets: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    total_liabilities: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    total_equity: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    retained_earnings: Mapped[Decimal] = mapped_column(
        Numeric(18, 2),
        nullable=False,
        default=Decimal("0.00"),
    )

    is_balanced: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )

    generated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )

    company = relationship("Company")
    period = relationship("FinanceAccountingPeriod")

    __table_args__ = (
        Index(
            "ix_finance_balance_sheet_snapshots_company_date",
            "company_id",
            "report_date",
        ),
    )