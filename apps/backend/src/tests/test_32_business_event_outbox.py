from __future__ import annotations

from pathlib import Path

import pytest

from src.main import app
from src.modules.automation.model_automation import DomainEventOutbox
from src.tests.route_utils import collect_paths


@pytest.mark.static
def test_business_automation_routes_are_registered():
    paths = collect_paths(app)
    assert "/api/v1/automation/sales-orders" in paths
    assert "/api/v1/automation/sales-orders/{order_id}/process" in paths
    assert "/api/v1/automation/events" in paths


@pytest.mark.static
def test_domain_event_outbox_has_unique_event_key():
    constraint_names = {
        constraint.name
        for constraint in DomainEventOutbox.__table__.constraints
    }
    assert "uq_domain_event_outbox_event_key" in constraint_names


@pytest.mark.static
def test_business_automation_migration_exists():
    backend_root = Path(__file__).resolve().parents[2]
    migration = (
        backend_root
        / "migrations"
        / "versions"
        / "7b8c9d0e1f23_business_automation_foundation.py"
    )
    assert migration.is_file()
    content = migration.read_text(encoding="utf-8")
    assert "sales_orders" in content
    assert "domain_event_outbox" in content
    assert "uq_finance_invoice_sales_order_source" in content
