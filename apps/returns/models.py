from django.db import models

class ReturnRequest(models.Model):
    STATUS = [
        ('REQUESTED', 'Requested'),
        ('APPROVED', 'Approved'),
        ('PICKUP_ASSIGNED', 'Pickup Assigned'),
        ('PICKED_UP', 'Picked Up'),
        ('RECEIVED_AT_WAREHOUSE', 'Received at Warehouse'),
        ('REFUNDED', 'Refunded'),
        ('REJECTED', 'Rejected'),
    ]
    order_item = models.ForeignKey('orders.OrderItem', on_delete=models.CASCADE, related_name='returns', null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='returns')
    reason = models.TextField()
    pickup_photo = models.ImageField(upload_to='returns/pickups/', null=True, blank=True)
    status = models.CharField(max_length=30, choices=STATUS, default='REQUESTED')
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.status == 'RECEIVED_AT_WAREHOUSE':
            from apps.wallet.models import Wallet, WalletTransaction
            from apps.orders.models import OrderTracking
            
            # Credit to wallet
            wallet, _ = Wallet.objects.get_or_create(user=self.user)
            refund_amount = self.order_item.price * self.order_item.quantity
            wallet.balance += refund_amount
            wallet.save()

            WalletTransaction.objects.create(
                wallet=wallet,
                amount=refund_amount,
                type='credit',
                reason=f'Refund for Return of Order Item #{self.order_item.id} (Order #{self.order_item.order.id})'
            )

            # Restore stock
            product = self.order_item.product
            product.stock += self.order_item.quantity
            product.save()

            # Add order tracking log
            OrderTracking.objects.create(
                order=self.order_item.order,
                status='returned',
                description=f'Returned item {product.name} received at warehouse. Refunded to wallet.'
            )

            # Auto-transition status to REFUNDED
            self.status = 'REFUNDED'
            
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Return Request for Item {self.order_item.product.name} (Order #{self.order_item.order.id}) - {self.status}"

