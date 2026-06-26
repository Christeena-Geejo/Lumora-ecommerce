from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum, Count
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model
from apps.orders.models import Order, OrderItem
from apps.users.permissions import IsAdmin

User = get_user_model()

class AdminAnalyticsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        last_30 = timezone.now() - timedelta(days=30)

        total_orders = Order.objects.count()
        
        # Calculate revenue, defaulting to 0 if None
        revenue_data = Order.objects.filter(
            created_at__gte=last_30, 
            status='delivered'
        ).aggregate(Sum('total_amount'))
        revenue_30d = revenue_data['total_amount__sum'] or 0.0

        new_users_30d = User.objects.filter(date_joined__gte=last_30).count()

        top_products = OrderItem.objects.values('product__name').annotate(
            total_sold=Sum('quantity')
        ).order_by('-total_sold')[:5]

        data = {
            'total_orders': total_orders,
            'revenue_30d': float(revenue_30d),
            'new_users_30d': new_users_30d,
            'top_products': list(top_products),
        }
        return Response(data)
