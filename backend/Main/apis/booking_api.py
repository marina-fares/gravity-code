from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from Main.serializers.booking_serializer import BookingSerializer, BookingWriteSerializer
from ..models.models_sessions import Booking, Customer, Session


def _recalculate_session_seats(session):
    new_available = Booking.calculate_available_seats(session)
    Session.objects.filter(pk=session.pk).update(available_seats=new_available)
    session.available_seats = new_available


def _get_session_with_lock(session_id):
    # FIX: Session.product is nullable (null=True), so Django generates a
    # LEFT OUTER JOIN when select_related("product") is used. PostgreSQL
    # refuses SELECT FOR UPDATE on the nullable side of an outer join.
    # of=('self',) locks only the Session row — not the joined Product row —
    # which is all we need to prevent concurrent seat-count races.
    return (
        Session.objects
        .select_related("product")
        .select_for_update(of=('self',))
        .get(pk=session_id)
    )


class BookingApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get(self, request, session_id=None):
        try:
            search_field = request.query_params.get("tt", "").strip()
            unposted_zoho = request.query_params.get("unposted_zoho", "").strip()

            if unposted_zoho:
                # Bookings of the current shift that were never posted to Zoho
                # (sales receipt creation failed, e.g. Zoho returned 502).
                profile = getattr(request.user, "profile", None)
                if profile is None or not profile.start_time:
                    return Response([], status=status.HTTP_200_OK)
                bookings = (
                    Booking.objects
                    .filter(
                        creation_agent=request.user.username,
                        created_at__gte=profile.start_time,
                        status="done",
                    )
                    .filter(
                        Q(zoho_sales_receipt_id__isnull=True)
                        | Q(zoho_sales_receipt_id="")
                    )
                    .select_related("booking_customer", "session__product", "refunded_by")
                    .order_by("created_at")
                )

            elif session_id:
                if not Session.objects.filter(pk=session_id).exists():
                    return Response(
                        {"error": f"Session with id '{session_id}' not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                bookings = (
                    Booking.objects
                    .filter(session_id=session_id, status="done")
                    # FIX G: booking_customer was missing from select_related here.
                    # BookingSerializer nests CustomerSerializer — without this,
                    # every booking in the list fired one extra query for the customer.
                    .select_related("booking_customer", "session__product", "refunded_by")
                    .order_by("id")
                )

            elif search_field:
                group_names = list(request.user.groups.values_list("name", flat=True))
                if not group_names:
                    return Response(
                        {"error": "Current user does not belong to any group."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                group_user_ids = User.objects.filter(
                    groups__name__in=group_names
                ).values_list("username", flat=True)

                bookings = (
                    Booking.objects
                    .filter(
                        # FIX H: Branch 1 was filtering only by group membership —
                        # the customer identifier icontains condition was missing.
                        # This meant searching "John" returned ALL bookings in the
                        # group, not just bookings for customers matching "John".
                        Q(
                            booking_customer__identifier__icontains=search_field,
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
                    .select_related("booking_customer", "session__product", "refunded_by")
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

    def post(self, request, session_id):
        try:
            with transaction.atomic():
                data = request.data.copy()

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

                try:
                    current_session = _get_session_with_lock(session_id)
                except Session.DoesNotExist:
                    return Response(
                        {"error": f"Session with id '{session_id}' not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                # Validate customer exists if provided
                booking_customer_id = data.get("booking_customer")
                if booking_customer_id:
                    if not Customer.objects.filter(pk=booking_customer_id).exists():
                        return Response(
                            {"error": f"Customer with id '{booking_customer_id}' not found."},
                            status=status.HTTP_404_NOT_FOUND,
                        )

                data["session"] = current_session.id

                booking_id = data.get("id")
                existing_booking = (
                    Booking.objects.filter(pk=booking_id).first()
                    if booking_id else None
                )

                available_seats = Booking.calculate_available_seats(current_session)

                if not (booking_id and existing_booking):
                    if available_seats <= 0:
                        return Response(
                            {"error": "There are no available seats for this session."},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    new_available = available_seats - number_of_players
                    if new_available < 0:
                        return Response(
                            {
                                "error": f"Not enough available seats. "
                                         f"Available: {available_seats}, requested: {number_of_players}.",
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    # NOTE: do NOT update available_seats here — Booking.save()
                    # already decrements via F("available_seats") - number_of_players
                    # for new bookings. Updating here as well causes a double decrement.

                if booking_id and existing_booking:
                    serializer = BookingWriteSerializer(existing_booking, data=data, partial=True)
                    if not serializer.is_valid():
                        return Response(
                            {"error": "Invalid booking data.", "detail": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    session_booking = serializer.save()
                    created = False
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

                # Recalculate AFTER the booking is fully committed so
                # calculate_available_seats() sees the correct DB state.
                _recalculate_session_seats(current_session)

            result = (
                Booking.objects
                .select_related("booking_customer", "session__product", "refunded_by")
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

    def put(self, request, session_id):
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

                if data.get("status") == "refunded" and existing_booking.status != "refunded":
                    data["refunded_by"] = request.user.pk
                    data["refunded_at"] = timezone.now().isoformat()

                serializer = BookingWriteSerializer(existing_booking, data=data, partial=True)
                if not serializer.is_valid():
                    return Response(
                        {"error": "Invalid booking data.", "detail": serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                booking_instance = serializer.save()
                _recalculate_session_seats(current_session)

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
                .select_related("booking_customer", "session__product", "refunded_by")
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


class OneBookingApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get(self, request, booking_id):
        try:
            booking = (
                Booking.objects
                .select_related("booking_customer", "session__product", "refunded_by")
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

    def post(self, request, booking_id=None):
        """Create a booking (e.g. hold). Checks seat availability and recalculates after save."""
        data = request.data.copy()
        if booking_id:
            data["id"] = booking_id

        serializer = BookingWriteSerializer(data=data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid booking data.", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

        session_id = data.get("session")
        current_session = None

        try:
            with transaction.atomic():
                if session_id:
                    try:
                        current_session = _get_session_with_lock(session_id)
                    except Session.DoesNotExist:
                        return Response(
                            {"error": f"Session with id '{session_id}' not found."},
                            status=status.HTTP_404_NOT_FOUND,
                        )

                    number_of_players = serializer.validated_data.get("number_of_players") or 0
                    if number_of_players > 0:
                        available_seats = Booking.calculate_available_seats(current_session)
                        if available_seats <= 0:
                            return Response(
                                {"error": "There are no available seats for this session."},
                                status=status.HTTP_400_BAD_REQUEST,
                            )
                        if available_seats - number_of_players < 0:
                            return Response(
                                {
                                    "error": f"Not enough available seats. "
                                             f"Available: {available_seats}, requested: {number_of_players}.",
                                },
                                status=status.HTTP_400_BAD_REQUEST,
                            )

                instance = serializer.save()

                if current_session:
                    _recalculate_session_seats(current_session)

        except IntegrityError as exc:
            return Response(
                {"error": "A booking with this ID already exists.", "detail": str(exc)},
                status=status.HTTP_409_CONFLICT,
            )
        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result = (
            Booking.objects
            .select_related("booking_customer", "session__product", "refunded_by")
            .get(pk=instance.pk)
        )
        return Response(BookingSerializer(result).data, status=status.HTTP_201_CREATED)

    def put(self, request, booking_id):
        """Update booking metadata. Does NOT change seat counts."""
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

        if data.get("status") == "refunded" and booking.status != "refunded":
            data["refunded_by"] = request.user.pk
            data["refunded_at"] = timezone.now().isoformat()

        serializer = BookingWriteSerializer(instance=booking, data=data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid booking data.", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            with transaction.atomic():
                instance = serializer.save()

                # Recalculate after any seat-sensitive field change (status,
                # number_of_players, session). This covers refunds made via
                # this endpoint — the booking is fully committed before
                # calculate_available_seats() runs, so refunded bookings are
                # correctly excluded from the count.
                _SEAT_SENSITIVE = {"number_of_players", "session", "session_id", "status"}
                if booking.session_id and _SEAT_SENSITIVE.intersection(data.keys()):
                    session = Session.objects.select_related("product").get(pk=booking.session_id)
                    _recalculate_session_seats(session)

        except DatabaseError as exc:
            return Response(
                {"error": "A database error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result = (
            Booking.objects
            .select_related("booking_customer", "session__product", "refunded_by")
            .get(pk=instance.pk)
        )
        return Response(BookingSerializer(result).data, status=status.HTTP_200_OK)

    def delete(self, request, booking_id):
        """Delete a booking and restore seat count. 'done' bookings cannot be deleted."""
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
                _recalculate_session_seats(current_session)

        except IntegrityError as exc:
            return Response(
                {"error": "A database integrity error prevented deletion.", "detail": str(exc)},
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

        return Response(
            {"message": f"Booking '{booking_id}' deleted successfully."},
            status=status.HTTP_200_OK,
        )