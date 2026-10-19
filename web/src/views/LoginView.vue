<script setup>
import { ref } from 'vue';
import { api, auth } from '../api.js';

const emit = defineEmits(['done']);
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  busy.value = true; error.value = '';
  try {
    const { token } = await api('/api/login', { method: 'POST', body: { password: password.value } });
    auth.token = token;
    emit('done');
  } catch (e) { error.value = e.message; }
  busy.value = false;
}
</script>

<template>
  <div class="login">
    <form class="card" @submit.prevent="submit">
      <img src="/icon.svg" alt="" class="logo" />
      <h1>Đăng nhập vào My Music</h1>
      <label class="lbl" for="pw">Mật khẩu</label>
      <input id="pw" v-model="password" type="password" class="field" autofocus autocomplete="current-password" />
      <p v-if="error" class="err">{{ error }}</p>
      <button class="btn btn-primary" :disabled="busy || !password">Đăng nhập</button>
    </form>
  </div>
</template>

<style scoped>
.login { min-height: 100%; display: grid; place-items: center; padding: 16px; background: linear-gradient(rgba(255,255,255,.1), #000); }
.card { width: min(420px, 100%); padding: 40px 32px; border-radius: 8px; background: var(--surface); display: flex; flex-direction: column; }
.logo { width: 48px; margin: 0 auto 16px; }
h1 { font-size: 28px; font-weight: 800; text-align: center; margin-bottom: 32px; }
.btn { height: 48px; margin-top: 24px; font-size: 16px; }
.err { color: var(--danger); margin: 8px 0 0; }
</style>
