from django.contrib import admin
from ..models.models import Profile, ProfileHistory
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from django.urls import reverse


class ProfileAdmin(admin.StackedInline):
    model = Profile


class GravityUser(User):
    class Meta:
        proxy = True


class GravityUserAdmin(UserAdmin):
    inlines = [ProfileAdmin]

    def get_queryset(self, request):
        current_user = request.user
        if current_user.is_superuser:
            return User.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            group_names = list(current_user.groups.values_list("name", flat=True))
            return User.objects.filter(groups__name__in=group_names).distinct()

    def change_password_link(self, obj):
        url = reverse('admin_change_user_password', args=[obj.pk])
        return format_html('<a class="button" href="{}">Change Password</a>', url)

    change_password_link.short_description = 'Password'
    change_password_link.allow_tags = True

    list_display = ['username', 'email', 'change_password_link']  # Add your fields

admin.site.unregister(User)
admin.site.register(GravityUser, GravityUserAdmin)