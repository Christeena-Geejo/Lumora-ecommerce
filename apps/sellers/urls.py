from django.urls import path
from .views import SellerRegisterView, SellerDetailView, SellerApprovalView

urlpatterns = [
    path('register/', SellerRegisterView.as_view(), name='seller-register'),
    path('profile/', SellerDetailView.as_view(), name='seller-profile'),
    path('<int:pk>/approve/', SellerApprovalView.as_view(), name='seller-approve'),
]
