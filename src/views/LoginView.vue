<script setup>
import { inject, reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { api } from '../services/api';

const store = inject('store');
const route = useRoute();
const router = useRouter();
const form = reactive({ email: 'admin@novatech.test', password: 'Password123' });
const error = ref('');

async function submit() {
  error.value = '';

  if (!form.email || !form.password) {
    error.value = 'Email and password are required.';
    return;
  }

  try {
    const auth = await api.login(form);
    store.setAuth(auth);
    router.push(route.query.redirect || '/admin');
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <section class="container auth-layout py-5">
    <div class="auth-card">
      <p class="eyebrow">Admin access</p>
      <h1 class="h2 fw-bold">Admin log in.</h1>
      <p class="text-secondary">Demo admin: admin@novatech.test / Password123</p>
      <p v-if="error" class="alert alert-danger">{{ error }}</p>

      <form class="d-grid gap-3" @submit.prevent="submit">
        <div>
          <label class="form-label" for="email">Email</label>
          <input id="email" v-model.trim="form.email" class="form-control" type="email" autocomplete="email" required />
        </div>
        <div>
          <label class="form-label" for="password">Password</label>
          <input id="password" v-model="form.password" class="form-control" type="password" autocomplete="current-password" required />
        </div>
        <button class="btn btn-dark rounded-pill" type="submit">Admin log in</button>
      </form>

      <p class="mt-3 mb-0">Need an admin account? <RouterLink to="/register">Create one</RouterLink></p>
    </div>
  </section>
</template>
