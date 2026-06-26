from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from django.conf.urls.static import static

from rest_framework.routers import DefaultRouter
from apps.returns.views import ReturnRequestViewSet

# Admin API router
admin_router = DefaultRouter()
admin_router.register('returns', ReturnRequestViewSet, basename='admin-returns')

admin_patterns = [
    path('', include(admin_router.urls)),
]

urlpatterns = [
    # Custom REST Admin API routes
    path('api/admin/', include(admin_patterns)),
    path('admin/returns/', include(admin_router.urls)),

    path('admin/', admin.site.urls),
    
    # Swagger API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # JWT Auth endpoints
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/', include('apps.users.urls')),
    
    # Modules endpoints
    path('api/sellers/', include('apps.sellers.urls')),
    path('api/products/', include('apps.products.urls')),
    path('api/cart/', include('apps.cart.urls')),
    path('api/orders/', include('apps.orders.urls')),
    path('api/payments/', include('apps.payments.urls')),
    path('api/returns/', include('apps.returns.urls')),
    path('api/wallet/', include('apps.wallet.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    path('api/search/', include('apps.search.urls')),
    path('api/chat/', include('apps.chat.urls')),
]


if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
