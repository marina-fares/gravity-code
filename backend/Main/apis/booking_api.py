from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.db import DatabaseError, IntegrityError, transaction
from django.db.models import Q
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from Main.serializers.booking_serializer import BookingSerializer, BookingWriteSerializer
from ..models.models_sessions import Booking, Customer, Session


def _recalculate_session_seats(session):
    new_available = Booking.calculate_available_seats(session)
    Session.objects.filter(pk=session.pk).update(available_seats=new_available)
    session.available_seats = new_available


def _get_session_with_lock(session_id):
    return (
        Session.objects
        .select_related("product")
        .select_for_update()
        .get(pk=session_id)
    )


class BookingApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get(self, request, session_id=None):
        try:
            search_field = request.query_params.get("tt", "").strip()

            if session_id:
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
                    .select_related("booking_customer", "session__product")
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
                    .select_related("booking_customer", "session__product")
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
                    Session.objects.filter(pk=current_session.pk).update(
                        available_seats=new_available
                    )
                    current_session.available_seats = new_available

                if booking_id and existing_booking:
                    serializer = BookingWriteSerializer(existing_booking, data=data, partial=True)
                    if not serializer.is_valid():
                        return Response(
                            {"error": "Invalid booking data.", "detail": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                    session_booking = serializer.save()
                    created = False
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

            result = (
                Booking.objects
                .select_related("booking_customer", "session__product")
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
                .select_related("booking_customer", "session__product")
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
                .select_related("booking_customer", "session__product")
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
        """Create a hold booking. No seat count change."""
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
                {"error": "A database error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result = (
            Booking.objects
            .select_related("booking_customer", "session__product")
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
                {"error": "A database error occurred.", "detail": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        result = (
            Booking.objects
            .select_related("booking_customer", "session__product")
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