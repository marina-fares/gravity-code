from rest_framework import permissions, generics
from rest_framework.response import Response
from rest_framework import status
import requests

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

        try:
            square_response = square_interface.make_square_request(
                **serializer.validated_data
            )
            return Response(square_response.json(), status=square_response.status_code)

        except requests.exceptions.ConnectionError:
            return Response(
                {"error": "No internet connection or Square API is unreachable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except ValueError:
            return Response(
                {"error": "Invalid response from Square API."},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
