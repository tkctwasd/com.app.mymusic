<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Icon from '../ui/Icon.vue';
const route = useRoute();
const cur = computed(() => (route.name === 'listen' ? 0 : route.name === 'explore' ? 2 : 1));
</script>

<template>
  <nav class="mnav">
    <RouterLink to="/" class="it" :class="{ on: cur === 0 }"><Icon name="listen" size="22" /><span>Nghe</span></RouterLink>
    <RouterLink to="/shelf" class="it" :class="{ on: cur === 1 }"><Icon name="shelf" size="22" /><span>Kệ</span></RouterLink>
    <RouterLink to="/explore" class="it" :class="{ on: cur === 2 }"><Icon name="compass" size="22" /><span>Tìm</span></RouterLink>
  </nav>
</template>

<style scoped>
.mnav { position: fixed; z-index: 200; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-around; height: calc(var(--mnav-h) + env(safe-area-inset-bottom)); padding-bottom: env(safe-area-inset-bottom);
  background: var(--glass); backdrop-filter: blur(20px) saturate(1.5); -webkit-backdrop-filter: blur(20px) saturate(1.5); border-top: 1px solid var(--line); }
.it { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; flex: 1; font-size: 11px; font-weight: 500; color: var(--text-3); transition: color .2s; }
.it.on { color: var(--text); }
.it.on :deep(svg) { color: var(--accent); }
</style>
