from rest_framework import permissions, generics
from rest_framework.response import Response
from ..serializers.user_serializer import UserProfileSerializer, GroupSerializer
from ..serializers.ZohoApiSerializers import ZohoApiSerializers
from ..interfaces.zoho_interface import ZohoApiInterface
from rest_framework import status
import requests

class ZohoAPI(generics.GenericAPIView):
    """
    This class is used to make a request to the Bookeo API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ZohoApiSerializers

    def post(self, request):
        """
        This method is used to make a request to the Bechoookeo API.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user_data = UserProfileSerializer(request.user).data
        zoho_interface = ZohoApiInterface()

        try:
            zoho_response = zoho_interface.make_zoho_request(
                user_data['group_name'],
                **serializer.validated_data
            )
            return Response(zoho_response.json(), status=zoho_response.status_code)

        except requests.exceptions.ConnectionError:
            return Response(
                {"error": "No internet connection or Zoho API is unreachable."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except ValueError:
            # JSON decoding error
            return Response(
                {"error": "Invalid response from Zoho API."},
                status=status.HTTP_502_BAD_GATEWAY
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
