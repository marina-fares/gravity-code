from rest_framework import serializers

from ..models.models_sub_shift import SubShift, SubShiftHistory
from .user_serializer import UserProfileSerializer

class SubShiftSerializer(serializers.ModelSerializer):

    class Meta:
        model = SubShift
        fields = [field.name for field in SubShift._meta.get_fields()]
        
        
class SubShiftHistorySerializer(serializers.ModelSerializer):
    sub_shift = UserProfileSerializer()
    class Meta:
        model = SubShiftHistory
        fields = ('date', 'sub_shift', 'json_data')
        
        
        
