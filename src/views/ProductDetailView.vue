<script setup>
import { inject, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../services/api';

const props = defineProps({
  id: {
    type: String,
    required: true
  }
});

const store = inject('store');
const product = ref(null);
const error = ref('');

async function loadProduct() {
  try {
    product.value = await api.getProduct(props.id);
  } catch (err) {
    error.value = err.message;
  }
}

async function likeProduct() {
  product.value = await api.likeProduct(product.value.id);
}

onMounted(loadProduct);
</script>

<template>
  <section class="container py-5">
    <p v-if="error" class="alert alert-danger">{{ error }}</p>
    <div v-else-if="product" class="row g-5 align-items-center">
      <div class="col-12 col-lg-6">
        <div class="detail-visual" :style="{ background: product.gradient }" role="img" :aria-label="product.name"></div>
      </div>
      <div class="col-12 col-lg-6">
        <p class="eyebrow">{{ product.category }}</p>
        <h1 class="display-5 fw-bold">{{ product.name }}</h1>
        <p class="lead text-secondary">{{ product.description }}</p>
        <p class="h3">${{ product.price.toLocaleString() }}</p>

        <ul class="list-unstyled my-4">
          <li v-for="feature in product.features" :key="feature" class="py-2 border-bottom">
            {{ feature }}
          </li>
        </ul>

        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-dark rounded-pill px-4" type="button" @click="store.addToCart(product)">Add to bag</button>
          <button class="btn btn-outline-dark rounded-pill px-4" type="button" @click="likeProduct">
            Like this product ({{ product.likes }})
          </button>
          <RouterLink class="btn btn-light rounded-pill px-4" to="/products">Back to catalogue</RouterLink>
        </div>
      </div>
    </div>
    <div v-else class="text-center py-5">Loading product...</div>
  </section>
</template>
