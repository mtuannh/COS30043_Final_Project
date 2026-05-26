<script setup>
defineProps({
  categories: {
    type: Array,
    required: true
  }
});

let filters = defineModel({
  type: Object,
  required: true
});
</script>

<template>
  <form class="product-filters row g-3 align-items-end p-3 bg-light rounded-4" @submit.prevent>
    <div class="col-12 col-md-5">
      <label class="form-label" for="query">Search products</label>
      <input id="query" v-model.trim="filters.query" class="form-control" type="search" placeholder="iPhone, iPad, Mac..." />
    </div>
    <div class="col-6 col-md-3">
      <label class="form-label" for="category">Category</label>
      <select id="category" v-model="filters.category" class="form-select">
        <option value="">All categories</option>
        <option v-for="category in categories" :key="category" :value="category">{{ category }}</option>
      </select>
    </div>
    <div class="col-6 col-md-2">
      <label class="form-label" for="sort">Sort by</label>
      <select id="sort" v-model="filters.sort" class="form-select">
        <option value="featured">Featured</option>
        <option value="price-asc">Price: low to high</option>
        <option value="price-desc">Price: high to low</option>
        <option value="likes-desc">Most liked</option>
      </select>
    </div>
    <div class="col-12 col-md-2">
      <label class="form-label" for="pageSize">Per page</label>
      <select id="pageSize" v-model.number="filters.pageSize" class="form-select">
        <option :value="3">3</option>
        <option :value="6">6</option>
        <option :value="9">9</option>
      </select>
    </div>
  </form>
</template>
