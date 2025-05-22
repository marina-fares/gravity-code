from rest_framework import serializers
from ..models.models_sessions import Session
from .product_serializer import ProductSerializer

class SessionSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    class Meta:
        model = Session
        fields = '__all__'