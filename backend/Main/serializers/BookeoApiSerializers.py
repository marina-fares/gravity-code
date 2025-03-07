from rest_framework import serializers


class BookeoApiSerializers(serializers.Serializer):

    request_type = serializers.CharField(max_length=255)

    url = serializers.CharField(max_length=255)

    payload = serializers.JSONField()
