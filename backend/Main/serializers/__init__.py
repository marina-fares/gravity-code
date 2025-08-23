# serializers.py
from rest_framework import serializers
from ..models.logs import APILog

class APILogSerializer(serializers.ModelSerializer):
    class Meta:
        model = APILog
        fields = "__all__"
