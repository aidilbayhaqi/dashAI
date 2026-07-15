from datetime import datetime, timezone


def utc_now_naive() -> datetime:
    """Return UTC normalized for legacy TIMESTAMP WITHOUT TIME ZONE columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
