from rest_framework import serializers
from .models import Category, Product, ProductImage, Review
from apps.sellers.serializers import SellerSerializer

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ('id', 'name', 'parent', 'slug')

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('id', 'image')

class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = Review
        fields = ('id', 'product', 'user_name', 'rating', 'comment', 'created_at')
        read_only_fields = ('id', 'user_name', 'created_at')

class ProductSerializer(serializers.ModelSerializer):
    seller = SellerSerializer(read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    uploaded_image = serializers.ImageField(write_only=True, required=False)

    sizesStock = serializers.JSONField(source='sizes', required=False)

    class Meta:
        model = Product
        fields = (
            'id', 'seller', 'category', 'category_name', 'name', 'description',
            'price', 'discount_price', 'stock', 'loyalty_points', 'sizesStock', 'images', 'uploaded_image', 'rating', 'is_active', 'created_at'
        )
        read_only_fields = ('id', 'rating', 'created_at')

    def create(self, validated_data):
        uploaded_image = validated_data.pop('uploaded_image', None)
        product = Product.objects.create(**validated_data)
        if uploaded_image:
            img_obj = ProductImage.objects.create(image=uploaded_image)
            product.images.add(img_obj)
        return product

    def update(self, instance, validated_data):
        uploaded_image = validated_data.pop('uploaded_image', None)
        instance = super().update(instance, validated_data)
        if uploaded_image:
            img_obj = ProductImage.objects.create(image=uploaded_image)
            instance.images.add(img_obj)
        return instance
