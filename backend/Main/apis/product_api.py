from rest_framework import permissions, generics
from rest_framework.response import Response
from ..models.models_sessions import Product
from Main.serializers.product_serializer import ProductSerializer


class ProductApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProductSerializer

    def get(self, request):
        """
        This method is used to make a request to the Square API.
        """
        current_user = self.request.user
        if current_user.is_superuser:
            products = Product.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [group.name for group in current_user_groups]
            products = Product.objects.filter(group__name__in=current_user_group_names)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)



