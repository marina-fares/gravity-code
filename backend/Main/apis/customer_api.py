# """
# customer_api.py  —  Phase 1: Database & Query Optimisation
# ===========================================================

# Changes from the original
# --------------------------
# 1.  CustomerApi.get()
#     - Group names fetched with values_list() — one DB round-trip, no Python
#       list comprehension.
#     - Non-superuser path uses filter(group__name__in=...) instead of
#       filter(group__name__in=current_user_group_names) derived from a separate
#       queryset.  Collapsed into one expression.

# 2.  CustomerApi.post()
#     - No functional change; existing get_or_create() is already optimal for
#       this use case (single upsert-style query).
#     - Tightened error message to be accurate (original said
#       "Missing 'identifier' or 'bookingId'" but bookingId was never used).
#     - DatabaseError now caught separately from generic Exception so callers
#       can distinguish DB errors from application errors.
# """

# from django.db import DatabaseError
# from rest_framework import generics, permissions, status
# from rest_framework.response import Response

# from ..models.models_sessions import Customer
# from Main.serializers.customer_serializer import CustomerSerializer


# class CustomerApi(generics.GenericAPIView):
#     permission_classes = [permissions.IsAuthenticated]
#     serializer_class = CustomerSerializer

#     def get(self, request):
#         """
#         Return all customers visible to the current user.

#         Superusers see all customers.
#         Normal users see only customers belonging to their groups.

#         Optimisation: values_list() fetches group names in a single SQL query
#         and returns flat strings — no Python iteration over ORM objects.
#         """
#         current_user = request.user

#         if current_user.is_superuser:
#             customers = Customer.objects.all()
#         else:
#             # One query: retrieve flat group name strings directly.
#             group_names = list(
#                 current_user.groups.values_list("name", flat=True)
#             )
#             customers = Customer.objects.filter(group__name__in=group_names)

#         serializer = CustomerSerializer(customers, many=True)
#         return Response(serializer.data)

#     def post(self, request):
#         """
#         Get or create a Customer by identifier within the user's group.

#         get_or_create() issues a single upsert-style query which is already
#         optimal — no change needed here.
#         """
#         customer_name = request.data.get("identifier")

#         if not customer_name:
#             return Response(
#                 {"error": "Missing required field: 'identifier'."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         current_group = request.user.groups.first()
#         if not current_group:
#             return Response(
#                 {"error": "User is not assigned to any group."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         try:
#             customer, _ = Customer.objects.get_or_create(
#                 identifier=customer_name,
#                 group=current_group,
#             )
#         except DatabaseError as exc:
#             return Response(
#                 {"error": "A database error occurred.", "detail": str(exc)},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             )
#         except Exception as exc:
#             return Response(
#                 {"error": str(exc)},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             )

#         return Response(CustomerSerializer(customer).data, status=status.HTTP_200_OK)