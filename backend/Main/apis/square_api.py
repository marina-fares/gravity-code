from datetime import timedelta

from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from ..interfaces.square_interface import SquareApiInterface


class SquareAPI(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data.copy()
        url = data.get('url', '')
        payload = data.get('payload') or {}
        request_type = data.get('request_type', '')

        # Validate required fields before hitting Square
        if not request_type:
            return Response(
                {"error": "Missing required field: 'request_type'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not url:
            return Response(
                {"error": "Missing required field: 'url'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        # payload must be a dict for .get() calls in the interface
        if not isinstance(payload, dict):
            return Response(
                {"error": "'payload' must be an object."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Inject server-side timestamps for Square labor shift endpoints.
        # Server time is always accurate — the browser clock cannot be trusted.
        if url == '/labor/shifts' and isinstance(payload.get('shift'), dict):
            now = timezone.now() - timedelta(seconds=30)
            payload['shift']['start_at'] = now.strftime('%Y-%m-%dT%H:%M:%SZ')

        if url.startswith('/labor/shifts/') and isinstance(payload.get('shift'), dict):
            now = timezone.now() - timedelta(seconds=30)
            payload['shift']['end_at'] = now.strftime('%Y-%m-%dT%H:%M:%SZ')

        square = SquareApiInterface()

        # FIX 1: SquareApiInterface.__init__ does 'Bearer ' + self.key which
        # raises TypeError if SQUARE_API_KEY is not set in the environment.
        if not square.key:
            return Response(
                {"error": "Square API key is not configured on the server."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response = square.make_square_request(request_type, url, payload)

        # FIX 2: make_square_request returns None on network error or bad
        # request_type. Calling response.json() on None raises AttributeError
        # which becomes an unhandled 500. Guard here before touching response.
        if response is None:
            return Response(
                {"error": "Could not reach Square API. Check server logs for details."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            return Response(response.json(), status=response.status_code)
        except ValueError:
            # Square returned non-JSON (e.g. empty body on 204)
            return Response(
                {"error": "Invalid response from Square API."},
                status=status.HTTP_502_BAD_GATEWAY,
            )