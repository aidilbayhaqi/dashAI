import os
from pathlib import Path

import pytest


BACKEND_ROOT = Path(__file__).resolve().parents[2]



def resolve_project_root() -> Path | None:
    """Return the monorepo root when it is available in this environment."""

    candidates: list[Path] = []

    configured_root = os.getenv("DASHAI_PROJECT_ROOT")
    if configured_root:
        candidates.append(Path(configured_root))

    candidates.extend(
        (
            BACKEND_ROOT.parent,
            BACKEND_ROOT.parent.parent,
            Path.cwd(),
            Path.cwd().parent,
        )
    )

    seen: set[Path] = set()

    for candidate in candidates:
        try:
            resolved = candidate.resolve()
        except OSError:
            continue

        if resolved in seen:
            continue

        seen.add(resolved)

        if (
            (resolved / ".env.example").is_file()
            and (resolved / "apps/frontend/Dockerfile").is_file()
            and (resolved / "apps/frontend/Dockerfile.dev").is_file()
        ):
            return resolved

    return None


def read_source(relative: str) -> str:
    return (BACKEND_ROOT / relative).read_text(encoding="utf-8")


def test_automation_owned_transactions_cannot_use_generic_finance_commands():
    source = read_source("src/modules/finance/service_finance_commands.py")
    assert 'AUTOMATION_OWNED_SOURCES = {"sales_order", "crm_deal", "hr_payroll"}' in source
    assert "_ensure_generic_command_allowed" in source
    assert "Sales Order Confirm Payment" in source
    assert "CRM Deal Confirm Payment" in source
    assert "Payroll Pay command" in source


def test_custom_automation_and_finance_commands_enforce_branch_scope():
    automation_route = read_source("src/modules/automation/route_automation.py")
    automation_service = read_source("src/modules/automation/service_automation.py")
    finance_route = read_source("src/modules/finance/route_finance.py")
    finance_service = read_source("src/modules/finance/service_finance_commands.py")
    assert "current_user.allowed_branch_ids" in automation_route
    assert "allowed_branch_ids" in automation_service
    assert "current_user.allowed_branch_ids" in finance_route
    assert "_ensure_branch_allowed" in finance_service


def test_accounting_bridge_covers_invoice_cash_cogs_payroll_and_reversals():
    source = read_source("src/modules/finance/service_accounting_bridge.py")
    for method in (
        "ensure_invoice_issue_journal",
        "ensure_invoice_payment_journal",
        "ensure_cash_transaction_journal",
        "ensure_cash_adjustment_journal",
        "ensure_sales_cogs_journal",
        "ensure_payroll_accrual_journal",
        "ensure_payroll_payment_journal",
        "reverse_transaction_journals",
        "reverse_invoice_issue_journal",
    ):
        assert f"async def {method}" in source
    for journal_prefix in (
        "AUTO-INV-",
        "AUTO-PAY-",
        "AUTO-TRX-",
        "AUTO-ADJ-",
        "AUTO-COGS-",
        "AUTO-PAYROLL-ACCRUAL-",
        "AUTO-PAYROLL-PAY-",
        "AUTO-REV-",
    ):
        assert journal_prefix in source


def test_tax_and_default_cash_constraints_are_database_backed():
    model = read_source("src/modules/finance/model_finance.py")
    migration = read_source(
        "migrations/versions/ae1f2a3b4c56_erp_integrity_accounting_bridge.py"
    )
    assert "invoice_id" in model
    assert "is_default" in model
    assert "uq_finance_tax_record_company_invoice_type" in migration
    assert "uq_finance_cash_account_default_company" in migration
    assert "uq_finance_transaction_automation_source" in migration
    assert "uq_finance_invoice_crm_deal_source" in migration


def test_crm_won_creates_invoice_before_cash_settlement():
    source = read_source("src/modules/crm/service_crm.py")
    assert 'source_module="crm_deal"' in source
    assert "FinanceInvoice(" in source
    assert "deal.invoice_id = invoice.id" in source
    assert "ensure_invoice_issue_journal" in source
    assert "ensure_invoice_payment_journal" in source


def test_payroll_requires_complete_attendance_and_has_dedicated_payment():
    service = read_source("src/modules/hr/service_hr.py")
    route = read_source("src/modules/hr/route_hr.py")
    assert "Attendance is incomplete for employee" in service
    assert "async def pay_payroll" in service
    assert '"/hr/payroll-runs/{payroll_run_id}/pay"' in route
    assert "ensure_payroll_accrual_journal" in service
    assert "ensure_payroll_payment_journal" in service


def test_production_defaults_are_safe_and_tool_versions_are_consistent():
    backend_env = (BACKEND_ROOT / ".env.example").read_text(encoding="utf-8")
    assert "AI_AGENT_ENABLED=false" in backend_env

    project_root = resolve_project_root()

    if project_root is None:
        pytest.skip(
            "Monorepo root is not mounted in the API container. "
            "The patch runner verifies root .env and frontend Dockerfiles "
            "directly from the host project."
        )

    root_env = (project_root / ".env.example").read_text(encoding="utf-8")
    dockerfile = (
        project_root / "apps/frontend/Dockerfile"
    ).read_text(encoding="utf-8")
    dockerfile_dev = (
        project_root / "apps/frontend/Dockerfile.dev"
    ).read_text(encoding="utf-8")

    assert "AI_AGENT_ENABLED=false" in root_env
    assert "pnpm@11.9.0" in dockerfile
    assert "pnpm@11.9.0" in dockerfile_dev


def test_generic_crm_and_payroll_updates_cannot_bypass_commands():
    crm_route = read_source("src/modules/crm/route_crm.py")
    crm_policy = read_source("src/modules/crm/policy_crm.py")
    payroll_policy = read_source("src/modules/hr/policy_hr.py")
    assert "CRMDealWritePolicy()" in crm_route
    assert "Use Close Won or Close Lost" in crm_policy
    assert "Closed or Finance-linked deals cannot be deleted" in crm_policy
    assert "Payroll calculated/payment fields must use payroll commands" in payroll_policy
    assert "Only draft payroll runs can be edited" in payroll_policy
