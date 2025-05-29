from rest_framework import permissions, generics
from rest_framework.response import Response
from ..models import models_sub_shift, models
from Main.serializers.sub_shift_serializer import SubShiftSerializer, SubShiftHistorySerializer
from datetime import datetime

from django.contrib.auth.models import Permission


class GetSubShiftApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubShiftSerializer

    def get(self, request):
        """
        This method is used to make a request to the Square API.
        """
        subshift = request.user.subshift
        serializer = SubShiftSerializer(subshift).data
        #permission.update(serializer)
        return Response(serializer)


    def post(self, request):
        """
        This method is used to make a request to the Shift API.
        """

        
       # if((request.data['payload']['end_time']) is None):
        #    pass
        #else:
         #   models.Profile.objects.filter(user = request.user).update(sub_shift_round = shift[0].sub_shift_round + 1)
        #models_sub_shift.SubShift.objects.get_or_create(user=request.user).update(**data)
        data = request.data['payload']
        models_sub_shift.SubShift.objects.filter(user=request.user).update(**data)
        subshift, created = models_sub_shift.SubShift.objects.get_or_create(user=request.user)
        
        
        return Response(SubShiftSerializer(subshift).data)



class GetOldSubShiftApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubShiftHistorySerializer


    def post(self, request):
        """
        This method is used to make a request to the Shift API.
        """

        if (request.data['payload']['end_time']) is None :
            pass
        else:
            current_user = models.User.objects.get(username=(request.user))
            shift =  models.Profile.objects.filter(user = request.user)
            

            history = models_sub_shift.SubShiftHistory.objects.create(
            date=datetime.now(), cash_amount = request.data['payload']['shift_money_cash'], visa_amount = request.data['payload']['shift_money_visa'], sub_shift_round = shift[0].sub_shift_round,sub_shift=current_user, json_data=request.data['payload'])
            history.save()
            models.Profile.objects.filter(user = request.user).update(sub_shift_round = shift[0].sub_shift_round + 1)
            
        
        serializer = SubShiftHistorySerializer(many=True)
        return Response(serializer.data)



    def get(self, request):
        """
        This method is used to make a request to the Square API.
        """
        current_user = request.user
        if current_user.is_superuser:
            shifts = models_sub_shift.SubShiftHistory.objects.all()
        elif request.user.has_perm('Main.view_gravityuser'):
            current_user_groups = current_user.groups.all()
            current_user_group_names = [group.name for group in current_user_groups]
            shifts = models_sub_shift.SubShiftHistory.objects.filter(subshift__groups__name__in=current_user_group_names)
           # shifts = models.ProfileHistory.objects.all()
        else:
            shifts = []
        serializer = SubShiftHistorySerializer(instance=shifts, many=True)
        return Response(serializer.data)


