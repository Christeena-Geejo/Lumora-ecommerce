import re
import os

filepath = 'app.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_load_state = """async function loadState() {
  try {
    if (localStorage.getItem("lumora_registeredUsers")) {
      registeredUsers = JSON.parse(localStorage.getItem("lumora_registeredUsers"));
    }
    if (localStorage.getItem("lumora_currentUser")) {
      currentUser = JSON.parse(localStorage.getItem("lumora_currentUser"));
      currentRole = currentUser ? currentUser.role : "user";
      
      const userInDb = registeredUsers.find(u => u.email === currentUser.email);
      if (userInDb) {
        walletBalance = userInDb.walletBalance !== undefined ? userInDb.walletBalance : 0.00;
        walletTransactions = userInDb.walletTransactions || [];
      } else {
        walletBalance = 0.00;
        walletTransactions = [];
      }
    } else {
      currentUser = null;
      currentRole = "user";
      walletBalance = 0.00;
      walletTransactions = [];
    }

    // Fetch products from Real Backend
    try {
      const res = await fetch('http://localhost:8000/api/products/');
      const data = await res.json();
      const apiProducts = data.results || data;
      products.length = 0;
      const mapped = apiProducts.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: parseFloat(p.price),
        discount_price: p.discount_price ? parseFloat(p.discount_price) : null,
        stock: p.stock,
        rating: p.rating,
        category: typeof p.category === 'object' ? p.category.name : p.category,
        image: p.images && p.images.length > 0 ? p.images[0].image : 'assets/handbag.png',
        seller: p.seller || { shop_name: 'Lumora' },
        reviews: 0,
        reviewsList: []
      }));
      products.push(...mapped);
    } catch (e) {
      console.error("Failed to fetch products from backend:", e);
    }

    if (localStorage.getItem("lumora_cart")) cart = JSON.parse(localStorage.getItem("lumora_cart"));
    if (localStorage.getItem("lumora_wishlist")) wishlist = new Set(JSON.parse(localStorage.getItem("lumora_wishlist")));
    if (localStorage.getItem("lumora_discountRate")) discountRate = JSON.parse(localStorage.getItem("lumora_discountRate"));
    if (localStorage.getItem("lumora_appliedCouponCode")) appliedCouponCode = JSON.parse(localStorage.getItem("lumora_appliedCouponCode"));
    
    if (currentUser) {
      currentRole = currentUser.role;
    }
    if (localStorage.getItem("lumora_orders")) orders = JSON.parse(localStorage.getItem("lumora_orders"));
    if (localStorage.getItem("lumora_managerNotifications")) managerNotifications = JSON.parse(localStorage.getItem("lumora_managerNotifications"));

    if (localStorage.getItem("lumora_savedAddresses")) {
      savedAddresses = JSON.parse(localStorage.getItem("lumora_savedAddresses"));
    }
    if (localStorage.getItem("lumora_activeAddressId")) {
      activeAddressId = JSON.parse(localStorage.getItem("lumora_activeAddressId"));
    }
    if (localStorage.getItem("lumora_shippingAddress")) {
      shippingAddress = JSON.parse(localStorage.getItem("lumora_shippingAddress"));
    }
    if (localStorage.getItem("lumora_selectedPaymentMethod")) selectedPaymentMethod = JSON.parse(localStorage.getItem("lumora_selectedPaymentMethod"));
  } catch (e) {
    console.error("Error loading state:", e);
  }
}"""

content = re.sub(r'function loadState\(\) \{.*?\n\}', new_load_state, content, flags=re.DOTALL)

content = content.replace('function handleRoute() {', 'async function handleRoute() {')
content = content.replace('loadState();', 'await loadState();')

# Ensure window listeners use async handleRoute properly
content = content.replace("window.addEventListener('hashchange', handleRoute);", "window.addEventListener('hashchange', async () => { await handleRoute(); });")
content = content.replace("window.addEventListener('load', handleRoute);", "window.addEventListener('load', async () => { await handleRoute(); });")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Rewrite complete!")
