from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from apps.orders.models import Order
from django.db.models import Sum

@shared_task
def generate_daily_report():
    yesterday = timezone.now().date() - timedelta(days=1)
    orders_yesterday = Order.objects.filter(created_at__date=yesterday)
    total_orders = orders_yesterday.count()
    revenue = orders_yesterday.filter(status='delivered').aggregate(Sum('total_amount'))['total_amount__sum'] or 0.0
    print(f"Daily Analytics Report for {yesterday}: Total Orders = {total_orders}, Total Revenue = {revenue}")
