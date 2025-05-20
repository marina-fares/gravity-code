from rest_framework import serializers

from ..models.models_sessions import Booking
from .user_serializer import UserProfileSerializer

class BookingSerializer(serializers.ModelSerializer):

    class Meta:
        model = Booking
        fields = '__all__'        
        
        
        
