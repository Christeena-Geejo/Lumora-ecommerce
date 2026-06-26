from django.db import models

class Seller(models.Model):
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='seller_profile')
    shop_name = models.CharField(max_length=255)
    gst_number = models.CharField(max_length=15, blank=True)
    is_approved = models.BooleanField(default=False)
    commission_rate = models.FloatField(default=10.0)  # %
    bank_account = models.CharField(max_length=20)
    ifsc = models.CharField(max_length=11)

    def __str__(self):
        return self.shop_name
