from rest_framework import permissions, generics
from rest_framework.response import Response

from ..serializers.ZohoApiSerializers import ZohoApiSerializers
from ..interfaces.zoho_interface import ZohoApiInterface


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

        zoho_interface = ZohoApiInterface()
        zoho_response = zoho_interface.make_zoho_request(
            **serializer.validated_data)
        try:
            return Response(zoho_response.json(), status=zoho_response.status_code)
        except Exception as e:
            return Response(zoho_response.text, status=zoho_response.status_code)
