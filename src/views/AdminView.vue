<script setup>
import { onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { api } from '../services/api';

const products = ref([]);
const message = ref('');
const adminMessage = ref('');
const adminError = ref('');
const adminForm = reactive({ name: '', email: '', password: '' });

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

async function createAdmin() {
  adminMessage.value = '';
  adminError.value = '';

  if (!adminForm.name || !adminForm.email || adminForm.password.length < 6) {
    adminError.value = 'Name, email, and password of at least 6 characters are required.';
    return;
  }

  try {
    const admin = await api.createAdmin(adminForm);
    adminMessage.value = `${admin.name} can now sign in as an admin.`;
    Object.assign(adminForm, { name: '', email: '', password: '' });
  } catch (err) {
    adminError.value = err.message;
  }
}

onMounted(loadProducts);
</script>

<template>
  <section class="container py-5">
    <div class="d-flex flex-column flex-md-row justify-content-between gap-3 mb-4">
      <div>
        <p class="eyebrow">Content management</p>
        <h1 class="display-5 fw-bold">Manage products.</h1>
      </div>
      <RouterLink class="btn btn-dark rounded-pill align-self-start" to="/admin/products/new">Create product</RouterLink>
    </div>

    <p v-if="message" class="alert alert-success">{{ message }}</p>

    <div class="admin-card rounded-4 border p-4 mb-4">
      <h2 class="h4 fw-bold">Create admin account</h2>
      <p class="text-secondary">Only signed-in admins can create another administrator.</p>
      <p v-if="adminMessage" class="alert alert-success">{{ adminMessage }}</p>
      <p v-if="adminError" class="alert alert-danger">{{ adminError }}</p>
      <form class="row g-3" @submit.prevent="createAdmin">
        <div class="col-12 col-md-4">
          <label class="form-label" for="admin-name">Name</label>
          <input id="admin-name" v-model.trim="adminForm.name" class="form-control" type="text" required />
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label" for="admin-email">Email</label>
          <input id="admin-email" v-model.trim="adminForm.email" class="form-control" type="email" required />
        </div>
        <div class="col-12 col-md-4">
          <label class="form-label" for="admin-password">Password</label>
          <input id="admin-password" v-model="adminForm.password" class="form-control" type="password" minlength="6" required />
        </div>
        <div class="col-12">
          <button class="btn btn-outline-dark rounded-pill" type="submit">Create admin</button>
        </div>
      </form>
    </div>

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
