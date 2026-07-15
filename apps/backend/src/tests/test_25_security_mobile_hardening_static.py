import os
from pathlib import Path

import pytest

from src.security.permissions import realtime_modules_from_permissions


BACKEND_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = Path(
    os.getenv(
        "DASHAI_FRONTEND_ROOT",
        str(BACKEND_ROOT.parent / "frontend"),
    )
).resolve()


def _frontend_source(relative_path: str) -> str:
    path = FRONTEND_ROOT / relative_path
    if not path.exists():
        pytest.skip(
            "Frontend source is not mounted. Set DASHAI_FRONTEND_ROOT "
            "or mount apps/frontend into the API test environment."
        )
    return path.read_text(encoding="utf-8")


def test_realtime_modules_are_derived_from_business_permissions():
    modules = realtime_modules_from_permissions(
        [
            "realtime.events.view",
            "dashboard.summary.view",
            "finance.transactions.view",
            "hr.employees.view",
        ]
    )
    assert modules == {"finance", "hr"}


def test_finance_generic_writes_are_guarded_by_policies():
    route_source = (
        BACKEND_ROOT / "src/modules/finance/route_finance.py"
    ).read_text(encoding="utf-8")
    assert "FinanceTransactionWritePolicy()" in route_source
    assert "FinanceInvoiceWritePolicy()" in route_source
    assert "FinanceJournalWritePolicy()" in route_source
    assert '"/finance/transactions/{transaction_id}/post"' in route_source
    assert '"/finance/invoices/{invoice_id}/payments"' in route_source


def test_realtime_frontend_uses_one_time_ticket_not_access_token_query():
    source = _frontend_source("features/dashboard/realtime.ts")
    assert '"/realtime/ticket"' in source
    assert 'searchParams.set("ticket"' in source
    assert 'searchParams.set("token"' not in source


def test_mobile_shell_and_manifest_are_present():
    manifest = FRONTEND_ROOT / "app/manifest.ts"
    nav = FRONTEND_ROOT / "components/layout/mobile-bottom-nav.tsx"
    if not manifest.exists() or not nav.exists():
        pytest.skip(
            "Frontend source is not mounted. Set DASHAI_FRONTEND_ROOT "
            "or mount apps/frontend into the API test environment."
        )
    monitoring = _frontend_source("features/automation/monitoring-table.tsx")
    assert "MonitoringMobileCard" in monitoring
    assert "md:hidden" in monitoring
    assert "hidden overflow-x-auto md:block" in monitoring


def test_ai_rate_limit_and_retryable_outbox_are_present():
    ai_route = (BACKEND_ROOT / "src/ai/route_ai.py").read_text(encoding="utf-8")
    worker = (
        BACKEND_ROOT / "src/modules/automation/outbox_worker.py"
    ).read_text(encoding="utf-8")
    assert "enforce_ai_rate_limit" in ai_route
    assert "next_attempt_at" in worker
    assert "with_for_update(skip_locked=True)" in worker


def test_admin_frontend_no_longer_uses_dummy_data():
    source = _frontend_source("features/admin/api.ts")
    assert 'api.get("/api/v1/companies"' in source
    assert 'api.get("/api/v1/users"' in source
    assert "adminDummyData" not in source
