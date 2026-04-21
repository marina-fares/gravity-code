from datetime import datetime

from django.contrib.auth.models import User
from rest_framework import generics, permissions
from rest_framework.response import Response

from Main.serializers.profile_serializer import ProfileSerializer, ProfileHistorySerializer
from ..models.models import Profile, ProfileHistory


class GetShiftApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileSerializer

    def get(self, request):
        profile = request.user.profile
        return Response(ProfileSerializer(profile).data)

    def post(self, request):
        """Update profile and record history snapshot when shift ends."""
        data = request.data.get('payload', {})

        if data.get('end_time') is not None:
            ProfileHistory.objects.create(
                date=datetime.now(),
                profile=request.user,
                json_data=data,
            )

        profile_data = data.copy()
        user_data = profile_data.pop('user', None)

        Profile.objects.filter(user_id=request.user.id).update(**profile_data)

        if user_data:
            allowed_user_fields = ['first_name', 'last_name', 'email']
            cleaned_user_data = {
                k: v for k, v in user_data.items() if k in allowed_user_fields
            }
            if cleaned_user_data:
                User.objects.filter(id=request.user.id).update(**cleaned_user_data)

        # FIX O: added select_related("profile") so ProfileHistorySerializer's
        # nested UserProfileSerializer does not fire one query per history row.
        history_qs = (
            ProfileHistory.objects
            .filter(profile=request.user)
            .select_related("profile")
        )
        return Response(ProfileHistorySerializer(history_qs, many=True).data)


class GetOldShiftApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileHistorySerializer

    def post(self, request):
        """Record a shift-end history snapshot (legacy endpoint)."""
        if request.data['payload']['end_time'] is None:
            pass
        else:
            current_user = User.objects.get(username=request.user)
            ProfileHistory.objects.create(
                date=datetime.now(),
                profile=current_user,
                json_data=request.data['payload'],
            )
        return Response(ProfileHistorySerializer(many=True).data)

    def get(self, request):
        """Return shift history for the current user or group."""
        current_user = request.user
        if current_user.is_superuser:
            shifts = ProfileHistory.objects.select_related("profile").all()
        elif request.user.has_perm('Main.view_gravityuser'):
            group_names = list(current_user.groups.values_list("name", flat=True))
            shifts = ProfileHistory.objects.filter(
                profile__groups__name__in=group_names
            ).select_related("profile")
        else:
            shifts = ProfileHistory.objects.none()

        return Response(ProfileHistorySerializer(instance=shifts, many=True).data)