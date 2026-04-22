from datetime import datetime

from django.contrib.auth.models import User
from rest_framework import generics, permissions
from rest_framework.response import Response

from Main.serializers.profile_serializer import ProfileSerializer, ProfileHistorySerializer
from ..models.models import Profile, ProfileHistory

# Fields the frontend is allowed to write to Profile via the shift endpoint.
# Anything not in this list is silently stripped — prevents accidental or
# malicious writes to sensitive fields (square_secret, bookeo_api_key, etc.)
ALLOWED_PROFILE_FIELDS = {
    'start_time', 'end_time', 'start_shift_cash', 'refund_cash', 'refund_visa',
    'shift_money_cash', 'shift_money_visa', 'actual_cash', 'actual_visa',
    'inventory', 'note', 'options', 'options2', 'current_shift_id',
}


class GetShiftApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileSerializer

    def get(self, request):
        return Response(ProfileSerializer(request.user.profile).data)

    def post(self, request):
        """Update profile shift fields and record history snapshot at shift end."""
        data = request.data.get('payload', {})

        if data.get('end_time') is not None:
            ProfileHistory.objects.create(
                date=datetime.now(),
                profile=request.user,
                json_data=data,
            )

        # SECURITY FIX: original did Profile.objects.filter(...).update(**profile_data)
        # with no field whitelist — the frontend could overwrite any Profile column
        # including square_secret, bookeo_api_key, square_team_member_id, etc.
        # Now only fields in ALLOWED_PROFILE_FIELDS are accepted.
        raw_profile_data = {k: v for k, v in data.items() if k != 'user'}
        profile_data = {k: v for k, v in raw_profile_data.items()
                        if k in ALLOWED_PROFILE_FIELDS}
        if profile_data:
            Profile.objects.filter(user_id=request.user.id).update(**profile_data)

        user_data = data.get('user')
        if user_data:
            allowed_user_fields = {'first_name', 'last_name', 'email'}
            cleaned = {k: v for k, v in user_data.items() if k in allowed_user_fields}
            if cleaned:
                User.objects.filter(id=request.user.id).update(**cleaned)

        history_qs = (
            ProfileHistory.objects
            .filter(profile=request.user)
            .select_related("profile")
            .order_by("-date")[:100]   # SCALABILITY: cap to 100 most recent records
        )
        return Response(ProfileHistorySerializer(history_qs, many=True).data)


class GetOldShiftApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileHistorySerializer

    def post(self, request):
        """Record a shift-end history snapshot (legacy endpoint)."""
        payload = request.data.get('payload')
        if not payload:
            from rest_framework import status
            return Response({"error": "Missing 'payload'."}, status=status.HTTP_400_BAD_REQUEST)
        if payload.get('end_time') is not None:
            current_user = User.objects.get(username=request.user)
            ProfileHistory.objects.create(
                date=datetime.now(),
                profile=current_user,
                json_data=payload,
            )
        return Response([])

    def get(self, request):
        """Return shift history for the current user or group."""
        current_user = request.user
        if current_user.is_superuser:
            shifts = (ProfileHistory.objects
                      .select_related("profile")
                      .order_by("-date")[:200])
        elif request.user.has_perm('Main.view_gravityuser'):
            group_names = list(current_user.groups.values_list("name", flat=True))
            shifts = (ProfileHistory.objects
                      .filter(profile__groups__name__in=group_names)
                      .select_related("profile")
                      .order_by("-date")[:200])
        else:
            shifts = ProfileHistory.objects.none()

        return Response(ProfileHistorySerializer(instance=shifts, many=True).data)