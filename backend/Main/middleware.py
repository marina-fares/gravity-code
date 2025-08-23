import datetime
from .models.logs import APILog


class APILogMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        start_time = datetime.datetime.now()

        # --- Capture request body ---
        try:
            request_body = request.body.decode("utf-8") if request.body else ""
        except Exception:
            request_body = "<unreadable>"

        # --- Process the request ---
        response = self.get_response(request)

        duration = (datetime.datetime.now() - start_time).total_seconds()

        # --- Capture response body (limit size to avoid DB issues) ---
        try:
            response_body = response.content.decode("utf-8")[:1000]  # limit 1000 chars
        except Exception:
            response_body = "<non-textual response>"

        # --- Save to DB ---
        APILog.objects.create(
            user=request.user if request.user.is_authenticated else None,
            method=request.method,
            path=request.get_full_path(),
            status_code=response.status_code,
            duration=duration,
            request_body=request_body[:1000],   # limit request body too
            response_body=response_body,
        )

        return response
