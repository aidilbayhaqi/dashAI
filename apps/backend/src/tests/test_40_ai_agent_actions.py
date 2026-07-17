from decimal import Decimal
from pathlib import Path

from src.ai.agent_action_service import (
    _fallback_invoice_extraction,
    _fallback_report_type,
)
from src.core.database_url import (
    normalize_async_database_url,
    normalize_sync_database_url,
)


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def test_hosted_database_urls_are_normalized_for_runtime_and_migrations():
    raw = "postgresql://user:secret@host:5432/app"
    assert normalize_async_database_url(raw) == (
        "postgresql+asyncpg://user:secret@host:5432/app"
    )
    assert normalize_sync_database_url(raw) == (
        "postgresql+psycopg2://user:secret@host:5432/app"
    )


def test_local_invoice_parser_keeps_demo_working_without_provider_quota():
    extraction = _fallback_invoice_extraction(
        "Buat invoice untuk PT Maju Bersama senilai 5 juta, "
        "PPN 11%, jatuh tempo 14 hari"
    )

    assert extraction.client_name == "PT Maju Bersama"
    assert extraction.subtotal_amount == Decimal("5000000.00")
    assert extraction.tax_rate_percent == Decimal("11")
    assert extraction.due_days == 14


def test_local_report_classifier_supports_main_financial_reports():
    assert _fallback_report_type("buat laporan laba rugi") == "profit_loss"
    assert _fallback_report_type("analisis arus kas") == "cashflow"
    assert _fallback_report_type("buat neraca") == "balance_sheet"


def test_ai_write_actions_require_preview_confirmation_and_idempotency():
    route_source = (
        BACKEND_ROOT / "src" / "ai" / "route_ai.py"
    ).read_text(encoding="utf-8")

    assert '"/agent/invoice/draft"' in route_source
    assert '"/agent/invoice/confirm"' in route_source
    assert '"/agent/report/draft"' in route_source
    assert '"/agent/report/confirm"' in route_source
    assert "get_idempotency_key" in route_source
    assert "require_all_permissions" in route_source


def test_payroll_runtime_uses_shared_utc_helper_without_assert_guard():
    source = (
        BACKEND_ROOT / "src" / "modules" / "hr" / "service_hr.py"
    ).read_text(encoding="utf-8")

    assert "from src.core.time import utc_now_naive" in source
    assert "assert payroll_run is not None" not in source


def test_ai_invoice_confirmation_recalculates_money_on_backend():
    source = (
        BACKEND_ROOT / "src" / "ai" / "agent_action_service.py"
    ).read_text(encoding="utf-8")

    assert "subtotal_amount = _money(payload.draft.subtotal_amount)" in source
    assert "subtotal_amount * tax_rate_percent / Decimal(\"100\")" in source
    assert "total_amount = subtotal_amount + tax_amount" in source
