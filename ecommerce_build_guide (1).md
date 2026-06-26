# Amazon-Like E-Commerce Platform — Build Guide
### Stack: Django · DRF · JWT · Celery · Docker · PostgreSQL

---

## Table of Contents
1. [Project Structure](#1-project-structure)
2. [Docker Setup](#2-docker-setup)
3. [Django Project Setup](#3-django-project-setup)
4. [Database Models](#4-database-models)
5. [Authentication — JWT (Access + Refresh Tokens)](#5-authentication--jwt)
6. [User Roles](#6-user-roles)
7. [Product & Inventory](#7-product--inventory)
8. [Cart & Wishlist](#8-cart--wishlist)
9. [Orders & Checkout](#9-orders--checkout)
10. [Payment Gateway (Razorpay)](#10-payment-gateway-razorpay)
11. [Search (Basic → Elasticsearch)](#11-search)
12. [Celery — Async Tasks](#12-celery--async-tasks)
13. [Email Notifications](#13-email-notifications)
14. [Returns & Refunds](#14-returns--refunds)
15. [Multi-Vendor (Seller)](#15-multi-vendor-seller)
16. [Recommendations, Deals, Wallet](#16-recommendations-deals-wallet)
17. [Live Order Tracking](#17-live-order-tracking)
18. [Analytics](#18-analytics)
19. [SSL & Security](#19-ssl--security)
20. [Frontend Notes](#20-frontend-notes)

---

## 1. Project Structure

```
ecommerce/
├── docker-compose.yml
├── Dockerfile
├── .env
├── requirements.txt
├── manage.py
├── config/
│   ├── settings/
│   │   ├── base.py
│   │   ├── dev.py
│   │   └── prod.py
│   ├── urls.py
│   └── celery.py
├── apps/
│   ├── users/          # Auth, roles, profiles
│   ├── products/       # Products, categories, inventory
│   ├── cart/           # Cart, wishlist
│   ├── orders/         # Orders, checkout
│   ├── payments/       # Razorpay integration
│   ├── search/         # Search (basic / Elasticsearch)
│   ├── notifications/  # Email, push notifications
│   ├── returns/        # Returns, refunds
│   ├── sellers/        # Multi-vendor
│   ├── analytics/      # Reports, dashboards
│   └── wallet/         # Wallet, loyalty points
└── nginx/
    └── nginx.conf
```

---

## 2. Docker Setup

### `docker-compose.yml`

```yaml
version: '3.9'

services:
  db:
    image: postgres:15
    env_file: .env
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  web:
    build: .
    command: gunicorn config.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - .:/app
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      - db
      - redis

  celery:
    build: .
    command: celery -A config worker -l info
    volumes:
      - .:/app
    env_file: .env
    depends_on:
      - redis
      - db

  celery-beat:
    build: .
    command: celery -A config beat -l info
    volumes:
      - .:/app
    env_file: .env
    depends_on:
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf
      - static_files:/app/staticfiles
    depends_on:
      - web

volumes:
  postgres_data:
  static_files:
```

### `Dockerfile`

```dockerfile
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y libpq-dev gcc

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput
```

### `.env`

```env
POSTGRES_DB=ecommerce
POSTGRES_USER=postgres
POSTGRES_PASSWORD=yourpassword
DATABASE_URL=postgresql://postgres:yourpassword@db:5432/ecommerce

REDIS_URL=redis://redis:6379/0

SECRET_KEY=your-django-secret-key
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,localhost

RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=you@gmail.com
EMAIL_HOST_PASSWORD=yourapppassword
```

### `requirements.txt`

```
django>=4.2
djangorestframework
djangorestframework-simplejwt
django-environ
psycopg2-binary
celery[redis]
django-celery-beat
razorpay
elasticsearch-dsl>=8.0
django-elasticsearch-dsl
Pillow
gunicorn
redis
django-cors-headers
drf-spectacular        # API docs (Swagger)
```

---

## 3. Django Project Setup

### `config/settings/base.py`

```python
import environ
from pathlib import Path

env = environ.Env()
BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = env('SECRET_KEY')
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_elasticsearch_dsl',
    'drf_spectacular',
    'django_celery_beat',
    # Apps
    'apps.users',
    'apps.products',
    'apps.cart',
    'apps.orders',
    'apps.payments',
    'apps.search',
    'apps.notifications',
    'apps.returns',
    'apps.sellers',
    'apps.analytics',
    'apps.wallet',
]

DATABASES = {
    'default': env.db('DATABASE_URL')
}

AUTH_USER_MODEL = 'users.User'

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CELERY_BROKER_URL = env('REDIS_URL')
CELERY_RESULT_BACKEND = env('REDIS_URL')
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': env('REDIS_URL'),
    }
}

ELASTICSEARCH_DSL = {
    'default': {'hosts': 'http://elasticsearch:9200'},
}

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = env('EMAIL_HOST')
EMAIL_PORT = env.int('EMAIL_PORT')
EMAIL_HOST_USER = env('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = env('EMAIL_HOST_PASSWORD')
EMAIL_USE_TLS = True

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "https://yourdomain.com",
]
```

### `config/celery.py`

```python
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.prod')

app = Celery('ecommerce')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
```

---

## 4. Database Models

### Users — `apps/users/models.py`

```python
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin
from django.db import models

class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = [
        ('user', 'Customer'),
        ('seller', 'Seller'),
        ('manager', 'Manager'),
        ('admin', 'Admin'),
    ]
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='user')
    phone = models.CharField(max_length=15, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    # Custom manager required — see Django docs
```

### Products — `apps/products/models.py`

```python
from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    slug = models.SlugField(unique=True)

class Product(models.Model):
    seller = models.ForeignKey('sellers.Seller', on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=500)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    discount_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    images = models.ManyToManyField('ProductImage')
    rating = models.FloatField(default=0.0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class ProductImage(models.Model):
    image = models.ImageField(upload_to='products/')

class Review(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reviews')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField()  # 1-5
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
```

### Cart — `apps/cart/models.py`

```python
from django.db import models

class Cart(models.Model):
    user = models.OneToOneField('users.User', on_delete=models.CASCADE)
    updated_at = models.DateTimeField(auto_now=True)

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)

class Wishlist(models.Model):
    user = models.OneToOneField('users.User', on_delete=models.CASCADE)
    products = models.ManyToManyField('products.Product')
```

### Orders — `apps/orders/models.py`

```python
from django.db import models

class Address(models.Model):
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    line1 = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.CharField(max_length=10)
    is_default = models.BooleanField(default=False)

class Order(models.Model):
    STATUS = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('returned', 'Returned'),
    ]
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    address = models.ForeignKey(Address, on_delete=models.SET_NULL, null=True)
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    coupon = models.ForeignKey('wallet.Coupon', null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=50)  # razorpay, cod, wallet

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

class OrderTracking(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='tracking')
    status = models.CharField(max_length=50)
    description = models.CharField(max_length=255)
    timestamp = models.DateTimeField(auto_now_add=True)
```

---

## 5. Authentication — JWT

### `apps/users/views.py`

```python
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = UserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        user = authenticate(request, email=email, password=password)
        if not user:
            return Response({'error': 'Invalid credentials'}, status=401)
        refresh = RefreshToken.for_user(user)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        })

class LogoutView(APIView):
    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()  # Requires token_blacklist in INSTALLED_APPS
            return Response({'message': 'Logged out'})
        except Exception:
            return Response({'error': 'Invalid token'}, status=400)
```

### Token Refresh URL

```python
# config/urls.py
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('api/auth/refresh/', TokenRefreshView.as_view()),
    ...
]
```

**Flow:**
- Login → get `access` (30 min) + `refresh` (7 days)
- Every API request → `Authorization: Bearer <access>`
- Access expired → POST `/api/auth/refresh/` with `refresh` token → new `access`
- Logout → blacklist the `refresh` token

---

## 6. User Roles

### Custom Permissions — `apps/users/permissions.py`

```python
from rest_framework.permissions import BasePermission

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'admin'

class IsSeller(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ('seller', 'admin')

class IsManager(BasePermission):
    def has_permission(self, request, view):
        return request.user.role in ('manager', 'admin')

class IsCustomer(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'user'
```

### Usage in Views

```python
class AdminDashboardView(APIView):
    permission_classes = [IsAdmin]
    ...

class SellerProductView(APIView):
    permission_classes = [IsSeller]
    ...
```

---

## 7. Product & Inventory

### Inventory Update on Order

```python
# apps/orders/services.py
from django.db import transaction

@transaction.atomic
def place_order(user, cart, address, payment_method):
    order = Order.objects.create(
        user=user,
        address=address,
        total_amount=calculate_total(cart),
        payment_method=payment_method,
    )
    for item in cart.items.all():
        if item.product.stock < item.quantity:
            raise ValueError(f"{item.product.name} out of stock")
        OrderItem.objects.create(
            order=order,
            product=item.product,
            quantity=item.quantity,
            price=item.product.price,
        )
        item.product.stock -= item.quantity
        item.product.save()
    cart.items.all().delete()
    return order
```

---

## 8. Cart & Wishlist

### Cart API — `apps/cart/views.py`

```python
class CartView(APIView):
    def get(self, request):
        cart, _ = Cart.objects.get_or_create(user=request.user)
        serializer = CartSerializer(cart)
        return Response(serializer.data)

    def post(self, request):
        # Add item to cart
        cart, _ = Cart.objects.get_or_create(user=request.user)
        product_id = request.data['product_id']
        quantity = request.data.get('quantity', 1)
        item, created = CartItem.objects.get_or_create(cart=cart, product_id=product_id)
        if not created:
            item.quantity += quantity
        else:
            item.quantity = quantity
        item.save()
        return Response({'message': 'Added to cart'})

    def delete(self, request):
        CartItem.objects.filter(
            cart__user=request.user,
            product_id=request.data['product_id']
        ).delete()
        return Response({'message': 'Removed'})
```

---

## 9. Orders & Checkout

### Checkout Flow

```
1. User has items in Cart
2. POST /api/orders/checkout/  → validate stock → create Order → initiate payment
3. Payment success webhook → confirm order → reduce stock → send email
4. Order status updates via /api/orders/<id>/track/
```

### URLs

```python
urlpatterns = [
    path('checkout/', CheckoutView.as_view()),
    path('<int:pk>/', OrderDetailView.as_view()),
    path('<int:pk>/track/', OrderTrackingView.as_view()),
    path('<int:pk>/cancel/', CancelOrderView.as_view()),
]
```

---

## 10. Payment Gateway (Razorpay)

### `apps/payments/views.py`

```python
import razorpay
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response

client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)

class CreatePaymentView(APIView):
    def post(self, request):
        order_id = request.data['order_id']
        order = Order.objects.get(id=order_id, user=request.user)
        razorpay_order = client.order.create({
            'amount': int(order.total_amount * 100),  # paise
            'currency': 'INR',
            'receipt': f'order_{order.id}',
        })
        return Response({'razorpay_order_id': razorpay_order['id']})

class PaymentWebhookView(APIView):
    permission_classes = []  # Public webhook

    def post(self, request):
        payload = request.body
        sig = request.headers.get('X-Razorpay-Signature')
        try:
            client.utility.verify_webhook_signature(
                payload, sig, settings.RAZORPAY_WEBHOOK_SECRET
            )
        except Exception:
            return Response(status=400)

        event = request.data.get('event')
        if event == 'payment.captured':
            payment_id = request.data['payload']['payment']['entity']['id']
            order_receipt = request.data['payload']['payment']['entity']['order_id']
            # Update order status to confirmed
            # Trigger email via Celery
        return Response(status=200)
```

**COD (Cash on Delivery):** Skip payment step, set order status to `confirmed` directly.

---

## 11. Search

### Basic Search (SQL LIKE)

```python
# apps/products/views.py
class ProductSearchView(APIView):
    permission_classes = []

    def get(self, request):
        q = request.query_params.get('q', '')
        category = request.query_params.get('category')
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')

        products = Product.objects.filter(name__icontains=q, is_active=True)
        if category:
            products = products.filter(category__slug=category)
        if min_price:
            products = products.filter(price__gte=min_price)
        if max_price:
            products = products.filter(price__lte=max_price)

        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)
```

### Elasticsearch (Scale)

```python
# apps/products/documents.py
from django_elasticsearch_dsl import Document, fields
from django_elasticsearch_dsl.registries import registry
from .models import Product

@registry.register_document
class ProductDocument(Document):
    class Index:
        name = 'products'
        settings = {'number_of_shards': 1, 'number_of_replicas': 0}

    class Django:
        model = Product
        fields = ['name', 'description', 'price', 'rating']

# Build index:
# docker exec web python manage.py search_index --rebuild
```

```python
# Elasticsearch search view
class ElasticSearchView(APIView):
    permission_classes = []

    def get(self, request):
        q = request.query_params.get('q', '')
        search = ProductDocument.search().query('multi_match', query=q, fields=['name', 'description'])
        results = search.to_queryset()
        return Response(ProductSerializer(results, many=True).data)
```

---

## 12. Celery — Async Tasks

### `apps/notifications/tasks.py`

```python
from celery import shared_task
from django.core.mail import send_mail

@shared_task
def send_order_confirmation_email(user_email, order_id):
    send_mail(
        subject=f'Order #{order_id} Confirmed!',
        message=f'Your order #{order_id} has been placed successfully.',
        from_email='noreply@yourstore.com',
        recipient_list=[user_email],
    )

@shared_task
def send_shipping_notification(user_email, order_id, tracking_info):
    send_mail(
        subject=f'Order #{order_id} Shipped!',
        message=f'Your order is on the way. Tracking: {tracking_info}',
        from_email='noreply@yourstore.com',
        recipient_list=[user_email],
    )

@shared_task
def update_product_ratings(product_id):
    from apps.products.models import Product, Review
    from django.db.models import Avg
    avg = Review.objects.filter(product_id=product_id).aggregate(Avg('rating'))['rating__avg']
    Product.objects.filter(id=product_id).update(rating=avg or 0)
```

### Trigger Tasks

```python
# After order placed:
send_order_confirmation_email.delay(user.email, order.id)

# After review created:
update_product_ratings.delay(product_id)
```

### Scheduled Tasks (Celery Beat)

```python
# config/settings/base.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    'expire-flash-deals': {
        'task': 'apps.wallet.tasks.expire_flash_deals',
        'schedule': crontab(minute='*/30'),  # Every 30 mins
    },
    'daily-analytics-report': {
        'task': 'apps.analytics.tasks.generate_daily_report',
        'schedule': crontab(hour=0, minute=0),  # Midnight
    },
}
```

---

## 13. Email Notifications

Triggered via Celery for:
- Registration welcome email
- Order confirmation
- Shipping notification
- Return approved/rejected
- Password reset
- Flash deal alerts

Use Django's built-in `send_mail` or **django-anymail** for production (SendGrid, Mailgun).

---

## 14. Returns & Refunds

### `apps/returns/models.py`

```python
class ReturnRequest(models.Model):
    STATUS = [('pending','Pending'),('approved','Approved'),('rejected','Rejected'),('refunded','Refunded')]
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
```

### Refund Flow

```
1. User submits return request within 7 days of delivery
2. Manager reviews → approve/reject
3. If approved → Razorpay refund API called OR wallet credited
4. Email sent to user
5. Stock restored if product returned
```

```python
# Razorpay refund
client.payment.refund(payment_id, {'amount': amount_in_paise})
```

---

## 15. Multi-Vendor (Seller)

### `apps/sellers/models.py`

```python
class Seller(models.Model):
    user = models.OneToOneField('users.User', on_delete=models.CASCADE)
    shop_name = models.CharField(max_length=255)
    gst_number = models.CharField(max_length=15, blank=True)
    is_approved = models.BooleanField(default=False)
    commission_rate = models.FloatField(default=10.0)  # %
    bank_account = models.CharField(max_length=20)
    ifsc = models.CharField(max_length=11)
```

### Seller Flow

```
1. User applies as seller → Admin approves
2. Seller lists products (own inventory)
3. Order placed → seller notified via Celery
4. Seller ships → updates tracking
5. Commission deducted on payout
```

---

## 16. Recommendations, Deals, Wallet

### Simple Recommendation (based on category)

```python
def get_recommendations(user):
    # Get categories from user's order history
    ordered_categories = OrderItem.objects.filter(
        order__user=user
    ).values_list('product__category', flat=True).distinct()

    return Product.objects.filter(
        category__in=ordered_categories,
        is_active=True
    ).exclude(
        id__in=OrderItem.objects.filter(order__user=user).values('product')
    ).order_by('-rating')[:10]
```

### Coupons & Flash Deals — `apps/wallet/models.py`

```python
class Coupon(models.Model):
    code = models.CharField(max_length=20, unique=True)
    discount_percent = models.FloatField()
    max_uses = models.PositiveIntegerField()
    used_count = models.PositiveIntegerField(default=0)
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)

class FlashDeal(models.Model):
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    discount_percent = models.FloatField()
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

class Wallet(models.Model):
    user = models.OneToOneField('users.User', on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)

class WalletTransaction(models.Model):
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    type = models.CharField(max_length=10)  # credit / debit
    reason = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
```

---

## 17. Live Order Tracking

### Via OrderTracking Model (Polling)

```python
# GET /api/orders/<id>/track/
class OrderTrackingView(APIView):
    def get(self, request, pk):
        order = Order.objects.get(pk=pk, user=request.user)
        tracking = order.tracking.all().order_by('timestamp')
        return Response(OrderTrackingSerializer(tracking, many=True).data)
```

### Add Tracking Update (Manager/Admin)

```python
class AddTrackingView(APIView):
    permission_classes = [IsManager]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        OrderTracking.objects.create(
            order=order,
            status=request.data['status'],
            description=request.data['description'],
        )
        order.status = request.data['status']
        order.save()
        # Trigger email notification
        send_shipping_notification.delay(order.user.email, order.id, request.data['description'])
        return Response({'message': 'Tracking updated'})
```

> **Real-time (optional later):** Use Django Channels + WebSockets for live push updates without polling.

---

## 18. Analytics

### `apps/analytics/views.py`

```python
class AdminAnalyticsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from django.db.models import Sum, Count
        from django.utils import timezone
        from datetime import timedelta

        last_30 = timezone.now() - timedelta(days=30)

        data = {
            'total_orders': Order.objects.count(),
            'revenue_30d': Order.objects.filter(
                created_at__gte=last_30, status='delivered'
            ).aggregate(Sum('total_amount'))['total_amount__sum'] or 0,
            'new_users_30d': User.objects.filter(date_joined__gte=last_30).count(),
            'top_products': OrderItem.objects.values('product__name').annotate(
                total_sold=Sum('quantity')
            ).order_by('-total_sold')[:5],
        }
        return Response(data)
```

---

## 19. SSL & Security

### Nginx Config — `nginx/nginx.conf`

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location /api/ {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /static/ {
        alias /app/staticfiles/;
    }

    location /media/ {
        alias /app/media/;
    }
}
```

### Get Free SSL (Let's Encrypt)

```bash
# On your server (not Docker):
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Security Checklist

- `DEBUG=False` in production
- `SECRET_KEY` from env, never hardcoded
- `ALLOWED_HOSTS` set
- CORS restricted to known origins
- Rate limiting on login endpoint (use `django-ratelimit`)
- Input validation on all serializers
- SQL injection safe via Django ORM
- File upload validation (Pillow for images)

---

## 20. Frontend Notes

This backend exposes a **REST API**. Connect any frontend:

| Option | When |
|--------|------|
| **Flutter** (mobile) | Android/iOS app |
| **React / Next.js** (web) | Web storefront |
| Both | Full Amazon-like platform |

### API Docs

Auto-generated Swagger docs via `drf-spectacular`:

```python
# config/urls.py
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns += [
    path('api/schema/', SpectacularAPIView.as_view()),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema')),
]
```

Visit `http://localhost:8000/api/docs/` to see all endpoints interactively.

---

## Quick Start

```bash
# Clone & setup
git clone your-repo && cd ecommerce
cp .env.example .env   # fill in values

# Run everything
docker-compose up --build

# Migrations
docker exec web python manage.py migrate

# Create superuser
docker exec -it web python manage.py createsuperuser

# Build search index (if using Elasticsearch)
docker exec web python manage.py search_index --rebuild

# Visit
# API:   http://localhost:8000/api/
# Docs:  http://localhost:8000/api/docs/
# Admin: http://localhost:8000/admin/
```

---

*Build order: Auth → Products → Cart → Orders → Payments → Notifications → Returns → Seller → Analytics → Search → Recommendations*
