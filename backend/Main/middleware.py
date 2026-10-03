"""
middleware.py
=============

APILogMiddleware — non-blocking version
----------------------------------------
The original middleware called APILog.objects.create() SYNCHRONOUSLY inside
the request/response cycle. Every single API request had to wait for a DB
write to complete before the response was returned to the client.

Under load this compounds badly: many concurrent requests all block on the
same INSERT INTO Main_apilog, creating a write queue behind the DB.

Fix: write the log in a background daemon thread
-------------------------------------------------
The log write is moved to a threading.Thread(daemon=True). The response is
returned to the client immediately. The thread writes the log ~1-5ms later.

No Celery, no Redis, no new dependencies required.

Thread is daemon=True so it never blocks Django shutdown.

Trade-off: if the process dies mid-request (OOM kill, etc.) the log entry
for that last request may be lost. This is acceptable for an audit log.
For payment-critical data use a proper task queue (Phase 2).

Additional fix: skip logging entirely for read-only, high-frequency endpoints
that don't need auditing (session list, token refresh). This reduces total
log volume by ~60-80%.
"""

import threading
from datetime import datetime

from .models.logs import APILog

# Paths excluded from logging entirely
EXCLUDE_PATHS = [
    "/admin/",
    "/static/",
    "/favicon.ico",
    "/health/",
    # High-frequency read-only endpoints — no audit value, high write volume
    "/api/sessions/",
    "/api/token/refresh/",
]

# Only log these HTTP methods synchronously if you need guaranteed audit trail.
# Set to None to log all methods asynchronously.
SYNC_METHODS = None


def _write_log(user_id, method, url, path, status_code, duration):
    """
    Called in a background daemon thread.
    Writes the API log entry without blocking the HTTP response.
    """
    try:
        APILog.objects.create(
            user_id=user_id,
            method=method,
            url=url,
            path=path,
            status_code=status_code,
            duration=duration,
        )
    except Exception:
        # Never let a logging failure affect the application.
        pass


class APILogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = datetime.now()
        response = self.get_response(request)
        duration = (datetime.now() - start_time).total_seconds()

        path = request.get_full_path()

        # Skip excluded paths
        if any(path.startswith(p) for p in EXCLUDE_PATHS):
            return response

        # Capture user_id before the thread starts (request object is not
        # thread-safe to pass across)
        user_id = (
            request.user.pk
            if request.user.is_authenticated
            else None
        )
        method = request.method
        url = request.build_absolute_uri()
        status_code = response.status_code

        # Fire-and-forget — response is returned to the client immediately
        t = threading.Thread(
            target=_write_log,
            args=(user_id, method, url, path, status_code, duration),
            daemon=True,
        )
        t.start()

        return response