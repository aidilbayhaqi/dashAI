from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def utc_now_naive() -> datetime:
    """Return UTC normalized for legacy TIMESTAMP WITHOUT TIME ZONE columns."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def local_today(timezone_name: str = "Asia/Jakarta") -> date:
    """Return the business-local date without depending on container timezone."""
    try:
        zone = ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        zone = timezone.utc
    return datetime.now(zone).date()
