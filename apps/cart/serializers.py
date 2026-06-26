from rest_framework import serializers
from .models import Cart, CartItem, Wishlist
from apps.products.serializers import ProductSerializer

class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = CartItem
        fields = ('id', 'product', 'product_id', 'quantity', 'size')

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ('id', 'user', 'items', 'total_price', 'updated_at')
        read_only_fields = ('id', 'user', 'updated_at')

    def get_total_price(self, obj):
        # Calculate total price, using discount_price if available
        total = 0
        for item in obj.items.all():
            price = item.product.discount_price if item.product.discount_price else item.product.price
            total += price * item.quantity
        return total

class WishlistSerializer(serializers.ModelSerializer):
    products = ProductSerializer(many=True, read_only=True)

    class Meta:
        model = Wishlist
        fields = ('id', 'user', 'products')
        read_only_fields = ('id', 'user')
