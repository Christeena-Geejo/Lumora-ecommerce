from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Coupon, FlashDeal, Wallet, WalletTransaction
from .serializers import CouponSerializer, FlashDealSerializer, WalletSerializer
from apps.users.permissions import IsManager, IsAdmin
import decimal

class WalletView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        serializer = WalletSerializer(wallet)
        return Response(serializer.data)

    def post(self, request):
        # Load money into wallet
        wallet, _ = Wallet.objects.get_or_create(user=request.user)
        amount_str = request.data.get('amount')
        if not amount_str:
            return Response({'error': 'amount is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            amount = decimal.Decimal(amount_str)
            if amount <= 0:
                raise ValueError()
        except (ValueError, decimal.InvalidOperation):
            return Response({'error': 'Invalid positive decimal amount'}, status=status.HTTP_400_BAD_REQUEST)

        wallet.balance += amount
        wallet.save()

        WalletTransaction.objects.create(
            wallet=wallet,
            amount=amount,
            type='credit',
            reason='Funded wallet balance'
        )

        serializer = WalletSerializer(wallet)
        return Response(serializer.data)

class ApplyCouponView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'code is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            coupon = Coupon.objects.get(code=code, is_active=True)
            if coupon.expires_at < timezone.now():
                return Response({'error': 'Coupon expired'}, status=status.HTTP_400_BAD_REQUEST)
            if coupon.used_count >= coupon.max_uses:
                return Response({'error': 'Coupon use limit reached'}, status=status.HTTP_400_BAD_REQUEST)
            
            return Response({
                'valid': True,
                'code': coupon.code,
                'discount_percent': coupon.discount_percent
            })
        except Coupon.DoesNotExist:
            return Response({'error': 'Invalid coupon code'}, status=status.HTTP_400_BAD_REQUEST)

class FlashDealViewSet(viewsets.ModelViewSet):
    queryset = FlashDeal.objects.all()
    serializer_class = FlashDealSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsManager()]
        return [permissions.AllowAny()]
