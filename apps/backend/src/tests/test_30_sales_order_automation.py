from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from src.tests.automation_helpers import (
    create_sales_order,
    create_stocked_product,
    decimal_value,
    get_product_stock,
)


pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_sales_order_auto_processes_product_to_finance(
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
    before = await get_product_stock(
        live_client,
        auth_headers=auth_headers,
        company_id=first_company_id,
        branch_id=first_branch_id,
        product_id=product["id"],
    )

    response = await create_sales_order(
        live_client,
        auth_headers=auth_headers,
        company_id=first_company_id,
        branch_id=first_branch_id,
        product_id=product["id"],
        idempotency_key=f"sales-order-auto-{uuid4().hex}",
        auto_process=True,
        quantity="2.0000",
    )
    assert response.status_code == 201, response.text
    order = response.json()

    assert order["status"] == "fulfilled"
    assert order["transaction_id"]
    assert order["invoice_id"]
    assert decimal_value(order["total_amount"]) == Decimal("150000.00")
    assert len(order["items"]) == 1

    after = await get_product_stock(
        live_client,
        auth_headers=auth_headers,
        company_id=first_company_id,
        branch_id=first_branch_id,
        product_id=product["id"],
    )
    assert decimal_value(after["quantity_on_hand"]) == (
        decimal_value(before["quantity_on_hand"]) - Decimal("2.0000")
    )
    assert decimal_value(after["reserved_quantity"]) == Decimal("0.0000")
