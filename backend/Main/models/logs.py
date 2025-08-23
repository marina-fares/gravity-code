# models.py
from django.db import models
from django.contrib.auth.models import User

ALLOWED_USERNAME = "root"

class APILog(models.Model):
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    method = models.CharField(max_length=10)
    path = models.CharField(max_length=255)
    status_code = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)
    duration = models.FloatField()

    class Meta:
        indexes = [
            models.Index(fields=["timestamp"]),
            models.Index(fields=["status_code"]),
            models.Index(fields=["path"]),
        ]
        ordering = ["-timestamp"]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.username != ALLOWED_USERNAME:
            return qs.none()  # Hide all logs for other users
        return qs

    # Hide the app/module from users who shouldn't see it
    def has_module_permission(self, request):
        return request.user.username == ALLOWED_USERNAME

    def __str__(self):
        return f"{self.method} {self.path} [{self.status_code}]"
