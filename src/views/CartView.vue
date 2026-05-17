<script setup>
import { computed, inject, ref } from 'vue';
import { RouterLink } from 'vue-router';

const store = inject('store');
const checkedOut = ref(false);
const total = computed(() => store.cart.reduce((sum, item) => sum + item.price * item.quantity, 0));
</script>

<template>
  <section class="container py-5">
    <p class="eyebrow">Shopping bag</p>
    <h1 class="display-5 fw-bold">Review your selected products.</h1>

    <div v-if="checkedOut" class="alert alert-success mt-4">
      Order placed successfully. This prototype records the cart locally for demonstration.
    </div>

    <div v-if="!store.cart.length" class="empty-state mt-4">
      <h2>Your bag is empty.</h2>
      <p class="text-secondary">Add a product from the catalogue to start a simulated order.</p>
      <RouterLink class="btn btn-dark rounded-pill" to="/products">Browse products</RouterLink>
    </div>

    <div v-else class="row g-4 mt-2">
      <div class="col-12 col-lg-8">
        <article v-for="item in store.cart" :key="item.id" class="cart-line">
          <div class="cart-thumb" :style="{ background: item.gradient }"></div>
          <div class="flex-grow-1">
            <h2 class="h5 mb-1">{{ item.name }}</h2>
            <p class="text-secondary mb-2">{{ item.category }}</p>
            <label class="form-label" :for="`qty-${item.id}`">Quantity</label>
            <input
              :id="`qty-${item.id}`"
              class="form-control quantity-input"
              type="number"
              min="1"
              :value="item.quantity"
              @input="store.updateCartQuantity(item.id, Number($event.target.value))"
            />
          </div>
          <div class="text-end">
            <strong>${{ (item.price * item.quantity).toLocaleString() }}</strong>
            <button class="btn btn-link text-danger d-block px-0" type="button" @click="store.removeFromCart(item.id)">
              Remove
            </button>
          </div>
        </article>
      </div>

      <aside class="col-12 col-lg-4">
        <div class="summary-panel">
          <h2 class="h4">Order summary</h2>
          <div class="d-flex justify-content-between py-2 border-bottom">
            <span>Subtotal</span>
            <strong>${{ total.toLocaleString() }}</strong>
          </div>
          <div class="d-flex justify-content-between py-2 border-bottom">
            <span>Delivery</span>
            <span>Free</span>
          </div>
          <button class="btn btn-dark rounded-pill w-100 mt-3" type="button" @click="checkedOut = true; store.clearCart()">
            Checkout
          </button>
        </div>
      </aside>
    </div>
  </section>
</template>
