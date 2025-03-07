from rest_framework import serializers
from ..models import PromoCode

class promo_code_serializer(serializers.ModelSerializer):
    class Meta:
        model = PromoCode
        fields = '__all__'