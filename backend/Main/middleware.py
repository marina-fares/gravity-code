from datetime import datetime
from .models.logs import APILog

EXCLUDE_PATHS = ["/admin/", "/static/", "/favicon.ico", "/health/"]

class APILogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = datetime.now()
        response = self.get_response(request)
        duration = (datetime.now() - start_time).total_seconds()

        path = request.get_full_path()
        if not any(path.startswith(p) for p in EXCLUDE_PATHS):
            APILog.objects.create(
                user=request.user if request.user.is_authenticated else None,
                method=request.method,
                path=path,
                status_code=response.status_code,
                duration=duration,
            )

        return response
