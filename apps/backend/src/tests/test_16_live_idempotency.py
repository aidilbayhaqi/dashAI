from __future__ import annotations

from uuid import uuid4

import pytest


pytestmark = [
    pytest.mark.integration,
    pytest.mark.asyncio,
]


async def test_product_category_create_is_idempotent(
    live_client,
    auth_headers: dict[str, str],
    first_company_id: str,
):
    unique_token = uuid4().hex
    idempotency_key = f"dashai-category-{unique_token}"

    payload = {
        "company_id": first_company_id,
        "code": f"IDEM-{unique_token[:12].upper()}",
        "name": f"Idempotency Test {unique_token[:8]}",
        "description": "Temporary integration-test record",
        "is_active": True,
    }

    request_headers = {
        **auth_headers,
        "Idempotency-Key": idempotency_key,
    }

    created_id: str | None = None

    try:
        first_response = await live_client.post(
            "/api/v1/products/categories",
            headers=request_headers,
            json=payload,
        )

        assert first_response.status_code == 201, (
            first_response.text
        )
        assert (
            first_response.headers.get("idempotency-replayed")
            == "false"
        )
        assert (
            first_response.headers.get("idempotency-key")
            == idempotency_key
        )

        first_body = first_response.json()
        created_id = first_body["id"]

        second_response = await live_client.post(
            "/api/v1/products/categories",
            headers=request_headers,
            json=payload,
        )

        assert second_response.status_code == 201, (
            second_response.text
        )
        assert (
            second_response.headers.get("idempotency-replayed")
            == "true"
        )
        assert second_response.json()["id"] == created_id

        changed_payload = {
            **payload,
            "name": f"Changed payload {unique_token[:8]}",
        }

        changed_response = await live_client.post(
            "/api/v1/products/categories",
            headers=request_headers,
            json=changed_payload,
        )

        assert changed_response.status_code == 409, (
            changed_response.text
        )

        duplicate_business_key_response = await live_client.post(
            "/api/v1/products/categories",
            headers={
                **auth_headers,
                "Idempotency-Key": (
                    f"dashai-category-duplicate-{unique_token}"
                ),
            },
            json=payload,
        )

        assert duplicate_business_key_response.status_code == 409, (
            duplicate_business_key_response.text
        )

        list_response = await live_client.get(
            "/api/v1/products/categories",
            headers=auth_headers,
            params={
                "page": 1,
                "limit": 20,
                "q": payload["code"],
                "company_id": first_company_id,
            },
        )

        assert list_response.status_code == 200, list_response.text

        list_body = list_response.json()
        matching_records = [
            item
            for item in list_body["data"]
            if item.get("code") == payload["code"]
        ]

        assert len(matching_records) == 1
        assert matching_records[0]["id"] == created_id

    finally:
        if created_id is not None:
            cleanup_response = await live_client.delete(
                f"/api/v1/products/categories/{created_id}",
                headers=auth_headers,
            )

            assert cleanup_response.status_code in {
                204,
                404,
            }, cleanup_response.text


async def test_create_requires_idempotency_key(
    live_client,
    auth_headers: dict[str, str],
    first_company_id: str,
):
    unique_token = uuid4().hex

    response = await live_client.post(
        "/api/v1/products/categories",
        headers=auth_headers,
        json={
            "company_id": first_company_id,
            "code": f"NO-IDEM-{unique_token[:10].upper()}",
            "name": f"Missing idempotency key {unique_token[:8]}",
            "is_active": True,
        },
    )

    assert response.status_code == 400, response.text
    assert "Idempotency-Key" in response.text
