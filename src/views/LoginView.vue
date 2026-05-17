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
    const user = await api.login(form);
    store.setUser(user);
    router.push(route.query.redirect || '/profile');
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <section class="container auth-layout py-5">
    <div class="auth-card">
      <p class="eyebrow">Member access</p>
      <h1 class="h2 fw-bold">Sign in to manage content.</h1>
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
        <button class="btn btn-dark rounded-pill" type="submit">Sign in</button>
      </form>

      <p class="mt-3 mb-0">New customer? <RouterLink to="/register">Create an account</RouterLink></p>
    </div>
  </section>
</template>
