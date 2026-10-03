"""
session_api.py  —  Phase 1: Database & Query Optimisation
==========================================================

Changes from the original
--------------------------
1.  All querysets now use .select_related("product") to prevent N+1 queries
    when SessionSerializer nests ProductSerializer.
    Original: one SQL query per session to fetch the related product.
    Optimised: product loaded in the same JOIN for the entire queryset.

2.  OneSessionApi.post()  (block seats update)
    - Replaced Python-side sum() with Booking.calculate_available_seats()
      (single SQL SUM aggregate).
    - Uses session.save(update_fields=[...]) to update only the two changed
      columns instead of writing every Session column.

3.  OneSessionApi.put()  (general session update)
    - Uses Booking.calculate_available_seats() for the recalculation.
    - Added basic input validation for added_seats / block_seats.
    - Re-fetches with select_related() for the response to avoid N+1.

4.  Error handling improved:
    - KeyError on missing payload fields returns a 400 with a clear message
      instead of propagating as a 500.
    - Date format validation returns a 400 with the invalid value in the
      error message.

5.  SessionApi.post() validates the request payload before hitting the DB.
"""

from datetime import datetime
import zoneinfo

from django.core.exceptions import ValidationError
from django.db import DatabaseError
from rest_framework import generics, permissions, status
from rest_framework.exceptions import NotFound
from rest_framework.response import Response

from ..models.models_sessions import Booking, Product, Session
from Main.serializers.session_serializer import SessionSerializer, SessionWriteSerializer

_CAIRO_TZ = zoneinfo.ZoneInfo("Africa/Cairo")


def _cairo_day_boundaries(dt):
    """
    Given any aware datetime, return (day_start, day_end) as UTC-aware
    datetimes covering the full Cairo local day that *dt* falls in.

    Example: dt = 2026-04-29 22:00:00 UTC (= 2026-04-30 01:00 Cairo)
             → day_start = 2026-04-29 21:00:00 UTC  (midnight Cairo)
             → day_end   = 2026-04-30 20:59:59 UTC  (23:59:59 Cairo)
    """
    local_date = dt.astimezone(_CAIRO_TZ).date()
    day_start = datetime(
        local_date.year, local_date.month, local_date.day,
        0, 0, 0, tzinfo=_CAIRO_TZ,
    )
    day_end = datetime(
        local_date.year, local_date.month, local_date.day,
        23, 59, 59, tzinfo=_CAIRO_TZ,
    )
    return day_start, day_end


def _cairo_day_boundaries_from_string(date_string):
    """
    Given a Cairo local date string (YYYY-MM-DD) sent from the frontend,
    return (day_start, day_end) as UTC-aware datetimes.
    Raises ValueError if the format is wrong.
    """
    local_date = datetime.strptime(date_string, "%Y-%m-%d").date()
    day_start = datetime(
        local_date.year, local_date.month, local_date.day,
        0, 0, 0, tzinfo=_CAIRO_TZ,
    )
    day_end = datetime(
        local_date.year, local_date.month, local_date.day,
        23, 59, 59, tzinfo=_CAIRO_TZ,
    )
    return day_start, day_end


# ---------------------------------------------------------------------------
# SessionApi  —  list and date-based queries
# ---------------------------------------------------------------------------

class SessionApi(generics.GenericAPIView):
    """
    GET  /sessions/<session_id>/
        All sessions on the same date as session_id, with id >= session_id.

    POST /sessions/
        All sessions for a specific product and date (the "get available
        slots" endpoint — called on every date change from the frontend).
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SessionSerializer

    def get(self, request, session_id):
        """
        Fetch the current session plus all later sessions on the same date.
        select_related("product") prevents one extra query per session when
        SessionSerializer nests ProductSerializer.
        """
        try:
            # Fetch the anchor session to determine the date.
            current_session = (
                Session.objects
                .select_related("product")
                .get(pk=session_id)
            )
        except Session.DoesNotExist:
            raise NotFound(detail=f"Session with id '{session_id}' not found.")

        # Convert the anchor session's UTC start_time to Cairo day boundaries
        # so sessions near midnight UTC are grouped under the correct local date.
        day_start, day_end = _cairo_day_boundaries(current_session.start_time)

        sessions = (
            Session.objects
            .filter(
                id__gte=session_id,
                start_time__gte=day_start,
                start_time__lte=day_end,
            )
            .select_related("product")   # prevents N+1 in SessionSerializer
            .order_by("start_time")
        )
        return Response(SessionSerializer(sessions, many=True).data)

    def post(self, request):
        """
        Return all sessions for a specific product on a specific date.

        This is the "get available slots" endpoint hit on every date change
        in the frontend — it must be fast.

        With the composite (product, start_time) index and .select_related(),
        this is a single index scan + JOIN, regardless of total session count.
        """
        # Validate payload before any DB work.
        try:
            payload = request.data.get("payload", {})
            date_string = payload["date"]
            selected_product = payload["product"]
        except KeyError as exc:
            return Response(
                {"error": f"Missing required payload field: {exc}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            day_start, day_end = _cairo_day_boundaries_from_string(date_string)
        except ValueError:
            return Response(
                {"error": f"Invalid date format '{date_string}'. Expected YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        sessions = (
            Session.objects
            .filter(
                product=selected_product,
                start_time__gte=day_start,
                start_time__lte=day_end,
            )
            .select_related("product")   # prevents N+1 in SessionSerializer
            .order_by("start_time")
        )
        return Response(SessionSerializer(sessions, many=True).data)


# ---------------------------------------------------------------------------
# OneSessionApi  —  single session operations
# ---------------------------------------------------------------------------

class OneSessionApi(generics.GenericAPIView):
    """
    GET  /sessions/one/<session_id>/
        Sessions from session_id onwards on the same date, filtered to
        the same product.

    POST /sessions/one/<session_id>/
        Update block_seats and recalculate available_seats.

    PUT  /sessions/one/<session_id>/
        Update session fields and recalculate available_seats.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SessionSerializer

    def get(self, request, session_id):
        """
        Fetch sessions from session_id onwards on the same date and product.
        """
        try:
            current_session = (
                Session.objects
                .select_related("product")
                .get(pk=session_id)
            )
        except Session.DoesNotExist:
            raise NotFound(detail=f"Session with id '{session_id}' not found.")

        day_start, day_end = _cairo_day_boundaries(current_session.start_time)

        sessions = (
            Session.objects
            .filter(
                id__gte=session_id,
                start_time__gte=day_start,
                start_time__lte=day_end,
                product_id=current_session.product_id,  # FK integer — no extra JOIN
            )
            .select_related("product")
            .order_by("start_time")
        )
        return Response(SessionSerializer(sessions, many=True).data)

    def post(self, request, session_id):
        """
        Update block_seats for a session and recalculate available_seats.

        Optimisations vs original:
        - Replaces Python-side sum() with Booking.calculate_available_seats()
          (single SQL SUM aggregate — one round-trip instead of N).
        - Uses save(update_fields=...) to write only the two changed columns.
        """
        try:
            blocks = int(request.data["numbers"])
        except (KeyError, ValueError, TypeError):
            return Response(
                {"error": "'numbers' must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # select_related so product.max_num is available without extra query.
            current_session = (
                Session.objects
                .select_related("product")
                .get(pk=session_id)
            )
        except Session.DoesNotExist:
            raise NotFound(detail=f"Session with id '{session_id}' not found.")

        current_session.block_seats = blocks
        # Single SQL aggregate replaces the Python sum() loop.
        new_available = Booking.calculate_available_seats(current_session)
        current_session.available_seats = new_available

        # Write only the two changed columns — not the entire row.
        current_session.save(update_fields=["block_seats", "available_seats"])

        return Response(SessionSerializer(current_session).data)

    def put(self, request, session_id):
        """
        Update session fields and recalculate available_seats.

        Applies incoming added_seats / block_seats to the in-memory instance
        before calling calculate_available_seats() so the formula uses the
        new values rather than the stale DB values.
        """
        data = request.data.copy()

        try:
            current_session = (
                Session.objects
                .select_related("product")
                .get(pk=session_id)
            )
        except Session.DoesNotExist:
            raise NotFound(detail="Session not found.")

        # Apply incoming seat-related values before recalculation.
        try:
            added_seats = int(data.get("added_seats", current_session.added_seats or 0))
            block_seats = int(data.get("block_seats", current_session.block_seats or 0))
        except (ValueError, TypeError):
            return Response(
                {"error": "added_seats and block_seats must be valid integers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Temporarily patch the in-memory instance so calculate_available_seats
        # uses the incoming values rather than the stale persisted values.
        current_session.added_seats = added_seats
        current_session.block_seats = block_seats

        new_available = Booking.calculate_available_seats(current_session)
        data["available_seats"] = new_available

        serializer = SessionWriteSerializer(
            instance=current_session, data=data, partial=True
        )
        if serializer.is_valid():
            serializer.save()
            # Re-fetch with select_related for the read response — ensures
            # SessionSerializer's nested ProductSerializer doesn't fire N+1.
            updated = Session.objects.select_related("product").get(pk=session_id)
            return Response(SessionSerializer(updated).data, status=status.HTTP_200_OK)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)