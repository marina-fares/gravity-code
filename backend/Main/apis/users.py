
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from ..serializers.user_serializer import UserProfileSerializer, GroupSerializer

from django.contrib.auth.models import User, Group



class VerifyUserToken(generics.GenericAPIView):
    """
    Verify Token
    """
    permission_classes = (IsAuthenticated,)
    serializer_class = UserProfileSerializer

    def put(self, request, *args, **kwargs):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)

class UsersGroups(generics.GenericAPIView):
    def get(self, request):
        current_user = request.user
        current_user_groups = current_user.groups.all()

        serializer = GroupSerializer(current_user_groups[0]).data
        return  Response(serializer)
