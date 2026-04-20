from rest_framework import serializers
from ..models.models_sessions import Session
from .product_serializer import ProductSerializer

class SessionSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    class Meta:
        model = Session
        fields = '__all__'

@property
def available_seats(self):
    booked = self.booking_set.exclude(status='refunded').aggregate(
        total=models.Sum('number_of_players')
    )['total'] or 0
    return self.added_seats + self.product.max_num - booked - self.block_seats