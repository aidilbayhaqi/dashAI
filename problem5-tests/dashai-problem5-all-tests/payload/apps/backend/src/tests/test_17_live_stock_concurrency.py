from __future__ import annotations

import asyncio
from decimal import Decimal
from uuid import uuid4

import pytest


pytestmark = [
    pytest.mark.integration,
    pytest.mark.asyncio,
]


def _idempotency_headers(
    auth_headers: dict[str, str],
    key: str,
) -> dict[str, str]:
    return {
        **auth_headers,
        "Idempotency-Key": key,
    }


async def _get_product_stock(
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
            "page": 1,
            "limit": 20,
            "company_id": company_id,
            "branch_id": branch_id,
            "product_id": product_id,
        },
    )

    assert response.status_code == 200, response.text

    body = response.json()
    records = [
        item
        for item in body["data"]
        if (
            item.get("product_id") == product_id
            and item.get("branch_id") == branch_id
        )
    ]

    assert len(records) == 1
    return records[0]


async def test_concurrent_stock_out_cannot_create_negative_stock(
    live_client,
    auth_headers: dict[str, str],
    first_company_id: str,
    first_branch_id: str | None,
):
    if first_branch_id is None:
        pytest.skip(
            "No branch data found. Run seed or create a branch first."
        )

    token = uuid4().hex
    product_id: str | None = None

    product_payload = {
        "company_id": first_company_id,
        "branch_id": first_branch_id,
        "category_id": None,
        "sku": f"CONC-{token[:12].upper()}",
        "barcode": None,
        "name": f"Concurrency Test Product {token[:8]}",
        "description": "Temporary stock concurrency test",
        "image_url": None,
        "product_type": "physical",
        "unit": "pcs",
        "cost_price": "10000.00",
        "selling_price": "15000.00",
        "track_stock": True,
        "status": "active",
    }

    try:
        product_response = await live_client.post(
            "/api/v1/products/items",
            headers=_idempotency_headers(
                auth_headers,
                f"dashai-product-concurrency-{token}",
            ),
            json=product_payload,
        )

        assert product_response.status_code == 201, (
            product_response.text
        )

        product_id = product_response.json()["id"]

        initial_source_id = str(uuid4())
        initial_payload = {
            "company_id": first_company_id,
            "branch_id": first_branch_id,
            "product_id": product_id,
            "movement_type": "in",
            "quantity": "10.0000",
            "unit_cost": "10000.00",
            "total_cost": "0.00",
            "source_module": "integration-test-initial",
            "source_id": initial_source_id,
            "notes": "Initial stock for concurrency test",
        }

        initial_response = await live_client.post(
            "/api/v1/products/stock-movements",
            headers=_idempotency_headers(
                auth_headers,
                f"dashai-stock-initial-{token}",
            ),
            json=initial_payload,
        )

        assert initial_response.status_code in {200, 201}, (
            initial_response.text
        )

        initial_stock = await _get_product_stock(
            live_client,
            auth_headers=auth_headers,
            company_id=first_company_id,
            branch_id=first_branch_id,
            product_id=product_id,
        )

        assert Decimal(
            str(initial_stock["quantity_on_hand"])
        ) == Decimal("10.0000")

        first_out_payload = {
            "company_id": first_company_id,
            "branch_id": first_branch_id,
            "product_id": product_id,
            "movement_type": "out",
            "quantity": "7.0000",
            "unit_cost": "10000.00",
            "total_cost": "0.00",
            "source_module": "integration-test-concurrent-out",
            "source_id": str(uuid4()),
            "notes": "Concurrent stock out request A",
        }
        second_out_payload = {
            **first_out_payload,
            "source_id": str(uuid4()),
            "notes": "Concurrent stock out request B",
        }

        first_key = f"dashai-stock-out-a-{token}"
        second_key = f"dashai-stock-out-b-{token}"

        first_result, second_result = await asyncio.gather(
            live_client.post(
                "/api/v1/products/stock-movements",
                headers=_idempotency_headers(
                    auth_headers,
                    first_key,
                ),
                json=first_out_payload,
            ),
            live_client.post(
                "/api/v1/products/stock-movements",
                headers=_idempotency_headers(
                    auth_headers,
                    second_key,
                ),
                json=second_out_payload,
            ),
        )

        statuses = sorted(
            [
                first_result.status_code,
                second_result.status_code,
            ]
        )

        assert statuses == [200, 409] or statuses == [201, 409], (
            first_result.text,
            second_result.text,
        )

        successful_response = (
            first_result
            if first_result.status_code in {200, 201}
            else second_result
        )
        failed_response = (
            second_result
            if successful_response is first_result
            else first_result
        )
        successful_payload = (
            first_out_payload
            if successful_response is first_result
            else second_out_payload
        )
        successful_key = (
            first_key
            if successful_response is first_result
            else second_key
        )

        assert "negative" in failed_response.text.lower()

        stock_after_concurrency = await _get_product_stock(
            live_client,
            auth_headers=auth_headers,
            company_id=first_company_id,
            branch_id=first_branch_id,
            product_id=product_id,
        )

        assert Decimal(
            str(stock_after_concurrency["quantity_on_hand"])
        ) == Decimal("3.0000")

        replay_response = await live_client.post(
            "/api/v1/products/stock-movements",
            headers=_idempotency_headers(
                auth_headers,
                successful_key,
            ),
            json=successful_payload,
        )

        assert replay_response.status_code in {200, 201}, (
            replay_response.text
        )
        assert (
            replay_response.headers.get("idempotency-replayed")
            == "true"
        )
        assert (
            replay_response.json()["id"]
            == successful_response.json()["id"]
        )

        stock_after_replay = await _get_product_stock(
            live_client,
            auth_headers=auth_headers,
            company_id=first_company_id,
            branch_id=first_branch_id,
            product_id=product_id,
        )

        assert Decimal(
            str(stock_after_replay["quantity_on_hand"])
        ) == Decimal("3.0000")

        duplicate_source_response = await live_client.post(
            "/api/v1/products/stock-movements",
            headers=_idempotency_headers(
                auth_headers,
                f"dashai-stock-duplicate-source-{token}",
            ),
            json=initial_payload,
        )

        assert duplicate_source_response.status_code == 409, (
            duplicate_source_response.text
        )

        stock_after_rollback = await _get_product_stock(
            live_client,
            auth_headers=auth_headers,
            company_id=first_company_id,
            branch_id=first_branch_id,
            product_id=product_id,
        )

        assert Decimal(
            str(stock_after_rollback["quantity_on_hand"])
        ) == Decimal("3.0000")

    finally:
        if product_id is not None:
            cleanup_response = await live_client.delete(
                f"/api/v1/products/items/{product_id}",
                headers=auth_headers,
            )

            assert cleanup_response.status_code in {
                204,
                404,
            }, cleanup_response.text
