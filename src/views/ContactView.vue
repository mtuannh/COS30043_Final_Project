<script setup>
import { reactive, ref } from 'vue';
import { api } from '../services/api';

const form = reactive({ name: '', email: '', message: '' });
const status = ref('');
const error = ref('');

async function submit() {
  status.value = '';
  error.value = '';

  if (form.name.length < 2 || !form.email.includes('@') || form.message.length < 10) {
    error.value = 'Please enter a valid name, email, and message of at least 10 characters.';
    return;
  }

  await api.sendContact(form);
  status.value = 'Message saved. The team will respond soon.';
  Object.assign(form, { name: '', email: '', message: '' });
}
</script>

<template>
  <section class="container py-5">
    <div class="row g-5">
      <div class="col-12 col-lg-5">
        <p class="eyebrow">Support</p>
        <h1 class="display-5 fw-bold">Contact NovaTech.</h1>
        <p class="text-secondary">
          This validated form sends data to the REST API, demonstrating application data persistence.
        </p>
      </div>
      <div class="col-12 col-lg-7">
        <p v-if="status" class="alert alert-success">{{ status }}</p>
        <p v-if="error" class="alert alert-danger">{{ error }}</p>
        <form class="contact-form d-grid gap-3" @submit.prevent="submit">
          <div>
            <label class="form-label" for="name">Name</label>
            <input id="name" v-model.trim="form.name" class="form-control" required />
          </div>
          <div>
            <label class="form-label" for="email">Email</label>
            <input id="email" v-model.trim="form.email" class="form-control" type="email" required />
          </div>
          <div>
            <label class="form-label" for="message">Message</label>
            <textarea id="message" v-model.trim="form.message" class="form-control" rows="5" required></textarea>
          </div>
          <button class="btn btn-dark rounded-pill justify-self-start" type="submit">Send message</button>
        </form>
      </div>
    </div>
  </section>
</template>
