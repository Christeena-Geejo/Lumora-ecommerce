from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import ChatRoom
from .serializers import ChatRoomSerializer

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class IsManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['manager', 'admin', 'seller']

class IsStoreManager(permissions.BasePermission):
    """
    Ensure the manager only accesses rooms belonging to their store.
    """
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ['manager', 'admin', 'seller']
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        if request.user.role in ['manager', 'seller']:
            if obj.store is None:
                return True
            if hasattr(request.user, 'seller_profile'):
                return obj.store == request.user.seller_profile
            return True
        return False

class ChatRoomViewSet(viewsets.ModelViewSet):
    serializer_class = ChatRoomSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['manager', 'admin', 'seller']:
            if hasattr(user, 'seller_profile'):
                return ChatRoom.objects.filter(store=user.seller_profile)
            return ChatRoom.objects.all()
        return ChatRoom.objects.filter(customer=user)

    @action(detail=False, methods=['post'])
    def start(self, request):
        user = request.user
        store_id = request.data.get('store_id')
        order_id = request.data.get('order_id')
        product_id = request.data.get('product_id')
        
        # Find existing open room for this specific store and customer
        room_query = ChatRoom.objects.filter(customer=user, status__in=['open', 'picked_up'])
        if store_id:
            room_query = room_query.filter(store_id=store_id)
            
        room = room_query.first()
        
        if room:
            # Update room context to current product/order if provided
            updated = False
            if product_id and room.product_id != product_id:
                room.product_id = product_id
                updated = True
            if order_id and room.order_id != order_id:
                room.order_id = order_id
                updated = True
            if updated:
                try:
                    room.save()
                except Exception:
                    pass
        else:
            try:
                room = ChatRoom.objects.create(
                    customer=user, 
                    store_id=store_id, 
                    order_id=order_id,
                    product_id=product_id
                )
            except Exception:
                # If foreign key fails (e.g. mock order_id or store_id from frontend), create without them
                room = ChatRoom.objects.create(customer=user)
                
            channel_layer = get_channel_layer()
            group_name = f'agents_store_{store_id}' if store_id else 'agents_online'
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    'type': 'new_room',
                    'room_id': room.id,
                    'customer_name': user.full_name,
                    'store_id': store_id
                }
            )
        serializer = self.get_serializer(room)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[IsManagerOrAdmin])
    def active_rooms(self, request):
        rooms = self.get_queryset().filter(status__in=['open', 'picked_up'])
        serializer = self.get_serializer(rooms, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[IsStoreManager])
    def pickup(self, request, pk=None):
        room = self.get_object()
        if room.status != 'open':
            return Response({'detail': 'Room is already picked up or closed.'}, status=status.HTTP_400_BAD_REQUEST)
        room.agent = request.user
        room.status = 'picked_up'
        room.save()
        return Response(self.get_serializer(room).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        room = self.get_object()
        if room.status == 'closed':
            return Response({'detail': 'Room is already closed.'}, status=status.HTTP_400_BAD_REQUEST)
        # Verify permission
        is_owner = request.user == room.customer
        is_agent = request.user == room.agent
        is_store_manager = request.user.role in ['manager', 'seller', 'admin']
        is_admin = request.user.role == 'admin'
        
        if not (is_owner or is_agent or is_store_manager or is_admin):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
            
        room.status = 'closed'
        room.closed_at = timezone.now()
        room.save()

        # Send close event to websocket group
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'chat_{room.id}',
                {
                    'type': 'chat_close',
                    'message': 'Chat has been ended.'
                }
            )
        except Exception as e:
            print("Failed to broadcast chat_close:", e)

        return Response(self.get_serializer(room).data)
