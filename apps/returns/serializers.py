from rest_framework import serializers
from .models import ReturnRequest
from apps.users.serializers import UserSerializer

class ReturnRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReturnRequest
        fields = ('id', 'order_item', 'user', 'reason', 'status', 'pickup_photo', 'created_at')
        read_only_fields = ('id', 'user', 'status', 'created_at')

