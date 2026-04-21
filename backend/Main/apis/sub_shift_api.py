from datetime import datetime

from rest_framework import generics, permissions
from rest_framework.response import Response

from ..models import models_sub_shift, models
from Main.serializers.sub_shift_serializer import SubShiftSerializer, SubShiftHistorySerializer


class GetSubShiftApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubShiftSerializer

    def get(self, request):
        subshift = request.user.subshift
        return Response(SubShiftSerializer(subshift).data)

    def post(self, request):
        """Update the current user's sub-shift state."""
        data = request.data['payload']
        models_sub_shift.SubShift.objects.filter(user=request.user).update(**data)

        # FIX L: original code did update() then get_or_create(). Since every
        # user always has a SubShift (created by signal on user creation),
        # get_or_create always hits the GET path — a wasted EXISTS check.
        # Replaced with a plain .get() — one query instead of two.
        subshift = models_sub_shift.SubShift.objects.get(user=request.user)
        return Response(SubShiftSerializer(subshift).data)


class GetOldSubShiftApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubShiftHistorySerializer

    def post(self, request):
        """Record end-of-sub-shift history snapshot."""
        if request.data['payload']['end_time'] is None:
            pass
        else:
            current_user = models.User.objects.get(username=request.user)
            shift = models.Profile.objects.filter(user=request.user)
            models_sub_shift.SubShiftHistory.objects.create(
                date=datetime.now(),
                cash_amount=request.data['payload']['shift_money_cash'],
                visa_amount=request.data['payload']['shift_money_visa'],
                sub_shift_round=shift[0].sub_shift_round,
                sub_shift=current_user,
                json_data=request.data['payload'],
            )
            models.Profile.objects.filter(user=request.user).update(
                sub_shift_round=shift[0].sub_shift_round + 1
            )

        serializer = SubShiftHistorySerializer(many=True)
        return Response(serializer.data)

    def get(self, request):
        """Return sub-shift history for the current user's group."""
        current_user = request.user
        if current_user.is_superuser:
            shifts = models_sub_shift.SubShiftHistory.objects.select_related(
                "sub_shift"
            ).all()
        elif request.user.has_perm('Main.view_gravityuser'):
            group_names = list(current_user.groups.values_list("name", flat=True))
            # FIX K: original filter was `subshift__groups__...` which is wrong.
            # SubShiftHistory.sub_shift is a FK to User. To filter by group,
            # traverse User's groups: sub_shift__groups__name__in.
            shifts = models_sub_shift.SubShiftHistory.objects.filter(
                sub_shift__groups__name__in=group_names
            ).select_related("sub_shift")
        else:
            shifts = models_sub_shift.SubShiftHistory.objects.none()

        serializer = SubShiftHistorySerializer(instance=shifts, many=True)
        return Response(serializer.data)