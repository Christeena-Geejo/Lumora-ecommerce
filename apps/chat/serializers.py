from rest_framework import serializers
from apps.chat.models import ChatRoom, ChatMessage
from apps.users.models import User
from apps.products.models import Product

class UserSnippetSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'role']

class ProductSnippetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'price']

class ChatMessageSerializer(serializers.ModelSerializer):
    sender = UserSnippetSerializer(read_only=True)
    class Meta:
        model = ChatMessage
        fields = ['id', 'sender', 'content', 'timestamp', 'is_read']

class ChatRoomSerializer(serializers.ModelSerializer):
    customer = UserSnippetSerializer(read_only=True)
    agent = UserSnippetSerializer(read_only=True)
    product = ProductSnippetSerializer(read_only=True)
    class Meta:
        model = ChatRoom
        fields = ['id', 'customer', 'agent', 'product', 'order', 'status', 'created_at', 'closed_at']
