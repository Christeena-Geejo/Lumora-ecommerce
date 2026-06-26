from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WalletView, ApplyCouponView, FlashDealViewSet

router = DefaultRouter()
router.register('flash-deals', FlashDealViewSet, basename='flash-deal')

urlpatterns = [
    path('my-wallet/', WalletView.as_view(), name='my-wallet'),
    path('apply-coupon/', ApplyCouponView.as_view(), name='apply-coupon'),
    path('', include(router.urls)),
]
