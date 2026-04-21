"""
session_serializer.py  —  Phase 1: Serializer Optimisation
===========================================================

Split into two serializers following the same pattern as booking_serializer.py:

SessionSerializer (read)
    Used for all GET responses.  Nests ProductSerializer so the frontend
    receives the full product object without a second API call.
    REQUIRES .select_related("product") on every feeding queryset.

SessionWriteSerializer (write)
    Used for POST / PUT operations.  Accepts product as a plain integer PK.
"""

from rest_framework import serializers

from ..models.models_sessions import Session
from .product_serializer import ProductSerializer


class SessionSerializer(serializers.ModelSerializer):
    """
    Read serializer for Session.

    Nests the full ProductSerializer so the frontend receives product details
    (name, duration, max_num, price) without a second API call.

    IMPORTANT: every queryset feeding into this serializer MUST use:
        .select_related("product")
    Without it, each session in a list fires an extra DB query for the
    product — N+1 for every session list response.
    """

    product = ProductSerializer(read_only=True)

    class Meta:
        model = Session
        fields = "__all__"


class SessionWriteSerializer(serializers.ModelSerializer):
    """
    Write serializer for Session.

    Accepts product as a plain integer PK (the default DRF behaviour).
    Used when creating or partially updating a session via the API.
    """

    class Meta:
        model = Session
        fields = "__all__"