from django import forms
from django.contrib import admin
from django.utils.html import format_html
from .models import Category, Product, ProductImage, Review

class ProductAdminForm(forms.ModelForm):
    upload_image = forms.ImageField(required=False, label="Upload Product Image")

    class Meta:
        model = Product
        fields = '__all__'

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    form = ProductAdminForm
    list_display = ('name', 'seller', 'category', 'price', 'stock', 'rating', 'is_active')
    list_filter = ('category', 'is_active', 'seller')
    search_fields = ('name', 'description', 'seller__shop_name')
    
    exclude = ('images',)
    readonly_fields = ('display_images',)

    fields = (
        'seller', 'category', 'name', 'description', 'price', 
        'discount_price', 'stock', 'rating', 'is_active', 
        'display_images', 'upload_image'
    )

    def display_images(self, obj):
        html = ""
        if obj.id:
            for img in obj.images.all():
                if img.image:
                    html += f'<img src="{img.image.url}" style="max-height: 100px; margin-right: 10px; border-radius: 4px;" />'
        return format_html(html) if html else "No images uploaded yet"
    
    display_images.short_description = "Current Images"

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        upload_image = form.cleaned_data.get('upload_image')
        if upload_image:
            img_obj = ProductImage.objects.create(image=upload_image)
            obj.images.add(img_obj)

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'slug')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'image')

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('product', 'user', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
