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

    transaction_response = await live_client.get(
        f"/api/v1/finance/transactions/{order['transaction_id']}",
        headers=auth_headers,
    )
    assert transaction_response.status_code == 200, transaction_response.text
    transaction = transaction_response.json()
    assert transaction["cash_account_id"], (
        "Sales automation must attach an active cash account "
        "to the generated transaction"
    )
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


async def test_product_branch_contract_filters_lookup_and_rejects_wrong_branch(
    live_client,
    auth_headers: dict[str, str],
    first_company_id: str,
    first_branch_id: str | None,
):
    if not first_branch_id:
        pytest.skip("No active branch is available")

    branches_response = await live_client.get(
        f"/api/v1/companies/{first_company_id}/branches",
        headers=auth_headers,
    )
    assert branches_response.status_code == 200, branches_response.text
    payload = branches_response.json()
    branches = payload if isinstance(payload, list) else payload.get("data", [])

    product = await create_stocked_product(
        live_client,
        auth_headers=auth_headers,
        company_id=first_company_id,
        branch_id=first_branch_id,
    )

    available_response = await live_client.get(
        f"/api/v1/products/items/{product['id']}/available-branches",
        headers=auth_headers,
        params={"company_id": first_company_id},
    )
    assert available_response.status_code == 200, available_response.text
    available = available_response.json()["data"]
    assert [row["id"] for row in available] == [first_branch_id]

    other_branch = next(
        (row for row in branches if row.get("id") != first_branch_id),
        None,
    )
    if other_branch is None:
        pytest.skip("A second branch is required for mismatch rejection")

    stock_response = await live_client.post(
        "/api/v1/products/stocks",
        headers={
            **auth_headers,
            "Idempotency-Key": f"stock-branch-mismatch-{uuid4().hex}",
        },
        json={
            "company_id": first_company_id,
            "branch_id": other_branch["id"],
            "product_id": product["id"],
            "quantity_on_hand": "1.0000",
            "reserved_quantity": "0.0000",
            "reorder_point": "0.0000",
        },
    )
    assert stock_response.status_code == 409, stock_response.text

    order_response = await create_sales_order(
        live_client,
        auth_headers=auth_headers,
        company_id=first_company_id,
        branch_id=other_branch["id"],
        product_id=product["id"],
        idempotency_key=f"sales-branch-mismatch-{uuid4().hex}",
        auto_process=False,
    )
    assert order_response.status_code == 409, order_response.text
