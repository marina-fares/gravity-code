from rest_framework import serializers
from ..models.models import Profile, ProfileHistory
from .user_serializer import UserProfileSerializer


class ProfileSerializer(serializers.ModelSerializer):
    user = UserProfileSerializer(read_only=True)

    class Meta:
        model = Profile
        # FIX C: _meta.get_fields() includes reverse relations (e.g.
        # profile_history, subshift) which are not real columns. When DRF
        # tries to serialise them it fires extra queries or raises errors.
        # Explicit field list is safe, fast, and self-documenting.
        fields = [
            'id', 'user', 'password', 'sub_shift_round', 'amount_cash_limit',
            'amount_visa_limit', 'endshift_page_password', 'square_team_member_id',
            'customer_id', 'square_location_id', 'branch_name', 'location_name',
            'city', 'current_shift_id', 'start_time', 'end_time',
            'start_shift_cash', 'refund_cash', 'refund_visa',
            'shift_money_cash', 'shift_money_visa', 'actual_cash', 'actual_visa',
            'inventory', 'note', 'options', 'bookeo_api_key', 'bookeo_secrete',
            'options2', 'square_secret',
        ]


class ProfileHistorySerializer(serializers.ModelSerializer):
    # FIX D: profile was nested with UserProfileSerializer(read_only=True)
    # but declared without read_only=True, causing write-path confusion.
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = ProfileHistory
        fields = ('date', 'profile', 'json_data')