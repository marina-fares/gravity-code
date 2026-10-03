import requests
from rest_framework import permissions, generics, status
from rest_framework.response import Response

from ..serializers.BookeoApiSerializers import BookeoApiSerializers
from ..interfaces.bookeo_interface import BookeoApiInterface


class BookeoAPI(generics.GenericAPIView):
    """
    This class is used to make a request to the Bookeo API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookeoApiSerializers

    def post(self, request):
        """
        This method is used to make a request to the Bookeo API.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bookeo_interface = BookeoApiInterface()
        try:
            bookeo_response = bookeo_interface.make_bookeo_request(
                **serializer.validated_data, user=request.user)
        except requests.exceptions.ConnectionError:
            return Response(
                {"error": "No internet connection or Bookeo API is unreachable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception as exc:
            return Response(
                {"error": "Failed to call Bookeo API.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # make_bookeo_request returns None on network error / bad request_type;
        # calling .json() or .text on None raised an unhandled AttributeError.
        if bookeo_response is None:
            return Response(
                {"error": "Could not reach Bookeo API. Check server logs for details."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            return Response(bookeo_response.json(), status=bookeo_response.status_code)
        except ValueError:
            # Non-JSON body (e.g. empty 204) — fall back to raw text.
            return Response(bookeo_response.text, status=bookeo_response.status_code)
