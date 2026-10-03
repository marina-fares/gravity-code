from rest_framework import generics, permissions
from rest_framework.response import Response

from ..models.models_sessions import Product
from Main.serializers.product_serializer import ProductSerializer


class ProductApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProductSerializer

    def get(self, request):
        current_user = request.user
        if current_user.is_superuser:
            products = Product.objects.select_related("group").all()
        else:
            # FIX J: replaced Python list comprehension over groups.all()
            # with values_list() — one flat query, no ORM object instantiation.
            group_names = list(current_user.groups.values_list("name", flat=True))
            products = Product.objects.filter(
                group__name__in=group_names
            ).select_related("group")
        return Response(ProductSerializer(products, many=True).data)