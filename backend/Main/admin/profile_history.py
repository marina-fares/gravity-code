from django.contrib import admin
from ..models.models import Profile, ProfileHistory
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin

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
    list_filter = (GroupFilter, )
    search_fields = ('profile__username','date')
    def get_queryset(self, request):
        current_user = request.user
        if current_user.is_superuser:
            return ProfileHistory.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [
                group.name for group in current_user_groups]
            return ProfileHistory.objects.filter(profile__groups__name__in=current_user_group_names)


admin.site.register(ProfileHistory, ProfileHistoryAdmin)
