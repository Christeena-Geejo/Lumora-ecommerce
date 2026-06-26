from rest_framework import serializers
from .models import Seller

class SellerSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    full_name = serializers.CharField(source='user.full_name', read_only=True)
    shop_name = serializers.CharField(max_length=20)

    class Meta:
        model = Seller
        fields = ('id', 'email', 'full_name', 'shop_name', 'gst_number', 'is_approved', 'commission_rate', 'bank_account', 'ifsc')
        read_only_fields = ('id', 'is_approved', 'commission_rate')
