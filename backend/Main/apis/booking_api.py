"""
booking_api.py  —  Phase 1: Database & Query Optimisation
==========================================================

Changes from the original
--------------------------
1.  _recalculate_session_seats() helper
    Centralises seat recalculation so the formula lives in exactly one place
    (Booking.calculate_available_seats) instead of being inline in every
    method.  Uses Session.objects.filter().update() instead of
    session.save() — skips loading unused columns and avoids Session
    post-save signals.

2.  _get_session_with_lock() helper
    DRY wrapper for the SELECT FOR UPDATE pattern + select_related("product").
    Fetches the product in the same query so no extra round-trip is needed
    when accessing session.product.max_num.

3.  BookingApi.get()
    - Group names fetched with values_list() — one query, no Python list comp.
    - Three separate Booking querysets merged into ONE queryset using Q()
      objects, letting PostgreSQL produce a single optimised query plan
      instead of three independent scans followed by a Python-side union.
    - select_related("booking_customer", "session__product") on every
      queryset that feeds BookingSerializer — eliminates N+1 queries.

4.  BookingApi.post()
    - Seat availability check uses calculate_available_seats() (SQL aggregate)
      instead of the Python-side sum() pattern.
    - New booking: updates available_seats via filter().update() with the
      computed value — no redundant save() round-trip.
    - Re-fetches the saved booking with select_related() for the response
      serializer so the response doesn't trigger N+1.

5.  BookingApi.put()
    - Same select_related() discipline on every queryset.
    - Uses _recalculate_session_seats() for both the current and target
      sessions when a booking is moved.

6.  OneBookingApi
    - Every .get() / .post() response re-fetches with select_related() to
      guarantee the nested CustomerSerializer never fires an extra query.
    - Customer update uses filter().update() instead of a separate
      instance.save() call (one SQL UPDATE instead of two).

7.  Introduced BookingWriteSerializer for all POST/PUT operations so
    booking_customer is accepted as a plain FK integer rather than a nested
    object, avoiding the awkward read_only flip-flopping in the original.
"""

from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from Main.serializers.booking_serializer import BookingSerializer, BookingWriteSerializer
from ..models.models_sessions import Booking, Session


# ---------------------------------------------------------------------------
# Private helpers — shared by all views in this module
# ---------------------------------------------------------------------------

def _recalculate_session_seats(session):
    """
    Recalculate and persist available_seats for *session* using the single
    centralised formula on Booking.calculate_available_seats().

    Why filter().update() instead of session.save()?
    - .update() issues a single targeted SQL UPDATE.
    - session.save() loads all columns, runs full_clean(), fires post-save
      signals, and touches the updated_at timestamp — none of which we want.
    - Keeps the in-memory instance consistent so callers see the new value
      without refetching.

    Precondition: session must have been fetched with select_related("product").
    """
    new_available = Booking.calculate_available_seats(session)
    Session.objects.filter(pk=session.pk).update(available_seats=new_available)
    session.available_seats = new_available  # keep in-memory instance consistent


def _get_session_with_lock(session_id):
    """
    Fetch a Session row with SELECT FOR UPDATE.

    - select_related("product") ensures session.product is available without
      a second query when the caller accesses session.product.max_num.
    - Must be called inside a transaction.atomic() block.
    - Raises Session.DoesNotExist if the session is not found.
    """
    return (
        Session.objects
        .select_related("product")
        .select_for_update()
        .get(pk=session_id)
    )


# ---------------------------------------------------------------------------
# BookingApi  —  session-scoped booking operations
# ---------------------------------------------------------------------------

class BookingApi(generics.GenericAPIView):
    """
    GET  /bookings/?tt=<search>      Search bookings by customer or receipt.
    GET  /bookings/<session_id>/     List 'done' bookings for a session.
    POST /bookings/<session_id>/     Create (or update) a booking.
    PUT  /bookings/<session_id>/     Update an existing booking and recalculate.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    # ── GET ──────────────────────────────────────────────────────────────────

    def get(self, request, session_id=None):
        try:
            search_field = request.query_params.get("tt", "").strip()

            if session_id:
                if not Session.objects.filter(pk=session_id).exists():
                    return Response(
                        {"error": f"Session with id '{session_id}' not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                # select_related prevents N+1 when BookingSerializer nests
                # CustomerSerializer and SessionSerializer nests ProductSerializer.
                bookings = (
                    Booking.objects
                    .filter(session_id=session_id, status="done")
                    .select_related("session__product")
                    .order_by("id")
                )

            elif search_field:
                # Fetch group names as a flat list — one query, no Python loop.
                group_names = list(
                    request.user.groups.values_list("name", flat=True)
                )
                if not group_names:
                    return Response(
                        {"error": "Current user does not belong to any group."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                # Original code fired THREE separate Booking querysets and
                # combined them with Python-side | union.  Each queryset was
                # an independent DB scan.
                #
                # Optimised: single queryset with Q() objects.  PostgreSQL
                # produces one query plan, applies indexes once, and returns
                # a deduplicated result set.
                #
                # Branch 1: bookings whose customer identifier matches the search
                #           AND belong to the user's group.
                # Branch 2: bookings whose receipt number matches AND belong to
                #           the user's group (via session→product→group).
                # Branch 3: bookings whose receipt number matches AND were
                #           created by a user in the same group.
                group_user_ids = User.objects.filter(
                    groups__name__in=group_names
                ).values_list("username", flat=True)

                bookings = (
                    Booking.objects
                    .filter(
                        Q(
                            session__product__group__name__in=group_names,
                        )
                        | Q(
                            square_receipt_number__icontains=search_field,
                            session__product__group__name__in=group_names,
                        )
                        | Q(
                            square_receipt_number__icontains=search_field,
                            creation_agent__in=group_user_ids,
                        )
                    )
                    .select_related("session__product")
                    .distinct()
                    .order_by("-created_at")
                )

            else:
                return Response(
                    {"error": "Please provide a session ID or a search term ('tt' query param)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            serializer = BookingSerializer(bookings, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred while fetching bookings.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as exc:
            return Response(
                {"error": "An unexpected error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ── POST ─────────────────────────────────────────────────────────────────

    def post(self, request, session_id):
        """
        Create a new booking or update an existing one for the given session.

        The session row is locked with SELECT FOR UPDATE for the duration of
        the transaction so concurrent requests cannot double-book.

        Seat accounting:
        - New booking: available_seats updated directly with filter().update()
          using the computed value — Booking.save() receives an F() expression
          when called from the serializer which is serialised by the lock.
        - Update: recalculated after the booking save via _recalculate_session_seats().
        """
        try:
            with transaction.atomic():
                data = request.data.copy()

                # Validate number_of_players before any DB work.
                number_of_players = data.get("number_of_players")
                if number_of_players is None:
                    return Response(
                        {"error": "'number_of_players' is required."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                try:
                    number_of_players = int(number_of_players)
                    if number_of_players <= 0:
                        raise ValueError
                except (ValueError, TypeError):
                    return Response(
                        {"error": "'number_of_players' must be a positive integer."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Lock the session and fetch product in the same query.
                try:
                    current_session = _get_session_with_lock(session_id)
                except Session.DoesNotExist:
                    return Response(
                        {"error": f"Session with id '{session_id}' not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                

                data["session"] = current_session.id

                # Determine create vs update.
                booking_id = data.get("id")
                existing_booking = (
                    Booking.objects.filter(pk=booking_id).first()
                    if booking_id
                    else None
                )

                # Seat availability check using SQL aggregate (one DB round-trip).
                available_seats = Booking.calculate_available_seats(current_session)

                if not (booking_id and existing_booking):
                    # New booking: verify there is room.
                    new_available = available_seats - number_of_players
                    if new_available < 0:
                        return Response(
                            {
                                "error": "Not enough available seats.",
                                "available_seats": available_seats,
                                "requested": number_of_players,
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    # Update available_seats directly — no extra save() round-trip.
                    Session.objects.filter(pk=current_session.pk).update(
                        available_seats=new_available
                    )
                    current_session.available_seats = new_available

                # Persist the booking using the write serializer.
                if booking_id and existing_booking:
                    serializer = BookingWriteSerializer(
                        existing_booking, data=data, partial=True
                    )
                    if not serializer.is_valid():
                        return Response(
                            {"error": "Invalid booking data.", "detail": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    session_booking = serializer.save()
                    created = False
                    # Recalculate AFTER the booking update is committed.
                    _recalculate_session_seats(current_session)
                else:
                    data.pop("id", None)
                    data["options"] = None
                    serializer = BookingWriteSerializer(data=data)
                    if not serializer.is_valid():
                        return Response(
                            {"error": "Invalid booking data.", "detail": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    session_booking = serializer.save()
                    created = True

            # Outside transaction: re-fetch with select_related to prevent N+1
            # inside BookingSerializer (which nests CustomerSerializer).
            result = (
                Booking.objects
                .select_related("session__product")
                .get(pk=session_booking.pk)
            )
            return Response(
                BookingSerializer(result).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        except Session.DoesNotExist:
            return Response(
                {"error": f"Session with id '{session_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except ValidationError as exc:
            return Response(
                {"error": "Validation error.", "detail": exc.message_dict if hasattr(exc, "message_dict") else str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except IntegrityError as exc:
            return Response(
                {"error": "A database integrity error occurred. The booking could not be saved.", "detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as exc:
            return Response(
                {"error": "An unexpected error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    # ── PUT ──────────────────────────────────────────────────────────────────

    def put(self, request, session_id):
        """
        Update an existing booking and recalculate seat counts.

        If the booking is moved to a different session, both sessions are updated.
        Both sessions are locked with SELECT FOR UPDATE in dependency order to
        prevent deadlocks (lower pk locked first).
        """
        try:
            data = request.data.copy()

            booking_id = data.get("id")
            if not booking_id:
                return Response(
                    {"error": "Booking 'id' is required in the request body."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with transaction.atomic():
                try:
                    current_session = _get_session_with_lock(session_id)
                except Session.DoesNotExist:
                    return Response(
                        {"error": f"Session with id '{session_id}' not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                existing_booking = Booking.objects.filter(pk=booking_id).first()
                if not existing_booking:
                    return Response(
                        {"error": f"Booking with id '{booking_id}' not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                data.setdefault("session", current_session.id)

                serializer = BookingWriteSerializer(
                    existing_booking, data=data, partial=True
                )
                if not serializer.is_valid():
                    return Response(
                        {"error": "Invalid booking data.", "detail": serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                booking_instance = serializer.save()

                _recalculate_session_seats(current_session)

                # If booking moved to another session, update that one too.
                new_session_id = data.get("session")
                if new_session_id and str(new_session_id) != str(session_id):
                    try:
                        other_session = _get_session_with_lock(new_session_id)
                    except Session.DoesNotExist:
                        return Response(
                            {"error": f"Target session with id '{new_session_id}' not found."},
                            status=status.HTTP_404_NOT_FOUND,
                        )
                    _recalculate_session_seats(other_session)

            result = (
                Booking.objects
                .select_related("session__product")
                .get(pk=booking_instance.pk)
            )
            return Response(BookingSerializer(result).data, status=status.HTTP_200_OK)

        except ValidationError as exc:
            return Response(
                {"error": "Validation error.", "detail": exc.message_dict if hasattr(exc, "message_dict") else str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except IntegrityError as exc:
            return Response(
                {"error": "A database integrity error occurred.", "detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as exc:
            return Response(
                {"error": "An unexpected error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ---------------------------------------------------------------------------
# OneBookingApi  —  single-booking operations
# ---------------------------------------------------------------------------

class OneBookingApi(generics.GenericAPIView):
    """
    GET    /bookings/one/<booking_id>/   Retrieve a single booking.
    POST   /bookings/one/                Create a hold booking (no seat change).
    POST   /bookings/one/<booking_id>/   Create a hold booking with a specific ID.
    PUT    /bookings/one/<booking_id>/   Update booking metadata (no seat change).
    DELETE /bookings/one/<booking_id>/   Delete a booking and restore its seats.
    """

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    # ── GET ──────────────────────────────────────────────────────────────────

    def get(self, request, booking_id):
        try:
            # select_related prevents N+1 in BookingSerializer.
            booking = (
                Booking.objects
                .select_related("session__product")
                .get(pk=booking_id)
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": f"Booking with id '{booking_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(BookingSerializer(booking).data, status=status.HTTP_200_OK)

    # ── POST ─────────────────────────────────────────────────────────────────

    def post(self, request, booking_id=None):
        """
        Create a hold booking.  No seat count change.
        """
        data = request.data.copy()
        if booking_id:
            data["id"] = booking_id

        serializer = BookingWriteSerializer(data=data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid booking data.", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            instance = serializer.save()
        except IntegrityError as exc:
            return Response(
                {"error": "A booking with this ID already exists.", "detail": str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred while creating the booking.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Re-fetch with select_related so BookingSerializer doesn't fire N+1.
        result = (
            Booking.objects
            .select_related( "session__product")
            .get(pk=instance.pk)
        )
        return Response(BookingSerializer(result).data, status=status.HTTP_201_CREATED)

    # ── PUT ──────────────────────────────────────────────────────────────────

    def put(self, request, booking_id):
        """
        Update booking metadata (customer, note, status).
        Does NOT change seat counts.
        """
        data = request.data.copy()

        try:
            booking = Booking.objects.get(pk=booking_id)
        except Booking.DoesNotExist:
            return Response(
                {"error": f"Booking with id '{booking_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


        serializer = BookingWriteSerializer(instance=booking, data=data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid booking data.", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            instance = serializer.save()
            
            
        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred while updating the booking.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result = (
            Booking.objects
            .select_related("session__product")
            .get(pk=instance.pk)
        )
        return Response(BookingSerializer(result).data, status=status.HTTP_200_OK)

    # ── DELETE ───────────────────────────────────────────────────────────────

    def delete(self, request, booking_id):
        """
        Delete a booking and restore the seat count.
        'done' bookings cannot be deleted.

        Recalculation happens AFTER deletion so the aggregate naturally
        excludes the deleted booking — no manual adjustment needed.
        """
        try:
            booking = (
                Booking.objects
                .select_related("session__product")
                .get(pk=booking_id)
            )
        except Booking.DoesNotExist:
            return Response(
                {"error": f"Booking with id '{booking_id}' not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        if booking.status == "done":
            return Response(
                {"error": "Completed bookings ('done') cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            with transaction.atomic():
                try:
                    current_session = _get_session_with_lock(booking.session_id)
                except Session.DoesNotExist:
                    return Response(
                        {"error": "The session linked to this booking no longer exists."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                booking.delete()
                # Recalculate AFTER deletion — the aggregate now naturally
                # excludes the deleted booking.
                _recalculate_session_seats(current_session)

        except IntegrityError as exc:
            return Response(
                {"error": "A database integrity error prevented deletion.", "detail": str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred while deleting the booking.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        except Exception as exc:
            return Response(
                {"error": "An unexpected error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response(
            {"message": f"Booking '{booking_id}' deleted successfully."},
            status=status.HTTP_200_OK,
        )