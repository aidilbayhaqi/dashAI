from __future__ import annotations

from uuid import uuid4

import pytest

from src.tests.automation_helpers import (
    create_sales_order,
    create_stocked_product,
)
from src.tests.problem5_helpers import idempotency_headers


pytestmark = [pytest.mark.integration, pytest.mark.asyncio]


async def test_sales_order_create_and_process_are_idempotent(
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

    create_key = f"sales-order-draft-{uuid4().hex}"
    first = await create_sales_order(
        live_client,
        auth_headers=auth_headers,
        company_id=first_company_id,
        branch_id=first_branch_id,
        product_id=product["id"],
        idempotency_key=create_key,
        auto_process=False,
    )
    assert first.status_code == 201, first.text
    assert first.headers.get("idempotency-replayed") == "false"
    draft = first.json()
    assert draft["status"] == "draft"
    assert draft["transaction_id"] is None
    assert draft["invoice_id"] is None

    replay = await create_sales_order(
        live_client,
        auth_headers=auth_headers,
        company_id=first_company_id,
        branch_id=first_branch_id,
        product_id=product["id"],
        idempotency_key=create_key,
        auto_process=False,
    )
    assert replay.status_code == 201, replay.text
    assert replay.headers.get("idempotency-replayed") == "true"
    assert replay.json()["id"] == draft["id"]

    process_key = f"sales-order-process-{uuid4().hex}"
    process_url = f"/api/v1/automation/sales-orders/{draft['id']}/process"
    process_params = {"company_id": first_company_id}

    processed = await live_client.post(
        process_url,
        params=process_params,
        headers=idempotency_headers(auth_headers, process_key),
        json={},
    )
    assert processed.status_code == 200, processed.text
    result = processed.json()
    assert result["status"] == "fulfilled"

    process_replay = await live_client.post(
        process_url,
        params=process_params,
        headers=idempotency_headers(auth_headers, process_key),
        json={},
    )
    assert process_replay.status_code == 200, process_replay.text
    assert process_replay.headers.get("idempotency-replayed") == "true"
    assert process_replay.json()["transaction_id"] == result["transaction_id"]
    assert process_replay.json()["invoice_id"] == result["invoice_id"]

    second_key = f"sales-order-process-second-{uuid4().hex}"
    second_process = await live_client.post(
        process_url,
        params=process_params,
        headers=idempotency_headers(auth_headers, second_key),
        json={},
    )
    assert second_process.status_code == 200, second_process.text
    assert second_process.json()["transaction_id"] == result["transaction_id"]
    assert second_process.json()["invoice_id"] == result["invoice_id"]
