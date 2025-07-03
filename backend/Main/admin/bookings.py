from django.contrib import admin
from ..models.models_sessions import Booking, Session
from django.contrib.auth.models import User
from django.contrib.auth.admin import UserAdmin



class BookingAdmin(admin.ModelAdmin):
    search_fields = ('id','session__start_time')
    exclude = ['square_order_id', 'square_payment_id', 'zoho_sales_receipt_id']
    def get_queryset(self, request):
        current_user = request.user
        if current_user.is_superuser:
            return Booking.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [
                group.name for group in current_user_groups]
            return Booking.objects.filter(session__product__groups__name__in=current_user_group_names)
        
    def delete_queryset(self, request, queryset):
        for i in queryset:
            session1 = Session.objects.filter(id = i.session.id)[0]
            all_bookings_num = sum(
                Booking.objects.filter(session_id=session1.id).exclude(status='refunded').values_list('number_of_players', flat=True)
            )
            new_sessions_seats = session1.added_seats + session1.product.max_num - all_bookings_num - session1.block_seats + i.number_of_players
            session1.available_seats = new_sessions_seats
            session1.save()
            

        
        """
        you can do anything here BEFORE deleting the object(s)
        """

        queryset.delete()

        """
        you can do anything here AFTER deleting the object(s)
        """

        print('==========================delete_queryset==========================')
    



admin.site.register( Booking, BookingAdmin)
