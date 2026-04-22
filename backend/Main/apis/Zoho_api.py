import requests
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from ..serializers.user_serializer import UserProfileSerializer
from ..serializers.ZohoApiSerializers import ZohoApiSerializers
from ..interfaces.zoho_interface import ZohoApiInterface


def _call_zoho(zoho_interface, group_name, request_type, url, payload):
    """
    Call make_zoho_request and return a DRF Response.

    FIX: make_zoho_request returns None when a network error occurs.
    Both post() and put() previously called zoho_response.json() and
    zoho_response.status_code directly — AttributeError on None = 500.
    Centralised here so both methods share the same None guard.
    """
    response = zoho_interface.make_zoho_request(
        group_name, request_type, url, payload
    )

    if response is None:
        return Response(
            {"error": "Could not reach Zoho API. Check server logs for details."},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    try:
        return Response(response.json(), status=response.status_code)
    except ValueError:
        return Response(
            {"error": "Invalid response from Zoho API."},
            status=status.HTTP_502_BAD_GATEWAY,
        )


class ZohoAPI(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ZohoApiSerializers

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group_name = UserProfileSerializer(request.user).data.get('group_name')
        zoho = ZohoApiInterface()

        try:
            return _call_zoho(
                zoho,
                group_name,
                **serializer.validated_data,
            )
        except requests.exceptions.ConnectionError:
            return Response(
                {"error": "No internet connection or Zoho API is unreachable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            logger_msg = str(exc)
            return Response(
                {"error": logger_msg},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def put(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        group_name = UserProfileSerializer(request.user).data.get('group_name')
        zoho = ZohoApiInterface()

        data = serializer.validated_data.copy()
        request_type = data.pop("request_type")
        url          = data.pop("url")
        payload      = data.pop("payload")

        try:
            return _call_zoho(zoho, group_name, request_type, url, payload)
        except requests.exceptions.ConnectionError:
            return Response(
                {"error": "No internet connection or Zoho API is unreachable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            return Response(
                {"error": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )