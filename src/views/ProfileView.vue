<script setup>
import { computed, inject } from 'vue';
import { useRouter } from 'vue-router';

const store = inject('store');
const router = useRouter();
const cartCount = computed(() => store.cart.reduce((total, item) => total + item.quantity, 0));

function logout() {
  store.logout();
  router.push('/');
}
</script>

<template>
  <section class="container py-5">
    <div class="profile-panel">
      <p class="eyebrow">Authenticated area</p>
      <h1 class="display-5 fw-bold">Welcome, {{ store.user.name }}.</h1>
      <p class="lead text-secondary">
        Signed-in users can see private account content and manage product records for the catalogue.
      </p>
      <div class="row g-3 mt-3">
        <div class="col-12 col-md-4">
          <div class="metric-card">
            <span>{{ cartCount }}</span>
            <p>Items in bag</p>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="metric-card">
            <span>{{ store.user.role }}</span>
            <p>Account role</p>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="metric-card">
            <span>REST</span>
            <p>Data source</p>
          </div>
        </div>
      </div>
      <button class="btn btn-outline-dark rounded-pill mt-4" type="button" @click="logout">Sign out</button>
    </div>
  </section>
</template>
