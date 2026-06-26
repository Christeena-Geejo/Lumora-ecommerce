from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AddressViewSet, CheckoutView, OrderDetailView, OrderTrackingView, CancelOrderView, AddTrackingView

router = DefaultRouter()
router.register('addresses', AddressViewSet, basename='address')

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='order-checkout'),
    path('<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('<int:pk>/track/', OrderTrackingView.as_view(), name='order-track'),
    path('<int:pk>/cancel/', CancelOrderView.as_view(), name='order-cancel'),
    path('<int:pk>/add-tracking/', AddTrackingView.as_view(), name='order-add-tracking'),
    path('', include(router.urls)),
]
