"""
logs.py  —  APILog model
"""

from django.contrib.auth.models import User
from django.db import models


class APILog(models.Model):
    """
    Records every non-excluded API request for audit and debugging.
    Written asynchronously in a background thread (see middleware.py).
    """
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    method = models.CharField(max_length=10)
    # FIX #22: url and path were CharField(max_length=255).
    # Real URLs can exceed 255 chars (query strings, long paths).
    # TextField has no length limit — no truncation, no data loss.
    path = models.TextField()
    url = models.TextField()
    status_code = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    # duration stays FloatField — sub-millisecond precision is fine for
    # response time logging; no financial arithmetic is done on this value.
    duration = models.FloatField()

    class Meta:
        indexes = [
            models.Index(fields=["timestamp"], name="apilog_timestamp_idx"),
            models.Index(fields=["status_code"], name="apilog_status_idx"),
            # FIX #23: path index was on a CharField(255). Now that path is
            # a TextField, a plain BTree index still works for prefix lookups
            # but a full-value index on text requires explicit length in raw SQL.
            # For admin/debug filtering by path prefix this BTree is sufficient.
            models.Index(fields=["path"], name="apilog_path_idx"),
        ]
        ordering = ["-timestamp"]

    # FIX #24: get_queryset() and has_module_permission() were defined directly
    # on the Model class. These are ModelAdmin methods, not Model methods.
    # On a Model class they do nothing — Django never calls them there.
    # They have been moved to APILogAdmin in admin/logs.py where they belong.

    def __str__(self):
        return f"{self.method} {self.path} [{self.status_code}]"