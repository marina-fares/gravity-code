from rest_framework import serializers
from ..models.models_sessions import Product


class ProductSerializer(serializers.ModelSerializer):
    # FIX B: Removed unused import of UserProfileSerializer. It was imported
    # but never referenced, adding a circular-import risk at startup.
    class Meta:
        model = Product
        fields = '__all__'