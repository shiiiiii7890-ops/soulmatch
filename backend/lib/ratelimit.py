"""Tiny in-memory sliding-window rate limiter, keyed by client IP."""

import time
from collections import defaultdict, deque

from fastapi import Depends, HTTPException, Request

_hits: dict[str, deque] = defaultdict(deque)


def client_ip(request: Request) -> str:
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit(key: str, limit: int, window_s: int):
    async def dep(request: Request) -> None:
        k = f"{key}:{client_ip(request)}"
        now = time.monotonic()
        q = _hits[k]
        while q and q[0] < now - window_s:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(status_code=429, detail="Too many attempts. Please wait a few minutes and try again.")
        q.append(now)

    return Depends(dep)
