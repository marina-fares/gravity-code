from django.contrib.auth.models import Group, User
from rest_framework import serializers
from rest_framework.serializers import ModelSerializer


class UserProfileSerializer(ModelSerializer):
    group_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        # FIX E: fields='__all__' exposed password hash, last_login, and all
        # Django permission flags over the API. Restricted to only the fields
        # actually used by the frontend and by other serializers.
        fields = [
            'id', 'username', 'first_name', 'last_name',
            'email', 'is_staff', 'is_active', 'group_name',
        ]

    def get_group_name(self, obj):
        """Return the first group name of the user."""
        group = obj.groups.first()
        return group.name if group else None


class GroupSerializer(ModelSerializer):
    class Meta:
        model = Group
        fields = '__all__'