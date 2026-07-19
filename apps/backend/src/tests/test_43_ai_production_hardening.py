from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException
from pydantic import BaseModel, Field, ValidationError

from src.ai.audit_service import request_fingerprint, safe_failure_details
from src.ai.errors import ai_validation_http_exception
from src.ai.invoice_action_service import _local_invoice_extraction
from src.ai.invoice_parser import parse_indonesian_amount
from src.ai.report_parser import fallback_report_type
from src.core.config import Settings


def test_rupiah_parser_supports_indonesian_and_international_decimals():
    assert parse_indonesian_amount("1.500,50", None) == Decimal("1500.50")
    assert parse_indonesian_amount("1,500.50", None) == Decimal("1500.50")
    assert parse_indonesian_amount("1.500.000", None) == Decimal("1500000.00")
    assert parse_indonesian_amount("1,5", "juta") == Decimal("1500000.00")


def test_invalid_local_invoice_values_are_exposed_as_422():
    with pytest.raises(HTTPException) as tax_error:
        _local_invoice_extraction(
            "Buat invoice untuk PT A senilai 5 juta PPN 111%"
        )
    assert tax_error.value.status_code == 422

    with pytest.raises(HTTPException) as due_error:
        _local_invoice_extraction(
            "Buat invoice untuk PT A senilai 5 juta tempo 999 hari"
        )
    assert due_error.value.status_code == 422


def test_unknown_report_request_is_not_silently_profit_loss():
    assert fallback_report_type("buat laporan pelanggan") is None
    assert fallback_report_type("buat laporan pajak") is None


def test_internal_pydantic_validation_has_stable_422_payload():
    class Example(BaseModel):
        rate: Decimal = Field(ge=0, le=100)

    with pytest.raises(ValidationError) as validation:
        Example(rate=Decimal("101"))

    http_error = ai_validation_http_exception(
        validation.value,
        message="Nilai AI tidak valid.",
    )
    assert http_error.status_code == 422
    assert http_error.detail["message"] == "Nilai AI tidak valid."
    assert http_error.detail["errors"][0]["field"] == "rate"


def test_audit_fingerprint_is_stable_and_does_not_store_raw_payload():
    payload = {
        "draft_id": uuid4(),
        "invoice_date": date(2026, 7, 18),
        "amount": Decimal("5000000.00"),
        "secret": "customer-private-data",
    }
    first = request_fingerprint(payload)
    second = request_fingerprint(dict(reversed(list(payload.items()))))

    assert first == second
    assert len(first) == 64
    assert "customer-private-data" not in first


def test_failure_audit_redacts_internal_exception_messages():
    code, message = safe_failure_details(
        RuntimeError("postgresql://user:secret@private-host/database")
    )
    assert code == "RuntimeError"
    assert message == "Internal AI action failure"
    assert "secret" not in message

    code, message = safe_failure_details(
        HTTPException(status_code=422, detail="Input tidak valid")
    )
    assert code == "422"
    assert message == "Input tidak valid"


def _production_settings(**overrides):
    values = {
        "ENVIRONMENT": "production",
        "DEBUG": False,
        "LOG_FORMAT": "json",
        "ENABLE_DOCS": False,
        "REALTIME_ALLOW_QUERY_ACCESS_TOKEN": False,
        "DB_ECHO": False,
        "JWT_SECRET": "x" * 64,
        "DATABASE_URL": (
            "postgresql+asyncpg://prod:strong-password@db:5432/dashai"
        ),
        "COOKIE_SECURE": True,
        "COOKIE_SAMESITE": "none",
        "CORS_ORIGINS": "https://app.example.com",
        "AI_AGENT_ENABLED": True,
        "AI_AGENT_ACTIONS_ENABLED": True,
        "AI_PROVIDER": "gemini",
        "AI_AGENT_ALLOW_RULE_FALLBACK": True,
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_production_settings_accept_secure_configuration():
    settings = _production_settings()
    assert settings.is_production is True
    assert settings.docs_url is None


def test_production_settings_reject_docs_and_insecure_cors():
    with pytest.raises(ValidationError):
        _production_settings(ENABLE_DOCS=True)

    with pytest.raises(ValidationError):
        _production_settings(CORS_ORIGINS="http://app.example.com")


def test_production_settings_reject_unbounded_ai_action_values():
    with pytest.raises(ValidationError):
        _production_settings(AI_ACTION_TOKEN_TTL_SECONDS=3600)

    with pytest.raises(ValidationError):
        _production_settings(AI_INVOICE_DEFAULT_DUE_DAYS=365)

class _FakeDB:
    def __init__(self):
        self.items = []
        self.rollback_calls = 0

    def add(self, item):
        self.items.append(item)

    async def rollback(self):
        self.rollback_calls += 1


def _current_user():
    from src.security.dependencies import CurrentUser

    return CurrentUser(
        user_id=uuid4(),
        email="finance@example.com",
        full_name="Finance User",
        is_superuser=False,
        company_id=uuid4(),
        role_id=uuid4(),
        default_branch_id=None,
        access_scope="company",
        permissions=["ai.analytics.view", "finance.invoices.create"],
        branch_ids=[],
        token_payload={},
        raw_token="token",
    )


def _invoice_confirm_payload():
    from src.ai.agent_action_schema import AIInvoiceConfirmRequest, AIInvoiceDraft

    draft_id = uuid4()
    return AIInvoiceConfirmRequest(
        draft_id=draft_id,
        action_token="x" * 30,
        draft=AIInvoiceDraft(
            invoice_no="AI-20260718-TEST0001",
            client_name="PT Production Test",
            invoice_date=date(2026, 7, 18),
            due_date=date(2026, 8, 1),
            subtotal_amount=Decimal("5000000.00"),
            tax_rate_percent=Decimal("11.00"),
            tax_amount=Decimal("550000.00"),
            total_amount=Decimal("5550000.00"),
            notes="ignored raw note",
        ),
    )


@pytest.mark.asyncio
async def test_invoice_success_commits_invoice_and_audit_without_releasing_token(
    monkeypatch,
):
    from src.ai import invoice_action_service as service

    user = _current_user()
    payload = _invoice_confirm_payload()
    db = _FakeDB()
    release_calls = []

    token_payload = {
        "company_id": user.company_id,
        "branch_id": None,
        "draft_id": payload.draft_id,
        "jti": str(uuid4()),
        "provider": "gemini",
    }

    monkeypatch.setattr(service, "verify_ai_action_token", lambda **_: token_payload)

    async def fake_scope(**_):
        return user.company_id, None

    async def fake_policy(self, **kwargs):
        return dict(kwargs["data"])

    async def fake_claim(_):
        return "claim-key"

    async def fake_release(key):
        release_calls.append(key)

    async def fake_flush(session):
        for item in session.items:
            if getattr(item, "id", None) is None:
                item.id = uuid4()
            if hasattr(item, "created_at") and item.created_at is None:
                item.created_at = datetime(2026, 7, 18, 0, 0, 0)
            if hasattr(item, "updated_at") and item.updated_at is None:
                item.updated_at = datetime(2026, 7, 18, 0, 0, 0)

    async def fake_commit(_):
        return None

    async def fake_publish(*args, **kwargs):
        return None

    async def fake_failure_audit(**kwargs):
        raise AssertionError("failure audit must not run on success")

    monkeypatch.setattr(service, "resolve_ai_action_scope", fake_scope)
    monkeypatch.setattr(
        service.FinanceInvoiceWritePolicy, "before_create", fake_policy
    )
    monkeypatch.setattr(service, "claim_ai_action_token", fake_claim)
    monkeypatch.setattr(service, "release_ai_action_token_claim", fake_release)
    monkeypatch.setattr(service, "flush_or_raise", fake_flush)
    monkeypatch.setattr(service, "commit_or_raise", fake_commit)
    monkeypatch.setattr(service, "publish_realtime_event_safe", fake_publish)
    monkeypatch.setattr(service, "record_failure_audit_safe", fake_failure_audit)

    invoice = await service.confirm_invoice_draft(
        db=db,
        current_user=user,
        payload=payload,
    )

    assert invoice.id is not None
    assert len(db.items) == 2
    assert release_calls == []
    assert db.rollback_calls == 0
    assert invoice.notes == "Invoice dibuat melalui DashAI Invoice Assistant."


@pytest.mark.asyncio
async def test_invoice_precommit_failure_releases_token_and_records_failure(
    monkeypatch,
):
    from src.ai import invoice_action_service as service

    user = _current_user()
    payload = _invoice_confirm_payload()
    db = _FakeDB()
    release_calls = []
    failure_audits = []

    token_payload = {
        "company_id": user.company_id,
        "branch_id": None,
        "draft_id": payload.draft_id,
        "jti": str(uuid4()),
        "provider": "rules",
    }

    monkeypatch.setattr(service, "verify_ai_action_token", lambda **_: token_payload)

    async def fake_scope(**_):
        return user.company_id, None

    async def fake_policy(self, **kwargs):
        return dict(kwargs["data"])

    async def fake_claim(_):
        return "claim-key"

    async def fake_release(key):
        release_calls.append(key)

    async def fake_flush(session):
        for item in session.items:
            if getattr(item, "id", None) is None:
                item.id = uuid4()
            if hasattr(item, "created_at") and item.created_at is None:
                item.created_at = datetime(2026, 7, 18, 0, 0, 0)
            if hasattr(item, "updated_at") and item.updated_at is None:
                item.updated_at = datetime(2026, 7, 18, 0, 0, 0)

    async def failing_commit(_):
        raise RuntimeError("database commit failed")

    async def fake_failure_audit(**kwargs):
        failure_audits.append(kwargs)

    monkeypatch.setattr(service, "resolve_ai_action_scope", fake_scope)
    monkeypatch.setattr(
        service.FinanceInvoiceWritePolicy, "before_create", fake_policy
    )
    monkeypatch.setattr(service, "claim_ai_action_token", fake_claim)
    monkeypatch.setattr(service, "release_ai_action_token_claim", fake_release)
    monkeypatch.setattr(service, "flush_or_raise", fake_flush)
    monkeypatch.setattr(service, "commit_or_raise", failing_commit)
    monkeypatch.setattr(service, "record_failure_audit_safe", fake_failure_audit)

    with pytest.raises(RuntimeError, match="database commit failed"):
        await service.confirm_invoice_draft(
            db=db,
            current_user=user,
            payload=payload,
        )

    assert release_calls == ["claim-key"]
    assert db.rollback_calls == 1
    assert len(failure_audits) == 1
