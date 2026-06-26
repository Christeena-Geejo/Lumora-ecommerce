from celery import shared_task
from django.core.mail import send_mail

@shared_task
def send_order_confirmation_email(user_email, order_id):
    try:
        send_mail(
            subject=f'Order #{order_id} Confirmed!',
            message=f'Your order #{order_id} has been placed successfully.',
            from_email='noreply@yourstore.com',
            recipient_list=[user_email],
        )
    except Exception as e:
        print(f"Error sending email: {e}")

@shared_task
def send_shipping_notification(user_email, order_id, tracking_info):
    try:
        send_mail(
            subject=f'Order #{order_id} Shipped!',
            message=f'Your order is on the way. Tracking: {tracking_info}',
            from_email='noreply@yourstore.com',
            recipient_list=[user_email],
        )
    except Exception as e:
        print(f"Error sending email: {e}")

@shared_task
def update_product_ratings(product_id):
    from apps.products.models import Product, Review
    from django.db.models import Avg
    try:
        avg = Review.objects.filter(product_id=product_id).aggregate(Avg('rating'))['rating__avg']
        Product.objects.filter(id=product_id).update(rating=avg or 0.0)
    except Exception as e:
        print(f"Error updating product ratings: {e}")
