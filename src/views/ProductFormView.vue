<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../services/api';

const props = defineProps({
  id: {
    type: String,
    default: ''
  }
});

const router = useRouter();
const error = ref('');
const form = reactive({
  name: '',
  category: 'iPhone',
  price: 999,
  summary: '',
  description: '',
  featuresText: '',
  gradient: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)'
});

const isEditing = computed(() => Boolean(props.id));

async function loadProduct() {
  if (!isEditing.value) return;
  const product = await api.getProduct(props.id);
  Object.assign(form, {
    name: product.name,
    category: product.category,
    price: product.price,
    summary: product.summary,
    description: product.description,
    featuresText: product.features.join('\n'),
    gradient: product.gradient
  });
}

async function submit() {
  error.value = '';

  if (!form.name || !form.summary || !form.description) {
    error.value = 'Name, summary, and description are required.';
    return;
  }

  if (Number(form.price) <= 0) {
    error.value = 'Price must be greater than zero.';
    return;
  }

  const payload = {
    ...form,
    price: Number(form.price),
    features: form.featuresText.split('\n').map((feature) => feature.trim()).filter(Boolean)
  };
  delete payload.featuresText;

  if (isEditing.value) {
    await api.updateProduct(props.id, payload);
  } else {
    await api.createProduct(payload);
  }

  router.push('/admin');
}

onMounted(loadProduct);
</script>

<template>
  <section class="container py-5">
    <p class="eyebrow">Product editor</p>
    <h1 class="display-5 fw-bold">{{ isEditing ? 'Edit product' : 'Create product' }}</h1>
    <p v-if="error" class="alert alert-danger">{{ error }}</p>

    <form class="row g-3 mt-2" @submit.prevent="submit">
      <div class="col-12 col-md-6">
        <label class="form-label" for="name">Name</label>
        <input id="name" v-model.trim="form.name" class="form-control" required />
      </div>
      <div class="col-12 col-md-3">
        <label class="form-label" for="category">Category</label>
        <select id="category" v-model="form.category" class="form-select">
          <option>iPhone</option>
          <option>iPad</option>
          <option>Mac</option>
          <option>Watch</option>
          <option>Audio</option>
          <option>Accessories</option>
        </select>
      </div>
      <div class="col-12 col-md-3">
        <label class="form-label" for="price">Price</label>
        <input id="price" v-model.number="form.price" class="form-control" type="number" min="1" required />
      </div>
      <div class="col-12">
        <label class="form-label" for="summary">Summary</label>
        <input id="summary" v-model.trim="form.summary" class="form-control" required />
      </div>
      <div class="col-12">
        <label class="form-label" for="description">Description</label>
        <textarea id="description" v-model.trim="form.description" class="form-control" rows="4" required></textarea>
      </div>
      <div class="col-12 col-md-6">
        <label class="form-label" for="features">Features, one per line</label>
        <textarea id="features" v-model="form.featuresText" class="form-control" rows="5"></textarea>
      </div>
      <div class="col-12 col-md-6">
        <label class="form-label" for="gradient">Product visual gradient</label>
        <input id="gradient" v-model.trim="form.gradient" class="form-control" />
        <div class="detail-visual small-preview mt-3" :style="{ background: form.gradient }"></div>
      </div>
      <div class="col-12">
        <button class="btn btn-dark rounded-pill px-4" type="submit">Save product</button>
      </div>
    </form>
  </section>
</template>
