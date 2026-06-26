from django.urls import path
from .views import AdminAnalyticsView

urlpatterns = [
    path('dashboard/', AdminAnalyticsView.as_view(), name='admin-analytics-dashboard'),
]
