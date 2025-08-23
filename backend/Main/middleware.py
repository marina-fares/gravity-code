import datetime
from .models.logs import APILog

class APILogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = datetime.datetime.now()

        response = self.get_response(request)

        duration = (datetime.datetime.now() - start_time).total_seconds()

        # Save to DB
        APILog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            method=request.method,
            path=request.get_full_path(),
            status_code=response.status_code,
            duration=duration,
        )

        return response