from rest_framework import permissions, generics
from rest_framework.response import Response
from Main.serializers.profile_serializer import ProfileSerializer, ProfileHistorySerializer
from datetime import datetime
from django.contrib.auth.models import Permission
from django.apps import apps

from ..models.models import User, ProfileHistory, Profile

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
        This method handles profile updates and stores history.
        """
        data = request.data.get('payload', {})

        # Save profile update history if end_time is provided
        if data.get('end_time') is not None:
            current_user = request.user
            ProfileHistory.objects.create(
                date=datetime.now(),
                profile=current_user,
                json_data=data
            )

        # Separate profile fields from user fields
        profile_data = data.copy()
        user_data = profile_data.pop('user', None)  # Remove 'user' field from profile data

        # Update the Profile model
        Profile.objects.filter(user_id=request.user.id).update(**profile_data)

        # Optionally update the User model
        if user_data:
            allowed_user_fields = ['first_name', 'last_name', 'email']  # Add others as needed
            cleaned_user_data = {key: val for key, val in user_data.items() if key in allowed_user_fields}
            User.objects.filter(id=request.user.id).update(**cleaned_user_data)

        # Return updated history
        serializer = ProfileHistorySerializer(ProfileHistory.objects.filter(profile=request.user), many=True)
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

        if (request.data['payload']['end_time']) is None :
            pass
        else:
            current_user = User.objects.get(username=(request.user))
            history = ProfileHistory.objects.create(
            date=datetime.now(), profile=current_user, json_data=request.data['payload'])
            history.save()
        
        
        
        serializer = ProfileHistorySerializer(many=True)
        return Response(serializer.data)



    def get(self, request):
        """
        This method is used to make a request to the Square API.
        """

        current_user = request.user
        if current_user.is_superuser:
            shifts = ProfileHistory.objects.all()
        elif request.user.has_perm('Main.view_gravityuser'):
            current_user_groups = current_user.groups.all()
            current_user_group_names = [group.name for group in current_user_groups]
            shifts = ProfileHistory.objects.filter(profile__groups__name__in=current_user_group_names)
           # shifts = models.ProfileHistory.objects.all()
        else:
            shifts = []
        serializer = ProfileHistorySerializer(instance=shifts, many=True)
        return Response(serializer.data)


