<script setup>
import { inject } from 'vue';
import { RouterLink } from 'vue-router';

defineProps({
  product: {
    type: Object,
    required: true
  }
});

const store = inject('store');
</script>

<template>
  <article class="card product-card h-100 shadow-sm">
    <div class="product-image" :style="{ background: product.gradient }" role="img" :aria-label="product.name"></div>
    <div class="card-body d-flex flex-column">
      <p class="text-uppercase text-secondary small mb-1">{{ product.category }}</p>
      <h2 class="h5">{{ product.name }}</h2>
      <p class="text-secondary flex-grow-1">{{ product.summary }}</p>
      <div class="d-flex justify-content-between align-items-center">
        <strong>${{ product.price.toLocaleString() }}</strong>
        <span class="small text-secondary">{{ product.likes }} likes</span>
      </div>
      <div class="d-grid gap-2 mt-3">
        <RouterLink class="btn btn-dark rounded-pill" :to="`/products/${product.id}`">View details</RouterLink>
        <button class="btn btn-outline-dark rounded-pill" type="button" @click="store.addToCart(product)">
          Add to bag
        </button>
      </div>
    </div>
  </article>
</template>
