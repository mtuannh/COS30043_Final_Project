<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import ProductCard from '../components/ProductCard.vue';
import { api } from '../services/api';

const products = ref([]);

onMounted(async () => {
  const response = await api.getProducts({ limit: 3, sort: 'likes-desc' });
  products.value = response.items;
});
</script>

<template>
  <section class="hero-section text-center">
    <div class="container">
      <p class="eyebrow">New season collection</p>
      <h1 class="display-3 fw-bold">Technology that feels effortless.</h1>
      <p class="lead mx-auto hero-copy">
        Discover a polished Apple-inspired storefront for phones, tablets, laptops, accessories, and services.
      </p>
      <div class="d-flex justify-content-center gap-3 flex-wrap">
        <RouterLink class="btn btn-dark btn-lg rounded-pill px-4" to="/products">Shop products</RouterLink>
        <RouterLink class="btn btn-outline-dark btn-lg rounded-pill px-4" to="/about">Learn more</RouterLink>
      </div>
    </div>
  </section>

  <section class="container py-5">
    <div class="d-flex justify-content-between align-items-end mb-4">
      <div>
        <p class="eyebrow">Popular now</p>
        <h2 class="h1">Loved by the community</h2>
      </div>
      <RouterLink class="link-dark" to="/products">Browse products</RouterLink>
    </div>

    <div class="row g-4">
      <div v-for="product in products" :key="product.id" class="col-12 col-md-6 col-xl-4">
        <ProductCard :product="product" />
      </div>
    </div>
  </section>

  <section class="container">
    <div class="row g-4">
      <div class="col-12 col-lg-4">
        <div class="feature-panel h-100">
          <h3>10+ Pages</h3>
          <p>Home, catalogue, details, cart, auth, profile, admin, edit, about, contact, and error routes.</p>
        </div>
      </div>
      <div class="col-12 col-lg-4">
        <div class="feature-panel h-100">
          <h3>Reactive Vue</h3>
          <p>Uses Vue directives, forms, computed state, events, route guards, and component-based UI.</p>
        </div>
      </div>
      <div class="col-12 col-lg-4">
        <div class="feature-panel h-100">
          <h3>REST Persistence</h3>
          <p>A small Express API stores products, users, likes, and messages in a JSON database.</p>
        </div>
      </div>
    </div>
  </section>
</template>
