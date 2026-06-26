from django.db import transaction
from .models import Order, OrderItem, OrderTracking
from apps.cart.models import Cart
from apps.wallet.models import Wallet, WalletTransaction
import decimal

def calculate_total(cart, coupon=None):
    total = decimal.Decimal('0.00')
    for item in cart.items.all():
        price = item.product.discount_price if item.product.discount_price else item.product.price
        total += price * item.quantity
    if coupon and coupon.is_active:
        discount = (total * decimal.Decimal(str(coupon.discount_percent))) / decimal.Decimal('100.00')
        total -= discount
    return total

@transaction.atomic
def place_order(user, cart, address, payment_method, coupon=None):
    if not cart.items.exists():
        raise ValueError("Cart is empty")

    total_amount = calculate_total(cart, coupon)
    
    order = Order.objects.create(
        user=user,
        address=address,
        total_amount=total_amount,
        payment_method=payment_method,
        coupon=coupon
    )
    
    OrderTracking.objects.create(
        order=order,
        status='pending',
        description='Order placed successfully.'
    )
    
    total_loyalty_points = decimal.Decimal('0.00')

    for item in cart.items.all():
        if item.product.stock < item.quantity:
            raise ValueError(f"{item.product.name} is out of stock (only {item.product.stock} available)")
        
        OrderItem.objects.create(
            order=order,
            product=item.product,
            quantity=item.quantity,
            price=item.product.discount_price if item.product.discount_price else item.product.price,
        )
        
        item.product.stock -= item.quantity
        item.product.save()
        total_loyalty_points += item.product.loyalty_points * item.quantity

    if total_loyalty_points > 0:
        wallet, _ = Wallet.objects.get_or_create(user=user)
        wallet.balance += total_loyalty_points
        wallet.save()
        WalletTransaction.objects.create(
            wallet=wallet,
            amount=total_loyalty_points,
            type='credit',
            reason=f'Loyalty points for Order #{order.id}'
        )

    if payment_method in ['cod', 'wallet']:
        order.status = 'confirmed'
        order.save()
        
        OrderTracking.objects.create(
            order=order,
            status='confirmed',
            description='Order confirmed directly.'
        )
        
        from apps.notifications.tasks import send_order_confirmation_email
        send_order_confirmation_email.delay(user.email, order.id)

    cart.items.all().delete()
    
    if coupon:
        coupon.used_count += 1
        if coupon.used_count >= coupon.max_uses:
            coupon.is_active = False
        coupon.save()
        
    return order
