import { createApp, reactive } from 'vue';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './styles.css';
import App from './App.vue';
import router from './router';
import { ensureMercuryHashRoute, saveProjectBase } from './router/history';

ensureMercuryHashRoute();
saveProjectBase();

const savedUser = JSON.parse(localStorage.getItem('user') || localStorage.getItem('novatech-user') || 'null');
const savedToken = localStorage.getItem('token') || '';
const savedCart = JSON.parse(localStorage.getItem('novatech-cart') || '[]');

const store = reactive({
  user: savedUser,
  token: savedToken,
  cart: savedCart,
  setAuth({ token, user }) {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.removeItem('novatech-user');
  },
  setUser(user) {
    this.user = user;
    localStorage.setItem('user', JSON.stringify(user));
  },
  logout() {
    this.user = null;
    this.token = '';
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('novatech-user');
  },
  addToCart(product) {
    const item = this.cart.find((entry) => entry.id === product.id);

    if (item) {
      item.quantity += 1;
    } else {
      this.cart.push({ ...product, quantity: 1 });
    }

    this.persistCart();
  },
  updateCartQuantity(productId, quantity) {
    const item = this.cart.find((entry) => entry.id === productId);
    if (!item) return;

    item.quantity = Math.max(1, quantity);
    this.persistCart();
  },
  removeFromCart(productId) {
    this.cart = this.cart.filter((entry) => entry.id !== productId);
    this.persistCart();
  },
  clearCart() {
    this.cart = [];
    this.persistCart();
  },
  persistCart() {
    localStorage.setItem('novatech-cart', JSON.stringify(this.cart));
  }
});

createApp(App).provide('store', store).use(router).mount('#app');
