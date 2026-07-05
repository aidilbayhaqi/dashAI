from fastapi import APIRouter

from src.routes.crud_factory import create_crud_router

from src.modules.finance.model_finance import (
    FinanceAccountingPeriod,
    FinanceAccount,
    FinanceTaxRate,
    FinanceCashAccount,
    FinanceTransaction,
    FinanceTransactionLine,
    FinanceJournalEntry,
    FinanceJournalLine,
    FinanceTaxRecord,
    FinanceBudget,
    FinanceBudgetLine,
    FinanceProfitLossSnapshot,
    FinanceCashflowSnapshot,
    FinanceMarginSnapshot,
    FinanceBalanceSheetSnapshot,
    FinanceInvoice,
)

from src.modules.finance.schema_finance import (
    FinanceAccountingPeriodCreate,
    FinanceAccountingPeriodUpdate,
    FinanceAccountingPeriodResponse,
    FinanceAccountCreate,
    FinanceAccountUpdate,
    FinanceAccountResponse,
    FinanceTaxRateCreate,
    FinanceTaxRateUpdate,
    FinanceTaxRateResponse,
    FinanceCashAccountCreate,
    FinanceCashAccountUpdate,
    FinanceCashAccountResponse,
    FinanceTransactionCreate,
    FinanceTransactionUpdate,
    FinanceTransactionResponse,
    FinanceTransactionLineCreate,
    FinanceTransactionLineUpdate,
    FinanceTransactionLineResponse,
    FinanceJournalEntryCreate,
    FinanceJournalEntryUpdate,
    FinanceJournalEntryResponse,
    FinanceJournalLineCreate,
    FinanceJournalLineUpdate,
    FinanceJournalLineResponse,
    FinanceTaxRecordCreate,
    FinanceTaxRecordUpdate,
    FinanceTaxRecordResponse,
    FinanceBudgetCreate,
    FinanceBudgetUpdate,
    FinanceBudgetResponse,
    FinanceBudgetLineCreate,
    FinanceBudgetLineUpdate,
    FinanceBudgetLineResponse,
    FinanceProfitLossSnapshotCreate,
    FinanceProfitLossSnapshotUpdate,
    FinanceProfitLossSnapshotResponse,
    FinanceCashflowSnapshotCreate,
    FinanceCashflowSnapshotUpdate,
    FinanceCashflowSnapshotResponse,
    FinanceMarginSnapshotCreate,
    FinanceMarginSnapshotUpdate,
    FinanceMarginSnapshotResponse,
    FinanceBalanceSheetSnapshotCreate,
    FinanceBalanceSheetSnapshotUpdate,
    FinanceBalanceSheetSnapshotResponse,
    FinanceInvoiceCreate,
    FinanceInvoiceUpdate,
    FinanceInvoiceResponse,
)


router = APIRouter(tags=["Finance"])


router.include_router(
    create_crud_router(
        prefix="/finance/accounting-periods",
        tags=["Finance - Accounting Periods"],
        permission_prefix="finance.accounts",
        model_class=FinanceAccountingPeriod,
        create_schema=FinanceAccountingPeriodCreate,
        update_schema=FinanceAccountingPeriodUpdate,
        response_schema=FinanceAccountingPeriodResponse,
        search_fields=["name", "description"],
        date_filter_field="start_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/accounts",
        tags=["Finance - Accounts"],
        permission_prefix="finance.accounts",
        model_class=FinanceAccount,
        create_schema=FinanceAccountCreate,
        update_schema=FinanceAccountUpdate,
        response_schema=FinanceAccountResponse,
        search_fields=["account_code", "account_name", "description"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/tax-rates",
        tags=["Finance - Tax Rates"],
        permission_prefix="finance.tax-rates",
        model_class=FinanceTaxRate,
        create_schema=FinanceTaxRateCreate,
        update_schema=FinanceTaxRateUpdate,
        response_schema=FinanceTaxRateResponse,
        search_fields=["code", "name", "description"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/cash-accounts",
        tags=["Finance - Cash Accounts"],
        permission_prefix="finance.cash-accounts",
        model_class=FinanceCashAccount,
        create_schema=FinanceCashAccountCreate,
        update_schema=FinanceCashAccountUpdate,
        response_schema=FinanceCashAccountResponse,
        search_fields=["account_name", "bank_name", "account_number", "description"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/transactions",
        tags=["Finance - Transactions"],
        permission_prefix="finance.transactions",
        model_class=FinanceTransaction,
        create_schema=FinanceTransactionCreate,
        update_schema=FinanceTransactionUpdate,
        response_schema=FinanceTransactionResponse,
        search_fields=[
            "transaction_no",
            "counterparty_name",
            "reference_no",
            "source_module",
            "description",
        ],
        date_filter_field="transaction_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/transaction-lines",
        tags=["Finance - Transaction Lines"],
        permission_prefix="finance.transactions",
        model_class=FinanceTransactionLine,
        create_schema=FinanceTransactionLineCreate,
        update_schema=FinanceTransactionLineUpdate,
        response_schema=FinanceTransactionLineResponse,
        search_fields=["description"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/journal-entries",
        tags=["Finance - Journal Entries"],
        permission_prefix="finance.journals",
        model_class=FinanceJournalEntry,
        create_schema=FinanceJournalEntryCreate,
        update_schema=FinanceJournalEntryUpdate,
        response_schema=FinanceJournalEntryResponse,
        search_fields=["journal_no", "reference_no", "description"],
        date_filter_field="journal_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/journal-lines",
        tags=["Finance - Journal Lines"],
        permission_prefix="finance.journals",
        model_class=FinanceJournalLine,
        create_schema=FinanceJournalLineCreate,
        update_schema=FinanceJournalLineUpdate,
        response_schema=FinanceJournalLineResponse,
        search_fields=["description"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/tax-records",
        tags=["Finance - Tax Records"],
        permission_prefix="finance.tax-rates",
        model_class=FinanceTaxRecord,
        create_schema=FinanceTaxRecordCreate,
        update_schema=FinanceTaxRecordUpdate,
        response_schema=FinanceTaxRecordResponse,
        search_fields=["tax_invoice_no", "description"],
        date_filter_field="tax_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/budgets",
        tags=["Finance - Budgets"],
        permission_prefix="finance.budgets",
        model_class=FinanceBudget,
        create_schema=FinanceBudgetCreate,
        update_schema=FinanceBudgetUpdate,
        response_schema=FinanceBudgetResponse,
        search_fields=["budget_no", "name", "description"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/budget-lines",
        tags=["Finance - Budget Lines"],
        permission_prefix="finance.budgets",
        model_class=FinanceBudgetLine,
        create_schema=FinanceBudgetLineCreate,
        update_schema=FinanceBudgetLineUpdate,
        response_schema=FinanceBudgetLineResponse,
        search_fields=["description"],
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/profit-loss-snapshots",
        tags=["Finance - Profit Loss Snapshots"],
        permission_prefix="finance.snapshots",
        model_class=FinanceProfitLossSnapshot,
        create_schema=FinanceProfitLossSnapshotCreate,
        update_schema=FinanceProfitLossSnapshotUpdate,
        response_schema=FinanceProfitLossSnapshotResponse,
        search_fields=[],
        date_filter_field="report_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/cashflow-snapshots",
        tags=["Finance - Cashflow Snapshots"],
        permission_prefix="finance.snapshots",
        model_class=FinanceCashflowSnapshot,
        create_schema=FinanceCashflowSnapshotCreate,
        update_schema=FinanceCashflowSnapshotUpdate,
        response_schema=FinanceCashflowSnapshotResponse,
        search_fields=[],
        date_filter_field="report_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/margin-snapshots",
        tags=["Finance - Margin Snapshots"],
        permission_prefix="finance.snapshots",
        model_class=FinanceMarginSnapshot,
        create_schema=FinanceMarginSnapshotCreate,
        update_schema=FinanceMarginSnapshotUpdate,
        response_schema=FinanceMarginSnapshotResponse,
        search_fields=["object_type", "object_name"],
        date_filter_field="report_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/balance-sheet-snapshots",
        tags=["Finance - Balance Sheet Snapshots"],
        permission_prefix="finance.snapshots",
        model_class=FinanceBalanceSheetSnapshot,
        create_schema=FinanceBalanceSheetSnapshotCreate,
        update_schema=FinanceBalanceSheetSnapshotUpdate,
        response_schema=FinanceBalanceSheetSnapshotResponse,
        search_fields=[],
        date_filter_field="report_date",
    )
)

router.include_router(
    create_crud_router(
        prefix="/finance/invoices",
        tags=["Finance - Invoices"],
        permission_prefix="finance.invoices",
        model_class=FinanceInvoice,
        create_schema=FinanceInvoiceCreate,
        update_schema=FinanceInvoiceUpdate,
        response_schema=FinanceInvoiceResponse,
        search_fields=["invoice_no", "client_name", "source_module", "notes"],
        date_filter_field="invoice_date",
    )
)