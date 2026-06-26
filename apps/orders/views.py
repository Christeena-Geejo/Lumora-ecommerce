from rest_framework import viewsets, permissions, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Address, Order, OrderItem, OrderTracking
from .serializers import AddressSerializer, OrderSerializer, OrderTrackingSerializer
from .services import place_order
from apps.cart.models import Cart
from apps.wallet.models import Coupon
from apps.users.permissions import IsManager

class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # If is_default is set to True, set all other addresses for this user to False
        if serializer.validated_data.get('is_default', False):
            Address.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default', False):
            Address.objects.filter(user=self.request.user).update(is_default=False)
        serializer.save()

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        address_id = request.data.get('address_id')
        payment_method = request.data.get('payment_method')
        coupon_code = request.data.get('coupon_code')

        if not address_id or not payment_method:
            return Response({'error': 'address_id and payment_method are required'}, status=status.HTTP_400_BAD_REQUEST)

        address = get_object_or_404(Address, id=address_id, user=request.user)
        cart, _ = Cart.objects.get_or_create(user=request.user)
        
        coupon = None
        if coupon_code:
            try:
                coupon = Coupon.objects.get(code=coupon_code, is_active=True)
                if coupon.expires_at < timezone.now():
                    return Response({'error': 'Coupon expired'}, status=status.HTTP_400_BAD_REQUEST)
            except Coupon.DoesNotExist:
                return Response({'error': 'Invalid coupon code'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = place_order(request.user, cart, address, payment_method, coupon)
            return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user)

class OrderTrackingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)
        tracking_history = order.tracking.all().order_by('timestamp')
        
        return Response({
            'status': order.status,
            'lat': None,
            'lng': None,
            'tracking': OrderTrackingSerializer(tracking_history, many=True).data
        })


class CancelOrderView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, user=request.user)
        if order.status in ['shipped', 'delivered', 'cancelled', 'returned']:
            return Response({'error': f'Order cannot be cancelled in state: {order.status}'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Restore stock
        for item in order.items.all():
            item.product.stock += item.quantity
            item.product.save()

        order.status = 'cancelled'
        order.save()

        OrderTracking.objects.create(
            order=order,
            status='cancelled',
            description='Order cancelled by user.'
        )
        return Response({'message': 'Order cancelled successfully.'})

class AddTrackingView(APIView):
    permission_classes = [IsManager]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        new_status = request.data.get('status')
        description = request.data.get('description', '')

        if not new_status:
            return Response({'error': 'status is required'}, status=status.HTTP_400_BAD_REQUEST)

        OrderTracking.objects.create(
            order=order,
            status=new_status,
            description=description,
        )
        order.status = new_status
        order.save()

        # Trigger async shipping email if order is shipped
        if new_status == 'shipped':
            from apps.notifications.tasks import send_shipping_notification
            send_shipping_notification.delay(order.user.email, order.id, description)
            
        return Response({'message': 'Tracking updated'})




