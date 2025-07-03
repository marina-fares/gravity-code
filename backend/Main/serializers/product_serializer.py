from rest_framework import serializers

from ..models.models_sessions import Product
from .user_serializer import UserProfileSerializer

class ProductSerializer(serializers.ModelSerializer):

    class Meta:
        model = Product
        fields = '__all__'        
        
        
        
