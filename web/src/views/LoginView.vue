<script setup>
import { ref } from 'vue';
import { api, auth } from '../api.js';
import AppLogo from '../components/ui/AppLogo.vue';

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
      <AppLogo :size="64" animated class="logo" />
      <h1 class="display">My Music</h1>
      <p class="muted sub">Nhập mật khẩu để vào kệ nhạc của bạn</p>
      <label class="lbl" for="pw">Mật khẩu</label>
      <input id="pw" v-model="password" type="password" class="field" autofocus autocomplete="current-password" />
      <p v-if="error" class="err">{{ error }}</p>
      <button class="btn btn-primary" :disabled="busy || !password">Đăng nhập</button>
    </form>
  </div>
</template>

<style scoped>
.login { min-height: 100%; display: grid; place-items: center; padding: 16px; background: radial-gradient(80% 60% at 30% 0%, color-mix(in oklab, var(--tint) 45%, transparent), transparent 70%), var(--bg); }
.card { width: min(400px, 100%); padding: 40px 32px; border-radius: 28px; background: var(--glass); backdrop-filter: blur(24px); border: 1px solid var(--line); box-shadow: var(--shadow-lg); display: flex; flex-direction: column; }
.logo { margin: 0 auto 16px; }
h1 { font-size: 26px; font-weight: 600; text-align: center; }
.sub { text-align: center; margin: 6px 0 28px; }
.btn { height: 48px; margin-top: 24px; font-size: 15px; }
.err { color: var(--danger); margin: 8px 0 0; }
</style>
