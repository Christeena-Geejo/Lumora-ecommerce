const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = {
  getTokens() {
    return {
      access: localStorage.getItem('lumora_access_token'),
      refresh: localStorage.getItem('lumora_refresh_token')
    };
  },
  
  setTokens(access, refresh) {
    if (access) localStorage.setItem('lumora_access_token', access);
    if (refresh) localStorage.setItem('lumora_refresh_token', refresh);
  },

  clearTokens() {
    localStorage.removeItem('lumora_access_token');
    localStorage.removeItem('lumora_refresh_token');
    localStorage.removeItem('lumora_currentUser');
  },

  async request(endpoint, options = {}) {
    let { access } = this.getTokens();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (access) {
      headers['Authorization'] = `Bearer ${access}`;
    }

    let response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers
    });

    if (response.status === 401 && access) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        access = this.getTokens().access;
        headers['Authorization'] = `Bearer ${access}`;
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers
        });
      } else {
        this.clearTokens();
        window.location.hash = '#/';
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw { status: response.status, data: errorData };
    }

    return response.json();
  },

  async refreshToken() {
    const { refresh } = this.getTokens();
    if (!refresh) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh })
      });
      if (res.ok) {
        const data = await res.json();
        this.setTokens(data.access, data.refresh || refresh);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  },

  async login(email, password) {
    const data = await this.request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setTokens(data.access, data.refresh);
    
    const base64Url = data.access.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    const tokenPayload = JSON.parse(jsonPayload);
    
    // Add role and email info mapped from tokenPayload or fetch details
    const user = {
      id: tokenPayload.user_id,
      email: email,
      role: tokenPayload.role || 'user',
      full_name: tokenPayload.full_name || 'Lumora Shopper',
      name: tokenPayload.full_name || 'Lumora Shopper'
    };
    localStorage.setItem('lumora_currentUser', JSON.stringify(user));
    return user;
  },

  async register(email, fullName, password, role = 'user', phone = '') {
    return this.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({ email, full_name: fullName, password, role, phone })
    });
  },

  async logout() {
    const { refresh } = this.getTokens();
    if (refresh) {
      try {
        await this.request('/auth/logout/', {
          method: 'POST',
          body: JSON.stringify({ refresh })
        });
      } catch (e) {
        console.error("Logout failed on server:", e);
      }
    }
    this.clearTokens();
  },

  // Products
  async getProducts(params = {}) {
    let query = '';
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.append('q', params.q);
    if (params.category && params.category !== 'all') searchParams.append('category', params.category);
    if (params.min_price) searchParams.append('min_price', params.min_price);
    if (params.max_price) searchParams.append('max_price', params.max_price);
    
    const queryString = searchParams.toString();
    const endpoint = queryString ? `/products/search/?${queryString}` : '/products/';
    return this.request(endpoint);
  },

  async getProduct(id) {
    return this.request(`/products/${id}/`);
  },

  // Cart
  async getCart() {
    return this.request('/cart/');
  },

  async addToCart(productId, quantity = 1) {
    return this.request('/cart/', {
      method: 'POST',
      body: JSON.stringify({ product_id: productId, quantity })
    });
  },

  async removeFromCart(productId) {
    return this.request('/cart/', {
      method: 'DELETE',
      body: JSON.stringify({ product_id: productId })
    });
  },

  // Orders
  async createOrder(addressId, paymentMethod, couponCode = '') {
    return this.request('/orders/', {
      method: 'POST',
      body: JSON.stringify({
        address_id: addressId,
        payment_method: paymentMethod,
        coupon_code: couponCode
      })
    });
  },

  async getOrders() {
    return this.request('/orders/');
  },

  async getAddresses() {
    return this.request('/orders/addresses/');
  },

  async createAddress(addressData) {
    return this.request('/orders/addresses/', {
      method: 'POST',
      body: JSON.stringify(addressData)
    });
  },

  // Razorpay Payments
  async createRazorpayOrder(amount, orderId = null) {
    return this.request('/payments/create/', {
      method: 'POST',
      body: JSON.stringify({ amount, order_id: orderId })
    });
  },

  async verifyRazorpayPayment(paymentId, orderId, signature) {
    return this.request('/payments/verify/', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        razorpay_signature: signature
      })
    });
  }
};
