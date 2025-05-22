from rest_framework import permissions, generics
from rest_framework.response import Response
from ..models.models_sessions import Booking
from Main.serializers.booking_serializer import BookingSerializer


class BookingApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get(self, request, session_id):
        """
        This method is used to make a request to the Square API.
        """
        current_user = self.request.user
        if current_user.is_superuser:
            all_products = Booking.objects.all()
            serializer = BookingSerializer(all_products).data
        else:
            sessionBookings = Booking.objects.filter(session=session_id)
            serializer = BookingSerializer(sessionBookings, many=True).data
        return Response(serializer)

    def post(self, request):
        """
        This method is used to make a request to the Square API.
        """
        current_user = self.request.user
        data = request.data.get('payload', {})

        print("--------------------55", data)
        sessionBookings = Booking.objects.create(data)
        serializer = BookingSerializer(sessionBookings).data
        return Response(serializer)


class OneBookingApi(generics.GenericAPIView):
    """
    This class is used to make a request to the Square API.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = BookingSerializer

    def get(self, request, booking_id):
        """
        This method is used to make a request to the Square API.
        """
        current_user = self.request.user
        if current_user.is_superuser:
            all_products = Booking.objects.all()
            serializer = BookingSerializer(all_products).data
        else:
            sessionBookings = Booking.objects.get(id=booking_id)
            serializer = BookingSerializer(sessionBookings).data
        return Response(serializer)
    


