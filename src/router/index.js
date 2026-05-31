import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ProductsView from '../views/ProductsView.vue';
import ProductDetailView from '../views/ProductDetailView.vue';
import CartView from '../views/CartView.vue';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import ProfileView from '../views/ProfileView.vue';
import AdminView from '../views/AdminView.vue';
import ProductFormView from '../views/ProductFormView.vue';
import AdminInboxView from '../views/AdminInboxView.vue';
import AboutView from '../views/AboutView.vue';
import ContactView from '../views/ContactView.vue';
import NotFoundView from '../views/NotFoundView.vue';

const AUTH_STORAGE_KEYS = ['user', 'novatech-user'];

function parseStoredUser() {
  for (const key of AUTH_STORAGE_KEYS) {
    const storedUser = localStorage.getItem(key);

    if (!storedUser) {
      continue;
    }

    try {
      return JSON.parse(storedUser);
    } catch {
      localStorage.removeItem(key);
    }
  }

  return null;
}

function getAuthSession() {
  return {
    token: localStorage.getItem('token'),
    user: parseStoredUser()
  };
}

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/products', name: 'products', component: ProductsView },
  { path: '/products/:id', name: 'product-detail', component: ProductDetailView, props: true },
  { path: '/cart', name: 'cart', component: CartView },
  { path: '/login', name: 'login', component: LoginView, meta: { guestOnly: true } },
  { path: '/register', name: 'register', component: RegisterView, meta: { guestOnly: true } },
  { path: '/profile', name: 'profile', component: ProfileView, meta: { requiresAuth: true } },
  { path: '/admin', name: 'admin', component: AdminView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/inbox', name: 'admin-inbox', component: AdminInboxView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/products/new', name: 'product-new', component: ProductFormView, meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/admin/products/:id/edit', name: 'product-edit', component: ProductFormView, meta: { requiresAuth: true, requiresAdmin: true }, props: true },
  { path: '/about', name: 'about', component: AboutView },
  { path: '/contact', name: 'contact', component: ContactView },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundView }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach((to) => {
  const { token, user } = getAuthSession();
  const isAuthenticated = Boolean(token && user);

  if (to.meta.guestOnly && isAuthenticated) {
    return { name: user.role === 'admin' ? 'admin' : 'profile' };
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  if (to.meta.requiresAdmin && user?.role !== 'admin') {
    return { name: 'home' };
  }

  return true;
});

export default router;
