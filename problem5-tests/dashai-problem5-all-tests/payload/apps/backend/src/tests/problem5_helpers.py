from __future__ import annotations

from typing import Any


def idempotency_headers(
    auth_headers: dict[str, str],
    key: str,
) -> dict[str, str]:
    return {
        **auth_headers,
        "Idempotency-Key": key,
    }


def paginated_rows(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        rows = payload.get("data", [])
        return rows if isinstance(rows, list) else []

    return payload if isinstance(payload, list) else []


async def delete_if_exists(
    client,
    path: str | None,
    *,
    headers: dict[str, str],
) -> None:
    if not path:
        return

    response = await client.delete(path, headers=headers)
    assert response.status_code in {204, 404}, response.text
