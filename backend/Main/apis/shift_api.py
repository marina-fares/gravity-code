from datetime import datetime, timedelta, time
import traceback
import zoneinfo

from django.db import DatabaseError, transaction
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from Main.serializers.profile_serializer import ProfileSerializer, ProfileHistorySerializer
from ..models.models import Profile, ProfileHistory

_CAIRO_TZ = zoneinfo.ZoneInfo("Africa/Cairo")

# Fields the frontend is allowed to write to Profile via the shift endpoint.
# Anything not in this list is silently stripped — prevents accidental or
# malicious writes to sensitive fields (square_secret, bookeo_api_key, etc.)
ALLOWED_PROFILE_FIELDS = {
    'start_time', 'end_time', 'start_shift_cash', 'refund_cash', 'refund_visa',
    'shift_money_cash', 'shift_money_visa', 'actual_cash', 'actual_visa',
    'inventory', 'note', 'options', 'options2', 'current_shift_id',
    'sub_shift_round',
}


class GetShiftApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileSerializer

    def get(self, request):
        # request.user.profile raises Profile.DoesNotExist (→ unhandled 500)
        # for a user with no profile row; return a clean 404 instead.
        try:
            profile = request.user.profile
        except Profile.DoesNotExist:
            return Response(
                {"error": "No shift profile found for the current user."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ProfileSerializer(profile).data)

    def post(self, request):
        """Update profile shift fields and record history snapshot at shift end."""
        data = request.data.get('payload', {})

        # SECURITY FIX: original did Profile.objects.filter(...).update(**profile_data)
        # with no field whitelist — the frontend could overwrite any Profile column
        # including square_secret, bookeo_api_key, square_team_member_id, etc.
        # Now only fields in ALLOWED_PROFILE_FIELDS are accepted.
        raw_profile_data = {k: v for k, v in data.items() if k != 'user'}
        profile_data = {k: v for k, v in raw_profile_data.items()
                        if k in ALLOWED_PROFILE_FIELDS}
        user_data = data.get('user')

        # A failed write here is why a booking's money can fail to update the End
        # Shift totals. Do the history snapshot + profile/user updates atomically
        # and surface any failure instead of returning a silent 500 the booking
        # flow would ignore.
        try:
            with transaction.atomic():
                if data.get('end_time') is not None:
                    ProfileHistory.objects.create(
                        date=timezone.now(),
                        profile=request.user,
                        json_data=data,
                    )

                if profile_data:
                    updated = (Profile.objects
                               .filter(user_id=request.user.id)
                               .update(**profile_data))
                    if not updated:
                        return Response(
                            {"error": "No shift profile found for the current user to update."},
                            status=status.HTTP_404_NOT_FOUND,
                        )

                if user_data:
                    allowed_user_fields = {'first_name', 'last_name', 'email'}
                    cleaned = {k: v for k, v in user_data.items() if k in allowed_user_fields}
                    if cleaned:
                        User.objects.filter(id=request.user.id).update(**cleaned)
        except Exception as e:
            traceback.print_exc()
            return Response(
                {"error": "Failed to update shift.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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
                date=timezone.now(),
                profile=current_user,
                json_data=payload,
            )
        return Response([])

    def get(self, request):
        """Return shift history for the current user or group."""
        current_user = request.user
        date_str = request.GET.get('date')

        # 'date' is a required query param. Without this guard a missing value
        # made strptime(None, ...) raise TypeError, and a malformed value raised
        # ValueError — both surfaced as an unhandled 500.
        if not date_str:
            return Response(
                {"error": "Missing required query parameter: 'date' (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            local_date = datetime.strptime(date_str, "%Y-%m-%d").date()
        except (ValueError, TypeError):
            return Response(
                {"error": f"Invalid date format '{date_str}'. Expected YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Build Cairo-aware day boundaries so shifts recorded near midnight
        # UTC are grouped under the correct Cairo local date.
        start_of_day = datetime(
            local_date.year, local_date.month, local_date.day,
            0, 0, 0, tzinfo=_CAIRO_TZ,
        )
        end_of_day = datetime(
            local_date.year, local_date.month, local_date.day,
            23, 59, 59, tzinfo=_CAIRO_TZ,
        )

        # Default so `shifts` is always bound — previously, if the superuser
        # query raised, the exception was swallowed and `shifts` stayed undefined,
        # raising UnboundLocalError on the return below.
        shifts = ProfileHistory.objects.none()
        try:
            if current_user.is_superuser:
                shifts = (ProfileHistory.objects
                          .filter(date__range=(start_of_day, end_of_day))
                          .select_related("profile")
                          .order_by("-date")[:200])
            elif request.user.has_perm('Main.view_gravityuser'):
                group_names = list(current_user.groups.values_list("name", flat=True))
                shifts = (ProfileHistory.objects
                          .filter(profile__groups__name__in=group_names)
                          .select_related("profile")
                          .order_by("-date")[:200])
        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred while fetching shift history.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(ProfileHistorySerializer(instance=shifts, many=True).data)