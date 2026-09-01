"""Tiny in-process rate limiter for FastAPI routes.

A per-process dict of {key: [timestamps]} with a sliding-window check. Fine
for the single-uvicorn-worker dev/demo; for a multi-worker production
deployment swap this for a Redis-backed limiter (slowapi, redis-py, etc.)
because each worker maintains its own counter.

Usage:

    from .ratelimit import limit

    @router.post("/login")
    async def login(...): ...

    # limit to 10 calls per 60s per client IP
    login_dep = limit("login", max_calls=10, window_seconds=60)
    @router.post("/login", dependencies=[Depends(login_deep)])
    async def login(...): ...
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Callable

from fastapi import Depends, HTTPException, Request, status

_BUCKETS: dict[str, deque[float]] = defaultdict(deque)
_LOCK = Lock()


def limit(
    name: str,
    *,
    max_calls: int,
    window_seconds: float,
    key_fn: Callable[[Request], str] | None = None,
):
    """Return a FastAPI dependency enforcing `max_calls` per `window_seconds`
    per key. Default key is the client IP plus the limiter name.
    """

    def dep(request: Request) -> None:
        if key_fn is not None:
            key = key_fn(request)
        else:
            host = (request.client.host if request.client else "unknown") or "unknown"
            key = f"{name}:{host}"
        now = time.monotonic()
        cutoff = now - window_seconds
        with _LOCK:
            bucket = _BUCKETS[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= max_calls:
                retry = window_seconds - (now - bucket[0])
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=(
                        f"Too many requests — try again in {int(retry) + 1}s."
                    ),
                    headers={"Retry-After": str(int(retry) + 1)},
                )
            bucket.append(now)

    return dep
