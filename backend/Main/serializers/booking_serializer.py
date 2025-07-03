from rest_framework import serializers

from ..models.models_sessions import Booking
from .user_serializer import UserProfileSerializer
from .customer_serializer import CustomerSerializer
class BookingSerializer(serializers.ModelSerializer):
    booking_customer = CustomerSerializer(read_only=True)
    class Meta:
        model = Booking
        fields = '__all__'        
        
        
        
