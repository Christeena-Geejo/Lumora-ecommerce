import os
from django.core.management.base import BaseCommand
from apps.users.models import User
from apps.sellers.models import Seller
from apps.products.models import Category, Product
from django.utils.text import slugify
from decimal import Decimal

class Command(BaseCommand):
    help = 'Seeds the database with initial users, sellers, categories, and products.'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding data...')
        
        # Disable Elasticsearch autosync temporarily
        from django.conf import settings
        settings.ELASTICSEARCH_DSL_AUTOSYNC = False
        from django_elasticsearch_dsl.registries import registry
        registry.update = lambda *args, **kw: None
        registry.delete = lambda *args, **kw: None

        # 1. Create Users
        User.objects.all().delete()
        
        customer = User.objects.create_user(
            email='customer@lumora.com',
            password='password',
            full_name='Jane Doe',
            role='user'
        )
        manager_user = User.objects.create_user(
            email='manager@lumora.com',
            password='password',
            full_name='Shop Manager',
            role='manager'
        )
        admin = User.objects.create_superuser(
            email='admin@lumora.com',
            password='password',
            full_name='System Admin',
            role='admin'
        )

        # 2. Create Seller
        seller, _ = Seller.objects.get_or_create(
            user=manager_user,
            defaults={
                'shop_name': 'Lumora Boutique',
                'gst_number': '22AAAAA0000A1Z5',
                'commission_rate': Decimal('5.00')
            }
        )

        # 3. Create Categories
        categories = ['Women', 'Men', 'Home & Living', 'Beauty', 'Accessories']
        cat_objects = {}
        for c in categories:
            cat, _ = Category.objects.get_or_create(name=c, slug=slugify(c))
            cat_objects[c] = cat

        # 4. Create Products
        Product.objects.all().delete()

        products_data = [
            {
                'name': 'Sage Green Wrap Dress',
                'description': 'A beautiful sage green wrap dress for any occasion.',
                'price': Decimal('75.00'),
                'discount_price': None,
                'stock': 10,
                'rating': 4.5,
                'category': 'Women',
                'images': [] # We'll skip images for the basic seed or mock it if needed
            },
            {
                'name': 'Luxe Leather Handbag',
                'description': 'Premium leather handbag in tan.',
                'price': Decimal('150.00'),
                'discount_price': Decimal('129.00'),
                'stock': 3,
                'rating': 4.8,
                'category': 'Accessories'
            },
            {
                'name': 'Organic Cotton T-Shirt',
                'description': 'Soft, organic cotton men\'s t-shirt.',
                'price': Decimal('25.00'),
                'discount_price': None,
                'stock': 50,
                'rating': 4.2,
                'category': 'Men'
            },
            {
                'name': 'Ceramic Vase Set',
                'description': 'Set of 3 minimalist ceramic vases.',
                'price': Decimal('45.00'),
                'discount_price': Decimal('35.00'),
                'stock': 12,
                'rating': 4.9,
                'category': 'Home & Living'
            },
            {
                'name': 'Glow Face Serum',
                'description': 'Vitamin C face serum for a radiant glow.',
                'price': Decimal('30.00'),
                'discount_price': None,
                'stock': 20,
                'rating': 4.6,
                'category': 'Beauty'
            }
        ]

        for p in products_data:
            Product.objects.create(
                seller=seller,
                category=cat_objects[p['category']],
                name=p['name'],
                description=p['description'],
                price=p['price'],
                discount_price=p['discount_price'],
                stock=p['stock'],
                rating=p['rating']
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded the database.'))
