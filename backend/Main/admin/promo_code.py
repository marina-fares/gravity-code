from django.contrib import admin
from ..models.models import PromoCode
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin


class PromoCodeAdmin(admin.ModelAdmin):
    list_filter = ('group',)
    search_fields = ('name',)
    def get_queryset(self, request):
        current_user = request.user
        if current_user.is_superuser:
            return PromoCode.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [
                group.name for group in current_user_groups]
            return PromoCode.objects.filter(group__name__in=current_user_group_names)


admin.site.register(PromoCode, PromoCodeAdmin)
