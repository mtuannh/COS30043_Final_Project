<script setup>
import { inject, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../services/api';

const store = inject('store');
const router = useRouter();
const form = reactive({ name: '', email: '', password: '' });
const error = ref('');

async function submit() {
  error.value = '';

  if (form.name.length < 2) {
    error.value = 'Name must be at least 2 characters.';
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    error.value = 'Enter a valid email address.';
    return;
  }

  if (form.password.length < 8) {
    error.value = 'Password must be at least 8 characters.';
    return;
  }

  try {
    const user = await api.register(form);
    store.setUser(user);
    router.push('/profile');
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <section class="container auth-layout py-5">
    <div class="auth-card">
      <p class="eyebrow">Create account</p>
      <h1 class="h2 fw-bold">Join NovaTech.</h1>
      <p v-if="error" class="alert alert-danger">{{ error }}</p>

      <form class="d-grid gap-3" @submit.prevent="submit">
        <div>
          <label class="form-label" for="name">Full name</label>
          <input id="name" v-model.trim="form.name" class="form-control" type="text" required />
        </div>
        <div>
          <label class="form-label" for="email">Email</label>
          <input id="email" v-model.trim="form.email" class="form-control" type="email" required />
        </div>
        <div>
          <label class="form-label" for="password">Password</label>
          <input id="password" v-model="form.password" class="form-control" type="password" minlength="8" required />
        </div>
        <button class="btn btn-dark rounded-pill" type="submit">Create account</button>
      </form>
    </div>
  </section>
</template>
