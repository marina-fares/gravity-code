from rest_framework.serializers import ModelSerializer
from django.contrib.auth.models import User, Group


class UserProfileSerializer(ModelSerializer):

    class Meta:
        model = User
        fields = '__all__'


class GroupSerializer(ModelSerializer):

    class Meta:
        model = Group
        fields = '__all__'

