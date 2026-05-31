<script setup>
import { onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../services/api';

const products = ref([]);
const message = ref('');

async function loadProducts() {
  const response = await api.getProducts({ limit: 100 });
  products.value = response.items;
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  await api.deleteProduct(id);
  message.value = 'Product deleted.';
  loadProducts();
}

onMounted(loadProducts);
</script>

<template>
  <section class="container py-5">
    <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
      <div>
        <h1 class="display-5 fw-bold">Manage products.</h1>
      </div>
      <RouterLink class="btn btn-dark rounded-pill align-self-start" to="/admin/products/new">Create product</RouterLink>
    </div>

    <p v-if="message" class="alert alert-success">{{ message }}</p>

    <div class="admin-table table-responsive rounded-4 border">
      <table class="table align-middle mb-0">
        <thead class="table-light">
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Likes</th>
            <th class="text-end">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id">
            <td>{{ product.name }}</td>
            <td>{{ product.category }}</td>
            <td>${{ product.price.toLocaleString() }}</td>
            <td>{{ product.likes }}</td>
            <td class="text-end">
              <RouterLink class="btn btn-sm btn-outline-dark rounded-pill me-2" :to="`/admin/products/${product.id}/edit`">
                Edit
              </RouterLink>
              <button class="btn btn-sm btn-outline-danger rounded-pill" type="button" @click="deleteProduct(product.id)">
                Delete
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
