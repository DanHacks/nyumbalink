"""Cross-worker realtime fan-out.

Production runs several gunicorn workers, so a socket opened on worker A is
invisible to a REST handler running on worker B. Anything that pushes a live
event goes through Redis pub/sub: every worker subscribes, and only the worker
holding the user's socket delivers it.

If Redis is unavailable the slow path still succeeds — live updates are simply
not delivered (clients fall back to their REST polling).
"""

import asyncio
import json
import logging
from typing import Iterable, Optional

import redis.asyncio as aioredis

from app.core.config import settings

logger = logging.getLogger(__name__)

CHANNEL = "nl:realtime"

_client: Optional[aioredis.Redis] = None
_listener_task: Optional[asyncio.Task] = None


def _redis() -> aioredis.Redis:
    global _client
    if _client is None:
        _client = aioredis.from_url(
            settings.REDIS_URL, encoding="utf-8", decode_responses=True
        )
    return _client


async def publish(user_ids: Iterable[str], payload: dict) -> None:
    targets = sorted({uid for uid in user_ids if uid})
    if not targets:
        return
    try:
        await _redis().publish(
            CHANNEL, json.dumps({"user_ids": targets, "payload": payload}, default=str)
        )
    except Exception:
        logger.warning("Realtime publish failed; live update dropped", exc_info=True)


async def _listen(manager) -> None:
    backoff = 1
    while True:
        try:
            async with _redis().pubsub() as pubsub:
                await pubsub.subscribe(CHANNEL)
                backoff = 1
                async for message in pubsub.listen():
                    if message.get("type") != "message":
                        continue
                    try:
                        envelope = json.loads(message["data"])
                        await manager.send_local(
                            envelope.get("user_ids", []), envelope.get("payload", {})
                        )
                    except Exception:
                        logger.warning("Bad realtime envelope", exc_info=True)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.warning("Realtime listener reconnecting in %ss", backoff, exc_info=True)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 30)


def start_listener(manager) -> None:
    global _listener_task
    if _listener_task is None or _listener_task.done():
        _listener_task = asyncio.create_task(_listen(manager), name="realtime-listener")


async def stop_listener() -> None:
    global _listener_task, _client
    if _listener_task is not None:
        _listener_task.cancel()
        try:
            await _listener_task
        except (asyncio.CancelledError, Exception):
            pass
        _listener_task = None
    if _client is not None:
        try:
            await _client.aclose()
        except Exception:
            pass
        _client = None
