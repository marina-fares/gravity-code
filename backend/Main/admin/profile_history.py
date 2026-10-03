from django.contrib import admin
from django.contrib.auth.models import Group
from ..models.models import ProfileHistory


class GroupFilter(admin.SimpleListFilter):
    title = 'User group'
    parameter_name = 'user_group'

    def lookups(self, request, model_admin):
        return [(g.id, g.name) for g in Group.objects.all()]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(profile__groups__id=self.value())
        return queryset


class ProfileHistoryAdmin(admin.ModelAdmin):
    list_filter = (GroupFilter,)
    search_fields = ('profile__username', 'date')
    list_select_related = ('profile',)
    list_per_page = 50
    show_full_result_count = False

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('profile')
        if request.user.is_superuser:
            return qs
        # FIX: replaced Python list comprehension with values_list()
        group_names = list(request.user.groups.values_list("name", flat=True))
        return qs.filter(profile__groups__name__in=group_names)


admin.site.register(ProfileHistory, ProfileHistoryAdmin)