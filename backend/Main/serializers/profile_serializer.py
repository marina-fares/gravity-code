from rest_framework import serializers

from ..models import Profile, ProfileHistory
from .user_serializer import UserProfileSerializer

class ProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = Profile
        fields = [field.name for field in Profile._meta.get_fields()]
        
        
class ProfileHistorySerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer()
    class Meta:
        model = ProfileHistory
        fields = ('date', 'profile', 'json_data')
        
        
        
