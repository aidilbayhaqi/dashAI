from __future__ import annotations

from decimal import Decimal
from uuid import uuid4

import pytest

from src.tests.problem5_helpers import idempotency_headers, paginated_rows


async def create_stocked_product(
    live_client,
    *,
    auth_headers: dict[str, str],
    company_id: str,
    branch_id: str | None,
    quantity: str = "10.0000",
) -> dict:
    if not branch_id:
        pytest.skip("Automation test requires at least one active branch")

    token = uuid4().hex
    product_response = await live_client.post(
        "/api/v1/products/items",
        headers=idempotency_headers(
            auth_headers,
            f"automation-product-{token}",
        ),
        json={
            "company_id": company_id,
            "branch_id": branch_id,
            "sku": f"AUTO-{token[:12].upper()}",
            "name": f"Automation Product {token[:8]}",
            "product_type": "physical",
            "unit": "pcs",
            "cost_price": "50000.00",
            "selling_price": "75000.00",
            "track_stock": True,
            "status": "active",
        },
    )
    assert product_response.status_code == 201, product_response.text
    product = product_response.json()

    stock_response = await live_client.post(
        "/api/v1/products/stock-movements",
        headers=idempotency_headers(
            auth_headers,
            f"automation-stock-{token}",
        ),
        json={
            "company_id": company_id,
            "branch_id": branch_id,
            "product_id": product["id"],
            "movement_type": "in",
            "quantity": quantity,
            "unit_cost": "50000.00",
            "source_module": "automation_test_setup",
            "source_id": str(uuid4()),
            "notes": "Initial stock for business automation test",
        },
    )
    assert stock_response.status_code in {200, 201}, stock_response.text
    return product


async def get_product_stock(
    live_client,
    *,
    auth_headers: dict[str, str],
    company_id: str,
    branch_id: str,
    product_id: str,
) -> dict:
    response = await live_client.get(
        "/api/v1/products/stocks",
        headers=auth_headers,
        params={
            "company_id": company_id,
            "branch_id": branch_id,
            "product_id": product_id,
            "limit": 100,
        },
    )
    assert response.status_code == 200, response.text
    matches = [
        row
        for row in paginated_rows(response.json())
        if row.get("product_id") == product_id
        and row.get("branch_id") == branch_id
    ]
    assert len(matches) == 1
    return matches[0]


async def create_sales_order(
    live_client,
    *,
    auth_headers: dict[str, str],
    company_id: str,
    branch_id: str,
    product_id: str,
    idempotency_key: str,
    auto_process: bool,
    quantity: str = "2.0000",
):
    return await live_client.post(
        "/api/v1/automation/sales-orders",
        headers=idempotency_headers(auth_headers, idempotency_key),
        json={
            "company_id": company_id,
            "branch_id": branch_id,
            "customer_name": "Automation Test Customer",
            "creation_mode": "manual",
            "auto_process": auto_process,
            "items": [
                {
                    "product_id": product_id,
                    "quantity": quantity,
                }
            ],
            "notes": "Temporary business automation integration test",
        },
    )


def decimal_value(value) -> Decimal:
    return Decimal(str(value))
