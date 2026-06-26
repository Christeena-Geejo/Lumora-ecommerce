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

        # 4. Clear existing products (no hardcoded items will be seeded)
        Product.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('Successfully cleared products and seeded categories.'))
