from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def read_source(relative: str) -> str:
    return (BACKEND_ROOT / relative).read_text(encoding="utf-8")


def class_block(source: str, class_name: str, next_class_name: str) -> str:
    start = source.index(f"class {class_name}(")
    end = source.index(f"class {next_class_name}(", start)
    return source[start:end]


def test_is_default_only_belongs_to_cash_account_model():
    source = read_source("src/modules/finance/model_finance.py")

    assert "is_default:" not in class_block(
        source,
        "FinanceAccountingPeriod",
        "FinanceAccount",
    )
    assert "is_default:" not in class_block(
        source,
        "FinanceAccount",
        "FinanceTaxRate",
    )
    assert "is_default:" not in class_block(
        source,
        "FinanceTaxRate",
        "FinanceCashAccount",
    )
    assert "is_default:" in class_block(
        source,
        "FinanceCashAccount",
        "FinanceTransaction",
    )


def test_process_sales_order_accepts_and_applies_branch_scope():
    source = read_source(
        "src/modules/automation/service_automation.py"
    )
    block = source.split(
        "async def process_sales_order",
        1,
    )[1].split(
        "async def _process_order",
        1,
    )[0]

    assert "allowed_branch_ids: set[UUID] | None = None" in block
    assert "allowed_branch_ids=allowed_branch_ids" in block


def test_branch_payroll_only_selects_employees_in_that_branch():
    source = read_source("src/modules/hr/service_hr.py")
    block = source.split(
        "if payroll_run.branch_id is not None:",
        1,
    )[1].split(
        "result = await self.db.execute(employee_query)",
        1,
    )[0]

    assert "Employee.branch_id == payroll_run.branch_id" in block
    assert "Employee.branch_id.is_(None)" not in block


def test_payroll_integration_uses_isolated_branch():
    source = read_source(
        "src/tests/test_18_live_payroll_integrity.py"
    )

    assert 'f"/api/v1/companies/{first_company_id}/branches"' in source
    assert 'f"/api/v1/companies/branches/{branch_id}"' in source
    assert 'employee_payload["branch_id"] = branch_id' in source
    assert 'payroll_payload["branch_id"] = branch_id' in source
