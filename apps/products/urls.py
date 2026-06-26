from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductViewSet, CategoryViewSet, ReviewViewSet, ProductSearchView, ElasticSearchView

router = DefaultRouter()
router.register('categories', CategoryViewSet, basename='category')
router.register('reviews', ReviewViewSet, basename='review')
router.register('', ProductViewSet, basename='product')

urlpatterns = [
    path('search/basic/', ProductSearchView.as_view(), name='product-search-basic'),
    path('search/elastic/', ElasticSearchView.as_view(), name='product-search-elastic'),
    path('', include(router.urls)),
]
