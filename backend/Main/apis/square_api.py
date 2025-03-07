from rest_framework import permissions, generics
from rest_framework.response import Response

from ..serializers.SquareApiSerializers import SquareApiSerializers
from ..interfaces.square_interface import SquareApiInterface


class SquareAPI(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SquareApiSerializers

    def post(self, request):
        """
        This method is used to make a request to the Square API.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        square_interface = SquareApiInterface(key=user.profile.square_secret)
        data = request.data
        square_response = square_interface.make_square_request(
            **serializer.validated_data)
        
        try:
            return Response(square_response.json(), status=square_response.status_code)
        except Exception as e:
            return Response(square_response.text, status=square_response.status_code)
