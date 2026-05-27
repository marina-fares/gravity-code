from rest_framework import serializers
from ..models.models_sessions import Booking
from .customer_serializer import CustomerSerializer


class BookingSerializer(serializers.ModelSerializer):
    """
    Read serializer — used for all GET responses.

    Nests CustomerSerializer so the frontend receives the full customer object.
    Every queryset feeding this serializer MUST use:
        .select_related("booking_customer", "session__product", "refunded_by")
    Without select_related each booking fires one extra query per nested
    relation — classic N+1.
    """
    booking_customer = CustomerSerializer(read_only=True)
    refunded_by_username = serializers.CharField(
        source="refunded_by.username", read_only=True, default=None
    )

    class Meta:
        model = Booking
        fields = '__all__'


class BookingWriteSerializer(serializers.ModelSerializer):
    """
    Write serializer — used for POST / PUT operations.
    Accepts booking_customer as a plain integer FK ID.
    """

    class Meta:
        model = Booking
        fields = '__all__'

    def validate_number_of_players(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("number_of_players cannot be negative.")
        return value

    def validate_status(self, value):
        valid_statuses = {choice[0] for choice in Booking.STATUS_CHOICES}
        if value is not None and value not in valid_statuses:
            raise serializers.ValidationError(
                f"'{value}' is not a valid status. Choose from: {sorted(valid_statuses)}"
            )
        return value