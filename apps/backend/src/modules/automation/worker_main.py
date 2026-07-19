from __future__ import annotations

import asyncio
import logging
import signal

from src.core.config import settings
from src.core.logging_config import configure_logging
from src.core.redis import close_redis_connection
from src.db.database import engine
from src.modules.automation.outbox_worker import start_outbox_worker


configure_logging(level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)
logger = logging.getLogger(__name__)


async def run_worker() -> None:
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    for signal_name in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(signal_name, stop_event.set)
        except NotImplementedError:
            pass

    worker_task = asyncio.create_task(start_outbox_worker())
    logger.info("DashAI outbox worker process started")
    try:
        await stop_event.wait()
    finally:
        worker_task.cancel()
        try:
            await worker_task
        except asyncio.CancelledError:
            pass
        await close_redis_connection()
        await engine.dispose()
        logger.info("DashAI outbox worker process stopped")


if __name__ == "__main__":
    asyncio.run(run_worker())
