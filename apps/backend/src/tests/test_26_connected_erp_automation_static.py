from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def read_backend(relative: str) -> str:
    return (BACKEND_ROOT / relative).read_text(encoding="utf-8")


def test_rule_catalog_covers_connected_erp_domains():
    source = read_backend("src/modules/automation/rule_catalog.py")
    for key in (
        "sales_order_fulfillment",
        "invoice_payment_to_cash",
        "expense_to_cashflow",
        "invoice_tax_accrual",
        "monthly_payroll_calculation",
        "crm_deal_won",
        "excel_bulk_import",
        "periodic_finance_reporting",
    ):
        assert f'key="{key}"' in source


def test_sales_order_cash_only_moves_after_payment():
    source = read_backend("src/modules/automation/service_automation.py")
    process_block = source.split("async def process_sales_order", 1)[1].split(
        "async def confirm_payment", 1
    )[0]
    payment_block = source.split("async def confirm_payment", 1)[1]
    assert "status=TransactionStatus.DRAFT" in process_block
    assert "cash_account.current_balance" not in process_block
    assert "cash_account.current_balance" in payment_block
    assert "transaction.status = TransactionStatus.POSTED" in payment_block


def test_invoice_tax_accrual_is_idempotent():
    source = read_backend("src/modules/finance/service_finance_automation.py")
    assert "ensure_invoice_tax_record" in source
    assert "FinanceTaxRecord.reference_no == invoice.invoice_no" in source
    assert 'event_key=f"invoice:{invoice.id}:tax-accrued"' in source
    assert "if tax_amount <= ZERO" in source


def test_payroll_uses_attendance_and_kpi_and_creates_finance_draft():
    source = read_backend("src/modules/hr/service_hr.py")
    calculate = source.split("async def calculate_payroll", 1)[1].split(
        "async def create_finance_transaction", 1
    )[0]
    finance = source.split("async def create_finance_transaction", 1)[1]
    assert "AttendanceStatus.ABSENT" in calculate
    assert "AttendanceStatus.LATE" in calculate
    assert "AttendanceRecord.overtime_minutes" in calculate
    assert "KPIReview.total_score" in calculate
    assert "bonus_rate" in calculate
    assert "deduction" in calculate
    assert "status=TransactionStatus.DRAFT" in finance
    assert 'source_module="hr_payroll"' in finance


def test_crm_won_deal_is_receivable_until_settlement():
    source = read_backend("src/modules/crm/service_crm.py")
    close_won = source.split("async def close_won", 1)[1].split(
        "async def confirm_payment", 1
    )[0]
    settlement = source.split("async def confirm_payment", 1)[1].split(
        "async def close_lost", 1
    )[0]
    assert "status=TransactionStatus.DRAFT" in close_won
    assert "cash_account.current_balance" not in close_won
    assert "cash_account.current_balance" in settlement
    assert "transaction.status = TransactionStatus.POSTED" in settlement
