from django.contrib import admin
from ..models import Profile, ProfileHistory
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin


class ProfileAdmin(admin.StackedInline):
    model = Profile


class GravityUser(User):
    class Meta:
        proxy = True


class GravityUserAdmin(UserAdmin):
    inlines = [
        ProfileAdmin
    ]

    def get_queryset(self, request):
        current_user = request.user
        if current_user.is_superuser:
            return User.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [
                group.name for group in current_user_groups]
            return User.objects.filter(groups__name__in=current_user_group_names)


admin.site.unregister(User)
admin.site.register(GravityUser, GravityUserAdmin)
