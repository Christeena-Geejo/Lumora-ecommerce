from rest_framework import serializers
from .models import Coupon, FlashDeal, Wallet, WalletTransaction
from apps.products.serializers import ProductSerializer

class CouponSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coupon
        fields = '__all__'

class FlashDealSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = FlashDeal
        fields = ('id', 'product', 'product_detail', 'discount_percent', 'start_time', 'end_time')

class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = ('id', 'amount', 'type', 'reason', 'created_at')

class WalletSerializer(serializers.ModelSerializer):
    transactions = WalletTransactionSerializer(many=True, read_only=True)

    class Meta:
        model = Wallet
        fields = ('id', 'balance', 'transactions')
        read_only_fields = ('id', 'balance')
