from rest_framework.serializers import ModelSerializer
from django.contrib.auth.models import User, Group
from rest_framework import serializers

class UserProfileSerializer(ModelSerializer):
    
    group_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = '__all__'
    def get_group_name(self, obj):
        """Return the first group name of the user"""
        return obj.groups.first().name if obj.groups.exists() else None

class GroupSerializer(ModelSerializer):

    class Meta:
        model = Group
        fields = '__all__'

