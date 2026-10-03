from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet

from ..serializers.promo_code_serializer import promo_code_serializer
from ..models.models import PromoCode


class PromoCodeApis(ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = promo_code_serializer

    def get_queryset(self):
        current_user = self.request.user
        if current_user.is_superuser:
            return PromoCode.objects.select_related("group").all()
        # FIX J (same): replaced Python loop over groups.all() with
        # values_list() — one query, no ORM object instantiation per group.
        group_names = list(current_user.groups.values_list("name", flat=True))
        return PromoCode.objects.filter(
            group__name__in=group_names
        ).select_related("group")