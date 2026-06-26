import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import ChatRoom, ChatMessage
from django.utils import timezone
from django.core.cache import cache

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        self.user = self.scope['user']

        if self.user.is_anonymous:
            await self.close()
            return

        has_access = await self.check_room_access()
        if not has_access:
            await self.close()
            return

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        # Send message history to the user upon connection
        history = await self.get_message_history()
        for msg in history:
            await self.send(text_data=json.dumps({
                'message': msg['content'],
                'sender_id': msg['sender_id'],
                'sender_email': msg['sender_email'],
                'sender_name': msg['sender_name'],
                'timestamp': msg['timestamp']
            }))

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message')

        if not message:
            return

        msg_obj = await self.save_message(message)

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': msg_obj.content,
                'sender_id': msg_obj.sender_id,
                'sender_email': msg_obj.sender.email,
                'sender_name': msg_obj.sender.full_name,
                'timestamp': msg_obj.timestamp.isoformat()
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message': event['message'],
            'sender_id': event['sender_id'],
            'sender_email': event.get('sender_email'),
            'sender_name': event['sender_name'],
            'timestamp': event['timestamp']
        }))

    async def chat_close(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat_close',
            'message': event['message']
        }))
        await self.close()

    @database_sync_to_async
    def check_room_access(self):
        try:
            room = ChatRoom.objects.get(id=self.room_id)
            if self.user.role == 'admin':
                return True
            if room.customer_id == self.user.id or room.agent_id == self.user.id:
                return True
            if self.user.role in ['manager', 'seller']:
                if hasattr(self.user, 'seller_profile'):
                    return room.store_id == self.user.seller_profile.id
                return True
            return False
        except ChatRoom.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content):
        room = ChatRoom.objects.get(id=self.room_id)
        return ChatMessage.objects.create(room=room, sender=self.user, content=content)

    @database_sync_to_async
    def get_message_history(self):
        messages = ChatMessage.objects.filter(room_id=self.room_id).select_related('sender').order_by('timestamp')
        return [
            {
                'content': msg.content,
                'sender_id': msg.sender_id,
                'sender_email': msg.sender.email,
                'sender_name': msg.sender.full_name,
                'timestamp': msg.timestamp.isoformat()
            }
            for msg in messages
        ]


class AgentConsumer(AsyncWebsocketConsumer):
    @database_sync_to_async
    def get_store_id(self):
        if hasattr(self.user, 'seller_profile'):
            return self.user.seller_profile.id
        return None

    async def connect(self):
        self.user = self.scope['user']
        if self.user.is_anonymous or self.user.role not in ['manager', 'admin', 'seller']:
            await self.close()
            return

        store_id = await self.get_store_id()
        if store_id:
            self.agent_group_name = f'agents_store_{store_id}'
        else:
            self.agent_group_name = 'agents_online'

        await self.channel_layer.group_add(
            self.agent_group_name,
            self.channel_name
        )
        await self.accept()
        await self.set_online_status()

    async def disconnect(self, close_code):
        if hasattr(self, 'agent_group_name'):
            await self.channel_layer.group_discard(
                self.agent_group_name,
                self.channel_name
            )
        await self.clear_online_status()

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'heartbeat':
            await self.set_online_status()
            await self.send(text_data=json.dumps({'type': 'heartbeat_ack'}))

    async def new_room(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_room',
            'room_id': event['room_id'],
            'customer_name': event['customer_name']
        }))

    @database_sync_to_async
    def set_online_status(self):
        cache.set(f'agent_online:{self.user.id}', True, timeout=60)

    @database_sync_to_async
    def clear_online_status(self):
        cache.delete(f'agent_online:{self.user.id}')
