from celery import shared_task
from django.utils import timezone
from .models import FlashDeal

@shared_task
def expire_flash_deals():
    now = timezone.now()
    expired_deals = FlashDeal.objects.filter(end_time__lte=now)
    count = expired_deals.count()
    expired_deals.delete()
    print(f"Expired and deleted {count} flash deals.")
