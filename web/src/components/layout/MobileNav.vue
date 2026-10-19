<script setup>
import { useRoute } from 'vue-router';
import Icon from '../ui/Icon.vue';
const route = useRoute();
</script>

<template>
  <nav class="mnav">
    <RouterLink to="/" class="it"><Icon :name="route.name === 'home' ? 'homeFill' : 'home'" size="24" /><span>Trang chủ</span></RouterLink>
    <RouterLink to="/search" class="it"><Icon name="search" size="24" /><span>Tìm kiếm</span></RouterLink>
    <RouterLink to="/library" class="it"><Icon name="library" size="24" /><span>Thư viện</span></RouterLink>
  </nav>
</template>

<style scoped>
.mnav { display: flex; justify-content: space-around; padding: 8px 0 calc(8px + env(safe-area-inset-bottom)); background: linear-gradient(transparent, rgba(0,0,0,.9) 30%, #000); }
.it { display: flex; flex-direction: column; align-items: center; gap: 4px; font-size: 10px; color: var(--text-2); width: 80px; }
.it.router-link-exact-active { color: #fff; }
</style>
