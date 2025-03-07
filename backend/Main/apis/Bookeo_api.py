from rest_framework import permissions, generics
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
        This method is used to make a request to the Bechoookeo API.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        bookeo_interface = BookeoApiInterface()
        bookeo_response = bookeo_interface.make_bookeo_request(
            **serializer.validated_data, user=request.user)
        try:
            return Response(bookeo_response.json(), status=bookeo_response.status_code)
        except Exception as e:
            return Response(bookeo_response.text, status=bookeo_response.status_code)
