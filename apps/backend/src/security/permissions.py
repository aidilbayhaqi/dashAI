from __future__ import annotations

from collections.abc import Iterable


DASHBOARD_SUMMARY_VIEW = "dashboard.summary.view"
AI_ANALYTICS_VIEW = "ai.analytics.view"
REALTIME_EVENTS_VIEW = "realtime.events.view"


def permission_module(permission: str) -> str | None:
    normalized = str(permission or "").strip().lower()
    if not normalized or "." not in normalized:
        return None
    return normalized.split(".", 1)[0]


def realtime_modules_from_permissions(
    permissions: Iterable[str],
) -> set[str]:
    """Return business modules a websocket may receive.

    Dashboard, AI, and realtime permissions authorize the transport itself;
    business payloads are still filtered by the underlying module permissions.
    """

    modules = {
        module
        for permission in permissions
        if (module := permission_module(permission))
    }
    modules.difference_update({"dashboard", "ai", "realtime", "admin"})
    return modules
