from django.db import models

class Coupon(models.Model):
    code = models.CharField(max_length=20, unique=True)
    discount_percent = models.FloatField()
    max_uses = models.PositiveIntegerField()
    used_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.code

class FlashDeal(models.Model):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE, related_name='flash_deals')
    discount_percent = models.FloatField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    def __str__(self):
        return f"Flash Deal for {self.product.name} ({self.discount_percent}%)"

class Wallet(models.Model):
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='wallet')
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Wallet of {self.user.email} (Bal: {self.balance})"

class WalletTransaction(models.Model):
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type_choices = [('credit', 'Credit'), ('debit', 'Debit')]
    type = models.CharField(max_length=10, choices=type_choices)
    reason = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type.upper()} {self.amount} - {self.reason}"
