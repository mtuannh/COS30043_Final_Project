<script setup>
import { inject } from 'vue';
import { RouterLink, useRouter } from 'vue-router';

const store = inject('store');
const router = useRouter();

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

      <button class="btn btn-outline-dark rounded-pill mt-4" type="button" @click="logout">Sign out</button>
    </div>
  </section>
</template>
