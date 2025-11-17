// src/services/api.js
const API_URL = 'http://localhost:8080/api';

const getToken = () => localStorage.getItem('token');

// === AUTH & USER ===
export const api = {
  login: async (email, password) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Invalid credentials');
    }

    const token = await res.text();
    localStorage.setItem('token', token);
    return token;
  },

  register: async (userData) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Registration failed');
    }
    return res.json();
  },

  // === USER APIS ===
  getProducts: async () => {
    const token = getToken();
    if (!token) return [];

    const res = await fetch(`${API_URL}/user/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) throw new Error('Failed to load products');
    return res.json();
  },

  addToCart: async (productId, quantity = 1) => {
    const token = getToken();
    if (!token) throw new Error('Please login first');

    const res = await fetch(`${API_URL}/user/cart/${productId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quantity })
    });

    if (!res.ok) throw new Error(await res.text());
    if (window.updateCartCount) window.updateCartCount();
    return await api.getCart();
  },

  updateCartItem: async (productId, quantity) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/user/cart/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quantity })
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Update failed');
    }
  },

  removeFromCart: async (productId) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/user/cart/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || 'Remove failed');
    }
  },

  getCart: async () => {
    const token = getToken();
    if (!token) throw new Error('No token');

    const res = await fetch(`${API_URL}/user/cart`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Failed to fetch cart');
    }
    return res.json();
  },

  checkout: async (data) => {
    const res = await fetch(`${API_URL}/user/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  createPaymentIntent: async (shippingAddress) => {
    const res = await fetch(`${API_URL}/user/create-payment-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify({ shippingAddress })
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Failed to create payment');
    }
    return res.json();
  },

  // === ADMIN APIS ===

  /** GET ALL PRODUCTS (Admin) */
getAllProductsAdmin: async () => {
  const token = getToken();
  const res = await fetch(`${API_URL}/admin/products`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // ← Should include imageBase64
},

  /** UPDATE PRODUCT (Admin) */
  updateProduct: async (productId, updates) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/admin/products/${productId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  /** DELETE PRODUCT (Admin) */
  deleteProduct: async (productId) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/admin/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  /** GET ALL USERS (Admin) */
getAllUsers: async () => {
  const token = getToken();
  const res = await fetch(`${API_URL}/admin/users`, {  // ← /api/users → /users
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
},
  /** UPDATE USER ROLE (Admin) */
  updateUserRole: async (userId, role) => {
    const token = getToken();
    const res = await fetch(`${API_URL}/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ role })
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  
  /** UPLOAD NEW PRODUCT (Admin) */
  uploadProduct: async (productData, mainFile, extraFiles = []) => {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(productData)], { type: 'application/json' }));
    formData.append('mainFile', mainFile);
    extraFiles.forEach(file => formData.append('extraFiles', file));

    const token = getToken();
    const res = await fetch(`${API_URL}/admin/products`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(error || 'Upload failed');
    }
    return res.json();
  },
  /** GET USER ORDERS */

// === ADMIN: GET ALL ORDERS ===
getAllOrdersAdmin: async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Login required');

  const res = await fetch('http://localhost:8080/api/admin/admin/orders', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Admin Orders Failed:', res.status, text);
    throw new Error(text || 'Failed to fetch all orders');
  }

  const data = await res.json();
  console.log('Admin Orders Success:', data);
  return data;
},

// === USER: GET MY ORDERS ===
getUserOrders: async () => {
  const token = getToken();
  if (!token) throw new Error('Please login again');

  const res = await fetch(`${API_URL}/user/orders`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text.includes('login') ? 'Session expired' : 'Failed to load orders');
  }
  return res.json();
},
createUpiPayment: async (data) => {
    const res = await fetch(`${API_URL}/user/create-upi-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

getOrderStatus: async (orderId) => {
    const res = await fetch(`${API_URL}/user/order-status/${orderId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json(); // { status: "PAID" }
  }

};

export default api;