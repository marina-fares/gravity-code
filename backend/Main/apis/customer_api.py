from rest_framework import permissions, generics
from rest_framework.response import Response
from ..models.models_sessions import Customer, Booking
from Main.serializers.customer_serializer import CustomerSerializer
from datetime import datetime
from rest_framework import status


class CustomerApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CustomerSerializer

    def get(self, request):
        """
        This method is used to make a request to the Square API.
        """
        current_user = self.request.user
        if current_user.is_superuser:
            customers = Customer.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [group.name for group in current_user_groups]
            customers = Customer.objects.filter(group__name__in=current_user_group_names)
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

    def post(self, request):
        try:
            # Extract data from request
            customer_name = request.data.get('identifier')

            if not customer_name :
                return Response({"error": "Missing 'identifier' or 'bookingId'."}, status=status.HTTP_400_BAD_REQUEST)

            # Get current user group (assumes one group per user)
            current_group = request.user.groups.first()
            if not current_group:
                return Response({"error": "User is not assigned to any group."}, status=status.HTTP_400_BAD_REQUEST)

            # Get or create customer
            customer, created = Customer.objects.get_or_create(
                identifier=customer_name,
                group=current_group
            )


            # Serialize and return response
            serializer = CustomerSerializer(customer)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


