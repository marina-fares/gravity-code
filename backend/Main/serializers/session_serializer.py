from rest_framework import serializers
from ..models.models_sessions import Session

class SessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Session
        fields = '__all__'