<script setup>
import { computed, inject, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import DiscountWheel from '../components/DiscountWheel.vue';
import ProductCard from '../components/ProductCard.vue';
import { api } from '../services/api';

const store = inject('store');
const products = ref([]);
const totalProducts = ref(0);

const isAdmin = computed(() => store.user?.role === 'admin');
const featuredProducts = computed(() => products.value.slice(0, 3));
const totalLikes = computed(() => products.value.reduce((total, product) => total + product.likes, 0));
const categoryCount = computed(() => new Set(products.value.map((product) => product.category)).size);

onMounted(async () => {
  const response = await api.getProducts({ limit: 100, sort: 'likes-desc' });
  products.value = response.items;
  totalProducts.value = response.total;
});
</script>

<template>
  <template v-if="isAdmin">
    <section class="hero-section admin-hero-section">
      <div class="container">
        <div>
          <div>
            <p class="eyebrow">Admin dashboard</p>
            <h1 class="display-4 fw-bold">Welcome back, {{ store.user.name }}.</h1>
            <p class="lead hero-copy">
              Manage the catalogue, review customer messages, and keep the NovaTech storefront up to date.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="container admin-dashboard-content">
      <div class="row g-3 mb-4">
        <div class="col-12 col-md-4">
          <div class="metric-card">
            <span>{{ totalProducts }}</span>
            <p>Products in catalogue</p>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="metric-card">
            <span>{{ categoryCount }}</span>
            <p>Active categories</p>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="metric-card">
            <span>{{ totalLikes }}</span>
            <p>Total product likes</p>
          </div>
        </div>
      </div>

      <div class="admin-card rounded-4 border p-4">
        <div class="d-flex justify-content-between align-items-end mb-3">
          <div>
            <p class="eyebrow">Catalogue insight</p>
            <h2 class="h3 fw-bold mb-0">Top liked products</h2>
          </div>
          <RouterLink class="link-dark" to="/admin">Edit products</RouterLink>
        </div>

        <div class="admin-table table-responsive">
          <table class="table align-middle mb-0">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th class="text-end">Likes</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="product in featuredProducts" :key="product.id">
                <td>{{ product.name }}</td>
                <td>{{ product.category }}</td>
                <td>${{ product.price.toLocaleString() }}</td>
                <td class="text-end">{{ product.likes }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </template>

  <template v-else>
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
        <div v-for="product in featuredProducts" :key="product.id" class="col-12 col-md-6 col-xl-4">
          <ProductCard :product="product" />
        </div>
      </div>
    </section>
  </template>

  <DiscountWheel v-if="!isAdmin" />

</template>
