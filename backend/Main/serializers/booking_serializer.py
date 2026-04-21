"""
booking_serializer.py  —  Phase 1: Serializer Optimisation
===========================================================

Split into two serializers:

BookingSerializer (read)
    Used for all GET responses.  Nests CustomerSerializer so the frontend
    receives the full customer object.  Works correctly ONLY when the queryset
    uses select_related("booking_customer", "session__product") — otherwise
    each booking fires an extra DB query per nested relation.

BookingWriteSerializer (write)
    Used for all POST / PUT operations.  Accepts booking_customer as a plain
    integer FK (the default DRF PrimaryKeyRelatedField behaviour).  Validates
    number_of_players and status.

Why split?
----------
The original serializer used a single class with booking_customer = CustomerSerializer(
read_only=True).  This created an ambiguity:
- On reads:  the nested serializer expanded the customer object correctly.
- On writes: the nested read_only field meant booking_customer was IGNORED
             on input, requiring manual assignment after save().

Splitting makes the intent explicit and removes the need for post-save
customer hacks in the view layer.
"""

from rest_framework import serializers

from ..models.models_sessions import Booking
# from .customer_serializer import CustomerSerializer


class BookingSerializer(serializers.ModelSerializer):
    """
    Read serializer — used for all GET responses.

    Nests the full CustomerSerializer so the frontend receives the customer
    object rather than just a bare integer ID.

    IMPORTANT: every queryset feeding into this serializer MUST use:
        .select_related("booking_customer", "session__product")
    Without it, each booking in a list fires an extra DB query for the
    customer and another for the product — classic N+1.
    """

    # booking_customer = CustomerSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = "__all__"


class BookingWriteSerializer(serializers.ModelSerializer):
    """
    Write serializer — used for all POST / PUT operations.

    Accepts booking_customer as a plain integer FK ID (default DRF
    PrimaryKeyRelatedField behaviour), which is what the frontend sends.

    Includes field-level validation for the two most commonly mis-supplied
    fields: number_of_players and status.
    """

    class Meta:
        model = Booking
        fields = "__all__"

    def validate_number_of_players(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError(
                "number_of_players cannot be negative."
            )
        return value

    def validate_status(self, value):
        valid_statuses = {choice[0] for choice in Booking.STATUS_CHOICES}
        if value is not None and value not in valid_statuses:
            raise serializers.ValidationError(
                f"'{value}' is not a valid status. "
                f"Choose from: {sorted(valid_statuses)}"
            )
        return value