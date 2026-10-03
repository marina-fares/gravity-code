from django.contrib import admin
from ..models.models import PromoCode


class PromoCodeAdmin(admin.ModelAdmin):
    list_filter = ('group',)
    search_fields = ('name', 'code')
    list_select_related = ('group',)
    list_per_page = 50
    show_full_result_count = False

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('group')
        if request.user.is_superuser:
            return qs
        # FIX: replaced Python list comprehension with values_list()
        group_names = list(request.user.groups.values_list("name", flat=True))
        return qs.filter(group__name__in=group_names)


admin.site.register(PromoCode, PromoCodeAdmin)