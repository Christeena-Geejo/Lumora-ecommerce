from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import timedelta
from .models import ReturnRequest
from .serializers import ReturnRequestSerializer
from apps.orders.models import Order, OrderItem, OrderTracking
from apps.wallet.models import Wallet, WalletTransaction
from apps.users.permissions import IsManager

class ReturnRequestViewSet(viewsets.ModelViewSet):
    serializer_class = ReturnRequestSerializer

    def get_queryset(self):
        if self.request.user.role in ['manager', 'admin']:
            return ReturnRequest.objects.all()
        return ReturnRequest.objects.filter(user=self.request.user)

    def get_permissions(self):
        if self.action in ['destroy']:
            return [IsManager()]
        return [permissions.IsAuthenticated()]

    def perform_create(self, serializer):
        order_item_id = self.request.data.get('order_item')
        order_item = get_object_or_404(OrderItem, id=order_item_id, order__user=self.request.user)
        order = order_item.order

        if order.status != 'delivered':
            raise ValueError("Order must be delivered to request a return.")

        delivery_tracking = order.tracking.filter(status='delivered').first()
        reference_time = delivery_tracking.timestamp if delivery_tracking else order.created_at
        
        if timezone.now() - reference_time > timedelta(days=7):
            raise ValueError("Return request must be filed within 7 days of delivery.")

        # Check if already has a return request for this order item
        if ReturnRequest.objects.filter(order_item=order_item).exists():
            raise ValueError("A return request already exists for this order item.")

        serializer.save(user=self.request.user, order_item=order_item)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsManager])
    def review(self, request, pk=None):
        return_request = self.get_object()
        if return_request.status != 'REQUESTED':
            return Response({'error': 'Return request has already been reviewed.'}, status=status.HTTP_400_BAD_REQUEST)

        review_action = request.data.get('action')  # 'approve' or 'reject'
        if review_action == 'approve':
            return_request.status = 'APPROVED'
            return_request.save()

            OrderTracking.objects.create(
                order=return_request.order_item.order,
                status='return_approved',
                description=f'Return request approved for item {return_request.order_item.product.name}. Awaiting pickup.'
            )

            return Response({'message': 'Return request approved.'})
            
        elif review_action == 'reject':
            return_request.status = 'REJECTED'
            return_request.save()

            OrderTracking.objects.create(
                order=return_request.order_item.order,
                status='delivered',
                description=f'Return request rejected for item {return_request.order_item.product.name}.'
            )

            return Response({'message': 'Return request rejected.'})

        return Response({'error': 'Invalid action'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'], permission_classes=[IsManager])
    def receive(self, request, pk=None):
        return_request = self.get_object()
        if return_request.status != 'APPROVED':
            return Response({'error': 'Return request must be approved first.'}, status=status.HTTP_400_BAD_REQUEST)
        
        return_request.status = 'RECEIVED_AT_WAREHOUSE'
        return_request.save()
        return Response({'message': 'Returned items received at warehouse. Refund processed.'})


