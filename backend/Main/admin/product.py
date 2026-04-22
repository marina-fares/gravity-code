from django.contrib import admin
from ..models.models_sessions import Product


class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'nick_name', 'group', 'price', 'min_num', 'max_num')
    list_filter = ('group',)
    search_fields = ('name', 'nick_name')
    list_select_related = ('group',)
    list_per_page = 50
    show_full_result_count = False

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('group')
        if request.user.is_superuser:
            return qs
        # FIX: original used groups__name__in — Product has a single FK 'group'
        # not a M2M 'groups'. Also replaced Python loop with values_list().
        group_names = list(request.user.groups.values_list("name", flat=True))
        return qs.filter(group__name__in=group_names)


admin.site.register(Product, ProductAdmin)