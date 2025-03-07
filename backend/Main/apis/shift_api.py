from rest_framework import permissions, generics
from rest_framework.response import Response
from .. import models
from Main.serializers.profile_serializer import ProfileSerializer, ProfileHistorySerializer
from datetime import datetime

from django.contrib.auth.models import Permission


class GetShiftApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileSerializer

    def get(self, request):
        """
        This method is used to make a request to the Square API.
        """
        profile = request.user.profile
        #permission = {'permissions': list(request.user.get_all_permissions())}
        serializer = ProfileSerializer(profile).data
        #permission.update(serializer)
        return Response(serializer)


    def post(self, request):
        """
        This method is used to make a request to the Shift API.
        """
        print("11111111111111111111111111111111111shift")

        print(request.data['payload'])
        print((request.data['payload']['end_time']))
        data = request.data['payload']
        print("---------------------------------------------- post old shift")
        if (request.data['payload']['end_time']) is None :
            pass
        else:
            print("yes")
            current_user = models.User.objects.get(username=(request.user))
            history = models.ProfileHistory.objects.create(
            date=datetime.now(), profile=current_user, json_data=request.data['payload'])
            history.save()
        
        
        models.Profile.objects.filter(user=request.user).update(**data) 
        serializer = ProfileHistorySerializer(many=True)
        return Response(serializer.data)



class GetOldShiftApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileHistorySerializer


    def post(self, request):
        """
        This method is used to make a request to the Shift API.
        """
        #print("11111111111111111111111111111111111shift")

        #print(request.data['payload'])
        #print((request.data['payload']['end_time']))
        #print("---------------------------------------------- post old shift")
        if (request.data['payload']['end_time']) is None :
            pass
        else:
            print("yes")
            current_user = models.User.objects.get(username=(request.user))
            history = models.ProfileHistory.objects.create(
            date=datetime.now(), profile=current_user, json_data=request.data['payload'])
            history.save()
        
        
        
        serializer = ProfileHistorySerializer(many=True)
        return Response(serializer.data)



    def get(self, request):
        """
        This method is used to make a request to the Square API.
        """
        #print("user permissionssssssssssssssssss")
       # print(user.get_user_permissions())
        current_user = request.user
        #print(current_user.get_user_permissions())
        if current_user.is_superuser:
            shifts = models.ProfileHistory.objects.all()
        elif request.user.has_perm('Main.view_gravityuser'):
            current_user_groups = current_user.groups.all()
            current_user_group_names = [group.name for group in current_user_groups]
            shifts = models.ProfileHistory.objects.filter(profile__groups__name__in=current_user_group_names)
           # shifts = models.ProfileHistory.objects.all()
        else:
            shifts = []
        serializer = ProfileHistorySerializer(instance=shifts, many=True)
        return Response(serializer.data)


