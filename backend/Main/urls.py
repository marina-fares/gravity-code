from django.urls import path

from Main.apis.shift_api import GetShiftApi, GetOldShiftApi
from Main.apis.sub_shift_api import GetSubShiftApi, GetOldSubShiftApi
from Main.apis.promo_code_api import PromoCodeApis
from .apis import SquareAPI, VerifyUserToken
from .apis.Bookeo_api import BookeoAPI
from .apis.Zoho_api import ZohoAPI
from .apis.users import UsersGroups
from .apis.session_api import SessionApi, OneSessionApi
from .apis.repair_sessions_api import RepairSessionsApi
from .apis.product_api import ProductApi
from .apis.booking_api import BookingApi, OneBookingApi
# SECURITY FIX: CustomerApi was commented out — endpoint unreachable.
from .apis.customer_api import CustomerApi
from .views import admin_change_user_password

urlpatterns = [
    path('current_user/', VerifyUserToken.as_view(), name='current_user'),
    path('current_group/', UsersGroups.as_view(), name='current_group'),
    path('square/', SquareAPI.as_view(), name='square'),
    path('bookeo/', BookeoAPI.as_view(), name='bookeo'),
    path('zoho/', ZohoAPI.as_view(), name='zoho'),
    path('shift/', GetShiftApi.as_view(), name='shift'),
    path('old_shift/', GetOldShiftApi.as_view(), name='old_shift'),
    path('sub_shift/', GetSubShiftApi.as_view(), name='sub_shift'),
    path('sub_shift_history/', GetOldSubShiftApi.as_view(), name='old_sub_shift'),
    path('promo_code/', PromoCodeApis.as_view(
        {'get': 'list', 'post': 'create', 'put': 'update', 'delete': 'destroy'}),
        name='promo_code'),
    path('repair-sessions/', RepairSessionsApi.as_view(), name='repair_sessions'),
    path('products/', ProductApi.as_view(), name='products'),
    path('sessions/', SessionApi.as_view(), name='sessions'),
    path('session/<int:session_id>/', OneSessionApi.as_view(), name='session'),
    path('bookings/<int:session_id>/', BookingApi.as_view(), name='bookings'),
    path('bookings/', BookingApi.as_view(), name='bookings_search'),
    path('booking/<int:booking_id>/', OneBookingApi.as_view(), name='booking_detail'),
    path('booking/', OneBookingApi.as_view(), name='create_booking'),
    # Re-enabled: CustomerApi was commented out — customers endpoint was dead
    path('customers/', CustomerApi.as_view(), name='customers'),
    # NOTE: this endpoint lives under /api/ not /admin/ — see views.py for
    # the group-scope authorization guard that was added.
    path('user/<int:user_id>/change-password/',
         admin_change_user_password, name='admin_change_user_password'),
]