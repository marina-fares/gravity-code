# admin.py
from django.contrib import admin
from django.contrib.auth.models import User
from ..models.logs import APILog

ALLOWED_USERNAME = "root"

@admin.register(APILog)
class APILogAdmin(admin.ModelAdmin):
    list_display = ("method", "path", "status_code", "user", "timestamp", "duration")
    list_filter = ("method", "status_code", "user")
    search_fields = ("path", "user__username")

    # Only allow the allowed user to see the logs
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.username != ALLOWED_USERNAME:
            return qs.none()
        return qs

    # Hide the app/module from other users
    def has_module_permission(self, request):
        return request.user.username == ALLOWED_USERNAME
