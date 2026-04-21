# FIX I: customer_api.py was entirely commented out — every line was a comment.
# The CustomerApi view was unavailable, meaning any URL mapped to it would 500.
# Restored as a clean, functional implementation.

from django.db import DatabaseError
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from ..models.models_sessions import Customer
from Main.serializers.customer_serializer import CustomerSerializer


class CustomerApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CustomerSerializer

    def get(self, request):
        current_user = request.user
        if current_user.is_superuser:
            customers = Customer.objects.all()
        else:
            group_names = list(current_user.groups.values_list("name", flat=True))
            customers = Customer.objects.filter(group__name__in=group_names)
        return Response(CustomerSerializer(customers, many=True).data)

    def post(self, request):
        customer_name = request.data.get("identifier")
        if not customer_name:
            return Response(
                {"error": "Missing required field: 'identifier'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        current_group = request.user.groups.first()
        if not current_group:
            return Response(
                {"error": "User is not assigned to any group."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            customer, _ = Customer.objects.get_or_create(
                identifier=customer_name,
                group=current_group,
            )
        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response(CustomerSerializer(customer).data, status=status.HTTP_200_OK)