from django.urls import path
from .views import CreatePaymentView, PaymentVerifyView, PaymentWebhookView

urlpatterns = [
    path('create/', CreatePaymentView.as_view(), name='payment-create'),
    path('verify/', PaymentVerifyView.as_view(), name='payment-verify'),
    path('webhook/', PaymentWebhookView.as_view(), name='payment-webhook'),
]
