from __future__ import annotations

import httpx
import pytest

from src.core.config import settings


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_requires_authentication(
    live_client,
    require_live_server,
):
    response = await live_client.post(
        "/api/v1/files/upload",
        params={
            "context": "product-photo",
            "company_id": "00000000-0000-0000-0000-000000000001",
        },
        files={
            "file": (
                "product.png",
                b"fake-image-content",
                "image/png",
            )
        },
    )

    assert response.status_code == 401, response.text


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_rejects_unknown_context(
    live_client,
    auth_headers,
    first_company_id,
):
    response = await live_client.post(
        "/api/v1/files/upload",
        params={
            "context": "unknown-context",
            "company_id": first_company_id,
        },
        headers=auth_headers,
        files={
            "file": (
                "document.pdf",
                b"%PDF-test",
                "application/pdf",
            )
        },
    )

    assert response.status_code == 422, response.text


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_rejects_mime_type_not_allowed_by_context(
    live_client,
    auth_headers,
    first_company_id,
):
    response = await live_client.post(
        "/api/v1/files/upload",
        params={
            "context": "product-photo",
            "company_id": first_company_id,
        },
        headers=auth_headers,
        files={
            "file": (
                "product.png",
                b"plain-text-disguised-as-image",
                "text/plain",
            )
        },
    )

    assert response.status_code == 415, response.text


@pytest.mark.integration
@pytest.mark.asyncio
async def test_public_upload_is_available_only_from_public_mount(
    live_client,
    auth_headers,
    first_company_id,
    base_url,
):
    upload_response = await live_client.post(
        "/api/v1/files/upload",
        params={
            "context": "product-photo",
            "company_id": first_company_id,
        },
        headers=auth_headers,
        files={
            "file": (
                "product.png",
                b"fake-public-image-content",
                "image/png",
            )
        },
    )

    assert upload_response.status_code == 200, upload_response.text

    payload = upload_response.json()

    assert payload["context"] == "product-photo"
    assert payload["visibility"] == "public"
    assert payload["is_public"] is True
    assert payload["company_id"] == first_company_id
    assert payload["url"].startswith("/uploads/public/products/")

    async with httpx.AsyncClient(
        base_url=base_url,
        timeout=20.0,
    ) as anonymous_client:
        public_response = await anonymous_client.get(
            payload["url"]
        )

    assert public_response.status_code == 200, public_response.text
    assert public_response.content == b"fake-public-image-content"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_private_upload_requires_auth_and_is_not_static(
    live_client,
    auth_headers,
    first_company_id,
    base_url,
):
    upload_response = await live_client.post(
        "/api/v1/files/upload",
        params={
            "context": "transaction-proof",
            "company_id": first_company_id,
        },
        headers=auth_headers,
        files={
            "file": (
                "proof.pdf",
                b"%PDF-private-proof",
                "application/pdf",
            )
        },
    )

    assert upload_response.status_code == 200, upload_response.text

    payload = upload_response.json()

    assert payload["context"] == "transaction-proof"
    assert payload["visibility"] == "private"
    assert payload["is_public"] is False
    assert payload["company_id"] == first_company_id
    assert payload["url"].startswith(
        "/api/v1/files/private/transaction-proof/"
    )

    guessed_static_url = (
        "/uploads/private/transactions/"
        f"{first_company_id}/{payload['filename']}"
    )

    async with httpx.AsyncClient(
        base_url=base_url,
        timeout=20.0,
    ) as anonymous_client:
        anonymous_private_response = await anonymous_client.get(
            payload["url"]
        )

        guessed_static_response = await anonymous_client.get(
            guessed_static_url
        )

    assert anonymous_private_response.status_code == 401, (
        anonymous_private_response.text
    )

    assert guessed_static_response.status_code == 404, (
        guessed_static_response.text
    )

    authenticated_response = await live_client.get(
        payload["url"],
        headers=auth_headers,
    )

    assert authenticated_response.status_code == 200, (
        authenticated_response.text
    )
    assert authenticated_response.content == b"%PDF-private-proof"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_upload_size_limit_removes_partial_file(
    live_client,
    auth_headers,
    first_company_id,
):
    oversized_content = b"x" * (
        settings.MAX_UPLOAD_SIZE_MB
        * 1024
        * 1024
        + 1
    )

    response = await live_client.post(
        "/api/v1/files/upload",
        params={
            "context": "general",
            "company_id": first_company_id,
        },
        headers=auth_headers,
        files={
            "file": (
                "oversized.pdf",
                oversized_content,
                "application/pdf",
            )
        },
    )

    assert response.status_code == 413, response.text
