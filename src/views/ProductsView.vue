<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import ProductCard from '../components/ProductCard.vue';
import ProductFilters from '../components/ProductFilters.vue';
import { api } from '../services/api';

const products = ref([]);
const total = ref(0);
const currentPage = ref(1);
const loading = ref(false);
let filters = reactive({
  query: '',
  category: '',
  sort: 'featured',
  pageSize: 6
});

const categories = computed(() => ['iPhone', 'iPad', 'Mac', 'Watch', 'Audio', 'Accessories']);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / filters.pageSize)));

async function loadProducts() {
  loading.value = true;
  const response = await api.getProducts({
    query: filters.query,
    category: filters.category,
    sort: filters.sort,
    page: currentPage.value,
    limit: filters.pageSize
  });
  products.value = response.items;
  total.value = response.total;
  loading.value = false;
}

watch(filters, () => {
  currentPage.value = 1;
  loadProducts();
});

watch(currentPage, loadProducts);

onMounted(loadProducts);
</script>

<template>
  <section class="container py-5">
    <div class="mb-4">
      <p class="eyebrow">Catalogue</p>
      <h1 class="display-5 fw-bold">Shop the full NovaTech range.</h1>
      <p class="text-secondary">Search, filter, sort, and paginate through the product collection.</p>
    </div>

    <ProductFilters v-model="filters" :categories="categories" />

    <div v-if="loading" class="text-center py-5">Loading products...</div>
    <div v-else class="row g-4 mt-2">
      <div v-for="product in products" :key="product.id" class="col-12 col-md-6 col-xl-4">
        <ProductCard :product="product" />
      </div>
      <p v-if="!products.length" class="text-secondary">No products match your criteria.</p>
    </div>

    <nav class="d-flex justify-content-center mt-4" aria-label="Product pages">
      <ul class="pagination">
        <li class="page-item" :class="{ disabled: currentPage === 1 }">
          <button class="page-link" type="button" @click="currentPage -= 1">Previous</button>
        </li>
        <li v-for="page in pageCount" :key="page" class="page-item" :class="{ active: page === currentPage }">
          <button class="page-link" type="button" @click="currentPage = page">{{ page }}</button>
        </li>
        <li class="page-item" :class="{ disabled: currentPage === pageCount }">
          <button class="page-link" type="button" @click="currentPage += 1">Next</button>
        </li>
      </ul>
    </nav>
  </section>
</template>
