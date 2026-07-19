from __future__ import annotations

from fastapi import HTTPException, status
from pydantic import ValidationError


def ai_validation_http_exception(
    exc: ValidationError,
    *,
    message: str,
) -> HTTPException:
    """Convert internal Pydantic validation into a stable HTTP 422 response.

    FastAPI automatically handles request-model validation, but AI provider and
    fallback parser output is validated inside services. Without this adapter,
    invalid provider/parser data can surface as an HTTP 500.
    """

    errors: list[dict[str, str]] = []
    for item in exc.errors(include_input=False, include_url=False):
        location = ".".join(str(part) for part in item.get("loc", ()))
        errors.append(
            {
                "field": location or "payload",
                "message": str(item.get("msg") or "Nilai tidak valid"),
                "type": str(item.get("type") or "validation_error"),
            }
        )

    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail={
            "message": message,
            "errors": errors,
        },
    )
