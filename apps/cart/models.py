from django.db import models

class Cart(models.Model):
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='cart')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart of {self.user.email}"

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey('products.Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    size = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} in Cart of {self.cart.user.email}"

class Wishlist(models.Model):
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='wishlist')
    products = models.ManyToManyField('products.Product', blank=True)

    def __str__(self):
        return f"Wishlist of {self.user.email}"
