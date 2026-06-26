from django.contrib import admin
from .models import Seller

@admin.register(Seller)
class SellerAdmin(admin.ModelAdmin):
    list_display = ('shop_name', 'user', 'is_approved', 'commission_rate')
    list_filter = ('is_approved',)
    search_fields = ('shop_name', 'user__email', 'user__full_name')
