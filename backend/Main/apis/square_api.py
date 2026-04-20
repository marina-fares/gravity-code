from rest_framework import permissions, generics
from rest_framework.response import Response
from rest_framework import status
import requests

from ..serializers.SquareApiSerializers import SquareApiSerializers
from ..interfaces.square_interface import SquareApiInterface


from django.utils import timezone
from datetime import timedelta

class SquareAPI(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        data = request.data.copy()
        url = data.get('url', '')
        payload = data.get('payload', {})

        # Inject server-side timestamp for shift start/end
        # Server time is always accurate — browser clock cannot be trusted
        if url == '/labor/shifts' and 'shift' in payload:
            # Subtract 30 seconds as safety buffer against minor drift
            now = timezone.now() - timedelta(seconds=30)
            square_time = now.strftime('%Y-%m-%dT%H:%M:%SZ')
            payload['shift']['start_at'] = square_time

        if url.startswith('/labor/shifts/') and 'shift' in payload:
            now = timezone.now() - timedelta(seconds=30)
            square_time = now.strftime('%Y-%m-%dT%H:%M:%SZ')
            payload['shift']['end_at'] = square_time

        square = SquareApiInterface()
        response = square.make_square_request(
            data.get('request_type'),
            url,
            payload
        )
        try:
            return Response(response.json(), status=response.status_code)
        except ValueError:
            return Response({"error": "Invalid response from Square"}, status=status.HTTP_502_BAD_GATEWAY)