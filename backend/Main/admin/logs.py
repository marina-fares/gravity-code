# admin.py
from django.contrib import admin
from django.urls import path
from django.shortcuts import render
from ..models.logs import APILog


class APILogAdmin(admin.ModelAdmin):
    list_display = ("method", "path", "status_code", "user", "timestamp", "duration")
    list_filter = ("method", "status_code", "user")
    search_fields = ("path", "user__username")

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path("custom-logs/", self.admin_site.admin_view(self.custom_logs_view), name="custom_logs"),
        ]
        return custom_urls + urls

    def custom_logs_view(self, request):
        logs = APILog.objects.order_by("-timestamp")[:50]  # latest 50 logs
        context = {
            "logs": logs,
            "title": "API Logs Dashboard",
        }
        return render(request, "admin/custom_logs.html", context)


admin.site.register(APILog, APILogAdmin)
