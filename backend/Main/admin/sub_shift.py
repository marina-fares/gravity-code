from django.contrib import admin
from ..models.models_sub_shift import SubShift


class SubShiftAdmin(admin.ModelAdmin):
    list_filter = ('user__groups', 'user')
    search_fields = ('user__username',)
    list_select_related = ('user',)
    list_per_page = 50
    show_full_result_count = False

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('user')
        if request.user.is_superuser:
            return qs
        # FIX: original used groups__name__in which is wrong for SubShift
        # (SubShift has no groups field). Must traverse through user.
        group_names = list(request.user.groups.values_list("name", flat=True))
        return qs.filter(user__groups__name__in=group_names)


admin.site.register(SubShift, SubShiftAdmin)