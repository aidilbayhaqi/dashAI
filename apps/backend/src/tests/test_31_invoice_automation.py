from __future__ import annotations

from uuid import uuid4

import pytest

from src.tests.automation_helpers import (
    create_sales_order,
    create_stocked_product,
)


pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_sales_order_creates_linked_transaction_and_invoice(
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
    response = await create_sales_order(
        live_client,
        auth_headers=auth_headers,
        company_id=first_company_id,
        branch_id=first_branch_id,
        product_id=product["id"],
        idempotency_key=f"invoice-auto-{uuid4().hex}",
        auto_process=True,
    )
    assert response.status_code == 201, response.text
    order = response.json()

    transaction_response = await live_client.get(
        f"/api/v1/finance/transactions/{order['transaction_id']}",
        headers=auth_headers,
    )
    assert transaction_response.status_code == 200, transaction_response.text
    transaction = transaction_response.json()
    assert transaction["creation_mode"] == "automatic"
    assert transaction["source_module"] == "sales_order"
    assert transaction["source_id"] == order["id"]
    assert transaction["status"] == "posted"

    invoice_response = await live_client.get(
        f"/api/v1/finance/invoices/{order['invoice_id']}",
        headers=auth_headers,
    )
    assert invoice_response.status_code == 200, invoice_response.text
    invoice = invoice_response.json()
    assert invoice["creation_mode"] == "automatic"
    assert invoice["source_module"] == "sales_order"
    assert invoice["source_id"] == order["id"]
    assert invoice["status"] == "sent"
    assert invoice["total_amount"] == order["total_amount"]
