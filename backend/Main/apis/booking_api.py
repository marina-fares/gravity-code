from rest_framework import permissions, generics
from rest_framework.response import Response
from ..models.models_sessions import Booking, Session, Customer, Product
from Main.serializers.booking_serializer import BookingSerializer
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.db import DatabaseError, IntegrityError

class BookingApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get(self, request, session_id=None):
        """
        This method is used to get all bookings for a specific session.
        """
        search_field = request.query_params.get('tt', '')

        if session_id:
            sessionBookings = Booking.objects.filter(session=session_id, status='done')
        elif search_field:

            all_customers = Customer.objects.filter(identifier__icontains=search_field)
            sessionBookings1 = Booking.objects.filter(booking_customer__in = all_customers)
            sessionBookings2 = Booking.objects.filter(square_receipt_number__icontains = search_field)
            sessionBookings = sessionBookings1 | sessionBookings2
        serializer = BookingSerializer(sessionBookings, many=True)

        return Response(serializer.data)  # Use .data here


    def post(self, request, session_id):
        try:
            current_user = request.user
            data = request.data.copy()

            # Get session or return 404
            booking_session = get_object_or_404(Session, id=session_id)
            data['session'] = booking_session

            # Optional: get customer
            booking_customer_id = data.get('booking_customer')
            if booking_customer_id:
                customer_instance = get_object_or_404(Customer, id=booking_customer_id)
                data['booking_customer'] = customer_instance

            # Check if we're updating an existing booking or creating a new one
            booking_id = data.get('id')
            existing_booking = Booking.objects.filter(id=booking_id).first()

            if booking_id and existing_booking:
                # Booking exists, updating it...
                session_booking = existing_booking
                for key, value in data.items():
                    setattr(session_booking, key, value)
                session_booking.save()
                created = False
            else:
                # Booking does not exist, creating it..."
                if data.get('id'):
                    data.pop('id', None)
                session_booking = Booking.objects.create(**data)
                created = True


            # Update the number of players in the session
            current_session = booking_session  # already fetched above
            product = Product.objects.get(id=current_session.product.id)
            all_bookings_num = sum(
                Booking.objects.filter(session_id=session_id).exclude(status='refunded').values_list('number_of_players', flat=True)
            )
            current_session.available_seats = product.max_num - all_bookings_num - current_session.block_seats
            current_session.save()

            serializer = BookingSerializer(session_booking)
            return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

        except ObjectDoesNotExist as e:
            return Response({"error": "Not found: " + str(e)}, status=status.HTTP_404_NOT_FOUND)

        except ValidationError as e:
            return Response({"error": "Validation error: " + str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except IntegrityError as e:
            return Response({"error": "Database integrity error: " + str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except DatabaseError as e:
            return Response({"error": "Database error: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except Exception as e:
            return Response({"error": "Unexpected error: " + str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class OneBookingApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get(self, request, booking_id):
        """
        Return details of a specific booking by ID.
        """
        try:
            booking = Booking.objects.get(id=booking_id)
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = BookingSerializer(booking)
        return Response(serializer.data, status=status.HTTP_200_OK) # ✅ Fix: use .data only here

    
    def post(self, request, booking_id):
        """
        Create a new booking using the given booking_id as a reference if needed.
        """
        data = request.data.copy()
        data["id"] = booking_id  # Optional: only if you want to set the ID manually
        serializer = self.get_serializer(data=data)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, booking_id):
        """
        Delete the booking with the specified booking_id.
        """
        try:
            booking = Booking.objects.get(id=booking_id)
            
        except Booking.DoesNotExist:
            return Response({"error": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)
        if booking and booking.status != 'done':
            
            # update the number of players in the session
            current_session = booking.session
            product = Product.objects.get(id=current_session.product.id)
            all_bookkings_num = sum(Booking.objects.filter(session__id=current_session.id).exclude(status='refunded').values_list('number_of_players', flat=True))
            current_session.available_seats = product.max_num - all_bookkings_num + booking.number_of_players - current_session.block_seats
            current_session.save()

            #delete the hold 
            booking.delete()
        return Response({"message": "Booking deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
    


