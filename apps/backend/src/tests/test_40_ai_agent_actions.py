from decimal import Decimal
from pathlib import Path

from src.ai.invoice_parser import (
    SAFE_AI_INVOICE_NOTE,
    fallback_invoice_extraction,
)
from src.ai.report_parser import build_report_title, fallback_report_type
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
    extraction = fallback_invoice_extraction(
        "Buat invoice untuk PT Maju Bersama senilai 5 juta, "
        "PPN 11%, jatuh tempo 14 hari"
    )

    assert extraction.client_name == "PT Maju Bersama"
    assert extraction.subtotal_amount == Decimal("5000000.00")
    assert extraction.tax_rate_percent == Decimal("11")
    assert extraction.due_days == 14
    assert extraction.notes == SAFE_AI_INVOICE_NOTE


def test_local_invoice_parser_does_not_use_date_as_subtotal():
    extraction = fallback_invoice_extraction(
        "Buat invoice tanggal 17 untuk PT Angka Lima Rp5 juta PPN 11%"
    )

    assert extraction.client_name == "PT Angka Lima"
    assert extraction.subtotal_amount == Decimal("5000000.00")


def test_local_invoice_parser_preserves_company_name_containing_nominal():
    extraction = fallback_invoice_extraction(
        "Buat invoice untuk PT Nominal sebesar Rp5.500.000 PPN 11"
    )

    assert extraction.client_name == "PT Nominal"
    assert extraction.subtotal_amount == Decimal("5500000.00")
    assert extraction.tax_rate_percent == Decimal("11")


def test_local_invoice_parser_supports_suffix_without_amount_keyword():
    extraction = fallback_invoice_extraction(
        "Buat invoice kepada CV Sukses 750 ribu PPN 11 tempo 30 hari"
    )

    assert extraction.client_name == "CV Sukses"
    assert extraction.subtotal_amount == Decimal("750000.00")
    assert extraction.due_days == 30


def test_local_report_classifier_supports_main_financial_reports():
    assert fallback_report_type("buat laporan laba rugi") == "profit_loss"
    assert fallback_report_type("analisis arus kas") == "cashflow"
    assert fallback_report_type("buat neraca") == "balance_sheet"


def test_balance_sheet_title_uses_as_of_date():
    from datetime import date

    title = build_report_title(
        report_type="balance_sheet",
        start_date=date(2026, 7, 1),
        end_date=date(2026, 7, 18),
        report_date=date(2026, 7, 18),
    )
    assert title == "Neraca per 18/07/2026"


def test_ai_write_actions_require_preview_confirmation_and_idempotency():
    route_source = (BACKEND_ROOT / "src" / "ai" / "route_ai.py").read_text(
        encoding="utf-8"
    )

    assert '"/agent/invoice/draft"' in route_source
    assert '"/agent/invoice/confirm"' in route_source
    assert '"/agent/report/draft"' in route_source
    assert '"/agent/report/confirm"' in route_source
    assert "get_idempotency_key" in route_source
    assert "require_all_permissions" in route_source


def test_ai_confirmation_is_bound_to_draft_and_one_time_token():
    schema_source = (
        BACKEND_ROOT / "src" / "ai" / "agent_action_schema.py"
    ).read_text(encoding="utf-8")
    token_source = (
        BACKEND_ROOT / "src" / "ai" / "action_token.py"
    ).read_text(encoding="utf-8")
    store_source = (
        BACKEND_ROOT / "src" / "ai" / "action_token_store.py"
    ).read_text(encoding="utf-8")

    assert "draft_id: UUID" in schema_source
    assert '"draft_id": str(draft_id)' in token_source
    assert "expected_draft_id" in token_source
    assert "nx=True" in store_source
    assert "AI action token sudah pernah digunakan" in store_source


def test_payroll_runtime_uses_shared_utc_helper_without_assert_guard():
    source = (
        BACKEND_ROOT / "src" / "modules" / "hr" / "service_hr.py"
    ).read_text(encoding="utf-8")

    assert "from src.core.time import utc_now_naive" in source
    assert "assert payroll_run is not None" not in source


def test_ai_invoice_confirmation_recalculates_money_on_backend():
    source = (
        BACKEND_ROOT / "src" / "ai" / "invoice_action_service.py"
    ).read_text(encoding="utf-8")

    assert "subtotal_amount = money(payload.draft.subtotal_amount)" in source
    assert "subtotal_amount * tax_rate_percent / Decimal(\"100\")" in source
    assert "total_amount = subtotal_amount + tax_amount" in source
