from django.contrib import admin
from ..models.models import Profile, ProfileHistory
from django.contrib.auth.models import Group
from django.contrib.auth.admin import UserAdmin


class GroupAdmin(admin.StackedInline):
    model = Group


class GravityGroup(Group):
    class Meta:
        proxy = True


class GravityGroupAdmin(GroupAdmin):
    inlines = [
        GroupAdmin
    ]

    def get_queryset(self, request):
        current_user = request.user
        if current_user.is_superuser:
            return Group.objects.all()

admin.site.unregister(Group)
admin.site.register(GravityGroup, GravityGroupAdmin)
