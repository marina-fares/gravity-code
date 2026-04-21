from rest_framework import serializers
from ..models.models_sub_shift import SubShift, SubShiftHistory
from .user_serializer import UserProfileSerializer


class SubShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubShift
        # FIX F: _meta.get_fields() includes the reverse OneToOne relation back
        # to User, causing DRF to attempt serialising it and firing extra queries.
        # Explicit field list avoids this entirely.
        fields = [
            'id', 'user', 'current_shift_id', 'start_time', 'end_time',
            'start_shift_cash', 'refund_cash', 'refund_visa',
            'shift_money_cash', 'shift_money_visa',
            'actual_cash', 'actual_visa', 'inventory', 'note',
        ]


class SubShiftHistorySerializer(serializers.ModelSerializer):
    sub_shift = UserProfileSerializer(read_only=True)

    class Meta:
        model = SubShiftHistory
        fields = ('date', 'sub_shift', 'json_data')