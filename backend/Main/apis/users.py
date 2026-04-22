from django.contrib.auth.models import Group, User
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from ..serializers.user_serializer import GroupSerializer, UserProfileSerializer


class VerifyUserToken(generics.GenericAPIView):
    """Verify JWT token and return the current user's profile."""
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = UserProfileSerializer

    def put(self, request, *args, **kwargs):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UsersGroups(generics.GenericAPIView):
    """Return the first group of the current user."""
    # SECURITY FIX: no permission_classes declared — endpoint was unauthenticated,
    # exposing group names to anonymous callers. Added IsAuthenticated.
    permission_classes = (permissions.IsAuthenticated,)
    serializer_class = GroupSerializer

    def get(self, request):
        group = request.user.groups.first()
        if group is None:
            return Response(
                {"error": "User does not belong to any group."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(GroupSerializer(group).data)