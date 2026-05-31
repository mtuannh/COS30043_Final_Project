<script setup>
import { computed, inject } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

const store = inject('store');
const router = useRouter();
const tokenPreview = computed(() => (store.token ? `${store.token.slice(0, 16)}...` : 'No active token'));

function logout() {
  store.logout();
  router.push('/');
}
</script>

<template>
  <section class="container py-5">
    <div class="profile-panel">
      <p class="eyebrow">Admin account</p>
      <h1 class="display-5 fw-bold">Welcome, {{ store.user.name }}.</h1>
      <p class="lead text-secondary">
        This is your admin control panel for managing account access, catalogue tasks, and secure admin actions.
      </p>

      <div class="row g-4 mt-3">
        <div class="col-12 col-lg-5">
          <div class="metric-card h-100">
            <p class="eyebrow mb-3">Account details</p>
            <dl class="row mb-0">
              <dt class="col-sm-4">Name</dt>
              <dd class="col-sm-8">{{ store.user.name }}</dd>

              <dt class="col-sm-4">Email</dt>
              <dd class="col-sm-8">{{ store.user.email }}</dd>

              <dt class="col-sm-4">Role</dt>
              <dd class="col-sm-8 text-capitalize">{{ store.user.role }}</dd>
            </dl>
          </div>
        </div>

        <div class="col-12 col-lg-7">
          <div class="metric-card h-100">
            <p class="eyebrow mb-3">Admin shortcuts</p>
            <div class="d-flex flex-wrap gap-2">
              <RouterLink class="btn btn-dark rounded-pill" to="/admin">Manage products</RouterLink>
              <RouterLink class="btn btn-outline-dark rounded-pill" to="/admin/products/new">Create product</RouterLink>
              <RouterLink class="btn btn-outline-dark rounded-pill" to="/admin/inbox">View inbox</RouterLink>
            </div>
          </div>
        </div>
      </div>

      <div class="metric-card mt-4">
        <p class="eyebrow mb-3">Advanced Vue authentication</p>
        <div class="row g-3">
          <div class="col-12 col-md-4">
            <span class="d-block fw-semibold">JWT session</span>
            <span class="text-secondary small">{{ tokenPreview }}</span>
          </div>
          <div class="col-12 col-md-4">
            <span class="d-block fw-semibold">Vue Router guard</span>
            <span class="text-secondary small">This profile page requires a logged-in user.</span>
          </div>
          <div class="col-12 col-md-4">
            <span class="d-block fw-semibold">Authenticated API</span>
            <span class="text-secondary small">Admin requests include the Bearer token.</span>
          </div>
        </div>
      </div>

      <button class="btn btn-outline-dark rounded-pill mt-4" type="button" @click="logout">Sign out</button>
    </div>
  </section>
</template>
