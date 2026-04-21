"""
admin/logs.py  —  APILogAdmin

FIX: get_queryset() and has_module_permission() were previously defined on
the APILog Model class where Django never calls them (they are ModelAdmin
methods). They are now correctly placed here on APILogAdmin.
"""

from django.contrib import admin
from ..models.logs import APILog

ALLOWED_USERNAME = "root"


@admin.register(APILog)
class APILogAdmin(admin.ModelAdmin):
    list_display = ("method", "path", "status_code", "user", "timestamp", "duration")
    list_filter = ("method", "status_code")
    search_fields = ("path", "user__username")
    list_select_related = ("user",)
    list_per_page = 50
    show_full_result_count = False

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related("user")
        if request.user.username != ALLOWED_USERNAME:
            return qs.none()
        return qs

    def has_module_permission(self, request):
        return request.user.username == ALLOWED_USERNAME