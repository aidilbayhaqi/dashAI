import json
import asyncio

from src.core.redis import redis_client
from src.realtime.events import ERP_EVENT_CHANNEL
from src.realtime.manager import manager


async def start_realtime_listener():
    pubsub = redis_client.pubsub()
    await pubsub.subscribe(ERP_EVENT_CHANNEL)

    print("✅ Redis realtime listener started")

    while True:
        message = await pubsub.get_message(
            ignore_subscribe_messages=True,
            timeout=1.0
        )

        if message:
            data = json.loads(message["data"])
            await manager.broadcast(data)

        await asyncio.sleep(0.01)