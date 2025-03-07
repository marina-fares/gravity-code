
from django.urls import path

from Main.apis.shift_api import GetShiftApi, GetOldShiftApi
from Main.apis.sub_shift_api import GetSubShiftApi, GetOldSubShiftApi
from Main.apis.promo_code_api import PromoCodeApis
from django.contrib.auth.models import Group
from .apis import SquareAPI, VerifyUserToken
from .apis.Bookeo_api import BookeoAPI
from .apis.users import UsersGroups

urlpatterns = [
    path('current_user/', VerifyUserToken.as_view(), name='current_user'),
    path('current_group/', UsersGroups.as_view(), name='current_group'),  
    path('square/', SquareAPI.as_view(), name='square'),
    path('bookeo/', BookeoAPI.as_view(), name='bookeo'),
    path('shift/', GetShiftApi.as_view(), name='shift'),
    # post to profile history
    path('old_shift/', GetOldShiftApi.as_view(), name='old_shift'), 
    path('sub_shift/', GetSubShiftApi.as_view(), name='sub_shift'),
    # post to sub_shift history
    path('sub_shift_history/', GetOldSubShiftApi.as_view(), name='old_sub_shift'),
    path('promo_code/', PromoCodeApis.as_view(
        {'get': 'list', 'post': 'create', 'put': 'update', 'delete': 'destroy'}), name='promo_code'),
]
