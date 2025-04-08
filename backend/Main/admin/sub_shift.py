from django.contrib import admin
from ..models_sub_shift import SubShift, SubShiftHistory
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin



class SubShiftAdmin(admin.ModelAdmin):
    list_filter=('user__groups', 'user',)
    search_fields = ('user__username',)
    def get_queryset(self, request):
        current_user = request.user
        if current_user.is_superuser:
            return SubShift.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [
                group.name for group in current_user_groups]
            return SubShift.objects.filter(groups__name__in=current_user_group_names)


#admin.site.unregister(User)
admin.site.register( SubShift, SubShiftAdmin)
