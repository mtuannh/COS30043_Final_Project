<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <section class="container py-5 text-center">
    <p class="eyebrow">404</p>
    <h1 class="display-5 fw-bold">This page does not exist.</h1>
    <p class="text-secondary">Use the navigation to continue shopping.</p>
    <RouterLink class="btn btn-dark rounded-pill" to="/">Return home</RouterLink>
  </section>
</template>
