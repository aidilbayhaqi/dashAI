from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db

from src.routes.crud_factory import create_crud_router
from src.security.dependencies import CurrentUser, require_permission
from src.security.idempotency import (
    build_idempotency_context,
    execute_idempotent,
    get_idempotency_key,
)
from src.security.tenant import resolve_company_id, tenant_not_found

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
    FinanceInvoicePaymentRequest,
    FinanceCashBalanceAdjustmentRequest,
    FinanceTaxPaymentRequest,
    FinanceReportGenerationRequest,
    FinanceCashflowGenerationRequest,
    FinanceBalanceSheetGenerationRequest,
)
from src.modules.finance.policy_finance import (
    FinanceCashAccountWritePolicy,
    FinanceInvoiceWritePolicy,
    FinanceJournalLineWritePolicy,
    FinanceJournalWritePolicy,
    FinanceTransactionLineWritePolicy,
    FinanceTransactionWritePolicy,
    FinanceTaxRecordWritePolicy,
    FinanceBudgetWritePolicy,
    FinanceBudgetLineWritePolicy,
    ImmutableFinanceSnapshotWritePolicy,
)
from src.modules.finance.service_finance_commands import FinanceCommandService
from src.modules.finance.service_finance import (
    FinanceProfitLossSnapshotService,
    FinanceCashflowSnapshotService,
    FinanceBalanceSheetSnapshotService,
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
        write_policy=FinanceCashAccountWritePolicy(),
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
        write_policy=FinanceTransactionWritePolicy(),
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
        write_policy=FinanceTransactionLineWritePolicy(),
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
        write_policy=FinanceJournalWritePolicy(),
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
        write_policy=FinanceJournalLineWritePolicy(),
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
        write_policy=FinanceTaxRecordWritePolicy(),
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
        write_policy=FinanceBudgetWritePolicy(),
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
        write_policy=FinanceBudgetLineWritePolicy(),
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
        write_policy=ImmutableFinanceSnapshotWritePolicy(),
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
        write_policy=ImmutableFinanceSnapshotWritePolicy(),
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
        write_policy=ImmutableFinanceSnapshotWritePolicy(),
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
        write_policy=ImmutableFinanceSnapshotWritePolicy(),
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
        write_policy=FinanceInvoiceWritePolicy(),
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


async def _execute_finance_command(
    *,
    request: Request,
    idempotency_key: str,
    current_user: CurrentUser,
    response_model: type,
    operation,
):
    context = await build_idempotency_context(
        request=request,
        current_user=current_user,
        raw_key=idempotency_key,
    )
    return await execute_idempotent(
        context=context,
        operation=operation,
        response_model=response_model,
        success_status_code=status.HTTP_200_OK,
    )


@router.post(
    "/finance/transactions/{transaction_id}/post",
    response_model=FinanceTransactionResponse,
)
async def post_finance_transaction(
    transaction_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.transactions.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request,
        idempotency_key=idempotency_key,
        current_user=current_user,
        response_model=FinanceTransactionResponse,
        operation=lambda: service.post_transaction(
            transaction_id=transaction_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
        ),
    )


@router.post(
    "/finance/transactions/{transaction_id}/void",
    response_model=FinanceTransactionResponse,
)
async def void_finance_transaction(
    transaction_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.transactions.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request,
        idempotency_key=idempotency_key,
        current_user=current_user,
        response_model=FinanceTransactionResponse,
        operation=lambda: service.void_transaction(
            transaction_id=transaction_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
        ),
    )


@router.post(
    "/finance/transactions/{transaction_id}/cancel",
    response_model=FinanceTransactionResponse,
)
async def cancel_finance_transaction(
    transaction_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.transactions.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request,
        idempotency_key=idempotency_key,
        current_user=current_user,
        response_model=FinanceTransactionResponse,
        operation=lambda: service.cancel_transaction(
            transaction_id=transaction_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
        ),
    )


@router.post(
    "/finance/invoices/{invoice_id}/send",
    response_model=FinanceInvoiceResponse,
)
async def send_finance_invoice(
    invoice_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.invoices.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request,
        idempotency_key=idempotency_key,
        current_user=current_user,
        response_model=FinanceInvoiceResponse,
        operation=lambda: service.send_invoice(
            invoice_id=invoice_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
        ),
    )


@router.post(
    "/finance/invoices/{invoice_id}/payments",
    response_model=FinanceInvoiceResponse,
)
async def record_finance_invoice_payment(
    invoice_id: UUID,
    payload: FinanceInvoicePaymentRequest,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.invoices.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request,
        idempotency_key=idempotency_key,
        current_user=current_user,
        response_model=FinanceInvoiceResponse,
        operation=lambda: service.record_invoice_payment(
            invoice_id=invoice_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
            user_id=current_user.user_id,
            payload=payload,
        ),
    )


@router.post(
    "/finance/invoices/{invoice_id}/cancel",
    response_model=FinanceInvoiceResponse,
)
async def cancel_finance_invoice(
    invoice_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.invoices.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request,
        idempotency_key=idempotency_key,
        current_user=current_user,
        response_model=FinanceInvoiceResponse,
        operation=lambda: service.cancel_invoice(
            invoice_id=invoice_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
        ),
    )


@router.post(
    "/finance/journal-entries/{journal_id}/post",
    response_model=FinanceJournalEntryResponse,
)
async def post_finance_journal(
    journal_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.journals.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request,
        idempotency_key=idempotency_key,
        current_user=current_user,
        response_model=FinanceJournalEntryResponse,
        operation=lambda: service.post_journal(
            journal_id=journal_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
        ),
    )


@router.post(
    "/finance/journal-entries/{journal_id}/reverse",
    response_model=FinanceJournalEntryResponse,
)
async def reverse_finance_journal(
    journal_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.journals.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request,
        idempotency_key=idempotency_key,
        current_user=current_user,
        response_model=FinanceJournalEntryResponse,
        operation=lambda: service.reverse_journal(
            journal_id=journal_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
        ),
    )


@router.post(
    "/finance/cash-accounts/{cash_account_id}/adjust-balance",
    response_model=FinanceCashAccountResponse,
)
async def adjust_finance_cash_balance(
    cash_account_id: UUID,
    payload: FinanceCashBalanceAdjustmentRequest,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.cash-accounts.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user,
        requested_company_id=company_id,
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request,
        idempotency_key=idempotency_key,
        current_user=current_user,
        response_model=FinanceCashAccountResponse,
        operation=lambda: service.adjust_cash_balance(
            cash_account_id=cash_account_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
            user_id=current_user.user_id,
            payload=payload,
        ),
    )


@router.post(
    "/finance/tax-records/{tax_record_id}/accrue",
    response_model=FinanceTaxRecordResponse,
)
async def accrue_finance_tax_record(
    tax_record_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.tax-rates.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user, requested_company_id=company_id
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request, idempotency_key=idempotency_key,
        current_user=current_user, response_model=FinanceTaxRecordResponse,
        operation=lambda: service.accrue_tax_record(
            tax_record_id=tax_record_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
        ),
    )


@router.post(
    "/finance/tax-records/{tax_record_id}/pay",
    response_model=FinanceTaxRecordResponse,
)
async def pay_finance_tax_record(
    tax_record_id: UUID,
    payload: FinanceTaxPaymentRequest,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.tax-rates.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user, requested_company_id=company_id
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request, idempotency_key=idempotency_key,
        current_user=current_user, response_model=FinanceTaxRecordResponse,
        operation=lambda: service.pay_tax_record(
            tax_record_id=tax_record_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
            user_id=current_user.user_id, payload=payload
        ),
    )


@router.post(
    "/finance/tax-records/{tax_record_id}/report",
    response_model=FinanceTaxRecordResponse,
)
async def report_finance_tax_record(
    tax_record_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.tax-rates.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user, requested_company_id=company_id
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request, idempotency_key=idempotency_key,
        current_user=current_user, response_model=FinanceTaxRecordResponse,
        operation=lambda: service.report_tax_record(
            tax_record_id=tax_record_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
        ),
    )


@router.post(
    "/finance/tax-records/{tax_record_id}/cancel",
    response_model=FinanceTaxRecordResponse,
)
async def cancel_finance_tax_record(
    tax_record_id: UUID,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.tax-rates.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user, requested_company_id=company_id
    )
    service = FinanceCommandService(db)
    return await _execute_finance_command(
        request=request, idempotency_key=idempotency_key,
        current_user=current_user, response_model=FinanceTaxRecordResponse,
        operation=lambda: service.cancel_tax_record(
            tax_record_id=tax_record_id,
            company_id=effective_company_id,
            allowed_branch_ids=current_user.allowed_branch_ids,
        ),
    )


@router.post(
    "/finance/reports/profit-loss/generate",
    response_model=FinanceProfitLossSnapshotResponse,
)
async def generate_profit_loss_report(
    payload: FinanceReportGenerationRequest,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.snapshots.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user, requested_company_id=company_id
    )
    service = FinanceProfitLossSnapshotService(db)
    return await _execute_finance_command(
        request=request, idempotency_key=idempotency_key,
        current_user=current_user, response_model=FinanceProfitLossSnapshotResponse,
        operation=lambda: service.generate_from_journals(
            company_id=effective_company_id, period_id=payload.period_id,
            start_date=payload.start_date, end_date=payload.end_date,
            report_date=payload.report_date
        ),
    )


@router.post(
    "/finance/reports/cashflow/generate",
    response_model=FinanceCashflowSnapshotResponse,
)
async def generate_cashflow_report(
    payload: FinanceCashflowGenerationRequest,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.snapshots.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user, requested_company_id=company_id
    )
    service = FinanceCashflowSnapshotService(db)
    return await _execute_finance_command(
        request=request, idempotency_key=idempotency_key,
        current_user=current_user, response_model=FinanceCashflowSnapshotResponse,
        operation=lambda: service.generate_from_transactions(
            company_id=effective_company_id, period_id=payload.period_id,
            start_date=payload.start_date, end_date=payload.end_date,
            report_date=payload.report_date,
            beginning_cash_balance=payload.beginning_cash_balance
        ),
    )


@router.post(
    "/finance/reports/balance-sheet/generate",
    response_model=FinanceBalanceSheetSnapshotResponse,
)
async def generate_balance_sheet_report(
    payload: FinanceBalanceSheetGenerationRequest,
    request: Request,
    company_id: UUID | None = Query(default=None),
    idempotency_key: str = Depends(get_idempotency_key),
    db: AsyncSession = Depends(get_db),
    current_user: CurrentUser = Depends(
        require_permission("finance.snapshots.approve")
    ),
):
    effective_company_id = _effective_company_id(
        current_user=current_user, requested_company_id=company_id
    )
    service = FinanceBalanceSheetSnapshotService(db)
    return await _execute_finance_command(
        request=request, idempotency_key=idempotency_key,
        current_user=current_user, response_model=FinanceBalanceSheetSnapshotResponse,
        operation=lambda: service.generate_from_journals(
            company_id=effective_company_id, period_id=payload.period_id,
            report_date=payload.report_date
        ),
    )
