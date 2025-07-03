from django.contrib import admin
from ..models.models_sessions import Product
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin



class ProductAdmin(admin.ModelAdmin):
    
    def get_queryset(self, request):
        current_user = request.user
        if current_user.is_superuser:
            return Product.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [
                group.name for group in current_user_groups]
            return Product.objects.filter(groups__name__in=current_user_group_names)
    



#admin.site.unregister(User)
admin.site.register( Product, ProductAdmin)
