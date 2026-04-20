from rest_framework import permissions, generics
from rest_framework.response import Response
from ..models.models_sessions import Booking, Session, Customer, Product
from Main.serializers.booking_serializer import BookingSerializer
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import DatabaseError, IntegrityError, transaction
from django.contrib.auth.models import User


class BookingApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get(self, request, session_id=None):
        """
        GET /bookings/?tt=<search>     → search bookings by customer or receipt
        GET /bookings/<session_id>/    → list 'done' bookings for a session
        """
        try:
            search_field = request.query_params.get('tt', '').strip()
            current_user = request.user

            if session_id:
                session_exists = Session.objects.filter(id=session_id).exists()
                if not session_exists:
                    return Response(
                        {"error": f"Session with id '{session_id}' not found."},
                        status=status.HTTP_404_NOT_FOUND
                    )
                sessionBookings = Booking.objects.filter(session=session_id, status='done')

            elif search_field:
                current_user_groups = current_user.groups.all()
                current_user_group_names = [group.name for group in current_user_groups]

                if not current_user_group_names:
                    return Response(
                        {"error": "Current user does not belong to any group."},
                        status=status.HTTP_403_FORBIDDEN
                    )

                all_customers = Customer.objects.filter(identifier__icontains=search_field)

                sessionBookings1 = Booking.objects.filter(
                    booking_customer__in=all_customers,
                    session__product__group__name__in=current_user_group_names
                )
                sessionBookings2 = Booking.objects.filter(
                    square_receipt_number__icontains=search_field,
                    session__product__group__name__in=current_user_group_names
                )
                group_users = User.objects.filter(
                    groups__name__in=current_user_group_names
                ).values_list('username', flat=True)
                sessionBookings3 = Booking.objects.filter(
                    square_receipt_number__icontains=search_field,
                    creation_agent__in=group_users
                )
                sessionBookings = (sessionBookings1 | sessionBookings2 | sessionBookings3).distinct()

            else:
                # Neither session_id nor search_field provided
                return Response(
                    {"error": "Please provide a session ID or a search term ('tt' query param)."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            serializer = BookingSerializer(sessionBookings, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        except DatabaseError as e:
            return Response(
                {"error": "A database error occurred while fetching bookings.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {"error": "An unexpected error occurred.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # -------------------------------------------------------------------------

    def post(self, request, session_id):
        """
        POST /bookings/<session_id>/
        Create a new booking or update an existing one for the given session.
        """
        try:
            with transaction.atomic():
                data = request.data.copy()

                # ── Validate required field ───────────────────────────────────
                number_of_players = data.get('number_of_players')
                if number_of_players is None:
                    return Response(
                        {"error": "'number_of_players' is required."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                try:
                    number_of_players = int(number_of_players)
                    if number_of_players <= 0:
                        raise ValueError
                except (ValueError, TypeError):
                    return Response(
                        {"error": "'number_of_players' must be a positive integer."},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # ── Fetch & lock the session row ──────────────────────────────
                try:
                    current_session = Session.objects.select_for_update().get(id=session_id)
                except Session.DoesNotExist:
                    return Response(
                        {"error": f"Session with id '{session_id}' not found."},
                        status=status.HTTP_404_NOT_FOUND
                    )

                # ── Resolve customer ──────────────────────────────────────────
                booking_customer_id = data.get('booking_customer')
                if booking_customer_id:
                    try:
                        customer_instance = Customer.objects.get(id=booking_customer_id)
                        data['booking_customer'] = customer_instance.id   # keep as ID for serializer
                    except Customer.DoesNotExist:
                        return Response(
                            {"error": f"Customer with id '{booking_customer_id}' not found."},
                            status=status.HTTP_404_NOT_FOUND
                        )

                data['session'] = current_session.id

                # ── Check existing booking ────────────────────────────────────
                booking_id = data.get('id')
                existing_booking = Booking.objects.filter(id=booking_id).first() if booking_id else None

                # ── Seat availability check ───────────────────────────────────
                product = current_session.product
                all_bookings_num = sum(
                    Booking.objects.filter(session_id=session_id)
                    .exclude(status='refunded')
                    .values_list('number_of_players', flat=True)
                )
                available_seats = (
                    current_session.added_seats
                    + product.max_num
                    - all_bookings_num
                    - current_session.block_seats
                )

                # On create, subtract the requested players; on update, keep as-is
                if not (booking_id and existing_booking):
                    new_available = available_seats - number_of_players
                    if new_available < 0:
                        return Response(
                            {
                                "error": "Not enough available seats.",
                                "available_seats": available_seats,
                                "requested": number_of_players,
                            },
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    current_session.available_seats = new_available
                else:
                    current_session.available_seats = available_seats

                current_session.save()

                # ── Save booking ──────────────────────────────────────────────
                if booking_id and existing_booking:
                    serializer = BookingSerializer(existing_booking, data=data, partial=True)
                    if not serializer.is_valid():
                        return Response(
                            {"error": "Invalid booking data.", "detail": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    session_booking = serializer.save()
                    created = False
                else:
                    data.pop('id', None)
                    data['options'] = None
                    serializer = BookingSerializer(data=data)
                    if not serializer.is_valid():
                        return Response(
                            {"error": "Invalid booking data.", "detail": serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST
                        )
                    session_booking = serializer.save()
                    created = True

            # ── Outside transaction ───────────────────────────────────────────
            result_serializer = BookingSerializer(session_booking)
            return Response(
                result_serializer.data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
            )

        except Session.DoesNotExist:
            return Response(
                {"error": f"Session with id '{session_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            return Response(
                {"error": "Validation error.", "detail": e.message_dict if hasattr(e, 'message_dict') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except IntegrityError as e:
            return Response(
                {"error": "A database integrity error occurred. The booking could not be saved.", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except DatabaseError as e:
            return Response(
                {"error": "A database error occurred.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {"error": "An unexpected error occurred.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    # -------------------------------------------------------------------------

    def put(self, request, session_id):
        """
        PUT /bookings/<session_id>/
        Update an existing booking and recalculate seat counts.
        """
        try:
            data = request.data.copy()

            # ── Validate booking_id is provided ──────────────────────────────
            booking_id = data.get('id')
            if not booking_id:
                return Response(
                    {"error": "Booking 'id' is required in the request body."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                # ── Fetch & lock the session ──────────────────────────────────
                try:
                    current_session = Session.objects.select_for_update().get(id=session_id)
                except Session.DoesNotExist:
                    return Response(
                        {"error": f"Session with id '{session_id}' not found."},
                        status=status.HTTP_404_NOT_FOUND
                    )

                # ── Fetch the booking ─────────────────────────────────────────
                existing_booking = Booking.objects.filter(id=booking_id).first()
                if not existing_booking:
                    return Response(
                        {"error": f"Booking with id '{booking_id}' not found."},
                        status=status.HTTP_404_NOT_FOUND
                    )

                data.setdefault('session', current_session.id)

                # ── Validate & save the booking ───────────────────────────────
                booking_serializer = BookingSerializer(existing_booking, data=data, partial=True)
                if not booking_serializer.is_valid():
                    return Response(
                        {"error": "Invalid booking data.", "detail": booking_serializer.errors},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                booking_instance = booking_serializer.save()

                # ── Recalculate seats for the current session ─────────────────
                product = current_session.product
                all_bookings_num = sum(
                    Booking.objects.filter(session_id=session_id)
                    .exclude(status='refunded')
                    .values_list('number_of_players', flat=True)
                )
                current_session.available_seats = (
                    current_session.added_seats
                    + product.max_num
                    - all_bookings_num
                    - current_session.block_seats
                )
                current_session.save()

                # ── If booking moved to another session, update that one too ──
                new_session_id = data.get('session')
                if new_session_id and str(new_session_id) != str(session_id):
                    try:
                        other_session = Session.objects.select_for_update().get(id=new_session_id)
                    except Session.DoesNotExist:
                        return Response(
                            {"error": f"Target session with id '{new_session_id}' not found."},
                            status=status.HTTP_404_NOT_FOUND
                        )
                    other_product = other_session.product
                    other_bookings_num = sum(
                        Booking.objects.filter(session_id=other_session.id)
                        .exclude(status='refunded')
                        .values_list('number_of_players', flat=True)
                    )
                    other_session.available_seats = (
                        other_session.added_seats
                        + other_product.max_num
                        - other_bookings_num
                        - other_session.block_seats
                    )
                    other_session.save()

            result_serializer = BookingSerializer(booking_instance)
            return Response(result_serializer.data, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response(
                {"error": "Validation error.", "detail": e.message_dict if hasattr(e, 'message_dict') else str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except IntegrityError as e:
            return Response(
                {"error": "A database integrity error occurred.", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except DatabaseError as e:
            return Response(
                {"error": "A database error occurred.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {"error": "An unexpected error occurred.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================


class OneBookingApi(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get(self, request, booking_id):
        """
        GET /bookings/one/<booking_id>/
        Retrieve a single booking by its ID.
        """
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response(
                {"error": f"Booking with id '{booking_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except DatabaseError as e:
            return Response(
                {"error": "A database error occurred.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # -------------------------------------------------------------------------

    def post(self, request, booking_id=None):
        """
        POST /bookings/one/              → Create a hold booking
        POST /bookings/one/<booking_id>/ → Create a hold booking with a specific ID
        No seat count change — no transaction needed.
        """
        data = request.data.copy()
        if booking_id:
            data['id'] = booking_id

        serializer = self.get_serializer(data=data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid booking data.", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            serializer.save()
        except IntegrityError as e:
            return Response(
                {"error": "A booking with this ID already exists.", "detail": str(e)},
                status=status.HTTP_409_CONFLICT
            )
        except DatabaseError as e:
            return Response(
                {"error": "A database error occurred while creating the booking.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # -------------------------------------------------------------------------

    def put(self, request, booking_id):
        """
        PUT /bookings/one/<booking_id>/
        Update booking metadata (customer, note, status).
        Does NOT change seat counts.
        """
        data = request.data.copy()

        # ── Fetch booking ─────────────────────────────────────────────────────
        try:
            booking = Booking.objects.get(id=booking_id)
            is_new = False
        except Booking.DoesNotExist:
            return Response(
                {"error": f"Booking with id '{booking_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except DatabaseError as e:
            return Response(
                {"error": "A database error occurred.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # ── Resolve customer (ID can arrive as int or string from JSON) ───────
        customer = None
        customer_id = data.get('booking_customer')
        if customer_id is not None:
            try:
                customer = Customer.objects.get(id=int(customer_id))
            except (Customer.DoesNotExist, ValueError, TypeError):
                return Response(
                    {"error": f"Customer with id '{customer_id}' not found."},
                    status=status.HTTP_404_NOT_FOUND
                )

        # ── Validate & save ───────────────────────────────────────────────────
        serializer = self.get_serializer(instance=booking, data=data, partial=True)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid booking data.", "detail": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            instance = serializer.save()
            if customer:
                instance.booking_customer = customer
                instance.save(update_fields=['booking_customer'])
        except DatabaseError as e:
            return Response(
                {"error": "A database error occurred while updating the booking.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if is_new else status.HTTP_200_OK
        )

    # -------------------------------------------------------------------------

    def delete(self, request, booking_id):
        """
        DELETE /bookings/one/<booking_id>/
        Delete a booking and restore the seat count (unless status is 'done').
        """
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response(
                {"error": f"Booking with id '{booking_id}' not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if booking.status == 'done':
            return Response(
                {"error": "Completed bookings ('done') cannot be deleted."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                try:
                    current_session = Session.objects.select_for_update().get(id=booking.session.id)
                except Session.DoesNotExist:
                    return Response(
                        {"error": "The session linked to this booking no longer exists."},
                        status=status.HTTP_404_NOT_FOUND
                    )

                product = current_session.product
                all_bookings_num = sum(
                    Booking.objects.filter(session__id=current_session.id)
                    .exclude(status='refunded')
                    .values_list('number_of_players', flat=True)
                )

                # Restore the seats freed by this booking
                current_session.available_seats = (
                    current_session.added_seats
                    + product.max_num
                    - all_bookings_num
                    + booking.number_of_players
                    - current_session.block_seats
                )
                current_session.save()
                booking.delete()

        except IntegrityError as e:
            return Response(
                {"error": "A database integrity error prevented deletion.", "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except DatabaseError as e:
            return Response(
                {"error": "A database error occurred while deleting the booking.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {"error": "An unexpected error occurred.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        return Response(
            {"message": f"Booking '{booking_id}' deleted successfully."},
            status=status.HTTP_200_OK
        )