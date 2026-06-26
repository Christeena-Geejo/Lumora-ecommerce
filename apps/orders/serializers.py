from rest_framework import serializers
from .models import Address, Order, OrderItem, OrderTracking

from apps.products.serializers import ProductSerializer
from apps.users.serializers import UserSerializer

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ('id', 'line1', 'city', 'state', 'pincode', 'is_default')
        read_only_fields = ('id',)

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'quantity', 'price', 'size')

class OrderTrackingSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderTracking
        fields = ('id', 'status', 'description', 'timestamp')

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    tracking = OrderTrackingSerializer(many=True, read_only=True)
    address = AddressSerializer(read_only=True)
    address_id = serializers.IntegerField(write_only=True)
    coupon_code = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Order
        fields = (
            'id', 'status', 'payment_status', 'total_amount', 'created_at', 'payment_method',
            'address', 'address_id', 'coupon_code', 'items', 'tracking'
        )
        read_only_fields = ('id', 'status', 'payment_status', 'total_amount', 'created_at')


