from datetime import datetime

from rest_framework import generics, permissions, status
from rest_framework.response import Response

from ..models import models_sub_shift, models
from Main.serializers.sub_shift_serializer import SubShiftSerializer, SubShiftHistorySerializer

# Fields the frontend is allowed to write to SubShift.
ALLOWED_SUBSHIFT_FIELDS = {
    'start_time', 'end_time', 'start_shift_cash', 'refund_cash', 'refund_visa',
    'shift_money_cash', 'shift_money_visa', 'actual_cash', 'actual_visa',
    'inventory', 'note', 'current_shift_id',
}


class GetSubShiftApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubShiftSerializer

    def get(self, request):
        return Response(SubShiftSerializer(request.user.subshift).data)

    def post(self, request):
        """Update the current user's sub-shift state."""
        payload = request.data.get('payload')
        if not payload:
            return Response({"error": "Missing 'payload'."}, status=status.HTTP_400_BAD_REQUEST)

        # SECURITY FIX: whitelist only allowed SubShift fields.
        safe_data = {k: v for k, v in payload.items() if k in ALLOWED_SUBSHIFT_FIELDS}
        if safe_data:
            models_sub_shift.SubShift.objects.filter(user=request.user).update(**safe_data)
        subshift = models_sub_shift.SubShift.objects.get(user=request.user)
        return Response(SubShiftSerializer(subshift).data)


class GetOldSubShiftApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SubShiftHistorySerializer

    def post(self, request):
        """Record end-of-sub-shift history snapshot."""
        payload = request.data.get('payload')
        if not payload:
            return Response({"error": "Missing 'payload'."}, status=status.HTTP_400_BAD_REQUEST)

        if payload.get('end_time') is not None:
            current_user = models.User.objects.get(username=request.user)
            shift = models.Profile.objects.filter(user=request.user).first()
            if shift:
                models_sub_shift.SubShiftHistory.objects.create(
                    date=datetime.now(),
                    cash_amount=payload.get('shift_money_cash'),
                    visa_amount=payload.get('shift_money_visa'),
                    sub_shift_round=shift.sub_shift_round,
                    sub_shift=current_user,
                    json_data=payload,
                )
                models.Profile.objects.filter(user=request.user).update(
                    sub_shift_round=shift.sub_shift_round + 1
                )
        return Response([])

    def get(self, request):
        """Return sub-shift history for the current user's group."""
        current_user = request.user
        if current_user.is_superuser:
            shifts = (models_sub_shift.SubShiftHistory.objects
                      .select_related("sub_shift")
                      .order_by("-date")[:200])
        elif request.user.has_perm('Main.view_gravityuser'):
            group_names = list(current_user.groups.values_list("name", flat=True))
            shifts = (models_sub_shift.SubShiftHistory.objects
                      .filter(sub_shift__groups__name__in=group_names)
                      .select_related("sub_shift")
                      .order_by("-date")[:200])
        else:
            shifts = models_sub_shift.SubShiftHistory.objects.none()

        return Response(SubShiftHistorySerializer(instance=shifts, many=True).data)