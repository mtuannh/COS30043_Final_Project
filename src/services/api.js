const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    if (response.status === 404) {
      throw new Error('API route not found. Restart the backend with `npm run api` or `npm run start`.');
    }
    throw new Error(error.message || `Request failed (${response.status})`);
  }

  return response.json();
}

export const api = {
  getProducts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return request(`/products${query ? `?${query}` : ''}`);
  },
  getProduct(id) {
    return request(`/products/${id}`);
  },
  createProduct(product) {
    return request('/products', {
      method: 'POST',
      body: JSON.stringify(product)
    });
  },
  updateProduct(id, product) {
    return request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product)
    });
  },
  deleteProduct(id) {
    return request(`/products/${id}`, { method: 'DELETE' });
  },
  likeProduct(id) {
    return request(`/products/${id}/like`, { method: 'POST' });
  },
  login(credentials) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },
  register(user) {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(user)
    });
  },
  sendContact(message) {
    return request('/messages', {
      method: 'POST',
      body: JSON.stringify(message)
    });
  },
  spinDiscount() {
    return request('/discounts/spin', {
      method: 'POST'
    });
  },
  claimDiscount(payload) {
    return request('/discounts/claim', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
