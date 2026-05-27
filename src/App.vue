<script setup>
import { computed, inject, ref } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import ChatWidget from './components/ChatWidget.vue';

const store = inject('store');

const savedTheme = localStorage.getItem('novatech-theme');
const isDarkMode = ref(savedTheme === 'dark');

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value;
  localStorage.setItem('novatech-theme', isDarkMode.value ? 'dark' : 'light');
}

const cartCount = computed(() => store.cart.reduce((total, item) => total + item.quantity, 0));
const isAdmin = computed(() => store.user?.role === 'admin');
</script>

<template>
  <div class="app-shell" :class="{ 'dark-mode': isDarkMode }">
    <nav class="navbar navbar-expand-lg navbar-light bg-white border-bottom sticky-top">
      <div class="container">
        <RouterLink class="navbar-brand fw-bold" to="/">NovaTech</RouterLink>
        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavigation"
          aria-controls="mainNavigation"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div id="mainNavigation" class="collapse navbar-collapse">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item"><RouterLink class="nav-link" to="/products">Products</RouterLink></li>
            <li v-if="store.user?.role !== 'admin'" class="nav-item"><RouterLink class="nav-link" to="/about">About</RouterLink></li>
            <li v-if="store.user?.role !== 'admin'" class="nav-item"><RouterLink class="nav-link" to="/contact">Contact</RouterLink></li>
            <li v-if="store.user?.role === 'admin'" class="nav-item"><RouterLink class="nav-link" to="/admin">Manage</RouterLink></li>
            <li v-if="store.user?.role === 'admin'" class="nav-item"><RouterLink class="nav-link" to="/admin/inbox">Inbox</RouterLink></li>
          </ul>

          <div class="d-flex align-items-center gap-2">
          <button class="btn btn-outline-dark rounded-pill" type="button" @click="toggleDarkMode">
                {{ isDarkMode ? 'Light mode' : 'Dark mode' }}
            </button>
            <RouterLink class="btn btn-outline-dark rounded-pill" to="/cart">
              Bag <span class="badge text-bg-dark ms-1">{{ cartCount }}</span>
            </RouterLink>
            <RouterLink v-if="store.user" class="btn btn-light rounded-pill" to="/profile">{{ store.user.name }}</RouterLink>
          </div>
        </div>
      </div>
    </nav>

    <main>
      <RouterView />
    </main>

    <footer class="border-top bg-light py-4 mt-5">
      <div class="container d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 small text-secondary">
        <div class="d-flex flex-column gap-1">
          <span>NovaTech Store, a COS30043 Vue 3 project.</span>
          <span>Responsive ecommerce prototype with REST API persistence.</span>
        </div>
        <RouterLink v-if="!store.user" class="btn btn-outline-dark btn-sm rounded-pill" to="/login">Admin log in</RouterLink>
      </div>
    </footer>

    <ChatWidget v-if="!isAdmin" />
  </div>
</template>
