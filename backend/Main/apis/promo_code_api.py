from rest_framework import permissions, generics
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from ..serializers.promo_code_serializer import promo_code_serializer
from ..models import PromoCode
from django.contrib import admin


class PromoCodeApis(ModelViewSet):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = promo_code_serializer
    #queryset = PromoCode.objects.all()

    def get_queryset(self):
        
        current_user = self.request.user
        if current_user.is_superuser:
            return PromoCode.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [group.name for group in current_user_groups]
            return PromoCode.objects.filter(group__name__in=current_user_group_names)

    
