from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from src.tests.automation_helpers import (
    create_sales_order,
    create_stocked_product,
)
from src.tests.problem5_helpers import idempotency_headers


pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_payment_confirmation_updates_monitoring_and_invoice(
    live_client,
    auth_headers: dict[str, str],
    first_company_id: str,
    first_branch_id: str | None,
):
    if not first_branch_id:
        pytest.skip("No active branch is available")

    product = await create_stocked_product(
        live_client,
        auth_headers=auth_headers,
        company_id=first_company_id,
        branch_id=first_branch_id,
    )
    order_response = await create_sales_order(
        live_client,
        auth_headers=auth_headers,
        company_id=first_company_id,
        branch_id=first_branch_id,
        product_id=product["id"],
        idempotency_key=f"payment-monitoring-{uuid4().hex}",
        auto_process=True,
    )
    assert order_response.status_code == 201, order_response.text
    order = order_response.json()

    monitoring_response = await live_client.get(
        "/api/v1/automation/monitoring",
        headers=auth_headers,
        params={"company_id": first_company_id, "limit": 200},
    )
    assert monitoring_response.status_code == 200, monitoring_response.text
    before = next(
        row
        for row in monitoring_response.json()
        if row["order_id"] == order["id"]
    )
    assert before["payment_status"] == "unpaid"
    assert before["invoice_status"] == "sent"
    assert Decimal(str(before["outstanding_amount"])) == Decimal(
        str(before["total_amount"])
    )

    payment_key = f"confirm-payment-{uuid4().hex}"
    confirm_response = await live_client.post(
        f"/api/v1/automation/sales-orders/{order['id']}/confirm-payment",
        headers=idempotency_headers(auth_headers, payment_key),
        params={"company_id": first_company_id},
        json={},
    )
    assert confirm_response.status_code == 200, confirm_response.text
    confirmed = confirm_response.json()
    assert confirmed["payment_status"] == "paid"
    assert confirmed["invoice_status"] == "paid"
    assert Decimal(str(confirmed["outstanding_amount"])) == Decimal("0.00")
    assert Decimal(str(confirmed["paid_amount"])) == Decimal(
        str(confirmed["total_amount"])
    )

    replay_response = await live_client.post(
        f"/api/v1/automation/sales-orders/{order['id']}/confirm-payment",
        headers=idempotency_headers(auth_headers, payment_key),
        params={"company_id": first_company_id},
        json={},
    )
    assert replay_response.status_code == 200, replay_response.text
    assert replay_response.json()["payment_status"] == "paid"

    invoice_response = await live_client.get(
        f"/api/v1/finance/invoices/{order['invoice_id']}",
        headers=auth_headers,
    )
    assert invoice_response.status_code == 200, invoice_response.text
    invoice = invoice_response.json()
    assert invoice["status"] == "paid"
    assert Decimal(str(invoice["paid_amount"])) == Decimal(
        str(invoice["total_amount"])
    )

    event_response = await live_client.get(
        "/api/v1/automation/events",
        headers=auth_headers,
        params={
            "company_id": first_company_id,
            "aggregate_id": order["id"],
            "limit": 100,
        },
    )
    assert event_response.status_code == 200, event_response.text
    payment_events = [
        event
        for event in event_response.json()
        if event["event_type"] == "finance.payment.confirmed"
    ]
    assert len(payment_events) == 1
