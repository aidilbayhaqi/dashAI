from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import or_, select

from src.core.config import settings
from src.db.database import AsyncSessionLocal
from src.modules.automation.model_automation import (
    DomainEventOutbox,
    DomainEventStatus,
)
from src.realtime.events import publish_realtime_event


logger = logging.getLogger(__name__)


def _event_module(event_type: str) -> str:
    module = str(event_type or "automation").split(".", 1)[0].lower()
    aliases = {"product": "products", "user": "users"}
    module = aliases.get(module, module)
    return module if module in {
        "automation",
        "finance",
        "products",
        "crm",
        "hr",
        "company",
        "users",
    } else "automation"


def _retry_delay_seconds(attempts: int) -> int:
    return min(2 ** max(attempts, 1), 300)


async def process_outbox_batch() -> int:
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(DomainEventOutbox)
            .where(
                DomainEventOutbox.status.in_(
                    [DomainEventStatus.PENDING, DomainEventStatus.FAILED]
                ),
                DomainEventOutbox.attempts < settings.OUTBOX_MAX_ATTEMPTS,
                or_(
                    DomainEventOutbox.next_attempt_at.is_(None),
                    DomainEventOutbox.next_attempt_at <= now,
                ),
            )
            .order_by(DomainEventOutbox.occurred_at.asc())
            .limit(settings.OUTBOX_BATCH_SIZE)
            .with_for_update(skip_locked=True)
        )
        events = list(result.scalars().all())
        if not events:
            return 0

        for event in events:
            event.attempts += 1
            try:
                await publish_realtime_event(
                    event.event_type,
                    {
                        **(event.payload or {}),
                        "outbox_event_id": str(event.id),
                        "aggregate_type": event.aggregate_type,
                        "aggregate_id": str(event.aggregate_id),
                    },
                    company_id=event.company_id,
                    module=_event_module(event.event_type),
                )
                event.status = DomainEventStatus.PROCESSED
                event.processed_at = now
                event.next_attempt_at = None
                event.last_error = None
            except Exception as exc:
                event.status = DomainEventStatus.FAILED
                event.last_error = str(exc)[:2000]
                event.next_attempt_at = (
                    None
                    if event.attempts >= settings.OUTBOX_MAX_ATTEMPTS
                    else now + timedelta(
                        seconds=_retry_delay_seconds(event.attempts)
                    )
                )
                logger.exception(
                    "Outbox publish failed for %s (attempt %s/%s)",
                    event.id,
                    event.attempts,
                    settings.OUTBOX_MAX_ATTEMPTS,
                )

        await db.commit()
        return len(events)


async def start_outbox_worker() -> None:
    logger.info("Domain event outbox worker started")
    while True:
        try:
            processed = await process_outbox_batch()
            await asyncio.sleep(
                0.05 if processed else settings.OUTBOX_POLL_INTERVAL_SECONDS
            )
        except asyncio.CancelledError:
            logger.info("Domain event outbox worker cancelled")
            raise
        except Exception:
            logger.exception("Domain event outbox worker iteration failed")
            await asyncio.sleep(settings.OUTBOX_POLL_INTERVAL_SECONDS)
