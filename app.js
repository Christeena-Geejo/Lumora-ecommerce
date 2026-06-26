// Custom Toast Alert Override to replace blocking browser alert dialogs
window.alert = function(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    container.style.maxWidth = '320px';
    container.style.pointerEvents = 'none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.style.backgroundColor = 'var(--color-primary, #1e3e35)';
  toast.style.color = '#ffffff';
  toast.style.padding = '12px 20px';
  toast.style.borderRadius = '8px';
  toast.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
  toast.style.fontFamily = 'var(--font-body, sans-serif)';
  toast.style.fontSize = '13px';
  toast.style.fontWeight = '600';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(20px)';
  toast.style.transition = 'all 0.3s ease';
  toast.style.pointerEvents = 'auto';
  
  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes('sorry') || lowerMessage.includes('error') || lowerMessage.includes('invalid') || lowerMessage.includes('insufficient') || lowerMessage.includes('required')) {
    toast.style.backgroundColor = '#c0392b';
  } else if (lowerMessage.includes('warning') || lowerMessage.includes('attention')) {
    toast.style.backgroundColor = '#e67e22';
  }

  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
};

const products = [];

// 2. STATE VARIABLES
let cart = [];
let wishlist = new Set();
let discountRate = 0.0;
let appliedCouponCode = "";
let currentRole = "user"; // user, seller, manager, admin
let walletBalance = 0.00; // Default funds
let walletTransactions = [];
let orders = [];
let savedAddresses = [];
let activeAddressId = null;
let shippingAddress = {
  line1: "",
  city: "",
  state: "",
  pincode: ""
};
let selectedPaymentMethod = "wallet";
let managerNotifications = [];
let activeManagerTab = "listings"; // listings, orders, alerts

// Multi-role Auth & Products Catalog State
let registeredUsers = [
  { 
    name: "Jane Doe", 
    email: "customer@lumora.com", 
    password: "password", 
    role: "user",
    walletBalance: 0.00,
    walletTransactions: []
  },
  { 
    name: "Shop Manager", 
    email: "manager@lumora.com", 
    password: "password", 
    role: "manager", 
    shopName: "Lumora Boutique",
    walletBalance: 0.00,
    walletTransactions: []
  },
  { 
    name: "System Admin", 
    email: "admin@lumora.com", 
    password: "password", 
    role: "admin",
    walletBalance: 0.00,
    walletTransactions: []
  }
];
let currentUser = null; // Currently logged in user object

// Search Filters State
let filterCategory = "all";
let filterMinPrice = "";
let filterMaxPrice = "";
let filterMinRating = 0;
let sortOption = "featured";

// 3. PERSISTENCE LAYER
function saveState() {
  if (currentUser) {
    let userInDb = registeredUsers.find(u => u.email === currentUser.email);
    if (!userInDb) {
      userInDb = {
        name: currentUser.name || currentUser.full_name || "Lumora Shopper",
        email: currentUser.email,
        role: currentUser.role || "user",
        walletBalance: walletBalance,
        walletTransactions: walletTransactions,
        shopName: currentUser.shopName
      };
      registeredUsers.push(userInDb);
      localStorage.setItem("lumora_registeredUsers", JSON.stringify(registeredUsers));
    } else {
      userInDb.walletBalance = walletBalance;
      userInDb.walletTransactions = walletTransactions;
      if (currentUser.shopName) {
        userInDb.shopName = currentUser.shopName;
      }
    }
    currentUser.walletBalance = walletBalance;
    currentUser.walletTransactions = walletTransactions;
    localStorage.setItem("lumora_currentUser", JSON.stringify(currentUser));
  }
  localStorage.setItem("lumora_products_full", JSON.stringify(products));
  localStorage.setItem("lumora_cart", JSON.stringify(cart));
  localStorage.setItem("lumora_wishlist", JSON.stringify(Array.from(wishlist)));
  localStorage.setItem("lumora_discountRate", JSON.stringify(discountRate));
  localStorage.setItem("lumora_appliedCouponCode", JSON.stringify(appliedCouponCode));
  localStorage.setItem("lumora_currentRole", JSON.stringify(currentRole));
  localStorage.setItem("lumora_walletBalance", JSON.stringify(walletBalance));
  localStorage.setItem("lumora_walletTransactions", JSON.stringify(walletTransactions));
  localStorage.setItem("lumora_orders", JSON.stringify(orders));
  localStorage.setItem("lumora_savedAddresses", JSON.stringify(savedAddresses));
  localStorage.setItem("lumora_activeAddressId", JSON.stringify(activeAddressId));
  localStorage.setItem("lumora_shippingAddress", JSON.stringify(shippingAddress));
  localStorage.setItem("lumora_selectedPaymentMethod", JSON.stringify(selectedPaymentMethod));
  localStorage.setItem("lumora_registeredUsers", JSON.stringify(registeredUsers));
  localStorage.setItem("lumora_currentUser", JSON.stringify(currentUser));
  localStorage.setItem("lumora_managerNotifications", JSON.stringify(managerNotifications));
}

function addManagerNotification(shopName, message, type = "info") {
  managerNotifications.unshift({
    id: Date.now() + Math.random(),
    shopName: shopName,
    message: message,
    type: type,
    timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    read: false
  });
  saveState();
}

async function loadState() {
  try {
    if (localStorage.getItem("lumora_registeredUsers")) {
      registeredUsers = JSON.parse(localStorage.getItem("lumora_registeredUsers"));
    }
    if (localStorage.getItem("lumora_currentUser")) {
      currentUser = JSON.parse(localStorage.getItem("lumora_currentUser"));
      if (currentUser && !currentUser.name && currentUser.full_name) {
        currentUser.name = currentUser.full_name;
      }
      currentRole = currentUser ? currentUser.role : "user";
      
      const userInDb = registeredUsers.find(u => u.email === currentUser.email);
      if (userInDb) {
        walletBalance = userInDb.walletBalance !== undefined ? userInDb.walletBalance : 0.00;
        walletTransactions = userInDb.walletTransactions || [];
        if (userInDb.shopName) {
          currentUser.shopName = userInDb.shopName;
        }
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

    // Fetch products from Real Backend and merge with local modifications
    try {
      const res = await fetch('http://localhost:8000/api/products/');
      const data = await res.json();
      const apiProducts = data.results || data;

      // Load existing local products from localStorage if present
      let localProducts = [];
      if (localStorage.getItem("lumora_products_full")) {
        localProducts = JSON.parse(localStorage.getItem("lumora_products_full"));
      }

      const mapped = apiProducts.map(p => {
        // Look up if we have local overrides (e.g. stock decremented by orders, manager stock saves)
        const localCopy = localProducts.find(lp => lp.id === p.id);
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          price: localCopy ? localCopy.price : parseFloat(p.price),
          discount_price: p.discount_price ? parseFloat(p.discount_price) : null,
          stock: localCopy ? localCopy.stock : p.stock,
          rating: localCopy ? localCopy.rating : p.rating,
          category: typeof p.category === 'object' ? p.category.name : p.category,
          image: p.images && p.images.length > 0 ? p.images[0].image : 'assets/handbag.png',
          seller: p.seller || { shop_name: 'Lumora' },
          reviews: localCopy ? localCopy.reviews : 0,
          reviewsList: localCopy ? localCopy.reviewsList || [] : []
        };
      });

      // Filter out products from localProducts that are purely local (e.g. manager added products not in Django API)
      const apiIds = new Set(apiProducts.map(p => p.id));
      const purelyLocal = localProducts.filter(lp => !apiIds.has(lp.id));

      products.length = 0;
      products.push(...mapped);
      products.push(...purelyLocal);
      
      // Update local storage to keep state in sync
      localStorage.setItem("lumora_products_full", JSON.stringify(products));
    } catch (e) {
      console.error("Failed to fetch products from backend:", e);
      if (localStorage.getItem("lumora_products_full")) {
        const loaded = JSON.parse(localStorage.getItem("lumora_products_full"));
        products.length = 0;
        products.push(...loaded);
      }
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
}

// 4. CLIENT ROUTER
async function handleRoute() {
  await loadState();
  updateHeaderCounters();
  
  const hash = window.location.hash || '#/';
  
  // Hide all page views
  document.querySelectorAll('.page-view').forEach(view => {
    view.style.display = 'none';
  });

  // Remove active state from header links
  document.querySelectorAll('nav .nav-link').forEach(link => {
    link.classList.remove('active');
  });

  // Route routing checks
  if (hash === '#/' || hash === '') {
    document.getElementById('view-home').style.display = 'block';
    document.getElementById('nav-link-home').classList.add('active');
    renderHome();
  } 
  else if (hash.startsWith('#/search')) {
    document.getElementById('view-search').style.display = 'block';
    document.getElementById('nav-link-shop').classList.add('active');
    parseSearchRouteParams(hash);
    renderSearch();
  } 
  else if (hash.startsWith('#/product')) {
    document.getElementById('view-product').style.display = 'block';
    parseProductRouteParams(hash);
  } 
  else if (hash === '#/cart') {
    document.getElementById('view-cart').style.display = 'block';
    renderCartPage();
  } 
  else if (hash.startsWith('#/checkout')) {
    if (!currentUser) {
      window.location.hash = '#/account';
      return;
    }
    document.getElementById('view-checkout').style.display = 'block';
    parseCheckoutRouteParams(hash);
  } 
  else if (hash.startsWith('#/confirmation')) {
    if (!currentUser) {
      window.location.hash = '#/account';
      return;
    }
    document.getElementById('view-confirmation').style.display = 'block';
    parseConfirmationRouteParams(hash);
  } 
  else if (hash === '#/orders') {
    if (!currentUser) {
      window.location.hash = '#/account';
      return;
    }
    document.getElementById('view-orders').style.display = 'block';
    document.getElementById('nav-link-orders').classList.add('active');
    renderOrdersPage();
  } 
  else if (hash === '#/wallet') {
    if (!currentUser) {
      window.location.hash = '#/account';
      return;
    }
    document.getElementById('view-wallet').style.display = 'block';
    document.getElementById('nav-link-wallet').classList.add('active');
    renderWalletPage();
  }
  else if (hash === '#/account') {
    document.getElementById('view-account').style.display = 'block';
    renderAccountPage();
  }
  else if (hash === '#/wishlist') {
    document.getElementById('view-wishlist').style.display = 'block';
    renderWishlistPage();
  }
}

// Listen to Hash Changes
window.addEventListener('hashchange', async () => { await handleRoute(); });
window.addEventListener('load', async () => { await handleRoute(); });

// 5. VIEW RENDERERS & EVENT HANDLERS

// --- HEADER UTILS ---
function updateHeaderCounters() {
  const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById('cart-badge').textContent = totalQty;
  const wlBadge = document.getElementById('wishlist-badge');
  if (wlBadge) wlBadge.textContent = wishlist.size;
  const userRoleBadge = document.getElementById('nav-user-role');
  if (userRoleBadge) {
    userRoleBadge.textContent = currentRole.charAt(0).toUpperCase() + currentRole.slice(1);
  }
  
  // Hide orders and wallet nav links when guest
  const ordersLink = document.getElementById('nav-link-orders');
  const walletLink = document.getElementById('nav-link-wallet');
  if (ordersLink) {
    ordersLink.style.display = currentUser ? 'inline-block' : 'none';
  }
  if (walletLink) {
    walletLink.style.display = currentUser ? 'inline-block' : 'none';
  }
  
  // Update header login status display badge
  const statusContainer = document.getElementById('header-user-status-container');
  if (statusContainer) {
    if (currentUser) {
      const displayRole = currentUser.role === 'user' ? 'Customer' : (currentUser.role === 'manager' ? 'Manager' : 'Admin');
      statusContainer.innerHTML = `<span class="header-user-status">${currentUser.name} (${displayRole})</span>`;
    } else {
      statusContainer.innerHTML = `<span class="header-user-status" style="background-color:#edeae5; color:var(--color-text-muted);">Sign In</span>`;
    }
  }
}

function executeGlobalSearch() {
  const query = document.getElementById('global-search-input').value.trim();
  const cat = document.getElementById('search-category-select').value;
  window.location.hash = `#/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(cat)}`;
}

// Bind search input Enter key
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('global-search-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      executeGlobalSearch();
    }
  });
});

// --- HOME VIEW ---
function renderHome() {
  const homeGrid = document.getElementById('home-new-arrivals-grid');
  if (!homeGrid) return;

  // Render first 4 approved products as new arrivals, newest first
  const approvedList = products.filter(p => !p.status || p.status === "Approved").sort((a, b) => b.id - a.id);
  homeGrid.innerHTML = approvedList.slice(0, 4).map(product => renderProductCardHTML(product)).join('');
}

function renderProductCardHTML(product) {
  const stars = Array(5).fill(0).map((_, i) => {
    const isFilled = i < Math.floor(product.rating);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="${isFilled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  }).join('');

  const priceHTML = product.discount_price 
    ? `<span class="discounted">₹${product.discount_price.toFixed(2)}</span><span class="original">₹${product.price.toFixed(2)}</span>`
    : `<span>₹${product.price.toFixed(2)}</span>`;

  const isWishlisted = wishlist.has(product.id) ? 'active' : '';
  const wishlistFill = wishlist.has(product.id) ? 'currentColor' : 'none';

  let stockBadgeHTML = '';
  let quickAddHTML = `<button class="quick-add-btn" onclick="event.stopPropagation(); addToCart(${product.id})">Add to Bag</button>`;

  if (product.stock === 0) {
    stockBadgeHTML = `<span class="stock-badge out-of-stock">Currently Unavailable</span>`;
    quickAddHTML = `<button class="quick-add-btn disabled" disabled onclick="event.stopPropagation()">Out of Stock</button>`;
  } else if (product.stock <= 5) {
    stockBadgeHTML = `<span class="stock-badge low-stock">Only ${product.stock} left!</span>`;
  }

  return `
    <div class="product-card" id="product-${product.id}">
      <div class="product-img-container" onclick="window.location.hash = '#/product?id=${product.id}'">
        <img src="${product.image}" alt="${product.name}">
        <button class="wishlist-btn ${isWishlisted}" onclick="event.stopPropagation(); toggleWishlist(${product.id})" title="Add to Wishlist">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="${wishlistFill}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
        </button>
        ${quickAddHTML}
      </div>
      <div class="product-details" onclick="window.location.hash = '#/product?id=${product.id}'" style="cursor: pointer;">
        <div class="product-rating">
          ${stars}
          <span style="color: var(--color-text-muted); margin-left: 4px;">(${product.reviews})</span>
        </div>
        <h3 class="product-title">${product.name}</h3>
        <div class="product-price">${priceHTML}</div>
        <div style="margin-top: 4px;">${stockBadgeHTML}</div>
      </div>
    </div>
  `;
}

// --- SEARCH VIEW ---
function parseSearchRouteParams(hash) {
  const urlParams = new URLSearchParams(hash.slice(hash.indexOf('?')));
  filterCategory = urlParams.get('category') || 'all';
  const query = urlParams.get('q') || '';
  const sort = urlParams.get('sort') || 'featured';
  
  document.getElementById('global-search-input').value = query;
  document.getElementById('search-category-select').value = filterCategory;
  
  const sortSelect = document.getElementById('search-sort-select');
  if (sortSelect) {
    sortSelect.value = sort;
  }
  sortOption = sort;
  
  // Set active link in sidebar
  document.querySelectorAll('.filter-links-list a').forEach(link => {
    link.classList.remove('active');
  });
  
  let targetLinkId = 'filter-cat-all';
  if (filterCategory === 'Women') targetLinkId = 'filter-cat-Women';
  else if (filterCategory === 'Men') targetLinkId = 'filter-cat-Men';
  else if (filterCategory === 'Home & Living') targetLinkId = 'filter-cat-Home';
  else if (filterCategory === 'Beauty') targetLinkId = 'filter-cat-Beauty';
  else if (filterCategory === 'Accessories') targetLinkId = 'filter-cat-Accessories';
  
  const linkNode = document.getElementById(targetLinkId);
  if (linkNode) linkNode.classList.add('active');
}

function applyFilters() {
  filterMinPrice = document.getElementById('filter-price-min').value;
  filterMaxPrice = document.getElementById('filter-price-max').value;
  renderSearch();
}

function setRatingFilter(minStars) {
  filterMinRating = minStars;
  
  // Style active rating button
  document.querySelectorAll('.rating-filter-item').forEach(btn => {
    btn.classList.remove('active');
  });
  renderSearch();
}

function applySort() {
  sortOption = document.getElementById('search-sort-select').value;
  renderSearch();
}

function renderSearch() {
  const searchGrid = document.getElementById('search-results-grid');
  if (!searchGrid) return;

  const query = document.getElementById('global-search-input').value.toLowerCase().trim();

  // 1. Filter Products
  let filtered = products.filter(product => {
    // Only display approved products
    if (product.status && product.status !== "Approved") return false;

    // Category match
    if (filterCategory !== 'all' && product.category !== filterCategory) return false;
    
    // Search query match
    if (query !== '' && !product.name.toLowerCase().includes(query) && !product.description.toLowerCase().includes(query)) return false;
    
    // Price match
    const price = product.discount_price ? product.discount_price : product.price;
    if (filterMinPrice !== '' && price < parseFloat(filterMinPrice)) return false;
    if (filterMaxPrice !== '' && price > parseFloat(filterMaxPrice)) return false;
    
    // Rating match
    if (product.rating < filterMinRating) return false;
    
    return true;
  });

  // 2. Sort Products
  if (sortOption === 'price-low') {
    filtered.sort((a, b) => (a.discount_price || a.price) - (b.discount_price || b.price));
  } else if (sortOption === 'price-high') {
    filtered.sort((a, b) => (b.discount_price || b.price) - (a.discount_price || a.price));
  } else if (sortOption === 'rating') {
    filtered.sort((a, b) => b.rating - a.rating);
  } else if (sortOption === 'newest') {
    filtered.sort((a, b) => b.id - a.id);
  }

  // 3. Render Grid
  document.getElementById('search-results-count').textContent = `Found ${filtered.length} products matching filters`;
  
  if (filtered.length === 0) {
    searchGrid.innerHTML = `<div class="no-results-alert">No products found matching your search criteria. Try removing filters.</div>`;
  } else {
    searchGrid.innerHTML = filtered.map(product => renderProductCardHTML(product)).join('');
  }
}

// --- PRODUCT DETAIL VIEW ---
function parseProductRouteParams(hash) {
  const urlParams = new URLSearchParams(hash.slice(hash.indexOf('?')));
  const id = parseInt(urlParams.get('id') || '0');
  renderProductDetail(id);
}

function renderProductDetail(id) {
  const container = document.getElementById('product-detail-container');
  if (!container) return;
  try {

  const product = products.find(p => p.id === id);
  if (!product) {
    container.innerHTML = `<div>Product not found.</div>`;
    return;
  }

  // Pending product authorization check
  if (product.status && product.status === "Pending") {
    const isSeller = currentUser && currentUser.role === "manager" && currentUser.shopName === product.seller.shop_name;
    const isAdmin = currentUser && currentUser.role === "admin";
    if (!isSeller && !isAdmin) {
      container.innerHTML = `
        <div class="auth-container" style="text-align:center; max-width: 500px;">
          <h3 style="color:#d9534f; font-family:var(--font-heading); font-size:24px; margin-bottom:12px;">Access Denied</h3>
          <p style="font-size:14px; color:var(--color-text-muted);">This product is currently pending administrative approval and is not visible to customers.</p>
          <a href="#/" class="btn-primary" style="display:inline-block; margin-top:16px; padding:10px 20px; border-radius:8px;">Back to Home</a>
        </div>
      `;
      return;
    }
  }

  const stars = Array(5).fill(0).map((_, i) => {
    const isFilled = i < Math.floor(product.rating);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isFilled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
  }).join('');

  const priceHTML = product.discount_price 
    ? `<span class="discounted">₹${product.discount_price.toFixed(2)}</span><span class="original">₹${product.price.toFixed(2)}</span>`
    : `<span>₹${product.price.toFixed(2)}</span>`;

  // Dynamic stock calculations
  let stockStatusHTML = '';
  let qtySelectDisabled = '';
  let qtyOptionsHTML = '';
  let buyActionsHTML = '';
  let sizePickerHTML = '';

  if (product.stock === 0) {
    stockStatusHTML = `
      <div class="stock-badge out-of-stock" style="font-size:12px; padding:6px 12px; width:100%; justify-content:center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        Currently Unavailable
      </div>`;
    qtySelectDisabled = 'disabled';
    qtyOptionsHTML = `<option value="0">0</option>`;
    buyActionsHTML = `
      <button class="btn-buybox-add disabled" disabled style="width:100%; text-align:center;">Out of Stock</button>
    `;
  } else {
    if (product.stock <= 5) {
      stockStatusHTML = `
        <div class="stock-badge low-stock" style="font-size:12px; padding:6px 12px; width:100%; justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          Only ${product.stock} left in stock - order soon!
        </div>`;
    } else {
      stockStatusHTML = `
        <div class="stock-badge in-stock" style="font-size:12px; padding:6px 12px; width:100%; justify-content:center;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          In Stock
        </div>`;
    }
    
    if (product.sizesStock && Object.keys(product.sizesStock).length > 0) {
      if (product.sizesStock.freesize !== undefined) {
        sizePickerHTML = `
          <div class="buy-box-size" style="margin-bottom: 12px;">
            <span style="font-size: 13px; color: var(--color-text-muted);">Size: <strong>Free Size</strong></span>
            <input type="hidden" id="selected-product-size" value="freesize">
          </div>
        `;
      } else {
        sizePickerHTML = `
          <div class="buy-box-size" style="margin-bottom: 12px;">
            <label style="font-weight: 600; display: block; margin-bottom: 6px; font-size: 13px;">Select Size:</label>
            <div style="display: flex; gap: 8px;" id="buy-box-size-picker">
              ${['XS', 'S', 'M', 'L', 'XL'].map(size => {
                const sizeStock = product.sizesStock[size] || 0;
                const isDisabled = sizeStock === 0;
                return `
                  <button 
                    type="button" 
                    class="size-picker-btn ${isDisabled ? 'disabled' : ''}" 
                    onclick="selectProductSize(this, '${size}', ${sizeStock})" 
                    ${isDisabled ? 'disabled' : ''}
                    style="
                      padding: 6px 12px; 
                      border: 1px solid ${isDisabled ? '#eee' : 'var(--color-border, #ddd)'}; 
                      border-radius: 4px; 
                      background: ${isDisabled ? '#fafafa' : '#fff'}; 
                      color: ${isDisabled ? '#ccc' : 'var(--color-text, #333)'}; 
                      font-weight: 600; 
                      cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
                      transition: all 0.2s ease;
                    "
                  >${size}</button>
                `;
              }).join('')}
            </div>
            <input type="hidden" id="selected-product-size" value="">
          </div>
        `;
      }
    }

    if (product.sizesStock && Object.keys(product.sizesStock).length > 0 && product.sizesStock.freesize === undefined) {
      qtySelectDisabled = 'disabled';
      qtyOptionsHTML = `<option value="0">0</option>`;
    } else {
      const maxQty = Math.min(product.stock, 5);
      const opts = [];
      for (let i = 1; i <= maxQty; i++) {
        opts.push(`<option value="${i}">${i}</option>`);
      }
      qtyOptionsHTML = opts.join('');
    }

    buyActionsHTML = `
      <button onclick="addProductFromBuyBoxToCart(${product.id})" class="btn-buybox-add">Add to Cart</button>
      <button onclick="buyNowFromBuyBox(${product.id})" class="btn-buybox-buy">Buy Now</button>
    `;
  }

  const isWishlisted = wishlist.has(product.id) ? 'active' : '';
  const wishlistText = wishlist.has(product.id) ? 'Saved in Wishlist' : 'Add to Wishlist';

  // Dynamic reviews HTML rendering
  const reviewsList = product.reviewsList || [];
  const reviewsHTML = reviewsList.length === 0 
    ? `<p style="font-size:14px; color:var(--color-text-muted);">No reviews yet. Be the first to review this product!</p>`
    : reviewsList.map(r => {
        const rStars = Array(5).fill(0).map((_, idx) => {
          const isFilled = idx < r.rating;
          return `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="${isFilled ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="color:var(--color-secondary);"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;
        }).join('');
        return `
          <div class="review-item" style="border-bottom:1px solid var(--color-border); padding: 12px 0;">
            <div class="review-meta" style="display:flex; justify-content:space-between; margin-bottom:4px; font-size:13px; font-weight:600;">
              <strong>${r.author}</strong>
              <span style="font-weight:400; color:var(--color-text-muted);">${r.date}</span>
            </div>
            <div style="margin-bottom:6px; display:flex; gap:2px;">${rStars}</div>
            <p style="font-size:13px; color:var(--color-text);">${r.comment}</p>
          </div>
        `;
      }).join('');

  const reviewFormHTML = `
    <div class="write-review-box">
      <h4>Write a Customer Review</h4>
      <div class="form-group" style="margin-bottom:12px;">
        <label for="review-author" style="font-weight:600; display:block; margin-bottom:4px; font-size:13px;">Your Name</label>
        <input type="text" id="review-author" placeholder="Jane Doe" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--color-border); font-family:var(--font-body); font-size:13px;">
      </div>
      <div class="form-group" style="margin-bottom:12px;">
        <label style="font-weight:600; display:block; margin-bottom:4px; font-size:13px;">Select Rating</label>
        <div class="star-rating-select" id="review-rating-select" style="display:flex; gap:6px;">
          <span class="star-rating-btn" data-val="1" style="font-size:24px; cursor:pointer; user-select:none;">★</span>
          <span class="star-rating-btn" data-val="2" style="font-size:24px; cursor:pointer; user-select:none;">★</span>
          <span class="star-rating-btn" data-val="3" style="font-size:24px; cursor:pointer; user-select:none;">★</span>
          <span class="star-rating-btn" data-val="4" style="font-size:24px; cursor:pointer; user-select:none;">★</span>
          <span class="star-rating-btn" data-val="5" style="font-size:24px; cursor:pointer; user-select:none;">★</span>
        </div>
        <input type="hidden" id="review-rating-val" value="5">
      </div>
      <div class="form-group" style="margin-bottom:16px;">
        <label for="review-comment" style="font-weight:600; display:block; margin-bottom:4px; font-size:13px;">Review Comments</label>
        <textarea id="review-comment" rows="3" placeholder="What did you like or dislike about this product?" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--color-border); font-family:var(--font-body); font-size:13px; resize:vertical;"></textarea>
      </div>
      <button onclick="submitProductReview(${product.id})" class="btn-primary" style="padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; display:inline-block;">Submit Review</button>
    </div>
  `;

  container.innerHTML = `
    <!-- Product detail columns -->
    <div class="product-detail-info-col">
      <div class="detail-breadcrumbs">
        <a href="#/">Home</a> &gt; <a href="#/search?category=${encodeURIComponent(product.category)}">${product.category}</a> &gt; <span>${product.name}</span>
      </div>
      
      <div class="detail-gallery-main">
        <img src="${product.image}" alt="${product.name}">
      </div>
      
      <h1 class="detail-title">${product.name}</h1>
      <div class="detail-rating-row">
        <div class="detail-stars">${stars}</div>
        <span class="detail-reviews-count">${Number(product.rating || 0).toFixed(1)} out of 5.0 (${product.reviews} reviews)</span>
      </div>

      <div class="detail-divider"></div>
      
      <h3 style="font-family:var(--font-heading); font-size:24px; margin-bottom:12px;">Product Details</h3>
      <p class="detail-description-text">${product.description}</p>
      
      <div class="detail-divider"></div>

      <!-- Seller credentials -->
      <div class="detail-seller-box">
        <div class="seller-box-title">Seller Information</div>
        <p><strong>Merchant Shop:</strong> ${product.seller.shop_name}</p>
        <p><strong>Government GSTIN:</strong> ${product.seller.gst_number}</p>
        <p><strong>Platform Fee / Commission:</strong> ${product.seller.commission_rate}% on sales payouts</p>
        ${currentUser && currentUser.role === 'user' ? `<button onclick="toggleCustomerChat(${product.seller.id}, null, ${product.id})" class="btn-outline" style="margin-top: 12px; width: 100%;">Chat with ${product.seller.shop_name}</button>` : ''}
      </div>

      <div class="detail-divider"></div>

      <!-- Reviews column -->
      <h3 style="font-family:var(--font-heading); font-size:24px; margin-bottom:24px;">Customer Reviews</h3>
      <div class="detail-reviews-list">
        ${reviewsHTML}
      </div>
      
      <!-- Review Writer Block -->
      ${reviewFormHTML}
    </div>

    <!-- Buy Box column (Amazon Style Sidebar) -->
    <div class="product-buy-box-col">
      <div class="buy-box-card">
        <div class="buy-box-price">${priceHTML}</div>
        <p class="buy-box-shipping"><strong>FREE delivery</strong> in 2-3 business days on orders over ₹50.</p>
        
        <div style="margin:16px 0;">
          ${stockStatusHTML}
        </div>

        ${sizePickerHTML}

        <div class="buy-box-qty">
          <label for="buy-box-qty-select">Quantity:</label>
          <select id="buy-box-qty-select" ${qtySelectDisabled}>
            ${qtyOptionsHTML}
          </select>
        </div>

        <div class="buy-box-actions">
          ${buyActionsHTML}
        </div>

        <div class="detail-divider" style="margin:16px 0;"></div>
        
        <p style="font-size:12px; color:var(--color-text-muted);">
          <strong>Ships from:</strong> Lumora Warehouse<br>
          <strong>Sold by:</strong> ${product.seller.shop_name}
        </p>

        <button onclick="toggleDetailWishlist(${product.id})" class="btn-buybox-wishlist ${isWishlisted}">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${wishlist.has(product.id) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span>${wishlistText}</span>
        </button>
      </div>
    </div>
  `;
  } catch (err) {
    container.innerHTML = '<div style="color:red; padding: 20px;">ERROR: ' + err.message + '<br><pre>' + err.stack + '</pre></div>';
  }
  setupReviewRatingSelector();
}

function selectProductSize(btn, size, stock) {
  // Deselect other buttons
  const buttons = btn.parentElement.querySelectorAll('.size-picker-btn');
  buttons.forEach(b => {
    b.style.backgroundColor = '#fff';
    b.style.color = 'var(--color-text, #333)';
    b.style.borderColor = 'var(--color-border, #ddd)';
  });
  // Select this button
  btn.style.backgroundColor = 'var(--color-primary, #2a433a)';
  btn.style.color = '#fff';
  btn.style.borderColor = 'var(--color-primary, #2a433a)';
  
  const hiddenInput = document.getElementById('selected-product-size');
  if (hiddenInput) hiddenInput.value = size;
  
  // Dynamically adjust quantity options
  const qtySelect = document.getElementById('buy-box-qty-select');
  if (qtySelect) {
    const maxQty = Math.min(stock, 5);
    qtySelect.innerHTML = '';
    if (maxQty === 0) {
      qtySelect.innerHTML = '<option value="0">0</option>';
      qtySelect.disabled = true;
    } else {
      qtySelect.disabled = false;
      for (let i = 1; i <= maxQty; i++) {
        const opt = document.createElement('option');
        opt.value = i;
        opt.textContent = i;
        qtySelect.appendChild(opt);
      }
    }
  }
}

// --- REVIEW HELPERS ---
function setupReviewRatingSelector() {
  const ratingSelect = document.getElementById('review-rating-select');
  if (!ratingSelect) return;
  const stars = ratingSelect.querySelectorAll('.star-rating-btn');
  const ratingInput = document.getElementById('review-rating-val');
  if (!ratingInput) return;

  function updateStars(val) {
    stars.forEach((star, idx) => {
      if (idx < val) {
        star.style.color = 'var(--color-secondary)';
        star.classList.add('active');
      } else {
        star.style.color = '#ccc';
        star.classList.remove('active');
      }
    });
  }

  stars.forEach((star, idx) => {
    const val = idx + 1;
    star.addEventListener('click', (e) => {
      e.preventDefault();
      ratingInput.value = val;
      updateStars(val);
    });
    star.addEventListener('mouseenter', () => {
      updateStars(val);
    });
  });

  ratingSelect.addEventListener('mouseleave', () => {
    const currentVal = parseInt(ratingInput.value) || 5;
    updateStars(currentVal);
  });

  updateStars(parseInt(ratingInput.value) || 5);
}

function submitProductReview(productId) {
  const authorInput = document.getElementById('review-author');
  const commentInput = document.getElementById('review-comment');
  const ratingInput = document.getElementById('review-rating-val');
  
  if (!authorInput || !commentInput) return;
  const author = authorInput.value.trim();
  const comment = commentInput.value.trim();
  const rating = parseInt(ratingInput.value || '5');
  
  if (!author || !comment) {
    alert("Please fill in both your name and review comments.");
    return;
  }
  
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  if (!product.reviewsList) product.reviewsList = [];
  
  const newReview = {
    author: author,
    comment: comment,
    rating: rating,
    date: new Date().toISOString().slice(0, 10)
  };
  
  product.reviewsList.push(newReview);
  
  // Recalculate average rating
  const totalRating = product.reviewsList.reduce((sum, r) => sum + r.rating, 0);
  product.rating = totalRating / product.reviewsList.length;
  product.reviews = product.reviewsList.length;
  
  saveState();
  renderProductDetail(productId);
  alert("Thank you! Your review has been posted.");
}

function addProductFromBuyBoxToCart(productId) {
  const qtySelect = document.getElementById('buy-box-qty-select');
  const qty = parseInt(qtySelect.value);
  
  const sizeInput = document.getElementById('selected-product-size');
  const size = sizeInput ? sizeInput.value : null;

  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (product.sizesStock && Object.keys(product.sizesStock).length > 0 && !size) {
    alert("Please select a size before adding to cart.");
    return;
  }

  if (product.stock === 0) {
    alert("Sorry, this product is currently out of stock.");
    return;
  }

  const stockLimit = (product.sizesStock && size && product.sizesStock[size] !== undefined) ? product.sizesStock[size] : product.stock;

  const cartItem = cart.find(item => item.product.id === productId && item.size === size);
  const currentQty = cartItem ? cartItem.quantity : 0;
  if (currentQty + qty > stockLimit) {
    alert(`Sorry, you cannot purchase more than ${stockLimit} items of this size. You already have ${currentQty} in your cart.`);
    return;
  }

  if (cartItem) {
    cartItem.quantity += qty;
  } else {
    cart.push({ product, quantity: qty, size: size });
  }

  saveState();
  updateHeaderCounters();
  alert(`Added ${qty}x ${product.name}${size ? ' (Size: ' + size + ')' : ''} to your cart.`);
}

function buyNowFromBuyBox(productId) {
  const qtySelect = document.getElementById('buy-box-qty-select');
  const qty = parseInt(qtySelect.value);
  
  const sizeInput = document.getElementById('selected-product-size');
  const size = sizeInput ? sizeInput.value : null;

  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (product.sizesStock && Object.keys(product.sizesStock).length > 0 && !size) {
    alert("Please select a size before buying.");
    return;
  }

  if (product.stock === 0) {
    alert("Sorry, this product is currently out of stock.");
    return;
  }

  const stockLimit = (product.sizesStock && size && product.sizesStock[size] !== undefined) ? product.sizesStock[size] : product.stock;

  if (qty > stockLimit) {
    alert(`Sorry, you cannot purchase more than ${stockLimit} items of this size.`);
    return;
  }

  const cartItem = cart.find(item => item.product.id === productId && item.size === size);
  if (cartItem) {
    cartItem.quantity = qty; 
  } else {
    cart.push({ product, quantity: qty, size: size });
  }

  saveState();
  updateHeaderCounters();
  window.location.hash = `#/checkout?step=shipping`;
}

function toggleDetailWishlist(productId) {
  if (wishlist.has(productId)) {
    wishlist.delete(productId);
  } else {
    wishlist.add(productId);
  }
  saveState();
  renderProductDetail(productId);
}

// --- CART VIEW PAGE ---
function applyCartPromoCode() {
  const input = document.getElementById('cart-coupon-input');
  const alertBox = document.getElementById('cart-coupon-message');
  const code = input.value.trim().toUpperCase();

  if (code === "SPRING40") {
    discountRate = 0.40;
    appliedCouponCode = "SPRING40";
    alertBox.textContent = "Promo Coupon 'SPRING40' applied: 40% Discount!";
    alertBox.className = "coupon-message-alert success";
  } else if (code === "") {
    discountRate = 0.0;
    appliedCouponCode = "";
    alertBox.textContent = "";
  } else {
    discountRate = 0.0;
    appliedCouponCode = "";
    alertBox.textContent = "Invalid coupon code.";
    alertBox.className = "coupon-message-alert error";
  }
  saveState();
  renderCartPage();
}

function renderCartPage() {
  const listContainer = document.getElementById('cart-page-items-list');
  if (!listContainer) return;

  if (cart.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-cart-page-state">
        <h3>Your shopping cart is empty</h3>
        <p>Explore our latest new season arrivals to add products to your bag.</p>
        <a href="#/search?q=" class="btn-primary" style="margin-top:16px;">Shop Now</a>
      </div>
    `;
    updateCartSummaryPanel(0, 0, 0, 0);
    return;
  }

  listContainer.innerHTML = cart.map(item => {
    const price = item.product.discount_price ? item.product.discount_price : item.product.price;
    return `
      <div class="cart-page-item">
        <img src="${item.product.image}" alt="${item.product.name}" class="cart-page-item-img">
        <div class="cart-page-item-desc">
          <h3 class="cart-page-item-title"><a href="#/product?id=${item.product.id}">${item.product.name}</a></h3>
          <p class="cart-page-item-seller">Sold by: ${item.product.seller.shop_name}</p>
          ${item.size ? `<p class="cart-page-item-size" style="font-size:13px; color:var(--color-text-muted); margin-bottom:4px;">Size: <strong>${item.size}</strong></p>` : ''}
          <p class="cart-page-item-stock">In stock (Ready to ship)</p>
          
          <div class="cart-page-item-actions">
            <div class="quantity-controls" style="margin: 0;">
              <button class="quantity-btn" onclick="updateCartPageQty(${item.product.id}, ${item.size ? "'" + item.size + "'" : 'null'}, ${item.quantity - 1})">-</button>
              <div class="quantity-value">${item.quantity}</div>
              <button class="quantity-btn" onclick="updateCartPageQty(${item.product.id}, ${item.size ? "'" + item.size + "'" : 'null'}, ${item.quantity + 1})">+</button>
            </div>
            <span class="cart-actions-sep">|</span>
            <button onclick="removeFromCartPage(${item.product.id}, ${item.size ? "'" + item.size + "'" : 'null'})" class="btn-cart-item-delete">Delete</button>
            ${currentUser && currentUser.role === 'user' ? `
            <span class="cart-actions-sep">|</span>
            <button onclick="toggleCustomerChat(${item.product.seller.id})" class="btn-cart-item-delete" style="color:var(--color-primary);">Have a question?</button>
            ` : ''}
          </div>
        </div>
        <div class="cart-page-item-price">₹${price.toFixed(2)}</div>
      </div>
    `;
  }).join('');

  // Calculate pricing summary
  let subtotal = 0;
  let totalItemsCount = 0;
  cart.forEach(item => {
    const price = item.product.discount_price ? item.product.discount_price : item.product.price;
    subtotal += price * item.quantity;
    totalItemsCount += item.quantity;
  });

  const discount = subtotal * discountRate;
  const shipping = (subtotal - discount) >= 50 ? 0.00 : 9.99;
  const grandTotal = subtotal - discount + shipping;

  updateCartSummaryPanel(totalItemsCount, subtotal, discount, shipping, grandTotal);
}

function updateCartPageQty(productId, size, newQty) {
  if (newQty <= 0) {
    removeFromCartPage(productId, size);
    return;
  }
  const item = cart.find(i => i.product.id === productId && i.size === size);
  if (item) {
    item.quantity = newQty;
  }
  saveState();
  renderCartPage();
  updateHeaderCounters();
}

function removeFromCartPage(productId, size) {
  cart = cart.filter(item => !(item.product.id === productId && item.size === size));
  saveState();
  renderCartPage();
  updateHeaderCounters();
}

function updateCartSummaryPanel(itemCount, subtotal, discount, shipping, grandTotal) {
  document.getElementById('cart-page-summary-qty').textContent = itemCount;
  document.getElementById('cart-page-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
  
  const discountRow = document.getElementById('cart-page-discount-row');
  if (discount > 0) {
    document.getElementById('cart-page-discount').textContent = `-₹${discount.toFixed(2)}`;
    discountRow.style.display = 'flex';
  } else {
    discountRow.style.display = 'none';
  }

  document.getElementById('cart-page-shipping').textContent = shipping === 0 ? "Free" : `₹${shipping.toFixed(2)}`;
  document.getElementById('cart-page-total').textContent = `₹${grandTotal.toFixed(2)}`;
}

// --- MULTI-STEP CHECKOUT VIEW ---
let checkoutStep = 'shipping';

function parseCheckoutRouteParams(hash) {
  const urlParams = new URLSearchParams(hash.slice(hash.indexOf('?')));
  checkoutStep = urlParams.get('step') || 'shipping';
  renderCheckoutWizard();
}

function renderCheckoutWizard() {
  const stepContainer = document.getElementById('checkout-step-container');
  if (!stepContainer) return;

  // Render navigation states
  document.querySelectorAll('.checkout-steps-nav .step-nav-item').forEach(item => {
    item.classList.remove('active');
  });

  // Calculate prices
  let subtotal = 0;
  cart.forEach(item => {
    const price = item.product.discount_price ? item.product.discount_price : item.product.price;
    subtotal += price * item.quantity;
  });
  const discount = subtotal * discountRate;
  const shipping = (subtotal - discount) >= 50 || subtotal === 0 ? 0.00 : 9.99;
  const grandTotal = subtotal - discount + shipping;

  // Update Checkout Sidebar numbers
  document.getElementById('checkout-summary-subtotal').textContent = `₹${subtotal.toFixed(2)}`;
  const discountRow = document.getElementById('checkout-summary-discount-row');
  if (discount > 0) {
    document.getElementById('checkout-summary-discount').textContent = `-₹${discount.toFixed(2)}`;
    discountRow.style.display = 'flex';
  } else {
    discountRow.style.display = 'none';
  }
  document.getElementById('checkout-summary-shipping').textContent = shipping === 0 ? "Free" : `₹${shipping.toFixed(2)}`;
  document.getElementById('checkout-summary-total').textContent = `₹${grandTotal.toFixed(2)}`;

  if (checkoutStep === 'shipping') {
    document.getElementById('step-nav-shipping').classList.add('active');
    
    const addressOptionsHTML = savedAddresses.map((addr) => {
      const checkedAttr = addr.id === activeAddressId ? 'checked' : '';
      return `
        <label class="payment-method-option" style="display:flex; align-items:center; gap:12px; padding:12px 16px; border:1px solid var(--color-border); border-radius:8px; margin-bottom:10px; cursor:pointer;">
          <input type="radio" name="checkout-address-option" value="${addr.id}" ${checkedAttr} onchange="toggleCheckoutAddressForm(false)">
          <div style="font-size:13px; text-align:left;">
            <strong>${addr.label}</strong> — ${addr.line1}, ${addr.city}, ${addr.state} - ${addr.pincode}
          </div>
        </label>
      `;
    }).join('');

    stepContainer.innerHTML = `
      <div class="checkout-step-form">
        <h3>1. Select a Shipping Address</h3>
        <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:16px;">Choose a saved address or enter a new shipping address below.</p>
        
        <div class="checkout-saved-addresses-options" style="margin-bottom:20px;">
          ${addressOptionsHTML}
          
          <label class="payment-method-option" style="display:flex; align-items:center; gap:12px; padding:12px 16px; border:1px solid var(--color-border); border-radius:8px; margin-bottom:10px; cursor:pointer;">
            <input type="radio" name="checkout-address-option" value="new" ${savedAddresses.length === 0 ? 'checked' : ''} onchange="toggleCheckoutAddressForm(true)">
            <div style="font-size:13px;">
              <strong>Ship to a New Address</strong>
            </div>
          </label>
        </div>

        <!-- New Address Fields, hidden by default if saved addresses exist -->
        <div id="checkout-new-address-fields" style="display: ${savedAddresses.length === 0 ? 'block' : 'none'}; border-top:1px dashed var(--color-accent); padding-top:20px; margin-top:20px;">
          <h4 style="font-family:var(--font-heading); font-size:20px; color:var(--color-primary); margin-bottom:12px;">New Shipping Address</h4>
          
          <div class="form-group">
            <label for="address-line1">Address Line 1</label>
            <input type="text" id="address-line1" placeholder="Street Address, P.O. Box">
          </div>
          <div class="form-row" style="display:flex; gap:12px; margin-top:12px;">
            <div class="form-group" style="flex:1;">
              <label for="address-city">City</label>
              <input type="text" id="address-city">
            </div>
            <div class="form-group" style="flex:1;">
              <label for="address-state">State / Region</label>
              <input type="text" id="address-state">
            </div>
            <div class="form-group" style="flex:1;">
              <label for="address-pincode">Pincode</label>
              <input type="text" id="address-pincode">
            </div>
          </div>
          
          <div style="margin-top:16px; display:flex; align-items:center; gap:8px;">
            <input type="checkbox" id="checkout-save-address-chk" onchange="toggleCheckoutAddressLabel(this.checked)">
            <label for="checkout-save-address-chk" style="font-size:13px; font-weight:500;">Save this address to my account as:</label>
            <select id="checkout-save-address-label" style="padding:6px; border-radius:6px; border:1px solid var(--color-border); font-family:var(--font-body); font-size:12px; display:none;">
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="School">School</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <button onclick="saveShippingAddressAndProceed()" class="btn-checkout-proceed" style="margin-top:24px;">Continue to Payment</button>
      </div>
    `;
  } 
  else if (checkoutStep === 'payment') {
    document.getElementById('step-nav-shipping').classList.add('active');
    document.getElementById('step-nav-payment').classList.add('active');
    
    const walletBalanceHTML = walletBalance >= grandTotal
      ? `<span class="funds-status success">Sufficient Funds (₹${walletBalance.toFixed(2)} available)</span>`
      : `<span class="funds-status error">Insufficient Funds (₹${walletBalance.toFixed(2)} available - Please load funds in My Wallet)</span>`;

    stepContainer.innerHTML = `
      <div class="checkout-step-form">
        <h3>2. Select Payment Method</h3>
        <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:24px;">Choose a payment method to settle your order balance.</p>
        
        <div class="payment-selector-list">
          <label class="payment-method-option">
            <input type="radio" name="payment-opt" value="wallet" onchange="toggleCheckoutCardForm(this.value)" ${selectedPaymentMethod === 'wallet' ? 'checked' : ''}>
            <div class="payment-option-details">
              <strong>Lumora Pay (Wallet Balance)</strong>
              ${walletBalanceHTML}
            </div>
          </label>

          <label class="payment-method-option">
            <input type="radio" name="payment-opt" value="cod" onchange="toggleCheckoutCardForm(this.value)" ${selectedPaymentMethod === 'cod' ? 'checked' : ''}>
            <div class="payment-option-details">
              <strong>Cash on Delivery (COD)</strong>
              <span class="funds-status">Pay at your doorstep during delivery.</span>
            </div>
          </label>

          <label class="payment-method-option">
            <input type="radio" name="payment-opt" value="card" onchange="toggleCheckoutCardForm(this.value)" ${selectedPaymentMethod === 'card' ? 'checked' : ''}>
            <div class="payment-option-details">
              <strong>Pay with Razorpay (Credit/Debit Card/UPI)</strong>
              <span class="funds-status">Settle securely using Razorpay gateway.</span>
            </div>
          </label>
        </div>

        <!-- Form card placeholder for custom fields is no longer needed since Razorpay uses popup modal -->

        <button onclick="savePaymentMethodAndProceed()" class="btn-checkout-proceed" style="margin-top:24px;">Continue to Review Order</button>
      </div>
    `;
  } 
  else if (checkoutStep === 'review') {
    document.getElementById('step-nav-shipping').classList.add('active');
    document.getElementById('step-nav-payment').classList.add('active');
    document.getElementById('step-nav-review').classList.add('active');

    const paymentLabel = selectedPaymentMethod === 'wallet' ? 'Lumora Pay (Wallet)' : (selectedPaymentMethod === 'cod' ? 'Cash on Delivery' : 'Razorpay (Card/UPI)');

    const reviewItemsHTML = cart.map(item => {
      const price = item.product.discount_price ? item.product.discount_price : item.product.price;
      return `
        <div class="checkout-review-item">
          <img src="${item.product.image}" alt="${item.product.name}">
          <div class="review-item-text">
            <strong>${item.product.name}</strong>
            <p>Qty: ${item.quantity} | Sold by: ${item.product.seller.shop_name}</p>
          </div>
          <span class="review-item-price">₹${(price * item.quantity).toFixed(2)}</span>
        </div>
      `;
    }).join('');

    stepContainer.innerHTML = `
      <div class="checkout-step-form">
        <h3>3. Review and Place Your Order</h3>
        <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:24px;">Please review the shipping details and order items before committing.</p>
        
        <div class="checkout-review-grid">
          <div class="review-block">
            <strong>Shipping Address:</strong>
            <p>${shippingAddress.line1}<br>${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}</p>
          </div>
          <div class="review-block">
            <strong>Payment Method:</strong>
            <p>${paymentLabel}</p>
          </div>
        </div>

        <div class="detail-divider"></div>

        <div class="review-items-list">
          <h4>Order Items</h4>
          ${reviewItemsHTML}
        </div>

        <button onclick="commitOrderPayment(${grandTotal})" class="btn-checkout-proceed final">Place Your Order</button>
      </div>
    `;
  }
}

function saveShippingAddressAndProceed() {
  const selectedOpt = document.querySelector('input[name="checkout-address-option"]:checked');
  if (!selectedOpt) {
    alert("Please select a shipping address.");
    return;
  }

  if (selectedOpt.value === 'new') {
    const line1Input = document.getElementById('address-line1');
    const cityInput = document.getElementById('address-city');
    const stateInput = document.getElementById('address-state');
    const pincodeInput = document.getElementById('address-pincode');

    if (!line1Input || !cityInput || !stateInput || !pincodeInput) return;

    const line1 = line1Input.value.trim();
    const city = cityInput.value.trim();
    const state = stateInput.value.trim();
    const pincode = pincodeInput.value.trim();

    if (!line1 || !city || !state || !pincode) {
      alert("Please fill in all address fields for the new address.");
      return;
    }

    shippingAddress = { line1, city, state, pincode };

    // Check if user requested to save address
    const saveChk = document.getElementById('checkout-save-address-chk');
    if (saveChk && saveChk.checked) {
      const labelSelect = document.getElementById('checkout-save-address-label');
      const label = labelSelect ? labelSelect.value : "Home";
      const newId = savedAddresses.length > 0 ? Math.max(...savedAddresses.map(a => a.id)) + 1 : 0;
      savedAddresses.push({ id: newId, label, line1, city, state, pincode });
      activeAddressId = newId;
    }
  } else {
    // Select from saved addresses
    const id = parseInt(selectedOpt.value);
    const addr = savedAddresses.find(a => a.id === id);
    if (!addr) {
      alert("Selected address not found.");
      return;
    }
    shippingAddress = {
      line1: addr.line1,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode
    };
    activeAddressId = id;
  }

  saveState();
  window.location.hash = `#/checkout?step=payment`;
}

function toggleCheckoutAddressForm(show) {
  const fields = document.getElementById('checkout-new-address-fields');
  if (fields) {
    fields.style.display = show ? 'block' : 'none';
  }
}

function toggleCheckoutAddressLabel(checked) {
  const labelSelect = document.getElementById('checkout-save-address-label');
  if (labelSelect) {
    labelSelect.style.display = checked ? 'block' : 'none';
  }
}

function toggleCheckoutCardForm(val) {
  const form = document.getElementById('checkout-card-form');
  if (form) {
    form.style.display = val === 'card' ? 'block' : 'none';
  }
}

function savePaymentMethodAndProceed() {
  const selectedOpt = document.querySelector('input[name="payment-opt"]:checked');
  if (!selectedOpt) {
    alert("Please choose a payment method.");
    return;
  }
  selectedPaymentMethod = selectedOpt.value;
  saveState();
  window.location.hash = `#/checkout?step=review`;
}

function commitOrderPayment(grandTotal) {
  if (cart.length === 0) {
    alert("Your cart is empty.");
    return;
  }

  if (selectedPaymentMethod === 'wallet') {
    if (walletBalance < grandTotal) {
      alert("Insufficient wallet balance. Please add funds to your wallet first.");
      window.location.hash = `#/wallet`;
      return;
    }
    
    // Deduct wallet funds
    walletBalance -= grandTotal;
    walletTransactions.unshift({
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: "debit",
      reason: "Settle order balance",
      amount: grandTotal
    });
    completeOrderPlacement(grandTotal);
  } else if (selectedPaymentMethod === 'cod') {
    completeOrderPlacement(grandTotal);
  } else if (selectedPaymentMethod === 'card') {
    // Razorpay Integration Payment Modal Popup
    apiClient.createRazorpayOrder(grandTotal).then(res => {
      const options = {
        key: res.razorpay_key_id,
        amount: res.amount,
        currency: res.currency,
        name: "Lumora",
        description: "Secure Order Payment",
        order_id: res.razorpay_order_id,
        handler: function (response) {
          apiClient.verifyRazorpayPayment(
            response.razorpay_payment_id,
            res.razorpay_order_id,
            response.razorpay_signature
          ).then(verifyRes => {
            if (verifyRes.verified) {
              completeOrderPlacement(grandTotal);
            } else {
              alert("Payment verification failed. Please try again.");
            }
          }).catch(err => {
            alert("Error verifying payment signature.");
          });
        },
        prefill: {
          name: currentUser ? currentUser.name : "Guest Shopper",
          email: currentUser ? currentUser.email : "guest@lumora.com"
        },
        theme: {
          color: "#1e3e35"
        }
      };
      const rzp1 = new Razorpay(options);
      rzp1.open();
    }).catch(err => {
      console.error(err);
      alert("Could not initialize Razorpay transaction setup.");
    });
  }
}

function completeOrderPlacement(grandTotal) {
  const orderId = Math.floor(10000 + Math.random() * 90000);
  let totalLoyaltyPoints = 0;
  cart.forEach(item => {
    const product = products.find(p => p.id === item.product.id);
    if (product) {
      product.stock = Math.max(0, product.stock - item.quantity);
      totalLoyaltyPoints += (product.loyalty_points || 0) * item.quantity;
      
      const shopName = product.seller ? product.seller.shop_name : "Manager Shop";
      addManagerNotification(
        shopName,
        `New Order #${orderId} placed for "${product.name}" (Qty: ${item.quantity}). Stock reduced to ${product.stock}.`,
        "info"
      );

      if (product.stock === 0) {
        addManagerNotification(
          shopName,
          `Alert: "${product.name}" is now OUT OF STOCK!`,
          "error"
        );
      } else if (product.stock <= 5) {
        addManagerNotification(
          shopName,
          `Warning: Low stock on "${product.name}" (${product.stock} left).`,
          "warning"
        );
      }
    }
  });

  const newOrder = {
    id: orderId,
    customer_email: currentUser ? currentUser.email : "guest@lumora.com",
    timestamp: Date.now(),
    dateStr: new Date().toISOString().slice(0, 16).replace('T', ' '),
    items: JSON.parse(JSON.stringify(cart)),
    address: shippingAddress,
    payment_method: selectedPaymentMethod,
    total_amount: grandTotal,
    status: selectedPaymentMethod === 'cod' ? 'pending' : 'confirmed',
    tracking: [
      { status: 'pending', description: 'Order placed, payment processed.', time: Date.now() }
    ]
  };

  if (totalLoyaltyPoints > 0) {
    walletBalance += totalLoyaltyPoints;
    walletTransactions.unshift({
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: "credit",
      reason: `Loyalty points for Order #${orderId}`,
      amount: totalLoyaltyPoints
    });
  }

  orders.unshift(newOrder);
  cart = [];
  discountRate = 0.0;
  appliedCouponCode = "";

  saveState();
  updateHeaderCounters();
  window.location.hash = `#/confirmation?orderId=${orderId}`;
}

// --- ORDER CONFIRMATION VIEW ---
function parseConfirmationRouteParams(hash) {
  const urlParams = new URLSearchParams(hash.slice(hash.indexOf('?')));
  const orderId = urlParams.get('orderId') || '10243';
  
  document.getElementById('confirm-order-id').textContent = `#${orderId}`;
}

// --- ORDERS HISTORY & TRACKING VIEW ---
function renderOrdersPage() {
  const container = document.getElementById('orders-dashboard-list');
  if (!container) return;

  simulateAllOrders();

  const userEmail = currentUser ? currentUser.email : "guest@lumora.com";
  const userOrders = orders.filter(order => order.customer_email === userEmail);

  if (userOrders.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-page-state">
        <h3>You have not placed any orders yet</h3>
        <p>Your purchase records, status tracking progress bars, and returns will display here.</p>
        <a href="#/search?q=" class="btn-primary" style="margin-top:16px;">Shop Now</a>
      </div>
    `;
    return;
  }

  container.innerHTML = userOrders.map(order => {
    // 1. Live order progress bar calculation
    // Ordered -> Shipped -> Delivered
    // 1 minute simulation: 
    // < 45s = Pending/Confirmed
    // 45s to 90s = Shipped
    // > 90s = Delivered
    const elapsedSeconds = (Date.now() - order.timestamp) / 1000;
    
    let currentStatus = order.status;
    let desc = order.tracking && order.tracking.length > 0 
      ? order.tracking[order.tracking.length - 1].description 
      : "Order placed successfully.";

    // Set up status step CSS classes
    const stepOrderedClass = "completed";
    const stepShippedClass = (currentStatus === 'shipped' || currentStatus === 'delivered' || currentStatus === 'returned' || currentStatus === 'refunded') ? "completed" : "";
    const stepDeliveredClass = (currentStatus === 'delivered' || currentStatus === 'returned' || currentStatus === 'refunded') ? "completed" : "";

    // Enable return requests if delivered and within 5 minutes of delivery (simulating 7 days window)
    const deliveryEvent = order.tracking ? [...order.tracking].reverse().find(t => t.status === 'delivered') : null;
    const elapsedSinceDelivery = deliveryEvent ? (Date.now() - deliveryEvent.time) / 1000 : elapsedSeconds;
    const isReturnable = currentStatus === 'delivered' && elapsedSinceDelivery < 300; 

    // Render order item summaries
    const itemsHTML = order.items.map(item => {
      const price = item.product.discount_price ? item.product.discount_price : item.product.price;
      return `
        <div class="orders-list-item-row">
          <img src="${item.product.image}" alt="${item.product.name}">
          <div>
            <strong>${item.product.name}</strong>
            ${item.size ? `<p style="font-size:12px; color:var(--color-text-muted); margin:2px 0;">Size: <strong>${item.size}</strong></p>` : ''}
            <p>Qty: ${item.quantity} | Sold by: ${item.product.seller.shop_name}</p>
          </div>
          <span style="font-weight:600;">₹${(price * item.quantity).toFixed(2)}</span>
        </div>
      `;
    }).join('');

    // Actions block based on status
    let actionsHTML = "";
    if (currentStatus === 'pending' || currentStatus === 'confirmed') {
      actionsHTML = `<button onclick="customerCancelOrderDirectly(${order.id})" class="btn-order-cancel" style="background-color:#c0392b; color:#fff; border:none; padding:8px 12px; border-radius:6px; font-weight:600; cursor:pointer;">Cancel Order</button>`;
    } else if (currentStatus === 'shipped') {
      actionsHTML = `<button onclick="customerRequestCancellation(${order.id})" class="btn-order-cancel" style="background-color:#e67e22; color:#fff; border:none; padding:8px 12px; border-radius:6px; font-weight:600; cursor:pointer;">Request Cancellation</button>`;
    } else if (currentStatus === 'delivered') {
      if (isReturnable) {
        actionsHTML = `<button onclick="customerRequestReturn(${order.id})" class="btn-order-return" style="background-color:var(--color-primary); color:#fff; border:none; padding:8px 12px; border-radius:6px; font-weight:600; cursor:pointer;">Return Items</button>`;
      } else {
        actionsHTML = `<span style="font-size:12px; color:var(--color-text-muted);">Delivered</span>`;
      }
    } else if (currentStatus === 'cancellation_requested') {
      actionsHTML = `<span class="status-badge pending" style="background-color:#f39c12; color:white; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600;">Cancellation Requested (Pending Approval)</span>`;
    } else if (currentStatus === 'return_requested') {
      actionsHTML = `<span class="status-badge pending" style="background-color:#f39c12; color:white; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:600;">Return Requested (Pending Approval)</span>`;
    } else if (currentStatus === 'returned') {
      actionsHTML = `<span class="returned-status-tag" style="color:#27ae60; font-weight:600; font-size:13px;">Returned & Refunded</span>`;
    } else if (currentStatus === 'cancelled') {
      actionsHTML = `<span class="cancelled-status-tag" style="color:#c0392b; font-weight:600; font-size:13px;">Order Cancelled</span>`;
    }

    // Add chat option for order
    const firstItemSeller = (order.items && order.items.length > 0 && order.items[0].product.seller) ? order.items[0].product.seller.id : 'null';
    actionsHTML += `<button onclick="toggleCustomerChat(${firstItemSeller}, ${order.id})" class="btn-outline" style="margin-left: 12px; padding:8px 12px; border-radius:6px; font-weight:600; cursor:pointer;">Chat about this order</button>`;

    // Manager/Admin status manual override
    let managerPanel = "";

    let trackingHTML = "";
    if (currentStatus === 'cancelled') {
      trackingHTML = `
        <div class="order-status-banner cancelled" style="background: linear-gradient(135deg, #fff5f5 0%, #fff0f0 100%); border-left: 4px solid #e74c3c; padding: 16px; border-radius: 8px; margin: 16px 0; box-shadow: 0 2px 8px rgba(231, 76, 60, 0.05); display: flex; align-items: flex-start; gap: 14px;">
          <div style="background-color: #fadbd8; padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
          </div>
          <div style="text-align: left; flex-grow: 1;">
            <strong style="color: #c0392b; display: block; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Order Cancelled</strong>
            <span style="color: #7f8c8d; font-size: 13px; font-weight: 500; line-height: 1.4;">${desc}</span>
          </div>
        </div>
      `;
    } else if (currentStatus === 'return_approved') {
      trackingHTML = `
        <div class="order-status-banner return-approved" style="background: linear-gradient(135deg, #f0f7fc 0%, #e6f2fa 100%); border-left: 4px solid #3498db; padding: 16px; border-radius: 8px; margin: 16px 0; box-shadow: 0 2px 8px rgba(52, 152, 219, 0.05); display: flex; align-items: flex-start; gap: 14px;">
          <div style="background-color: #d6eaf8; padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3498db" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="13"></rect>
              <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
              <circle cx="5.5" cy="18.5" r="2.5"></circle>
              <circle cx="18.5" cy="18.5" r="2.5"></circle>
            </svg>
          </div>
          <div style="text-align: left; flex-grow: 1;">
            <strong style="color: #2980b9; display: block; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Return Approved</strong>
            <span style="color: #7f8c8d; font-size: 13px; font-weight: 500; line-height: 1.4;">${desc}</span>
          </div>
        </div>
      `;
    } else if (currentStatus === 'returned' || currentStatus === 'refunded') {
      trackingHTML = `
        <div class="order-status-banner returned" style="background: linear-gradient(135deg, #f0fcf6 0%, #e6faf0 100%); border-left: 4px solid #2ecc71; padding: 16px; border-radius: 8px; margin: 16px 0; box-shadow: 0 2px 8px rgba(46, 204, 113, 0.05); display: flex; align-items: flex-start; gap: 14px;">
          <div style="background-color: #d4efdf; padding: 8px; border-radius: 50%; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path>
            </svg>
          </div>
          <div style="text-align: left; flex-grow: 1;">
            <strong style="color: #27ae60; display: block; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Returned & Refunded</strong>
            <span style="color: #7f8c8d; font-size: 13px; font-weight: 500; line-height: 1.4;">${desc}</span>
          </div>
        </div>
      `;
    } else {
      trackingHTML = `
        <div class="order-tracking-tracker">
          <div class="tracking-title-row">
            <strong>Order Status: ${currentStatus.toUpperCase()}</strong>
            <span>${desc}</span>
          </div>
          <div class="tracking-progress-bar">
            <div class="progress-step ${stepOrderedClass}">
              <div class="progress-dot"></div>
              <span>Ordered</span>
            </div>
            <div class="progress-line ${stepShippedClass}"></div>
            <div class="progress-step ${stepShippedClass}">
              <div class="progress-dot"></div>
              <span>Shipped</span>
            </div>
            <div class="progress-line ${stepDeliveredClass}"></div>
            <div class="progress-step ${stepDeliveredClass}">
              <div class="progress-dot"></div>
              <span>Delivered</span>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="order-dashboard-card">
        <div class="order-card-header">
          <div>
            <span class="header-label">Order Placed</span>
            <span class="header-val">${order.dateStr}</span>
          </div>
          <div>
            <span class="header-label">Total Amount</span>
            <span class="header-val" style="font-weight:600; color:var(--color-primary);">₹${order.total_amount.toFixed(2)}</span>
          </div>
          <div>
            <span class="header-label">Ship To</span>
            <span class="header-val">${order.address.city}, ${order.address.state}</span>
          </div>
          <div style="margin-left:auto; text-align:right;">
            <span class="header-label">Order ID</span>
            <span class="header-val">#${order.id}</span>
          </div>
        </div>

        <div class="order-card-body">
          <div class="order-items-wrapper">
            ${itemsHTML}
          </div>

          <!-- Live tracking bar -->
          ${trackingHTML}

          <div class="order-card-footer">
            ${actionsHTML}
            ${managerPanel}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Helper to refund orders to customer wallet database
function refundOrderToCustomer(order, reason) {
  if (order.payment_method !== 'wallet' && order.payment_method !== 'cod') return;

  const customer = registeredUsers.find(u => u.email.toLowerCase() === order.customer_email.toLowerCase());
  if (customer) {
    customer.walletBalance = (customer.walletBalance || 0) + order.total_amount;
    if (!customer.walletTransactions) customer.walletTransactions = [];
    customer.walletTransactions.unshift({
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: "credit",
      reason: reason,
      amount: order.total_amount
    });
  }

  // Sync memory variables if the customer is the currently logged-in user
  if (currentUser && currentUser.email.toLowerCase() === order.customer_email.toLowerCase()) {
    walletBalance = customer ? customer.walletBalance : walletBalance;
    walletTransactions = customer ? customer.walletTransactions : walletTransactions;
  }
}

function customerCancelOrderDirectly(orderId) {
  if (!confirm("Are you sure you want to cancel this order?")) return;

  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = 'cancelled';
  order.tracking.push({
    status: 'cancelled',
    description: 'Order cancelled by customer.',
    time: Date.now()
  });

  // Restore inventory stock and notify managers
  order.items.forEach(item => {
    const product = products.find(p => p.id == item.product.id);
    if (product) {
      product.stock += item.quantity;
      addManagerNotification(
        product.seller ? product.seller.shop_name : "Manager Shop",
        `Order #${order.id} was cancelled by customer. Stock restored for "${product.name}" (+${item.quantity}).`,
        "info"
      );
    }
  });

  // Refund wallet
  if (order.payment_method === 'wallet') {
    refundOrderToCustomer(order, `Refund for Cancelled Order #${order.id}`);
  }

  saveState();
  renderOrdersPage();
  alert("Order cancelled successfully. Refund processed to your wallet if paid by wallet.");
}

function customerRequestCancellation(orderId) {
  if (!confirm("Are you sure you want to request cancellation for this order? Since it has already shipped, this requires manager approval.")) return;

  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = 'cancellation_requested';
  order.tracking.push({
    status: 'cancellation_requested',
    description: 'Cancellation requested by customer.',
    time: Date.now()
  });

  // Notify manager
  order.items.forEach(item => {
    addManagerNotification(
      item.product.seller ? item.product.seller.shop_name : "Manager Shop",
      `Cancellation requested for Shipped Order #${order.id} ("${item.product.name}").`,
      "warning"
    );
  });

  saveState();
  renderOrdersPage();
  alert("Cancellation request submitted to store manager.");
}

// Premium Modal helper for return reason input
function showReturnModal(orderId, onSubmit) {
  let modal = document.getElementById('return-reason-modal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'return-reason-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
  modal.style.backdropFilter = 'blur(4px)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '10000';
  modal.style.opacity = '0';
  modal.style.transition = 'opacity 0.2s ease';

  modal.innerHTML = `
    <div class="return-modal-content" style="
      background-color: var(--color-card-bg, #fff);
      border: 1px solid var(--color-border, #e5e5e5);
      border-radius: var(--border-radius-md, 12px);
      padding: 24px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      transform: translateY(20px);
      transition: transform 0.2s ease;
      font-family: var(--font-body, sans-serif);
    ">
      <h3 style="
        font-family: var(--font-heading, serif);
        font-size: 20px;
        color: var(--color-primary, #1e3e35);
        margin-top: 0;
        margin-bottom: 8px;
      ">Return Items</h3>
      <p style="
        font-size: 13px;
        color: var(--color-text-muted, #666);
        margin-bottom: 16px;
        line-height: 1.4;
      ">Please provide a reason for returning the items in Order #${orderId} to help us process your request.</p>
      
      <div style="margin-bottom: 20px;">
        <label for="return-reason-textarea" style="
          font-weight: 600;
          font-size: 12px;
          display: block;
          margin-bottom: 6px;
        ">Reason for Return</label>
        <textarea id="return-reason-textarea" placeholder="e.g. Wrong size, Item damaged, Not as described..." style="
          width: 100%;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid var(--color-border, #e5e5e5);
          font-family: var(--font-body, sans-serif);
          font-size: 13px;
          resize: vertical;
          min-height: 70px;
          box-sizing: border-box;
          outline: none;
        "></textarea>
      </div>

      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button id="btn-return-cancel" style="
          background: none;
          border: 1px solid var(--color-border, #e5e5e5);
          color: var(--color-text-muted, #666);
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Cancel</button>
        <button id="btn-return-submit" style="
          background-color: var(--color-primary, #1e3e35);
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        ">Submit Return</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const textarea = document.getElementById('return-reason-textarea');
  setTimeout(() => textarea.focus(), 50);

  setTimeout(() => {
    modal.style.opacity = '1';
    modal.querySelector('.return-modal-content').style.transform = 'translateY(0)';
  }, 10);

  function closeModal() {
    modal.style.opacity = '0';
    modal.querySelector('.return-modal-content').style.transform = 'translateY(20px)';
    setTimeout(() => modal.remove(), 200);
  }

  document.getElementById('btn-return-cancel').addEventListener('click', closeModal);

  document.getElementById('btn-return-submit').addEventListener('click', () => {
    const val = textarea.value.trim();
    if (!val) {
      alert("Return reason is required.");
      textarea.style.borderColor = '#c0392b';
      textarea.focus();
      return;
    }
    closeModal();
    onSubmit(val);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function customerRequestReturn(orderId) {
  showReturnModal(orderId, (reason) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    order.status = 'return_requested';
    order.return_reason = reason.trim();
    order.tracking.push({
      status: 'return_requested',
      description: `Return requested by customer. Reason: ${reason}`,
      time: Date.now()
    });

    // Notify manager
    order.items.forEach(item => {
      addManagerNotification(
        item.product.seller ? item.product.seller.shop_name : "Manager Shop",
        `Return requested for Order #${order.id} ("${item.product.name}"). Reason: ${reason}`,
        "warning"
      );
    });

    saveState();
    renderOrdersPage();
    alert("Return request submitted to the store manager for approval.");
  });
}

function managerUpdateOrderStatus(orderId, nextStatus) {
  if (!nextStatus) return;
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = nextStatus;
  order.tracking.push({
    status: nextStatus,
    description: `Status manually set by staff to ${nextStatus}.`,
    time: Date.now()
  });

  if (nextStatus === 'cancelled') {
    // Restore inventory
    order.items.forEach(item => {
      const product = products.find(p => p.id === item.product.id);
      if (product) {
        product.stock += item.quantity;
      }
    });
    
    // Refund if wallet
    if (order.payment_method === 'wallet') {
      refundOrderToCustomer(order, `Refund for Cancelled Order #${order.id}`);
    }
  }

  saveState();
  if (window.location.hash === '#/account') {
    renderAccountPage();
  } else {
    renderOrdersPage();
  }
  alert(`Order #${orderId} updated to ${nextStatus}.`);
}

// --- WALLET & PROFILE VIEW ---
function renderWalletPage() {
  document.getElementById('wallet-balance-display').textContent = `₹${walletBalance.toFixed(2)}`;

  // Render logs
  const list = document.getElementById('wallet-transactions-list');
  if (!list) return;

  if (walletTransactions.length === 0) {
    list.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:16px;">No transactions recorded.</td></tr>`;
    return;
  }

  list.innerHTML = walletTransactions.map(t => {
    const sign = t.type === 'credit' ? '+' : '-';
    const classType = t.type === 'credit' ? 'credit-sign' : 'debit-sign';
    return `
      <tr>
        <td>${t.date}</td>
        <td><span class="txn-type-badge ${t.type}">${t.type.toUpperCase()}</span></td>
        <td>${t.reason}</td>
        <td class="${classType}" style="font-weight:600;">${sign}₹${t.amount.toFixed(2)}</td>
      </tr>
    `;
  }).join('');
}

// Premium Modal helper for credit card payment gateway simulation
function showPaymentGatewayModal(amount, onComplete) {
  let modal = document.getElementById('payment-gateway-modal');
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'payment-gateway-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
  modal.style.backdropFilter = 'blur(4px)';
  modal.style.display = 'flex';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.zIndex = '10000';
  modal.style.opacity = '0';
  modal.style.transition = 'opacity 0.2s ease';

  modal.innerHTML = `
    <div class="gateway-modal-content" style="
      background-color: var(--color-card-bg, #fff);
      border: 1px solid var(--color-border, #e5e5e5);
      border-radius: var(--border-radius-md, 12px);
      padding: 24px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      transform: translateY(20px);
      transition: transform 0.2s ease;
      font-family: var(--font-body, sans-serif);
    ">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
        <h3 style="
          font-family: var(--font-heading, serif);
          font-size: 20px;
          color: var(--color-primary, #1e3e35);
          margin: 0;
        ">Lumora Secure Pay</h3>
        <span style="font-size:11px; color:#27ae60; font-weight:700; background:#e8f8f0; padding:4px 8px; border-radius:12px;">🔒 SECURE</span>
      </div>
      
      <div id="gateway-loader" style="display:none; text-align:center; padding:30px 0;">
        <div class="gateway-spinner" style="
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid var(--color-primary, #1e3e35);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px auto;
        "></div>
        <p style="font-size:13px; font-weight:600; color:var(--color-primary, #1e3e35); margin-bottom:6px;">Processing Transaction...</p>
        <p style="font-size:11px; color:var(--color-text-muted, #666); margin:0;">Verifying credentials with card issuer...</p>
      </div>

      <div id="gateway-form">
        <p style="
          font-size: 13px;
          color: var(--color-text-muted, #666);
          margin-bottom: 20px;
          line-height: 1.4;
        ">Load <strong>₹${amount.toFixed(2)}</strong> into your Lumora Wallet via Credit/Debit card.</p>
        
        <div style="margin-bottom: 12px;">
          <label style="font-weight: 600; font-size: 12px; display: block; margin-bottom: 4px;">Cardholder Name</label>
          <input type="text" id="gateway-card-name" placeholder="John Doe" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--color-border, #e5e5e5); font-family: var(--font-body, sans-serif); font-size: 13px; box-sizing: border-box; outline: none;">
        </div>

        <div style="margin-bottom: 12px;">
          <label style="font-weight: 600; font-size: 12px; display: block; margin-bottom: 4px;">Card Number</label>
          <input type="text" id="gateway-card-number" placeholder="1111222233334444" maxlength="16" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--color-border, #e5e5e5); font-family: var(--font-body, sans-serif); font-size: 13px; box-sizing: border-box; outline: none;">
        </div>

        <div style="display: flex; gap: 12px; margin-bottom: 20px;">
          <div style="flex:1;">
            <label style="font-weight: 600; font-size: 12px; display: block; margin-bottom: 4px;">Expiry (MM/YY)</label>
            <input type="text" id="gateway-card-expiry" placeholder="12/28" maxlength="5" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--color-border, #e5e5e5); font-family: var(--font-body, sans-serif); font-size: 13px; box-sizing: border-box; outline: none;">
          </div>
          <div style="flex:1;">
            <label style="font-weight: 600; font-size: 12px; display: block; margin-bottom: 4px;">CVV</label>
            <input type="password" id="gateway-card-cvv" placeholder="•••" maxlength="3" style="width: 100%; padding: 10px; border-radius: 8px; border: 1px solid var(--color-border, #e5e5e5); font-family: var(--font-body, sans-serif); font-size: 13px; box-sizing: border-box; outline: none;">
          </div>
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="btn-gateway-cancel" style="
            background: none;
            border: 1px solid var(--color-border, #e5e5e5);
            color: var(--color-text-muted, #666);
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          ">Cancel</button>
          <button id="btn-gateway-submit" style="
            background-color: var(--color-primary, #1e3e35);
            color: #fff;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          ">Pay ₹${amount.toFixed(2)}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  if (!document.getElementById('gateway-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'gateway-spinner-style';
    style.innerHTML = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  const cardName = document.getElementById('gateway-card-name');
  setTimeout(() => cardName.focus(), 50);

  setTimeout(() => {
    modal.style.opacity = '1';
    modal.querySelector('.gateway-modal-content').style.transform = 'translateY(0)';
  }, 10);

  function closeModal() {
    modal.style.opacity = '0';
    modal.querySelector('.gateway-modal-content').style.transform = 'translateY(20px)';
    setTimeout(() => modal.remove(), 200);
  }

  document.getElementById('btn-gateway-cancel').addEventListener('click', closeModal);

  document.getElementById('btn-gateway-submit').addEventListener('click', () => {
    const name = cardName.value.trim();
    const number = document.getElementById('gateway-card-number').value.trim();
    const expiry = document.getElementById('gateway-card-expiry').value.trim();
    const cvv = document.getElementById('gateway-card-cvv').value.trim();

    if (!name || !number || !expiry || !cvv) {
      alert("Please complete all credit card fields.");
      return;
    }
    if (number.length !== 16 || isNaN(Number(number))) {
      alert("Please enter a valid 16-digit card number.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      alert("Expiry date must be in MM/YY format.");
      return;
    }
    if (cvv.length !== 3 || isNaN(Number(cvv))) {
      alert("CVV must be a 3-digit number.");
      return;
    }

    document.getElementById('gateway-form').style.display = 'none';
    document.getElementById('gateway-loader').style.display = 'block';

    setTimeout(() => {
      closeModal();
      onComplete();
    }, 1500);
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function addWalletFunds() {
  const amtInput = document.getElementById('wallet-add-amount');
  if (!amtInput) return;
  
  const amt = parseFloat(amtInput.value);
  if (isNaN(amt) || amt <= 0) {
    alert("Please enter a valid positive amount to load.");
    return;
  }

  // Disable add funds button to prevent double submits
  const btn = document.querySelector('button[onclick="addWalletFunds()"]');
  if (btn) btn.disabled = true;

  apiClient.createRazorpayOrder(amt)
    .then(res => {
      const options = {
        key: res.razorpay_key_id,
        amount: res.amount,
        currency: res.currency,
        name: "Lumora Wallet",
        description: "Add Funds to Wallet",
        order_id: res.razorpay_order_id,
        handler: function (response) {
          apiClient.verifyRazorpayPayment(
            response.razorpay_payment_id,
            res.razorpay_order_id,
            response.razorpay_signature
          ).then(verifyRes => {
            if (verifyRes.verified) {
              walletBalance += amt;
              walletTransactions.unshift({
                date: new Date().toISOString().slice(0, 16).replace('T', ' '),
                type: "credit",
                reason: `Loaded funds via Razorpay (Payment ID: ${response.razorpay_payment_id})`,
                amount: amt
              });

              amtInput.value = "";
              saveState();
              renderWalletPage();
              updateHeaderCounters();
              alert(`Successfully loaded ₹${amt.toFixed(2)} to your wallet balance.`);
            } else {
              alert("Payment verification failed. Please try again.");
            }
            if (btn) btn.disabled = false;
          }).catch(err => {
            alert("Error verifying payment signature.");
            if (btn) btn.disabled = false;
          });
        },
        prefill: {
          name: currentUser ? currentUser.name : "Guest Shopper",
          email: currentUser ? currentUser.email : "guest@lumora.com"
        },
        theme: {
          color: "#2a433a"
        },
        modal: {
          ondismiss: function () {
            if (btn) btn.disabled = false;
          }
        }
      };
      const rzp1 = new Razorpay(options);
      rzp1.open();
    })
    .catch(err => {
      alert("Failed to initiate Razorpay transaction. Please try again.");
      if (btn) btn.disabled = false;
    });
}

function redeemGiftCard() {
  const codeInput = document.getElementById('wallet-gift-code');
  const msgText = document.getElementById('gift-card-message');
  if (!codeInput || !msgText) return;
  
  const code = codeInput.value.trim().toUpperCase();
  
  if (code === "LUMORAGIFT") {
    walletBalance += 50.00;
    walletTransactions.unshift({
      date: new Date().toISOString().slice(0, 16).replace('T', ' '),
      type: "credit",
      reason: "Redeemed Gift Card LUMORAGIFT",
      amount: 50.00
    });
    saveState();
    renderWalletPage();
    updateHeaderCounters();
    
    msgText.style.color = "var(--color-primary)";
    msgText.textContent = "Gift Card code redeemed successfully! +₹50.00 added.";
    codeInput.value = "";
  } else if (code === "") {
    msgText.textContent = "";
  } else {
    msgText.style.color = "red";
    msgText.textContent = "Invalid Gift Card code.";
  }
}

function changeUserRole() {
  const roleSelect = document.getElementById('role-select');
  if (!roleSelect) return;
  currentRole = roleSelect.value;
  saveState();
  updateHeaderCounters();
  renderWalletPage();
  alert(`User role changed to ${currentRole.toUpperCase()}`);
}

// Global scroll utility
function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// Global cart utility helper for Homepage
function addToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (product.stock === 0) {
    alert("Sorry, this product is currently out of stock.");
    return;
  }

  const cartItem = cart.find(item => item.product.id === productId);
  if (cartItem) {
    if (cartItem.quantity + 1 > product.stock) {
      alert(`Sorry, you cannot purchase more than ${product.stock} items of this product.`);
      return;
    }
    cartItem.quantity += 1;
  } else {
    cart.push({ product, quantity: 1 });
  }

  saveState();
  updateHeaderCounters();
  alert(`Added ${product.name} to your cart.`);
}

function addHandbagToCart() {
  addToCart(0);
}

function toggleWishlist(productId) {
  if (wishlist.has(productId)) {
    wishlist.delete(productId);
  } else {
    wishlist.add(productId);
  }
  saveState();
  if (window.location.hash.startsWith('#/search')) {
    renderSearch();
  }
  renderHome();
  updateHeaderCounters();
}

// --- YOUR ACCOUNT VIEW ---
function renderAccountPage() {
  const accountContainer = document.getElementById('view-account');
  if (!accountContainer) return;

  simulateAllOrders();

  // 1. GUEST ACCESS (Not Logged In)
  if (!currentUser) {
    renderGuestAuth(accountContainer);
    return;
  }

  // 2. LOGGED IN - RENDER ROLE-SPECIFIC VIEWS
  if (currentRole === 'manager') {
    renderManagerDashboard(accountContainer);
  } else if (currentRole === 'admin') {
    renderAdminDashboard(accountContainer);
  } else {
    renderCustomerDashboard(accountContainer);
  }
}

function renderGuestAuth(container) {
  container.innerHTML = `
    <div class="auth-container">
      <div class="auth-tabs">
        <button id="tab-login-btn" class="auth-tab-btn active" onclick="switchAuthTab('login')">Sign In</button>
        <button id="tab-signup-btn" class="auth-tab-btn" onclick="switchAuthTab('signup')">Sign Up</button>
      </div>

      <!-- Login Form -->
      <div id="auth-login-form" class="auth-form active">
        <h3 style="font-family:var(--font-heading); font-size:24px; color:var(--color-primary); margin-bottom:16px; text-align:center;">Welcome back</h3>
        <div class="auth-form-group">
          <label for="login-email">Email Address</label>
          <input type="email" id="login-email" placeholder="email@example.com" maxlength="20">
        </div>
        <div class="auth-form-group">
          <label for="login-password">Password</label>
          <input type="password" id="login-password" placeholder="••••••••" maxlength="20">
        </div>
        <div id="login-error-msg" class="auth-error-msg"></div>
        <button onclick="handleLoginSubmit()" class="auth-submit-btn">Sign In</button>
        <p style="font-size:12px; text-align:center; margin-top:16px; color:var(--color-text-muted);">
          Demo Accounts: customer@lumora.com | manager@lumora.com | admin@lumora.com (Password: password)
        </p>
      </div>

      <!-- Signup Form -->
      <div id="auth-signup-form" class="auth-form">
        <h3 style="font-family:var(--font-heading); font-size:24px; color:var(--color-primary); margin-bottom:16px; text-align:center;">Create Account</h3>
        <div class="auth-form-group">
          <label for="signup-name">Full Name</label>
          <input type="text" id="signup-name" placeholder="Jane Doe" maxlength="20">
        </div>
        <div class="auth-form-group">
          <label for="signup-email">Email Address</label>
          <input type="email" id="signup-email" placeholder="jane@example.com" maxlength="20">
        </div>
        <div class="auth-form-group">
          <label for="signup-password">Password</label>
          <input type="password" id="signup-password" placeholder="••••••••" maxlength="20">
        </div>
        <div class="auth-form-group">
          <label for="signup-role">Join As</label>
          <select id="signup-role" onchange="toggleSignupManagerFields(this.value)">
            <option value="user">Customer (Shop & Review)</option>
            <option value="manager">Store Manager (Sell & Manage Stock)</option>
          </select>
        </div>
        <div class="auth-form-group" id="signup-manager-fields" style="display:none;">
          <label for="signup-shop-name">Merchant Shop Name</label>
          <input type="text" id="signup-shop-name" placeholder="Boutique Name" maxlength="20">
        </div>
        <div id="signup-error-msg" class="auth-error-msg"></div>
        <button onclick="handleSignupSubmit()" class="auth-submit-btn">Sign Up</button>
      </div>
    </div>
  `;
}

function switchAuthTab(tab) {
  const loginForm = document.getElementById('auth-login-form');
  const signupForm = document.getElementById('auth-signup-form');
  const loginBtn = document.getElementById('tab-login-btn');
  const signupBtn = document.getElementById('tab-signup-btn');

  if (tab === 'login') {
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    loginBtn.classList.add('active');
    signupBtn.classList.remove('active');
  } else {
    loginForm.classList.remove('active');
    signupForm.classList.add('active');
    loginBtn.classList.remove('active');
    signupBtn.classList.add('active');
  }
}

function toggleSignupManagerFields(role) {
  const fields = document.getElementById('signup-manager-fields');
  if (fields) {
    fields.style.display = role === 'manager' ? 'block' : 'none';
  }
}

function handleLoginSubmit() {
  const emailVal = document.getElementById('login-email').value.trim().toLowerCase();
  const passwordVal = document.getElementById('login-password').value;
  const errorMsg = document.getElementById('login-error-msg');

  if (!emailVal || !passwordVal) {
    errorMsg.textContent = "Please fill in all fields.";
    return;
  }

  if (emailVal.length > 20 || passwordVal.length > 20) {
    errorMsg.textContent = "Fields cannot exceed 20 characters.";
    return;
  }

  apiClient.login(emailVal, passwordVal).then(user => {
    currentUser = user;
    currentRole = user.role;
    
    // Load from local database if exists, otherwise initialize and add
    let userInDb = registeredUsers.find(u => u.email === currentUser.email);
    if (userInDb) {
      walletBalance = userInDb.walletBalance !== undefined ? userInDb.walletBalance : 0.00;
      walletTransactions = userInDb.walletTransactions || [];
      if (userInDb.shopName) {
        currentUser.shopName = userInDb.shopName;
      }
    } else {
      walletBalance = 0.00;
      walletTransactions = [];
      userInDb = {
        name: currentUser.name || currentUser.full_name || "Lumora Shopper",
        email: currentUser.email,
        role: currentUser.role || "user",
        walletBalance: walletBalance,
        walletTransactions: walletTransactions
      };
      registeredUsers.push(userInDb);
      localStorage.setItem("lumora_registeredUsers", JSON.stringify(registeredUsers));
    }
    saveState();
    updateHeaderCounters();
    if (currentUser && currentUser.role === 'user') {
      window.location.hash = '#/search?q=';
    } else {
      renderAccountPage();
    }
  }).catch(err => {
    errorMsg.textContent = err.data && err.data.detail ? err.data.detail : "Invalid email or password.";
  });
}

function handleSignupSubmit() {
  const nameVal = document.getElementById('signup-name').value.trim();
  const emailVal = document.getElementById('signup-email').value.trim().toLowerCase();
  const passwordVal = document.getElementById('signup-password').value;
  const roleVal = document.getElementById('signup-role').value;
  const shopNameVal = document.getElementById('signup-shop-name') ? document.getElementById('signup-shop-name').value.trim() : '';
  const errorMsg = document.getElementById('signup-error-msg');

  if (!nameVal || !emailVal || !passwordVal) {
    errorMsg.textContent = "Please fill in all fields.";
    return;
  }

  if (nameVal.length > 20 || emailVal.length > 20 || passwordVal.length > 20 || shopNameVal.length > 20) {
    errorMsg.textContent = "Fields cannot exceed 20 characters.";
    return;
  }

  if (roleVal === 'manager' && !shopNameVal) {
    errorMsg.textContent = "Please specify your Shop Name.";
    return;
  }

  apiClient.register(emailVal, nameVal, passwordVal, roleVal, '').then(() => {
    // Automatically log in the user after registering
    apiClient.login(emailVal, passwordVal).then(user => {
      currentUser = user;
      currentRole = user.role;
      if (roleVal === 'manager' && shopNameVal) {
        currentUser.shopName = shopNameVal;
      }
      
      let userInDb = registeredUsers.find(u => u.email === currentUser.email);
      if (userInDb) {
        walletBalance = userInDb.walletBalance !== undefined ? userInDb.walletBalance : 0.00;
        walletTransactions = userInDb.walletTransactions || [];
        if (roleVal === 'manager' && shopNameVal) {
          userInDb.shopName = shopNameVal;
        }
      } else {
        walletBalance = 0.00;
        walletTransactions = [];
        userInDb = {
          name: currentUser.name || currentUser.full_name || "Lumora Shopper",
          email: currentUser.email,
          role: currentUser.role || "user",
          walletBalance: walletBalance,
          walletTransactions: walletTransactions,
          shopName: roleVal === 'manager' ? shopNameVal : undefined
        };
        registeredUsers.push(userInDb);
        localStorage.setItem("lumora_registeredUsers", JSON.stringify(registeredUsers));
      }
      saveState();
      updateHeaderCounters();
      if (currentUser && currentUser.role === 'user') {
        window.location.hash = '#/search?q=';
      } else {
        renderAccountPage();
      }
    });
  }).catch(err => {
    errorMsg.textContent = err.data && err.data.error ? err.data.error : "Registration failed. Email may already be in use.";
  });
}

function handleLogout() {
  apiClient.logout().then(() => {
    currentUser = null;
    currentRole = "user";
    walletBalance = 0.00;
    walletTransactions = [];
    
    // Close chat/agent sockets and hide customer chat window on logout
    const win = document.getElementById('customer-chat-window');
    if (win) {
      win.style.display = 'none';
    }
    const widget = document.getElementById('customer-chat-widget');
    if (widget) {
      widget.style.display = 'none';
    }
    if (chatSocket) {
      try { chatSocket.close(); } catch(e) {}
      chatSocket = null;
    }
    if (agentSocket) {
      try { agentSocket.close(); } catch(e) {}
      agentSocket = null;
    }
    if (managerActiveRoomSocket) {
      try { managerActiveRoomSocket.close(); } catch(e) {}
      managerActiveRoomSocket = null;
    }

    saveState();
    updateHeaderCounters();
    window.location.hash = "#/";
  });
}

function renderCustomerDashboard(container) {
  // Build the list of addresses
  let addressCardsHTML = '';
  if (savedAddresses.length === 0) {
    addressCardsHTML = `<p style="font-size:13px; color:var(--color-text-muted);">No saved addresses. Add an address below.</p>`;
  } else {
    addressCardsHTML = savedAddresses.map(addr => {
      const defaultBadge = addr.id === activeAddressId ? `<span class="address-default-badge">Default</span>` : '';
      const setBtn = addr.id !== activeAddressId ? `<button onclick="setAccountDefaultAddress(${addr.id})" class="address-action-btn">Set as Default</button>` : '';
      return `
        <div class="saved-address-card">
          <div class="address-info">
            <div class="address-header-row">
              <span class="address-label-badge">${addr.label}</span>
              ${defaultBadge}
            </div>
            <p class="address-details">${addr.line1}, ${addr.city}, ${addr.state} - ${addr.pincode}</p>
          </div>
          <div class="address-actions">
            ${setBtn}
            <button onclick="deleteAccountAddress(${addr.id})" class="address-delete-btn">Delete</button>
          </div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="container account-dashboard-layout">
      <div class="dashboard-header">
        <div>
          <h2 class="dashboard-title">Your Account</h2>
          <p class="dashboard-user-info">Logged in as: <strong>${currentUser.name}</strong> (${currentUser.email})</p>
        </div>
        <button onclick="handleLogout()" class="btn-primary" style="padding: 10px 16px; border-radius: 8px; font-size: 13px; background-color: #c0392b; cursor:pointer;">Logout</button>
      </div>

      <div class="account-tiles-grid">
        <a href="#/orders" class="account-tile">
          <div class="tile-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </div>
          <div class="tile-text">
            <h3>Your Orders</h3>
            <p>Track, return, or buy items again.</p>
          </div>
        </a>

        <a href="#/wishlist" class="account-tile">
          <div class="tile-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </div>
          <div class="tile-text">
            <h3>Your Wish List</h3>
            <p>View, edit, or add items to cart.</p>
          </div>
        </a>

        <a href="#/wallet" class="account-tile">
          <div class="tile-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <div class="tile-text">
            <h3>Payment & Wallet</h3>
            <p>Redeem gift cards, load funds, or view history.</p>
          </div>
        </a>
      </div>

      <div class="account-settings-row" style="grid-template-columns: 1fr;">
        <!-- Multiple Saved Addresses card -->
        <div class="account-settings-card">
          <h3>Your Addresses</h3>
          <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:16px;">Manage your saved shipping addresses for faster checkouts.</p>
          
          <div id="account-saved-addresses-list" style="margin-bottom:24px; display:flex; flex-direction:column; gap:12px;">
            ${addressCardsHTML}
          </div>

          <div style="border-top:1px solid var(--color-border); padding-top:20px; margin-top:20px;">
            <h4 style="font-family:var(--font-heading); font-size:20px; color:var(--color-primary); margin-bottom:12px;">Add a New Address</h4>
            
            <div class="form-group" style="margin-bottom:10px;">
              <label for="acc-address-label">Address Type (e.g. Home, Work)</label>
              <select id="acc-address-label" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--color-border); font-family:var(--font-body); font-size:13px;">
                <option value="Home">Home</option>
                <option value="Work">Work</option>
                <option value="School">School</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="acc-address-line1">Address Line 1</label>
              <input type="text" id="acc-address-line1" placeholder="Street Address, P.O. Box">
            </div>
            
            <div class="form-row" style="display:flex; gap:12px; margin-top:12px;">
              <div class="form-group" style="flex:1;">
                <label for="acc-address-city">City</label>
                <input type="text" id="acc-address-city">
              </div>
              <div class="form-group" style="flex:1;">
                <label for="acc-address-state">State</label>
                <input type="text" id="acc-address-state">
              </div>
              <div class="form-group" style="flex:1;">
                <label for="acc-address-pincode">Pincode</label>
                <input type="text" id="acc-address-pincode">
              </div>
            </div>
            
            <button onclick="addAccountAddress()" class="btn-primary" style="margin-top:16px; padding: 10px 20px; font-size:13px; border-radius:8px;">Add Address</button>
            <span id="acc-address-msg" style="font-size:12px; margin-left:12px; color:var(--color-primary); font-weight:600;"></span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function addAccountAddress() {
  const labelInput = document.getElementById('acc-address-label');
  const line1Input = document.getElementById('acc-address-line1');
  const cityInput = document.getElementById('acc-address-city');
  const stateInput = document.getElementById('acc-address-state');
  const pincodeInput = document.getElementById('acc-address-pincode');
  const msgSpan = document.getElementById('acc-address-msg');

  if (!line1Input || !cityInput || !stateInput || !pincodeInput) return;

  const label = labelInput ? labelInput.value : "Home";
  const line1 = line1Input.value.trim();
  const city = cityInput.value.trim();
  const state = stateInput.value.trim();
  const pincode = pincodeInput.value.trim();

  if (!line1 || !city || !state || !pincode) {
    alert("Please fill in all address fields.");
    return;
  }

  const newId = savedAddresses.length > 0 ? Math.max(...savedAddresses.map(a => a.id)) + 1 : 0;
  const newAddr = { id: newId, label, line1, city, state, pincode };
  savedAddresses.push(newAddr);

  // If first address, make default
  if (savedAddresses.length === 1) {
    activeAddressId = newId;
    shippingAddress = { line1, city, state, pincode };
  }

  saveState();
  renderAccountPage();

  // Clear fields
  line1Input.value = "";
  cityInput.value = "";
  stateInput.value = "";
  pincodeInput.value = "";

  if (msgSpan) {
    msgSpan.textContent = "Address added successfully!";
    setTimeout(() => { msgSpan.textContent = ""; }, 3000);
  }
}

function deleteAccountAddress(id) {
  if (savedAddresses.length <= 1) {
    alert("You must keep at least one saved address in your account.");
    return;
  }
  savedAddresses = savedAddresses.filter(a => a.id !== id);
  if (activeAddressId === id) {
    activeAddressId = savedAddresses[0].id;
    shippingAddress = {
      line1: savedAddresses[0].line1,
      city: savedAddresses[0].city,
      state: savedAddresses[0].state,
      pincode: savedAddresses[0].pincode
    };
  }
  saveState();
  renderAccountPage();
}

function setAccountDefaultAddress(id) {
  activeAddressId = id;
  const addr = savedAddresses.find(a => a.id === id);
  if (addr) {
    shippingAddress = {
      line1: addr.line1,
      city: addr.city,
      state: addr.state,
      pincode: addr.pincode
    };
  }
  saveState();
  renderAccountPage();
}

function renderManagerDashboard(container) {
  const shopName = currentUser.shopName || "Manager Shop";
  const myProducts = products.filter(p => p.seller && p.seller.shop_name === shopName).sort((a, b) => b.id - a.id);
  
  // Tab Header Navigation
  const tabNavHTML = `
    <div class="dashboard-tabs-nav" style="display:flex; gap:16px; margin-bottom:24px; border-bottom:1px solid var(--color-border); padding-bottom:8px;">
      <button onclick="setManagerTab('listings')" class="dashboard-tab-link" style="background:none; border:none; padding:8px 12px; font-weight:600; cursor:pointer; color:${activeManagerTab === 'listings' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; border-bottom:${activeManagerTab === 'listings' ? '2px solid var(--color-primary)' : 'none'};">Listings & Add</button>
      <button onclick="setManagerTab('orders')" class="dashboard-tab-link" style="background:none; border:none; padding:8px 12px; font-weight:600; cursor:pointer; color:${activeManagerTab === 'orders' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; border-bottom:${activeManagerTab === 'orders' ? '2px solid var(--color-primary)' : 'none'};">Orders & Requests</button>
      <button onclick="setManagerTab('alerts')" class="dashboard-tab-link" style="background:none; border:none; padding:8px 12px; font-weight:600; cursor:pointer; color:${activeManagerTab === 'alerts' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; border-bottom:${activeManagerTab === 'alerts' ? '2px solid var(--color-primary)' : 'none'};">Alerts & Notifications</button>
      <button onclick="setManagerTab('chat')" class="dashboard-tab-link" style="background:none; border:none; padding:8px 12px; font-weight:600; cursor:pointer; color:${activeManagerTab === 'chat' ? 'var(--color-primary)' : 'var(--color-text-muted)'}; border-bottom:${activeManagerTab === 'chat' ? '2px solid var(--color-primary)' : 'none'};">Support Chat</button>
    </div>
  `;

  let mainContentHTML = '';

  if (activeManagerTab === 'listings') {
    let productsRowsHTML = '';
    if (myProducts.length === 0) {
      productsRowsHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-text-muted);">No products listed yet. Create one below.</td></tr>`;
    } else {
      productsRowsHTML = myProducts.map(p => {
        const statusLabel = p.status || "Approved";
        const badgeClass = statusLabel === "Pending" ? "pending" : "approved";
        
        let stockHTML = '';
        if (p.stock === 0) {
          stockHTML = `<span class="status-badge out-of-stock" style="background-color:#c0392b; color:white; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; display:inline-block; margin-top:4px;">Out of Stock</span>`;
        } else if (p.stock <= 5) {
          stockHTML = `<span class="status-badge low-stock" style="background-color:#d35400; color:white; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; display:inline-block; margin-top:4px;">Low Stock (${p.stock})</span>`;
        } else {
          stockHTML = `<span style="font-size:11px; color:#27ae60; font-weight:600;">In Stock (${p.stock})</span>`;
        }

        let stockCellHTML = '';
        if (p.sizesStock) {
          if (p.sizesStock.freesize !== undefined) {
            stockCellHTML = `
              <div style="font-size:11px; margin-bottom:4px;"><strong>Free Size</strong></div>
              <div class="inline-edit-form" style="margin-bottom:6px;">
                <input type="number" class="inline-edit-input" id="mgr-stock-free-${p.id}" value="${p.sizesStock.freesize}" style="width:50px;">
                <button onclick="updateManagerProductSizesStock(${p.id}, 'freesize')" class="inline-edit-btn">Save</button>
              </div>
            `;
          } else {
            stockCellHTML = `
              <div style="font-size:11px; margin-bottom:4px;"><strong>Sizes</strong></div>
              <div style="display:flex; flex-direction:column; gap:4px;">
                <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:4px; font-size:11px; text-align:center;">
                  <div>XS<br><input type="number" id="mgr-stock-xs-${p.id}" value="${p.sizesStock.XS || 0}" style="width:30px; text-align:center; padding:2px; font-size:10px; border-radius:4px; border:1px solid var(--color-border);"></div>
                  <div>S<br><input type="number" id="mgr-stock-s-${p.id}" value="${p.sizesStock.S || 0}" style="width:30px; text-align:center; padding:2px; font-size:10px; border-radius:4px; border:1px solid var(--color-border);"></div>
                  <div>M<br><input type="number" id="mgr-stock-m-${p.id}" value="${p.sizesStock.M || 0}" style="width:30px; text-align:center; padding:2px; font-size:10px; border-radius:4px; border:1px solid var(--color-border);"></div>
                  <div>L<br><input type="number" id="mgr-stock-l-${p.id}" value="${p.sizesStock.L || 0}" style="width:30px; text-align:center; padding:2px; font-size:10px; border-radius:4px; border:1px solid var(--color-border);"></div>
                  <div>XL<br><input type="number" id="mgr-stock-xl-${p.id}" value="${p.sizesStock.XL || 0}" style="width:30px; text-align:center; padding:2px; font-size:10px; border-radius:4px; border:1px solid var(--color-border);"></div>
                </div>
                <button onclick="updateManagerProductSizesStock(${p.id}, 'standard')" class="inline-edit-btn" style="width:100%; margin-top:2px;">Save Sizes</button>
              </div>
            `;
          }
        } else {
          stockCellHTML = `
            <div class="inline-edit-form" style="margin-bottom:6px;">
              <input type="number" class="inline-edit-input" id="mgr-stock-${p.id}" value="${p.stock}" style="width:50px;">
              <button onclick="updateManagerProductStock(${p.id})" class="inline-edit-btn">Save</button>
            </div>
          `;
        }

        return `
          <tr>
            <td>${p.id}</td>
            <td><img src="${p.image}" alt="${p.name}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
            <td><strong>${p.name}</strong><br><span style="font-size:11px; color:var(--color-text-muted);">${p.category}</span></td>
            <td>
              <div class="inline-edit-form">
                <span style="font-weight:600;">₹</span>
                <input type="number" step="0.01" class="inline-edit-input" id="mgr-price-${p.id}" value="${p.price.toFixed(2)}" style="width:60px;">
                <button onclick="updateManagerProductPrice(${p.id})" class="inline-edit-btn">Save</button>
              </div>
            </td>
            <td>
              ${stockCellHTML}
              ${stockHTML}
            </td>
            <td><span class="status-badge ${badgeClass}">${statusLabel}</span></td>
          </tr>
        `;
      }).join('');
    }

    mainContentHTML = `
      <div class="account-settings-row">
        <!-- Add Product Form Card -->
        <div class="account-settings-card">
          <h3 class="dashboard-section-title" style="margin-top:0;">Add a New Product</h3>
          <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:16px;">Submit a new catalog item. Items remain pending until approved by system admin.</p>
          
          <div class="auth-form-group">
            <label for="mgr-prod-name">Product Title</label>
            <input type="text" id="mgr-prod-name" placeholder="e.g. Handmade Linen Towel">
          </div>
          <div class="auth-form-group">
            <label for="mgr-prod-category">Product Category</label>
            <select id="mgr-prod-category">
              <option value="Women">Women</option>
              <option value="Men">Men</option>
              <option value="Home & Living">Home & Living</option>
              <option value="Beauty">Beauty</option>
              <option value="Accessories">Accessories</option>
            </select>
          </div>
          <div class="form-row" style="display:flex; gap:12px; margin-bottom:12px;">
            <div class="auth-form-group" style="flex:1;">
              <label for="mgr-prod-price">Retail Price (₹)</label>
              <input type="number" step="0.01" id="mgr-prod-price" placeholder="29.99">
            </div>
            <div class="auth-form-group" style="flex:1;">
              <label for="mgr-prod-size-type">Sizing Option</label>
              <select id="mgr-prod-size-type" onchange="toggleManagerSizeInputs()" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--color-border); font-family:var(--font-body); font-size:13px; outline:none; height:40px; box-sizing:border-box;">
                <option value="freesize">Free Size (Single Size)</option>
                <option value="standard">Standard Sizes (XS, S, M, L, XL)</option>
              </select>
            </div>
          </div>
          
          <!-- Free Size Input -->
          <div id="mgr-size-freesize-container" class="auth-form-group" style="margin-bottom:12px;">
            <label for="mgr-prod-stock-freesize">Free Size Stock Quantity</label>
            <input type="number" id="mgr-prod-stock-freesize" placeholder="e.g. 10" value="10" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--color-border); font-family:var(--font-body); font-size:13px; box-sizing:border-box;">
          </div>
          
          <!-- Standard Sizes Inputs -->
          <div id="mgr-size-standard-container" style="display:none; margin-bottom:16px;">
            <label style="font-weight:600; display:block; margin-bottom:8px; font-size:13px;">Stock for Each Size</label>
            <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:8px;">
              <div>
                <label style="font-size:11px; text-align:center; display:block; margin-bottom:2px; font-weight:600;">XS</label>
                <input type="number" id="mgr-stock-xs" placeholder="0" value="0" style="width:100%; text-align:center; padding:8px; border-radius:8px; border:1px solid var(--color-border); box-sizing:border-box;">
              </div>
              <div>
                <label style="font-size:11px; text-align:center; display:block; margin-bottom:2px; font-weight:600;">S</label>
                <input type="number" id="mgr-stock-s" placeholder="0" value="0" style="width:100%; text-align:center; padding:8px; border-radius:8px; border:1px solid var(--color-border); box-sizing:border-box;">
              </div>
              <div>
                <label style="font-size:11px; text-align:center; display:block; margin-bottom:2px; font-weight:600;">M</label>
                <input type="number" id="mgr-stock-m" placeholder="0" value="0" style="width:100%; text-align:center; padding:8px; border-radius:8px; border:1px solid var(--color-border); box-sizing:border-box;">
              </div>
              <div>
                <label style="font-size:11px; text-align:center; display:block; margin-bottom:2px; font-weight:600;">L</label>
                <input type="number" id="mgr-stock-l" placeholder="0" value="0" style="width:100%; text-align:center; padding:8px; border-radius:8px; border:1px solid var(--color-border); box-sizing:border-box;">
              </div>
              <div>
                <label style="font-size:11px; text-align:center; display:block; margin-bottom:2px; font-weight:600;">XL</label>
                <input type="number" id="mgr-stock-xl" placeholder="0" value="0" style="width:100%; text-align:center; padding:8px; border-radius:8px; border:1px solid var(--color-border); box-sizing:border-box;">
              </div>
            </div>
          </div>
          <div class="auth-form-group">
            <label for="mgr-prod-desc">Description</label>
            <textarea id="mgr-prod-desc" rows="3" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--color-border); font-family:var(--font-body); font-size:13px; resize:vertical;" placeholder="Describe product details, sizing, material details..."></textarea>
          </div>
          <div class="auth-form-group">
            <label for="mgr-prod-loyalty-points">Loyalty Points to Award</label>
            <input type="number" step="0.01" id="mgr-prod-loyalty-points" placeholder="e.g. 5.00" value="0.00">
          </div>
          <div class="auth-form-group">
            <label for="mgr-prod-image-file">Upload Product Image</label>
            <input type="file" id="mgr-prod-image-file" accept="image/*" onchange="previewManagerImage(event)" style="padding: 8px;">
            <div style="margin-top:10px;">
              <img id="mgr-prod-image-preview" src="" style="max-width:120px; max-height:120px; display:none; border-radius:8px; border:1px solid var(--color-border); object-fit:cover;">
            </div>
          </div>
          <button onclick="addManagerProduct()" class="auth-submit-btn">Submit Product Listing</button>
          <div id="mgr-prod-success" style="font-size:13px; color:var(--color-primary); font-weight:600; margin-top:8px; text-align:center;"></div>
        </div>

        <!-- My Products List Card -->
        <div class="account-settings-card" style="overflow-x:auto;">
          <h3 class="dashboard-section-title" style="margin-top:0;">My Catalog Listings</h3>
          <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:16px;">Update pricing and stock levels directly below.</p>
          <table class="dashboard-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Img</th>
                <th>Product details</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${productsRowsHTML}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (activeManagerTab === 'orders') {
    // Filter orders containing items from this manager's shop
    const managerOrders = orders.filter(order =>
      order.items.some(item => item.product.seller && item.product.seller.shop_name === shopName)
    );

    // 1. Active Orders Table
    const activeOrders = managerOrders.filter(o => 
      o.status !== 'cancelled' && o.status !== 'returned' && o.status !== 'cancellation_requested' && o.status !== 'return_requested'
    );
    let activeOrdersHTML = '';
    if (activeOrders.length === 0) {
      activeOrdersHTML = `<tr><td colspan="6" style="text-align:center; padding:12px; color:var(--color-text-muted);">No active customer orders.</td></tr>`;
    } else {
      activeOrdersHTML = activeOrders.map(order => {
        const myItemsHTML = order.items
          .filter(item => item.product.seller && item.product.seller.shop_name === shopName)
          .map(item => `• ${item.product.name} (Qty: ${item.quantity})`)
          .join('<br>');

        return `
          <tr>
            <td>#${order.id}</td>
            <td>${order.dateStr}</td>
            <td><span style="font-size:11px; font-weight:600;">${order.customer_email}</span></td>
            <td><div style="font-size:11px; text-align:left;">${myItemsHTML}</div></td>
            <td><strong>₹${order.total_amount.toFixed(2)}</strong><br><span style="font-size:10px; color:var(--color-text-muted);">${order.payment_method.toUpperCase()}</span></td>
            <td>
              <div style="display:flex; flex-direction:column; gap:6px;">
                <span class="status-badge approved" style="font-size:10px; text-transform:uppercase;">${order.status}</span>
                <select onchange="managerUpdateOrderStatus(${order.id}, this.value)" style="padding:4px; border-radius:4px; border:1px solid var(--color-border); font-size:11px;">
                  <option value="">-- Actions --</option>
                  <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirm</option>
                  <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Ship</option>
                  <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Deliver</option>
                  <option value="cancelled">Cancel</option>
                </select>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 2. Cancellation Requests Table
    const cancelRequests = managerOrders.filter(o => o.status === 'cancellation_requested');
    let cancelRequestsHTML = '';
    if (cancelRequests.length === 0) {
      cancelRequestsHTML = `<tr><td colspan="5" style="text-align:center; padding:12px; color:var(--color-text-muted);">No pending cancellation requests.</td></tr>`;
    } else {
      cancelRequestsHTML = cancelRequests.map(order => {
        const myItemsHTML = order.items
          .filter(item => item.product.seller && item.product.seller.shop_name === shopName)
          .map(item => `• ${item.product.name} (Qty: ${item.quantity})`)
          .join('<br>');

        return `
          <tr>
            <td>#${order.id}</td>
            <td><span style="font-size:11px; font-weight:600;">${order.customer_email}</span></td>
            <td><div style="font-size:11px; text-align:left;">${myItemsHTML}</div></td>
            <td><strong>₹${order.total_amount.toFixed(2)}</strong></td>
            <td>
              <div style="display:flex; gap:6px;">
                <button onclick="managerApproveCancellation(${order.id})" class="inline-edit-btn" style="background-color:#27ae60; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Approve</button>
                <button onclick="managerRejectCancellation(${order.id})" class="inline-edit-btn" style="background-color:#c0392b; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Reject</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 3. Return Requests Table
    const returnRequests = managerOrders.filter(o => o.status === 'return_requested');
    let returnRequestsHTML = '';
    if (returnRequests.length === 0) {
      returnRequestsHTML = `<tr><td colspan="6" style="text-align:center; padding:12px; color:var(--color-text-muted);">No pending return requests.</td></tr>`;
    } else {
      returnRequestsHTML = returnRequests.map(order => {
        const myItemsHTML = order.items
          .filter(item => item.product.seller && item.product.seller.shop_name === shopName)
          .map(item => `• ${item.product.name} (Qty: ${item.quantity})`)
          .join('<br>');

        return `
          <tr>
            <td>#${order.id}</td>
            <td><span style="font-size:11px; font-weight:600;">${order.customer_email}</span></td>
            <td><div style="font-size:11px; text-align:left;">${myItemsHTML}</div></td>
            <td><span style="font-size:12px; color:var(--color-text-muted); font-style:italic;">"${order.return_reason || 'No reason specified'}"</span></td>
            <td><strong>₹${order.total_amount.toFixed(2)}</strong></td>
            <td>
              <div style="display:flex; flex-direction:column; gap:6px;">
                <div style="display:flex; gap:6px;">
                  <button onclick="managerApproveReturn(${order.id})" class="inline-edit-btn" style="background-color:#27ae60; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Approve</button>
                  <button onclick="managerRejectReturn(${order.id})" class="inline-edit-btn" style="background-color:#c0392b; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">Reject</button>
                </div>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    mainContentHTML = `
      <div style="display:flex; flex-direction:column; gap:24px;">
        <!-- Active Orders Card -->
        <div class="account-settings-card" style="overflow-x:auto;">
          <h3 class="dashboard-section-title" style="margin-top:0; color:var(--color-primary);">Active Customer Orders</h3>
          <table class="dashboard-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Customer</th>
                <th>My Items</th>
                <th>Total Value</th>
                <th>Status / Actions</th>
              </tr>
            </thead>
            <tbody>
              ${activeOrdersHTML}
            </tbody>
          </table>
        </div>

        <!-- Cancellation Requests Card -->
        <div class="account-settings-card" style="overflow-x:auto;">
          <h3 class="dashboard-section-title" style="margin-top:0; color:#d35400;">Pending Cancellation Requests (Shipped/Processing)</h3>
          <table class="dashboard-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items Requested</th>
                <th>Order Value</th>
                <th>Action Panel</th>
              </tr>
            </thead>
            <tbody>
              ${cancelRequestsHTML}
            </tbody>
          </table>
        </div>

        <!-- Return Requests Card -->
        <div class="account-settings-card" style="overflow-x:auto;">
          <h3 class="dashboard-section-title" style="margin-top:0; color:var(--color-primary);">Pending Return Requests (Delivered)</h3>
          <table class="dashboard-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Items Returned</th>
                <th>Return Reason</th>
                <th>Order Value</th>
                <th>Action Panel</th>
              </tr>
            </thead>
            <tbody>
              ${returnRequestsHTML}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } else if (activeManagerTab === 'alerts') {
    const alerts = managerNotifications.filter(n => n.shopName === shopName);
    let alertsHTML = '';
    
    if (alerts.length === 0) {
      alertsHTML = `<div style="text-align:center; padding:32px; color:var(--color-text-muted);">No notification logs recorded for your shop yet. All stock reductions, low stock warnings, and orders will show here.</div>`;
    } else {
      alertsHTML = alerts.map(n => {
        let borderColor = 'var(--color-border)';
        let badgeBg = 'var(--color-primary)';
        if (n.type === 'warning') {
          borderColor = '#e67e22';
          badgeBg = '#e67e22';
        } else if (n.type === 'error') {
          borderColor = '#c0392b';
          badgeBg = '#c0392b';
        }

        return `
          <div class="notification-item" style="border-left: 4px solid ${borderColor}; padding: 12px; margin-bottom: 12px; background-color: white; border-radius: 6px; box-shadow: 0 2px 4px var(--color-shadow); display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span class="status-badge" style="background-color:${badgeBg}; color:white; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:600; text-transform:uppercase; margin-right:8px;">${n.type}</span>
              <span style="font-size:13px; font-weight:500;">${n.message}</span>
            </div>
            <span style="font-size:11px; color:var(--color-text-muted); font-style:italic;">${n.timestamp}</span>
          </div>
        `;
      }).join('');
    }

    mainContentHTML = `
      <div class="account-settings-card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
          <h3 class="dashboard-section-title" style="margin:0;">Store Alerts & Real-Time Logs</h3>
          ${alerts.length > 0 ? `<button onclick="managerClearNotifications()" class="address-delete-btn" style="font-size:12px; padding:6px 12px; border-radius:6px; border:1px solid #c0392b; color:#c0392b;">Clear All Alerts</button>` : ''}
        </div>
        <div style="max-height: 500px; overflow-y:auto; padding-right:6px;">
          ${alertsHTML}
        </div>
      </div>
    `;
  } else if (activeManagerTab === 'chat') {
    mainContentHTML = `
      <div class="manager-chat-dashboard">
        <div class="room-list-sidebar">
          <div style="padding: 16px; border-bottom: 1px solid var(--color-border); font-weight: 600; background-color: var(--color-primary); color: #fff;">
            Chat Support <span id="mgr-chat-count" style="background:#fff; color:var(--color-primary); border-radius:10px; padding:2px 8px; font-size:11px; margin-left:8px;">0</span>
          </div>
          <div style="display:flex; border-bottom:1px solid var(--color-border); background-color:#fbfaf7;">
            <div id="mgr-chat-tab-open" class="mgr-chat-tab active" onclick="setManagerChatFilter('open')">Open</div>
            <div id="mgr-chat-tab-picked_up" class="mgr-chat-tab" onclick="setManagerChatFilter('picked_up')">Active</div>
            <div id="mgr-chat-tab-closed" class="mgr-chat-tab" onclick="setManagerChatFilter('closed')">Closed</div>
          </div>
          <style>
            .mgr-chat-tab { flex:1; padding:8px; text-align:center; font-size:12px; cursor:pointer; color:var(--color-text-muted); font-weight:600; }
            .mgr-chat-tab.active { border-bottom:2px solid var(--color-primary); color:var(--color-primary); }
          </style>
          <div id="mgr-chat-rooms-list" style="overflow-y:auto; height:calc(100% - 85px);">
            <div style="padding: 16px; font-size: 12px; color: var(--color-text-muted); text-align: center;">Loading...</div>
          </div>
        </div>
        <div class="chat-workspace" style="display: flex; flex-direction: column; background: #fff; border: 1px solid var(--color-border, #ddd); border-radius: 8px; overflow: hidden; height: 100%;">
          <div id="mgr-chat-header" class="chat-header" style="background-color: var(--color-primary, #2a433a); color: #fff; padding: 16px; display: flex; justify-content: space-between; align-items: center; font-weight: 600;">
            <span>Select a chat to begin</span>
          </div>
          <div id="mgr-chat-context-banner"></div>
          <div class="chat-messages" id="mgr-chat-messages" style="flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background-color: #f9f9f9; height: 400px; min-height: 400px;">
          </div>
          <div class="chat-input-area" id="mgr-chat-input-area" style="display: none; padding: 16px; border-top: 1px solid #eee; gap: 8px; background: #fff; align-items: center;">
            <input type="text" id="mgr-chat-input" placeholder="Type a message..." onkeypress="handleManagerChatKeypress(event)" maxlength="250" style="flex: 1; padding: 10px; border-radius: 20px; border: 1px solid #ddd; outline: none;">
            <button onclick="sendManagerChatMessage()" style="background: var(--color-primary, #2a433a); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => {
      initManagerChatDashboard();
    }, 100);
  }

  container.innerHTML = `
    <div class="container account-dashboard-layout">
      <div class="dashboard-header" style="margin-bottom:16px;">
        <div>
          <h2 class="dashboard-title">Store Manager Dashboard</h2>
          <p class="dashboard-user-info">Shop Merchant: <strong>${shopName}</strong> | Manager: <strong>${currentUser.name}</strong></p>
        </div>
        <button onclick="handleLogout()" class="btn-primary" style="padding: 10px 16px; border-radius: 8px; font-size: 13px; background-color: #c0392b; cursor:pointer;">Logout</button>
      </div>

      ${tabNavHTML}
      ${mainContentHTML}
    </div>
  `;
}

function previewManagerImage(event) {
  const file = event.target.files[0];
  const preview = document.getElementById('mgr-prod-image-preview');
  if (!preview) return;

  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        // Downscale image to max 300px width/height to save localStorage quota
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 300;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Get compressed Base64 jpeg (70% quality)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        preview.src = compressedDataUrl;
        preview.style.display = 'block';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  } else {
    preview.src = "";
    preview.style.display = 'none';
  }
}

function toggleManagerSizeInputs() {
  const sizeTypeSelect = document.getElementById('mgr-prod-size-type');
  if (!sizeTypeSelect) return;
  const sizeType = sizeTypeSelect.value;
  const freesizeContainer = document.getElementById('mgr-size-freesize-container');
  const standardContainer = document.getElementById('mgr-size-standard-container');
  if (sizeType === 'standard') {
    if (freesizeContainer) freesizeContainer.style.display = 'none';
    if (standardContainer) standardContainer.style.display = 'block';
  } else {
    if (freesizeContainer) freesizeContainer.style.display = 'block';
    if (standardContainer) standardContainer.style.display = 'none';
  }
}

function updateManagerProductSizesStock(id, type) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  if (type === 'freesize') {
    const input = document.getElementById(`mgr-stock-free-${id}`);
    if (!input) return;
    const val = parseInt(input.value);
    if (isNaN(val) || val < 0) {
      alert("Please enter a valid stock level.");
      return;
    }
    product.sizesStock = { "freesize": val };
    product.stock = val;
  } else {
    const xsVal = parseInt(document.getElementById(`mgr-stock-xs-${id}`).value) || 0;
    const sVal = parseInt(document.getElementById(`mgr-stock-s-${id}`).value) || 0;
    const mVal = parseInt(document.getElementById(`mgr-stock-m-${id}`).value) || 0;
    const lVal = parseInt(document.getElementById(`mgr-stock-l-${id}`).value) || 0;
    const xlVal = parseInt(document.getElementById(`mgr-stock-xl-${id}`).value) || 0;

    if (xsVal < 0 || sVal < 0 || mVal < 0 || lVal < 0 || xlVal < 0) {
      alert("Stock levels cannot be negative.");
      return;
    }

    product.sizesStock = { "XS": xsVal, "S": sVal, "M": mVal, "L": lVal, "XL": xlVal };
    product.stock = xsVal + sVal + mVal + lVal + xlVal;
  }

  saveState();
  alert("Product size stocks updated successfully.");
  renderAccountPage();
}

function addManagerProduct() {
  const nameInput = document.getElementById('mgr-prod-name');
  const catInput = document.getElementById('mgr-prod-category');
  const priceInput = document.getElementById('mgr-prod-price');
  const descInput = document.getElementById('mgr-prod-desc');
  const loyaltyInput = document.getElementById('mgr-prod-loyalty-points');
  const preview = document.getElementById('mgr-prod-image-preview');
  const successMsg = document.getElementById('mgr-prod-success');

  if (!nameInput || !priceInput || !descInput) return;

  const name = nameInput.value.trim();
  const category = catInput.value;
  const price = parseFloat(priceInput.value);
  const description = descInput.value.trim();
  const loyalty_points = loyaltyInput ? parseFloat(loyaltyInput.value) || 0 : 0;
  
  // Read Sizing Info
  const sizeTypeSelect = document.getElementById('mgr-prod-size-type');
  let sizesStock = {};
  let stock = 0;

  if (sizeTypeSelect) {
    const sizeType = sizeTypeSelect.value;
    if (sizeType === 'standard') {
      const xs = parseInt(document.getElementById('mgr-stock-xs').value) || 0;
      const s = parseInt(document.getElementById('mgr-stock-s').value) || 0;
      const m = parseInt(document.getElementById('mgr-stock-m').value) || 0;
      const l = parseInt(document.getElementById('mgr-stock-l').value) || 0;
      const xl = parseInt(document.getElementById('mgr-stock-xl').value) || 0;
      sizesStock = { "XS": xs, "S": s, "M": m, "L": l, "XL": xl };
      stock = xs + s + m + l + xl;
    } else {
      const f = parseInt(document.getElementById('mgr-prod-stock-freesize').value) || 0;
      sizesStock = { "freesize": f };
      stock = f;
    }
  } else {
    stock = 10; // fallback
    sizesStock = { "freesize": 10 };
  }
  
  let image = "assets/hero_model.png"; // default fallback
  if (preview && preview.src && preview.src.startsWith('data:image')) {
    image = preview.src;
  }

  if (!name || isNaN(price) || !description) {
    alert("Please fill in all product fields.");
    return;
  }

  const shopName = currentUser.shopName || "Manager Shop";
  const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 0;

  const newProduct = {
    id: newId,
    name,
    price,
    discount_price: null,
    rating: 5.0,
    reviews: 0,
    image,
    category,
    stock,
    sizesStock,
    loyalty_points,
    seller: {
      shop_name: shopName,
      gst_number: "29MERCH" + Math.floor(10000 + Math.random() * 90000) + "Z9",
      commission_rate: 10.0
    },
    description,
    reviewsList: [],
    status: "Pending"
  };

  products.push(newProduct);
  saveState();

  nameInput.value = "";
  priceInput.value = "";
  descInput.value = "";
  if (loyaltyInput) loyaltyInput.value = "0.00";
  
  // Reset sizes inputs
  if (document.getElementById('mgr-stock-xs')) document.getElementById('mgr-stock-xs').value = "0";
  if (document.getElementById('mgr-stock-s')) document.getElementById('mgr-stock-s').value = "0";
  if (document.getElementById('mgr-stock-m')) document.getElementById('mgr-stock-m').value = "0";
  if (document.getElementById('mgr-stock-l')) document.getElementById('mgr-stock-l').value = "0";
  if (document.getElementById('mgr-stock-xl')) document.getElementById('mgr-stock-xl').value = "0";
  if (document.getElementById('mgr-prod-stock-freesize')) document.getElementById('mgr-prod-stock-freesize').value = "10";
  if (sizeTypeSelect) {
    sizeTypeSelect.value = "freesize";
    toggleManagerSizeInputs();
  }
  
  const fileInput = document.getElementById('mgr-prod-image-file');
  if (fileInput) fileInput.value = "";
  if (preview) {
    preview.src = "";
    preview.style.display = "none";
  }

  if (successMsg) {
    successMsg.textContent = "Product submitted successfully for Admin approval!";
    setTimeout(() => { successMsg.textContent = ""; }, 3000);
  }

  renderAccountPage();
}

function setManagerTab(tab) {
  activeManagerTab = tab;
  renderAccountPage();
}



function managerApproveCancellation(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = 'cancelled';
  order.tracking.push({
    status: 'cancelled',
    description: 'Cancellation request approved by store manager.',
    time: Date.now()
  });

  // Restore inventory
  order.items.forEach(item => {
    const product = products.find(p => p.id == item.product.id);
    if (product) product.stock += item.quantity;
  });

  // Refund if wallet
  if (order.payment_method === 'wallet') {
    refundOrderToCustomer(order, `Refund for Cancelled Order #${order.id}`);
  }

  saveState();
  renderAccountPage();
  alert(`Order #${orderId} cancellation request approved.`);
}

function managerRejectCancellation(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  // Revert back to shipped or confirmed
  order.status = 'shipped';
  order.tracking.push({
    status: 'shipped',
    description: 'Cancellation request rejected by store manager. Order remains active.',
    time: Date.now()
  });

  saveState();
  renderAccountPage();
  alert(`Order #${orderId} cancellation request rejected.`);
}

function managerApproveReturn(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = 'return_approved';
  order.tracking.push({
    status: 'return_approved',
    description: 'Return request approved by store manager. Return package is in transit.',
    time: Date.now()
  });

  saveState();
  renderAccountPage();
  alert(`Order #${orderId} return request approved. Awaiting return package transit.`);
}

function managerRejectReturn(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = 'delivered';
  order.tracking.push({
    status: 'delivered',
    description: 'Return request rejected by store manager.',
    time: Date.now()
  });

  saveState();
  renderAccountPage();
  alert(`Order #${orderId} return request rejected.`);
}

function managerClearNotifications() {
  const shopName = currentUser.shopName || "Manager Shop";
  managerNotifications = managerNotifications.filter(n => n.shopName !== shopName);
  saveState();
  renderAccountPage();
}

function updateManagerProductPrice(id) {
  const input = document.getElementById(`mgr-price-${id}`);
  if (!input) return;
  const newPrice = parseFloat(input.value);
  if (isNaN(newPrice) || newPrice < 0) {
    alert("Please enter a valid price.");
    return;
  }
  const product = products.find(p => p.id === id);
  if (product) {
    product.price = newPrice;
    saveState();
    alert("Product price updated successfully.");
    renderAccountPage();
  }
}

function updateManagerProductStock(id) {
  const input = document.getElementById(`mgr-stock-${id}`);
  if (!input) return;
  const newStock = parseInt(input.value);
  if (isNaN(newStock) || newStock < 0) {
    alert("Please enter a valid stock level.");
    return;
  }
  const product = products.find(p => p.id === id);
  if (product) {
    product.stock = newStock;
    saveState();
    alert("Product stock updated successfully.");
    renderAccountPage();
  }
}

function renderAdminDashboard(container) {
  const pendingProducts = products.filter(p => p.status === "Pending").sort((a, b) => b.id - a.id);
  const approvedProducts = products.filter(p => !p.status || p.status === "Approved").sort((a, b) => b.id - a.id);

  // 1. Calculate Daily Analytics Metrics
  const activeOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'returned');
  const totalRev = activeOrders.reduce((sum, o) => sum + o.total_amount, 0);
  
  let totalCommissions = 0;
  activeOrders.forEach(o => {
    o.items.forEach(item => {
      const commissionRate = (item.product.seller && item.product.seller.commission_rate) ? item.product.seller.commission_rate : 10.0;
      const price = item.product.discount_price ? item.product.discount_price : item.product.price;
      totalCommissions += price * item.quantity * (commissionRate / 100);
    });
  });

  const lowStockCount = products.filter(p => p.stock <= 5).length;

  let pendingRowsHTML = '';
  if (pendingProducts.length === 0) {
    pendingRowsHTML = `<tr><td colspan="6" style="text-align:center; color:var(--color-text-muted); padding:16px;">No pending products requiring approval.</td></tr>`;
  } else {
    pendingRowsHTML = pendingProducts.map(p => {
      return `
        <tr>
          <td>${p.id}</td>
          <td><img src="${p.image}" alt="${p.name}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;"></td>
          <td>
            <strong>${p.name}</strong><br>
            <span style="font-size:11px; color:var(--color-text-muted);">Shop: ${p.seller.shop_name}</span>
          </td>
          <td>₹${p.price.toFixed(2)}</td>
          <td>${p.stock} units</td>
          <td>
            <div style="display:flex; gap:8px;">
              <button onclick="approveProduct(${p.id})" class="inline-edit-btn" style="background-color:#16a34a;">Approve</button>
              <button onclick="rejectProduct(${p.id})" class="inline-edit-btn" style="background-color:#dc2626;">Reject</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  let catalogRowsHTML = approvedProducts.map(p => {
    return `
      <tr>
        <td>${p.id}</td>
        <td><strong>${p.name}</strong><br><span style="font-size:11px; color:var(--color-text-muted);">Shop: ${p.seller.shop_name}</span></td>
        <td>₹${p.price.toFixed(2)}</td>
        <td>${p.stock} units</td>
        <td><button onclick="deleteProductListing(${p.id})" class="address-delete-btn" style="font-size:12px;">Delete</button></td>
      </tr>
    `;
  }).join('');

  // 2. Render Global Orders and Fraud Risk Flags
  let ordersRowsHTML = '';
  if (orders.length === 0) {
    ordersRowsHTML = `<tr><td colspan="7" style="text-align:center; padding:12px; color:var(--color-text-muted);">No orders placed on the platform yet.</td></tr>`;
  } else {
    ordersRowsHTML = orders.map(order => {
      // Analyze for automated fraud flags
      let fraudFlagsHTML = '';
      
      if (order.total_amount > 300) {
        fraudFlagsHTML += `<span class="fraud-badge high-value" style="background-color:#f1c40f; color:#333; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700; margin-right:4px; display:inline-block;">HIGH VALUE</span>`;
      }
      if (order.payment_method === 'cod' && order.total_amount > 150) {
        fraudFlagsHTML += `<span class="fraud-badge cod-risk" style="background-color:#e67e22; color:white; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700; margin-right:4px; display:inline-block;">COD RISK</span>`;
      }
      const frequency = orders.filter(o => o.customer_email === order.customer_email).length;
      if (frequency >= 3) {
        fraudFlagsHTML += `<span class="fraud-badge frequent" style="background-color:#3498db; color:white; padding:2px 6px; border-radius:4px; font-size:9px; font-weight:700; margin-right:4px; display:inline-block;">HIGH FREQ (${frequency})</span>`;
      }

      if (fraudFlagsHTML === '') {
        fraudFlagsHTML = `<span style="color:#2ecc71; font-weight:600; font-size:10px;">CLEARED / LOW RISK</span>`;
      }

      let adminActionsHTML = '';
      if (order.status !== 'cancelled' && order.status !== 'returned') {
        adminActionsHTML = `
          <div style="display:flex; gap:6px;">
            <button onclick="adminVerifyOrder(${order.id})" class="inline-edit-btn" style="background-color:#2ecc71; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;">Verify</button>
            <button onclick="adminCancelOrder(${order.id})" class="address-delete-btn" style="font-size:11px; padding:4px 8px; border-radius:4px; border:1px solid #c0392b; color:#c0392b; cursor:pointer;">Cancel</button>
          </div>
        `;
      } else {
        adminActionsHTML = `<span style="font-size:11px; color:var(--color-text-muted); font-style:italic;">No active actions</span>`;
      }

      return `
        <tr>
          <td>#${order.id}</td>
          <td>${order.dateStr}</td>
          <td><span style="font-size:11px; font-weight:600;">${order.customer_email}</span></td>
          <td><strong>₹${order.total_amount.toFixed(2)}</strong><br><span style="font-size:10px; color:var(--color-text-muted);">${order.payment_method.toUpperCase()}</span></td>
          <td><div style="text-align:left;">${fraudFlagsHTML}</div></td>
          <td><span class="status-badge approved" style="font-size:10px; text-transform:uppercase;">${order.status}</span></td>
          <td>${adminActionsHTML}</td>
        </tr>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="container account-dashboard-layout" style="display: flex; flex-direction: column; gap: 24px;">
      <div class="dashboard-header" style="margin-bottom:0;">
        <div>
          <h2 class="dashboard-title">System Admin Dashboard</h2>
          <p class="dashboard-user-info">Logged in as Administrator: <strong>${currentUser.name}</strong></p>
        </div>
        <button onclick="handleLogout()" class="btn-primary" style="padding: 10px 16px; border-radius: 8px; font-size: 13px; background-color: #c0392b; cursor:pointer;">Logout</button>
      </div>

      <!-- Daily Analytics Section -->
      <div class="account-settings-row" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px;">
        <div class="account-settings-card" style="padding: 16px; text-align: center; border-left: 4px solid var(--color-primary);">
          <span style="font-size:12px; color:var(--color-text-muted); font-weight:600; text-transform:uppercase;">Total Platform Sales</span>
          <h3 style="font-size:24px; margin:8px 0 0 0; color:var(--color-primary); font-family:var(--font-display);">₹${totalRev.toFixed(2)}</h3>
        </div>
        <div class="account-settings-card" style="padding: 16px; text-align: center; border-left: 4px solid #3498db;">
          <span style="font-size:12px; color:var(--color-text-muted); font-weight:600; text-transform:uppercase;">Platform Commission (10%)</span>
          <h3 style="font-size:24px; margin:8px 0 0 0; color:#3498db; font-family:var(--font-display);">₹${totalCommissions.toFixed(2)}</h3>
        </div>
        <div class="account-settings-card" style="padding: 16px; text-align: center; border-left: 4px solid #f1c40f;">
          <span style="font-size:12px; color:var(--color-text-muted); font-weight:600; text-transform:uppercase;">Valid Platform Orders</span>
          <h3 style="font-size:24px; margin:8px 0 0 0; color:#f1c40f; font-family:var(--font-display);">${activeOrders.length}</h3>
        </div>
        <div class="account-settings-card" style="padding: 16px; text-align: center; border-left: 4px solid #e74c3c;">
          <span style="font-size:12px; color:var(--color-text-muted); font-weight:600; text-transform:uppercase;">Low Stock Alerts</span>
          <h3 style="font-size:24px; margin:8px 0 0 0; color:#e74c3c; font-family:var(--font-display);">${lowStockCount}</h3>
        </div>
      </div>

      <!-- Global Orders & Fraud flags -->
      <div class="account-settings-card" style="overflow-x:auto;">
        <h3 class="dashboard-section-title" style="margin-top:0;">Global Order tracking & Fraud Analysis</h3>
        <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:16px;">Monitor platform purchases and identify potential merchant and checkout security issues.</p>
        <table class="dashboard-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Checkout Amount</th>
              <th>Risk Assessment</th>
              <th>Status</th>
              <th>Action Panel</th>
            </tr>
          </thead>
          <tbody>
            ${ordersRowsHTML}
          </tbody>
        </table>
      </div>

      <div class="account-settings-row">
        <!-- Pending Approvals Card -->
        <div class="account-settings-card" style="overflow-x:auto;">
          <h3 class="dashboard-section-title" style="margin-top:0;">Pending Product Approvals</h3>
          <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:16px;">Approve submitted products to display them on the storefront catalog, or reject them.</p>
          <table class="dashboard-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Img</th>
                <th>Product details</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${pendingRowsHTML}
            </tbody>
          </table>
        </div>

        <!-- All Active Catalog Listings Card -->
        <div class="account-settings-card" style="overflow-x:auto;">
          <h3 class="dashboard-section-title" style="margin-top:0;">Active Catalog Manager</h3>
          <p style="font-size:12px; color:var(--color-text-muted); margin-bottom:16px;">Global listing registry. Remove any product listing if it violates policy guidelines.</p>
          <table class="dashboard-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Product details</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${catalogRowsHTML}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function approveProduct(id) {
  const product = products.find(p => p.id === id);
  if (product) {
    product.status = "Approved";
    saveState();
    alert(`Product "${product.name}" has been approved and published!`);
    renderAccountPage();
  }
}

function rejectProduct(id) {
  const product = products.find(p => p.id === id);
  if (product) {
    if (confirm(`Are you sure you want to reject and delete product "${product.name}"?`)) {
      products.splice(products.indexOf(product), 1);
      saveState();
      alert("Product listing rejected and deleted.");
      renderAccountPage();
    }
  }
}

function deleteProductListing(id) {
  const product = products.find(p => p.id === id);
  if (product) {
    if (confirm(`Are you sure you want to permanently delete product "${product.name}" from the store catalog?`)) {
      products.splice(products.indexOf(product), 1);
      saveState();
      alert("Product listing removed.");
      renderAccountPage();
    }
  }
}

function adminCancelOrder(orderId) {
  if (!confirm(`Are you sure you want to cancel Order #${orderId} as administrator?`)) return;
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.status = 'cancelled';
  order.tracking.push({
    status: 'cancelled',
    description: 'Order cancelled by System Administrator.',
    time: Date.now()
  });

  // Restore inventory
  order.items.forEach(item => {
    const product = products.find(p => p.id === item.product.id);
    if (product) product.stock += item.quantity;
  });

  // Refund if wallet
  if (order.payment_method === 'wallet') {
    refundOrderToCustomer(order, `Refund for Cancelled Order #${order.id} (Admin Override)`);
  }

  saveState();
  renderAccountPage();
  alert(`Order #${orderId} has been successfully cancelled.`);
}

function adminVerifyOrder(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;

  order.tracking.push({
    status: order.status,
    description: 'Order details verified by System Administrator.',
    time: Date.now()
  });

  saveState();
  renderAccountPage();
  alert(`Order #${orderId} verified successfully.`);
}

// --- WISHLIST VIEW ---
function renderWishlistPage() {
  const listContainer = document.getElementById('wishlist-items-list');
  if (!listContainer) return;
  
  const wlArray = Array.from(wishlist);
  if (wlArray.length === 0) {
    listContainer.innerHTML = `
      <div class="empty-cart-page-state" style="grid-column: 1 / -1; width:100%; text-align:center; padding:40px;">
        <h3>Your Wish List is empty</h3>
        <p>Explore our products and click the heart icon to save items to your wish list.</p>
        <a href="#/search?q=" class="btn-primary" style="margin-top:16px; display:inline-block; padding:10px 20px; border-radius:8px;">Shop Now</a>
      </div>
    `;
    return;
  }
  
  listContainer.innerHTML = wlArray.map(productId => {
    const product = products.find(p => p.id === productId);
    if (!product) return '';
    
    const priceHTML = product.discount_price 
      ? `<span class="discounted">₹${product.discount_price.toFixed(2)}</span> <span class="original" style="font-size:12px; text-decoration:line-through; color:var(--color-text-muted);">₹${product.price.toFixed(2)}</span>`
      : `<span>₹${product.price.toFixed(2)}</span>`;
      
    return `
      <div class="wishlist-item-card" id="wishlist-item-${product.id}">
        <div class="wishlist-img-frame" onclick="window.location.hash = '#/product?id=${product.id}'">
          <img src="${product.image}" alt="${product.name}">
        </div>
        <div class="wishlist-item-details">
          <h3 class="wishlist-item-title">${product.name}</h3>
          <div class="wishlist-item-price">${priceHTML}</div>
          <div class="wishlist-actions">
            <button onclick="addWishlistItemToCart(${product.id})" class="wishlist-btn-add">Add to Bag</button>
            <button onclick="removeWishlistItem(${product.id})" class="wishlist-btn-remove">Remove</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function addWishlistItemToCart(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;
  
  const cartItem = cart.find(item => item.product.id === productId);
  if (cartItem) {
    cartItem.quantity += 1;
  } else {
    cart.push({ product, quantity: 1 });
  }
  
  wishlist.delete(productId);
  saveState();
  updateHeaderCounters();
  renderWishlistPage();
  alert(`Added ${product.name} to your bag.`);
}

function removeWishlistItem(productId) {
  wishlist.delete(productId);
  saveState();
  updateHeaderCounters();
  renderWishlistPage();
}

// Function to simulate order transitions without page redraw/re-render triggers
function simulateAllOrders() {
  let stateChanged = false;
  orders.forEach(order => {
    if (order.status !== 'cancelled' && order.status !== 'returned' && order.status !== 'refunded' && order.status !== 'cancellation_requested' && order.status !== 'return_requested') {
      if (order.status === 'return_approved') {
        const lastTracking = order.tracking && order.tracking.length > 0 ? order.tracking[order.tracking.length - 1] : null;
        const elapsedSinceApproval = lastTracking && lastTracking.time ? (Date.now() - lastTracking.time) / 1000 : 0;
        if (lastTracking && elapsedSinceApproval > 30) {
          order.status = 'returned';
          const desc = "Return package received and inspected at warehouse. Refund processed.";
          order.tracking.push({
            status: 'returned',
            description: desc,
            time: Date.now()
          });

          // Restore inventory
          order.items.forEach(item => {
            const product = products.find(p => p.id == item.product.id);
            if (product) product.stock += item.quantity;
          });

          // Process Refund based on payment method
          if (order.payment_method === 'wallet' || order.payment_method === 'cod') {
            const refundReason = order.payment_method === 'cod' 
              ? `Store credit refund for Return of COD Order #${order.id}`
              : `Refund for Return of Order #${order.id}`;
            refundOrderToCustomer(order, refundReason);
          } else if (order.payment_method === 'card') {
            const descCard = `Return package received and inspected. Refund of ₹${order.total_amount.toFixed(2)} processed back to original Credit Card.`;
            order.tracking[order.tracking.length - 1].description = descCard;
          }

          stateChanged = true;
        }
      }
    }
  });

  if (stateChanged) {
    saveState();
  }
  return stateChanged;
}

// Background simulation ticker to process status updates and re-render views automatically without page refresh
function updateAllOrdersSimulation() {
  const stateChanged = simulateAllOrders();
  if (stateChanged) {
    // Re-render the current view if it depends on order or wallet state
    const hash = window.location.hash || '#/';
    if (hash === '#/orders') {
      renderOrdersPage();
    } else if (hash === '#/wallet') {
      renderWalletPage();
    } else if (hash === '#/account') {
      renderAccountPage();
    }
  }
}



// Check for simulated background updates every 2 seconds
setInterval(updateAllOrdersSimulation, 2000);

// --- CHAT LOGIC ---
let chatSocket = null;
let currentChatRoomId = null;
let currentChatStoreId = null;

function injectCustomerChatWidget() {
  if (document.getElementById('customer-chat-widget')) return;
  const widgetDiv = document.createElement('div');
  widgetDiv.id = 'customer-chat-widget';
  widgetDiv.innerHTML = `
    <div class="chat-window" id="customer-chat-window" style="display: none; position: fixed; bottom: 100px; right: 24px; width: 350px; height: 500px; background: #fff; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); flex-direction: column; z-index: 9999; overflow: hidden; border: 1px solid #ddd;">
      <div class="chat-header" style="background: var(--color-primary, #2a433a); color: white; padding: 16px; font-weight: 600; display: flex; justify-content: space-between; align-items: center;">
        <span>Support Chat</span>
        <button class="chat-close-btn" onclick="toggleCustomerChat()" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
      </div>
      <div class="chat-messages" id="customer-chat-messages" style="flex: 1; padding: 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; background: #f9f9f9;">
        <!-- Messages will appear here dynamically -->
      </div>
      <div class="chat-input-area" style="padding: 16px; border-top: 1px solid #eee; display: flex; gap: 8px; background: #fff;">
        <input type="text" id="customer-chat-input" placeholder="Type a message..." onkeypress="handleCustomerChatKeypress(event)" maxlength="250" style="flex: 1; padding: 10px; border-radius: 20px; border: 1px solid #ddd; outline: none;">
        <button onclick="sendCustomerChatMessage()" style="background: var(--color-primary, #2a433a); color: white; border: none; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(widgetDiv);
}

// Call it immediately
injectCustomerChatWidget();

function toggleCustomerChat(storeId = null, orderId = null, productId = null) {
  const win = document.getElementById('customer-chat-window');
  if (!win) {
    console.error("Chat window element not found!");
    return;
  }
  
  if (win.style.display === 'none' || win.style.display === '') {
    const widget = document.getElementById('customer-chat-widget');
    if (widget) widget.style.display = 'block';
    win.style.display = 'flex';
    initCustomerChat(storeId, orderId, productId);
  } else {
    if (storeId && currentChatStoreId !== storeId) {
      if (chatSocket) {
        chatSocket.close();
        chatSocket = null;
      }
      initCustomerChat(storeId, orderId, productId);
    } else {
      win.style.display = 'none';
      if (chatSocket) {
        chatSocket.close();
        chatSocket = null;
      }
    }
  }
}

function initCustomerChat(storeId = null, orderId = null, productId = null) {
  if (chatSocket) return; // already connected

  const payload = {};
  if (storeId) payload.store_id = storeId;
  if (orderId) payload.order_id = orderId;
  if (productId) payload.product_id = productId;

  apiClient.request('/chat/rooms/start/', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
    .then(room => {
      currentChatRoomId = room.id;
      currentChatStoreId = storeId;
      const token = localStorage.getItem('lumora_access_token');
      chatSocket = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${room.id}/?token=${token}`);
      
      const input = document.getElementById('customer-chat-input');
      if (input) {
        input.disabled = false;
        input.placeholder = "Type a message...";
      }

      const msgContainer = document.getElementById('customer-chat-messages');
      msgContainer.innerHTML = '';
      if (!room.agent) {
        msgContainer.innerHTML += `<div class="chat-msg other">Hi! Connecting you to an agent...</div>`;
      } else {
        msgContainer.innerHTML += `<div class="chat-msg other">Reconnected with ${room.agent.full_name || 'Agent'}</div>`;
      }
      
      chatSocket.onmessage = function(e) {
        const data = JSON.parse(e.data);
        const msgContainer = document.getElementById('customer-chat-messages');
        if (data.type === 'chat_close') {
          console.log("Customer Chat SWS - Chat ended by manager/agent");
          currentChatRoomId = null;
          if (chatSocket) {
            chatSocket.close();
            chatSocket = null;
          }
          msgContainer.innerHTML += `<div class="chat-system-msg">Chat has been ended by the agent.</div>`;
          msgContainer.scrollTop = msgContainer.scrollHeight;
          const inputEl = document.getElementById('customer-chat-input');
          if (inputEl) {
            inputEl.disabled = true;
            inputEl.placeholder = "Chat ended. Close window and open chat again to start a new chat.";
          }
          return;
        }

        const isSelf = currentUser && (
          (data.sender_email && currentUser.email && data.sender_email.toLowerCase() === currentUser.email.toLowerCase()) ||
          (Number(data.sender_id) === Number(currentUser.id))
        );
        console.log("Customer Chat SWS - Received message:", data, "isSelf:", isSelf, "currentUser:", currentUser);
        
        msgContainer.innerHTML += `<div class="chat-msg ${isSelf ? 'self' : 'other'}">${data.message}</div>`;
        msgContainer.scrollTop = msgContainer.scrollHeight;
      };
      
      chatSocket.onclose = function(e) {
        console.error('Chat socket closed unexpectedly');
        chatSocket = null;
      };
    })
    .catch(err => console.error(err));
}

function sendCustomerChatMessage() {
  const input = document.getElementById('customer-chat-input');
  const message = input.value.trim();
  if (message.length > 250) {
    alert("Message cannot exceed 250 characters.");
    return;
  }
  if (message && chatSocket && chatSocket.readyState === WebSocket.OPEN) {
    chatSocket.send(JSON.stringify({
      'message': message
    }));
    input.value = '';
  }
}

function handleCustomerChatKeypress(e) {
  if (e.key === 'Enter') {
    sendCustomerChatMessage();
  }
}

let agentSocket = null;
let managerActiveRoomSocket = null;
let managerActiveRoomId = null;

let managerChatRooms = [];

function initManagerChatDashboard() {
  const token = localStorage.getItem('lumora_access_token');
  
  if (!agentSocket) {
    agentSocket = new WebSocket(`ws://127.0.0.1:8000/ws/agents/?token=${token}`);
    agentSocket.onopen = function() {
      setInterval(() => {
        if (agentSocket && agentSocket.readyState === WebSocket.OPEN) {
          agentSocket.send(JSON.stringify({ type: 'heartbeat' }));
        }
      }, 45000);
    };
    agentSocket.onmessage = function(e) {
      const data = JSON.parse(e.data);
      if (data.type === 'new_room') {
        fetchManagerRooms();
      }
    };
    agentSocket.onclose = function(e) {
      console.error('Agent notification socket closed');
      agentSocket = null;
    };
  }

  fetchManagerRooms();
}

let managerChatFilter = 'open';

function setManagerChatFilter(filter) {
  managerChatFilter = filter;
  const tabs = document.querySelectorAll('.mgr-chat-tab');
  if(tabs.length) {
    tabs.forEach(el => el.classList.remove('active'));
    document.getElementById(`mgr-chat-tab-${filter}`).classList.add('active');
  }
  fetchManagerRooms();
}

function fetchManagerRooms() {
  apiClient.request('/chat/rooms/')
    .then(rooms => {
      managerChatRooms = rooms;
      const countEl = document.getElementById('mgr-chat-count');
      const listEl = document.getElementById('mgr-chat-rooms-list');
      if (!countEl || !listEl) return;
      
      const filteredRooms = rooms.filter(r => r.status === managerChatFilter);
      countEl.textContent = filteredRooms.length;
      if (filteredRooms.length === 0) {
        listEl.innerHTML = `<div style="padding: 16px; font-size: 12px; color: var(--color-text-muted); text-align: center;">No ${managerChatFilter} chat requests.</div>`;
      } else {
        listEl.innerHTML = filteredRooms.map(room => {
          const isActive = room.id === managerActiveRoomId ? 'active' : '';
          const statusCol = room.status === 'open' ? '#d35400' : (room.status === 'picked_up' ? '#27ae60' : '#7f8c8d');
          
          let contextHTML = '';
          if (room.product) {
            contextHTML = `<div class="room-item-context" style="font-size: 11px; color: var(--color-primary); font-weight: 500; margin-top: 4px; text-align: left;">Product: ${room.product.name}</div>`;
          } else if (room.order) {
            contextHTML = `<div class="room-item-context" style="font-size: 11px; color: #2980b9; font-weight: 500; margin-top: 4px; text-align: left;">Order: #${room.order}</div>`;
          }
          
          return `
            <div class="room-item ${isActive}" onclick="selectManagerRoom(${room.id})" style="cursor: pointer; padding: 12px; border-bottom: 1px solid #eee;">
              <div class="room-item-title" style="font-weight: 600; font-size: 13px; text-align: left;">Room #${room.id} - ${room.customer.email}</div>
              ${contextHTML}
              <div class="room-item-meta" style="font-size: 11px; color: #777; margin-top: 4px; text-align: left;"><span style="color:${statusCol}; font-weight:600;">${room.status}</span> • ${new Date(room.created_at).toLocaleTimeString()}</div>
            </div>
          `;
        }).join('');
      }
    });
}

function selectManagerRoom(roomId) {
  const room = managerChatRooms.find(r => r.id === roomId);
  if (!room) return;

  if (room.status === 'open') {
    apiClient.request(`/chat/rooms/${roomId}/pickup/`, { method: 'POST' })
      .then(updatedRoom => {
        managerActiveRoomId = updatedRoom.id;
        fetchManagerRooms();
        openManagerRoom(updatedRoom);
      })
      .catch(err => {
        managerActiveRoomId = roomId;
        fetchManagerRooms();
        openManagerRoom(room);
      });
  } else {
    managerActiveRoomId = roomId;
    fetchManagerRooms();
    openManagerRoom(room);
  }
}

function openManagerRoom(room) {
  const header = document.getElementById('mgr-chat-header');
  const msgArea = document.getElementById('mgr-chat-messages');
  const inputArea = document.getElementById('mgr-chat-input-area');
  const contextBanner = document.getElementById('mgr-chat-context-banner');
  
  let contextTitle = '';
  let contextBannerHTML = '';
  
  if (room.product) {
    contextTitle = `Product Inquiry: ${room.product.name}`;
    contextBannerHTML = `
      <div style="padding: 12px 16px; background-color: #f1f8f5; border-bottom: 1px solid #ddd; display: flex; align-items: center; justify-content: space-between; font-size: 13px; font-weight: 500; color: var(--color-primary, #2a433a);">
        <span>Regarding Product: <strong>${room.product.name}</strong></span>
        <span style="font-weight: 600;">$${room.product.price}</span>
      </div>
    `;
  } else if (room.order) {
    contextTitle = `Order Reference: #${room.order}`;
    contextBannerHTML = `
      <div style="padding: 12px 16px; background-color: #f1f7fa; border-bottom: 1px solid #ddd; font-size: 13px; font-weight: 500; color: #2980b9;">
        Regarding Order: <strong>#${room.order}</strong>
      </div>
    `;
  } else {
    contextBannerHTML = '';
  }

  header.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
      <span>Chatting with ${room.customer.email}</span>
      ${contextTitle ? `<span style="font-size:11px; opacity:0.85; font-weight:normal;">${contextTitle}</span>` : ''}
    </div>
    ${room.status !== 'closed' ? `<button onclick="closeManagerRoom(${room.id})" class="btn-outline" style="padding:4px 8px; font-size:11px; color:white; border-color:white; background:none; cursor:pointer;">End Chat</button>` : ''}
  `;
  header.style.backgroundColor = 'var(--color-primary)';
  header.style.color = '#fff';
  
  if (contextBanner) {
    contextBanner.innerHTML = contextBannerHTML;
  }
  
  if (room.status === 'closed') {
    inputArea.style.display = 'none';
  } else {
    inputArea.style.display = 'flex';
  }
  msgArea.innerHTML = '';
  
  if (managerActiveRoomSocket) {
    managerActiveRoomSocket.close();
  }
  
  const token = localStorage.getItem('lumora_access_token');
  managerActiveRoomSocket = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${room.id}/?token=${token}`);
  managerActiveRoomSocket.onmessage = function(e) {
    const data = JSON.parse(e.data);
    if (data.type === 'chat_close') {
      console.log("Manager Chat SWS - Chat closed");
      if (managerActiveRoomSocket) {
        managerActiveRoomSocket.close();
        managerActiveRoomSocket = null;
      }
      managerActiveRoomId = null;
      document.getElementById('mgr-chat-header').innerHTML = '<span>Select a chat to begin</span>';
      document.getElementById('mgr-chat-header').style.backgroundColor = '#fbfaf7';
      document.getElementById('mgr-chat-header').style.color = 'var(--color-primary)';
      document.getElementById('mgr-chat-messages').innerHTML = '';
      document.getElementById('mgr-chat-input-area').style.display = 'none';
      fetchManagerRooms();
      return;
    }

    const isSelf = currentUser && (
      (data.sender_email && currentUser.email && data.sender_email.toLowerCase() === currentUser.email.toLowerCase()) ||
      (Number(data.sender_id) === Number(currentUser.id))
    );
    console.log("Manager Chat SWS - Received message:", data, "isSelf:", isSelf, "currentUser:", currentUser);
    msgArea.innerHTML += `<div class="chat-msg ${isSelf ? 'self' : 'other'}">${data.message}</div>`;
    msgArea.scrollTop = msgArea.scrollHeight;
  };
  managerActiveRoomSocket.onclose = function(e) {
    console.error('Manager active room socket closed');
    managerActiveRoomSocket = null;
  };
}

function sendManagerChatMessage() {
  const input = document.getElementById('mgr-chat-input');
  const message = input.value.trim();
  if (message.length > 250) {
    alert("Message cannot exceed 250 characters.");
    return;
  }
  if (message && managerActiveRoomSocket && managerActiveRoomSocket.readyState === WebSocket.OPEN) {
    managerActiveRoomSocket.send(JSON.stringify({
      'message': message
    }));
    input.value = '';
  }
}

function handleManagerChatKeypress(e) {
  if (e.key === 'Enter') {
    sendManagerChatMessage();
  }
}

function closeManagerRoom(roomId) {
  apiClient.request(`/chat/rooms/${roomId}/close/`, { method: 'POST' })
    .then(() => {
      if (managerActiveRoomSocket) {
        managerActiveRoomSocket.close();
        managerActiveRoomSocket = null;
      }
      managerActiveRoomId = null;
      document.getElementById('mgr-chat-header').innerHTML = '<span>Select a chat to begin</span>';
      document.getElementById('mgr-chat-header').style.backgroundColor = '#fbfaf7';
      document.getElementById('mgr-chat-header').style.color = 'var(--color-primary)';
      document.getElementById('mgr-chat-messages').innerHTML = '';
      document.getElementById('mgr-chat-input-area').style.display = 'none';
      fetchManagerRooms();
    });
}
