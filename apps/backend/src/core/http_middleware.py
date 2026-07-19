from __future__ import annotations

from uuid import UUID, uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from src.core.config import settings
from src.core.logging_config import request_id_context


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        raw_request_id = request.headers.get("X-Request-ID", "").strip()
        try:
            request_id = str(UUID(raw_request_id)) if raw_request_id else str(uuid4())
        except ValueError:
            request_id = str(uuid4())

        token = request_id_context.set(request_id)
        request.state.request_id = request_id
        try:
            response = await call_next(request)
        finally:
            request_id_context.reset(token)

        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains"
            )
        return response
