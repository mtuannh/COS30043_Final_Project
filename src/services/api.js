function isMercuryHost() {
  return typeof window !== 'undefined' && /mercury\.swin\.edu\.au/i.test(window.location.hostname);
}

function usePhpApiGateway() {
  if (import.meta.env.VITE_API_URL) {
    return false;
  }

  if (isMercuryHost()) {
    return true;
  }

  return import.meta.env.PROD;
}

function mercuryApiPhpUrl() {
  let path = window.location.pathname;
  if (path.indexOf('index.html') !== -1) {
    path = path.replace(/index\.html.*$/, '');
  }
  if (path.charAt(path.length - 1) !== '/') {
    path += '/';
  }
  return `${window.location.origin}${path}api.php`;
}

function buildRequestUrl(path) {
  const [pathname, search = ''] = path.split('?');
  const route = `/api${pathname}`;

  if (import.meta.env.DEV && !usePhpApiGateway()) {
    return `/api${path}`;
  }

  if (usePhpApiGateway()) {
    const url = new URL(mercuryApiPhpUrl());
    url.searchParams.set('route', route);

    const extra = new URLSearchParams(search);
    extra.forEach((value, key) => {
      url.searchParams.set(key, value);
    });

    return url.toString();
  }

  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}${path}`;
  }

  const base = import.meta.env.BASE_URL || '/';
  const prefix = `${base}${base.endsWith('/') ? '' : '/'}api`.replace(/\/{2,}/g, '/');
  return `${prefix}${path}`;
}

async function request(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const requestUrl = buildRequestUrl(path);

  const response = await fetch(requestUrl, {
    ...options,
    headers
  });

  const raw = await response.text();
  let payload = {};

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      const snippet = raw.replace(/\s+/g, ' ').slice(0, 120);
      throw new Error(
        `API error (${response.status}) at ${requestUrl}. Upload api.php + api/ folder. ${snippet}`
      );
    }
  }

  if (!response.ok) {
    throw new Error(payload.message || `Request failed (${response.status}) at ${requestUrl}`);
  }

  return payload;
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
  createAdmin(user) {
    return request('/admin/create-admin', {
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
  },
  createChatConversation(data) {
    return request('/chat', { method: 'POST', body: JSON.stringify(data) });
  },
  addChatMessage(id, msg) {
    return request(`/chat/${id}/messages`, { method: 'POST', body: JSON.stringify(msg) });
  },
  getChatConversation(id) {
    return request(`/chat/${id}`);
  },
  getChatConversations() {
    return request('/chat');
  },
  replyChatConversation(id, text) {
    return request(`/chat/${id}/reply`, { method: 'POST', body: JSON.stringify({ text }) });
  },
  deleteChatConversation(id) {
    return request(`/chat/${id}`, { method: 'DELETE' });
  }
};
